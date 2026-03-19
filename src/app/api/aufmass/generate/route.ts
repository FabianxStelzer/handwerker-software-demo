import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatWithAi, getSystemPromptForFunction, AiFileAttachment } from "@/lib/ai";
import { extractFileFromUrl, loadFileBuffer, getMimeType, isVisualFile } from "@/lib/file-extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB per file

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { aufmassId, frage } = await req.json();

  const aufmass = await prisma.aufmass.findUnique({
    where: { id: aufmassId },
    include: { positionen: true, dateien: true, project: true },
  });

  if (!aufmass) return NextResponse.json({ error: "Aufmaß nicht gefunden" }, { status: 404 });

  const fileAttachments: AiFileAttachment[] = [];
  const textDateiInhalte: string[] = [];

  for (const datei of aufmass.dateien) {
    if (isVisualFile(datei.dateiName)) {
      const buffer = await loadFileBuffer(datei.dateiUrl);
      if (buffer && buffer.length <= MAX_FILE_SIZE) {
        fileAttachments.push({
          data: buffer,
          fileName: datei.dateiName,
          mimeType: getMimeType(datei.dateiName),
        });
      } else if (buffer) {
        textDateiInhalte.push(`\n═══ ${datei.dateiName} ═══\n[Datei zu groß für direkte Analyse: ${(buffer.length / 1024 / 1024).toFixed(1)} MB]`);
      } else {
        textDateiInhalte.push(`\n═══ ${datei.dateiName} ═══\n[Datei konnte nicht geladen werden]`);
      }
    } else {
      const content = await extractFileFromUrl(datei.dateiUrl, datei.dateiName);
      textDateiInhalte.push(`\n═══ Datei: ${datei.dateiName} (${datei.dateiTyp.toUpperCase()}) ═══\n${content}`);
    }
  }

  const positionenInfo = aufmass.positionen.length > 0
    ? `\n\nBereits vorhandene Positionen (${aufmass.positionen.length} Stück):\n${aufmass.positionen.map((p, i) => `${i + 1}. ${p.bezeichnung} – ${p.menge} ${p.einheit}${p.kategorie ? ` (Kategorie: ${p.kategorie})` : ""}${p.raum ? ` [Raum: ${p.raum}]` : ""}`).join("\n")}`
    : "";

  const projektInfo = aufmass.project
    ? `\nProjekt: ${aufmass.project.name}`
    : "";

  const textDateienBlock = textDateiInhalte.length > 0
    ? `\n\n────────── TEXT-DATEIEN ──────────${textDateiInhalte.join("\n")}\n────────── ENDE TEXT-DATEIEN ──────────`
    : "";

  const fileHint = fileAttachments.length > 0
    ? `\n\nEs wurden ${fileAttachments.length} Datei(en) als Dokument/Bild angehängt (PDFs, Bilder). Analysiere diese visuell – lies den Plankopf, Schriftfeld, Raumbezeichnungen, Maße und alle sichtbaren Informationen.`
    : "";

  const userAnweisung = frage || aufmass.kiAnweisung || "Erstelle ein allgemeines Aufmaß basierend auf den hochgeladenen Dateien.";

  const prompt = `Du bist ein Experte für Aufmaße im Handwerk (Heizung, Sanitär, Elektro, Bau).

Folgende Informationen liegen zu diesem Aufmaß vor:

Titel: ${aufmass.titel}
${aufmass.beschreibung ? `Beschreibung: ${aufmass.beschreibung}` : ""}${projektInfo}
${fileHint}${textDateienBlock}
${positionenInfo}

────────── AUFGABE ──────────
${userAnweisung}

WICHTIG: Analysiere ALLE angehängten Dokumente und Dateien sorgfältig. Bei PDFs/Bauplänen: Lies den Plankopf/Schriftfeld (Bauherr, Architekt, Projektnummer), Raumbezeichnungen, Maße und alle sichtbaren Details. Zitiere relevante Informationen.

Wenn es um ein Aufmaß geht, erstelle eine detaillierte Aufstellung mit:
- Berechnungen (z.B. Wärmepumpen-Leistung, Rohrlängen, Fußbodenheizung)
- Materialaufstellung mit Mengen und Einheiten
- Raum-Zuordnungen wo sinnvoll
- Hinweise zu DIN-Normen und Vorschriften

Formatiere das Ergebnis übersichtlich.`;

  try {
    const customPrompt = await getSystemPromptForFunction("aufmass");
    const baseSystemPrompt = "Du bist ein erfahrener Handwerksmeister und Sachverständiger. Antworte auf Deutsch. Du analysierst Baupläne, Leistungsverzeichnisse und GAEB-Dateien. Wenn dir PDFs oder Bilder als Anhang bereitgestellt werden, analysiere diese visuell und gründlich.";

    const result = await chatWithAi([
      { role: "system", content: customPrompt ? `${baseSystemPrompt}\n\nZusätzliche Anweisungen:\n${customPrompt}` : baseSystemPrompt },
      { role: "user", content: prompt, files: fileAttachments },
    ], undefined, "aufmass");

    const updated = await prisma.aufmass.update({
      where: { id: aufmassId },
      data: {
        kiErgebnis: result.content,
        status: "IN_BEARBEITUNG",
      },
      include: { dateien: true, positionen: { orderBy: { position: "asc" } }, project: { select: { id: true, name: true, projectNumber: true } } },
    });

    return NextResponse.json({ ...updated, usedModel: result.model, usedProvider: result.provider });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
