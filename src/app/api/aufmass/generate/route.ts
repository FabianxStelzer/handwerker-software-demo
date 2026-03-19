import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatWithAi } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { aufmassId } = await req.json();

  const aufmass = await prisma.aufmass.findUnique({
    where: { id: aufmassId },
    include: { positionen: true, dateien: true, project: true },
  });

  if (!aufmass) return NextResponse.json({ error: "Aufmaß nicht gefunden" }, { status: 404 });

  const positionenInfo = aufmass.positionen.length > 0
    ? `\n\nBereits vorhandene Positionen:\n${aufmass.positionen.map((p, i) => `${i + 1}. ${p.bezeichnung} – ${p.menge} ${p.einheit}${p.kategorie ? ` (${p.kategorie})` : ""}${p.raum ? ` [${p.raum}]` : ""}`).join("\n")}`
    : "";

  const projektInfo = aufmass.project
    ? `\nProjekt: ${aufmass.project.name}`
    : "";

  const prompt = `Du bist ein Experte für Aufmaße im Handwerk (Heizung, Sanitär, Elektro, Bau).

Erstelle basierend auf folgenden Informationen ein detailliertes Aufmaß:

Titel: ${aufmass.titel}
${aufmass.beschreibung ? `Beschreibung: ${aufmass.beschreibung}` : ""}${projektInfo}

KI-Anweisung: ${aufmass.kiAnweisung || "Erstelle ein allgemeines Aufmaß."}
${positionenInfo}

Erstelle eine detaillierte Aufstellung mit:
- Berechnungen (z.B. Wärmepumpen-Leistung, Rohrlängen, Fußbodenheizung)
- Materialaufstellung mit Mengen und Einheiten
- Raum-Zuordnungen wo sinnvoll
- Hinweise zu DIN-Normen und Vorschriften

Formatiere das Ergebnis übersichtlich.`;

  try {
    const result = await chatWithAi([
      { role: "system", content: "Du bist ein erfahrener Handwerksmeister und Sachverständiger. Antworte auf Deutsch. Erstelle präzise, fachlich korrekte Aufmaße." },
      { role: "user", content: prompt },
    ]);

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
