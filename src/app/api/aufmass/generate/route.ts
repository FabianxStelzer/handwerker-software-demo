import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatWithAi } from "@/lib/ai";
import { extractFileFromUrl } from "@/lib/file-extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { aufmassId, frage } = await req.json();

  const aufmass = await prisma.aufmass.findUnique({
    where: { id: aufmassId },
    include: { positionen: true, dateien: true, project: true },
  });

  if (!aufmass) return NextResponse.json({ error: "Aufmaß nicht gefunden" }, { status: 404 });

  // Alle Dateien lesen und Inhalt extrahieren
  const dateiInhalte: string[] = [];
  for (const datei of aufmass.dateien) {
    const content = await extractFileFromUrl(datei.dateiUrl, datei.dateiName);
    dateiInhalte.push(`\n═══ Datei: ${datei.dateiName} (${datei.dateiTyp.toUpperCase()}) ═══\n${content}`);
  }

  const positionenInfo = aufmass.positionen.length > 0
    ? `\n\nBereits vorhandene Positionen (${aufmass.positionen.length} Stück):\n${aufmass.positionen.map((p, i) => `${i + 1}. ${p.bezeichnung} – ${p.menge} ${p.einheit}${p.kategorie ? ` (Kategorie: ${p.kategorie})` : ""}${p.raum ? ` [Raum: ${p.raum}]` : ""}`).join("\n")}`
    : "";

  const projektInfo = aufmass.project
    ? `\nProjekt: ${aufmass.project.name}`
    : "";

  const dateienInfo = dateiInhalte.length > 0
    ? `\n\n────────── HOCHGELADENE DATEIEN (${dateiInhalte.length} Stück) ──────────${dateiInhalte.join("\n")}\n────────── ENDE DER DATEIEN ──────────`
    : "\n\n(Keine Dateien hochgeladen)";

  const userAnweisung = frage || aufmass.kiAnweisung || "Erstelle ein allgemeines Aufmaß basierend auf den hochgeladenen Dateien.";

  const prompt = `Du bist ein Experte für Aufmaße im Handwerk (Heizung, Sanitär, Elektro, Bau).

Folgende Informationen liegen zu diesem Aufmaß vor:

Titel: ${aufmass.titel}
${aufmass.beschreibung ? `Beschreibung: ${aufmass.beschreibung}` : ""}${projektInfo}
${dateienInfo}
${positionenInfo}

────────── AUFGABE ──────────
${userAnweisung}

WICHTIG: Durchsuche ALLE oben genannten Dateien sorgfältig, um die Aufgabe zu beantworten. Wenn nach konkreten Informationen gefragt wird (z.B. Anzahl Garagen, Raumgrößen, Materialmengen), suche die Antwort in den Dateiinhalten. Zitiere relevante Stellen aus den Dateien.

Wenn es um ein Aufmaß geht, erstelle eine detaillierte Aufstellung mit:
- Berechnungen (z.B. Wärmepumpen-Leistung, Rohrlängen, Fußbodenheizung)
- Materialaufstellung mit Mengen und Einheiten
- Raum-Zuordnungen wo sinnvoll
- Hinweise zu DIN-Normen und Vorschriften

Formatiere das Ergebnis übersichtlich.`;

  try {
    const result = await chatWithAi([
      { role: "system", content: "Du bist ein erfahrener Handwerksmeister und Sachverständiger. Antworte auf Deutsch. Du analysierst Baupläne, Leistungsverzeichnisse und GAEB-Dateien. Durchsuche alle bereitgestellten Dateiinhalte gründlich, bevor du antwortest." },
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
