import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chatWithAi } from "@/lib/ai";
import type { AiMessage } from "@/lib/ai";
import { readFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = process.env.DATA_DIR || process.env.NEXT_PUBLIC_DATA_DIR || path.join(process.cwd(), "data");

export async function POST(req: NextRequest) {
  const { checkId } = await req.json();

  const check = await prisma.belegCheck.findUnique({
    where: { id: checkId },
    include: { documents: true },
  });

  if (!check) {
    return NextResponse.json({ error: "Prüfung nicht gefunden" }, { status: 404 });
  }

  if (check.documents.length < 2) {
    return NextResponse.json({ error: "Mindestens 2 Dokumente erforderlich" }, { status: 400 });
  }

  const fileAttachments = [];
  const docDescriptions: string[] = [];

  for (const doc of check.documents) {
    const filePath = path.join(DATA_DIR, doc.fileUrl.replace(/^\//, ""));
    try {
      const buffer = await readFile(filePath);
      const mimeType = doc.fileType === "pdf" ? "application/pdf"
        : doc.fileType.match(/^(jpg|jpeg)$/) ? "image/jpeg"
        : doc.fileType === "png" ? "image/png"
        : `application/${doc.fileType}`;

      fileAttachments.push({ data: buffer, fileName: doc.fileName, mimeType });
      docDescriptions.push(`Dokument ${doc.role.toUpperCase()}: "${doc.fileName}"`);
    } catch {
      return NextResponse.json(
        { error: `Datei nicht lesbar: ${doc.fileName}` },
        { status: 500 }
      );
    }
  }

  const systemPrompt = `Du bist ein Buchhalter-Assistent für ein Handwerksunternehmen. Du prüfst Belege auf Übereinstimmung.

Deine Aufgabe: Vergleiche die hochgeladenen Dokumente (z.B. Angebot und Rechnung) und prüfe ob die Positionen, Mengen, Einzelpreise und Gesamtbeträge übereinstimmen.

Antworte IMMER im folgenden JSON-Format (kein Markdown, nur reines JSON):
{
  "status": "ok" | "fehler",
  "summary": "Kurze Zusammenfassung der Prüfung (1-2 Sätze)",
  "positions": [
    {
      "position": "Positionsbezeichnung",
      "doc1Value": "Wert aus Dokument 1",
      "doc2Value": "Wert aus Dokument 2",
      "match": true | false,
      "note": "Optionale Anmerkung bei Abweichung"
    }
  ],
  "totals": {
    "doc1Total": "Gesamtbetrag Dokument 1",
    "doc2Total": "Gesamtbetrag Dokument 2",
    "match": true | false,
    "difference": "Differenz falls vorhanden"
  },
  "issues": ["Liste der gefundenen Probleme (leer wenn keine)"]
}

Wenn du die Dokumente nicht lesen kannst oder es sich nicht um vergleichbare Belege handelt, setze status auf "fehler" und beschreibe das Problem in summary.`;

  const userPrompt = `Bitte vergleiche die folgenden Dokumente und prüfe ob Positionen, Mengen, Preise und Gesamtbeträge übereinstimmen:\n\n${docDescriptions.join("\n")}`;

  const messages: AiMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt, files: fileAttachments },
  ];

  try {
    const aiResponse = await chatWithAi(messages);
    let resultData;
    try {
      const cleaned = aiResponse.content
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      resultData = JSON.parse(cleaned);
    } catch {
      resultData = {
        status: "fehler",
        summary: "KI-Antwort konnte nicht verarbeitet werden",
        rawResponse: aiResponse.content,
        positions: [],
        totals: null,
        issues: ["Die KI-Antwort lag nicht im erwarteten Format vor."],
      };
    }

    const status = resultData.status === "ok" ? "GEPRUEFT" : "FEHLER";

    await prisma.belegCheck.update({
      where: { id: checkId },
      data: {
        status,
        resultSummary: resultData.summary || "",
        resultDetails: JSON.stringify(resultData),
        checkedAt: new Date(),
      },
    });

    const updated = await prisma.belegCheck.findUnique({
      where: { id: checkId },
      include: { documents: true },
    });

    return NextResponse.json({ ...updated, parsedResult: resultData });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `KI-Prüfung fehlgeschlagen: ${message}` }, { status: 500 });
  }
}
