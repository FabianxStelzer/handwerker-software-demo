import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const ELEMENT_TYPEN = [
  "TUER", "FENSTER", "TOR", "GELAENDER", "ZAUN",
  "SCHLOSS", "FLUCHTWEG", "BRANDSCHUTZTUER", "SONSTIGES",
] as const;

type ConfigRow = { id: string; elementTyp: string; intervallMonate: number; vorlaufTage: number; pflicht: boolean; bezeichnung: string | null };

export async function GET() {
  try {
    const delegate = prisma.schlosserPruefConfig;
    let configs: ConfigRow[];

    if (delegate?.findMany) {
      configs = await delegate.findMany({ orderBy: { elementTyp: "asc" } });
    } else {
      configs = await prisma.$queryRaw<ConfigRow[]>`
        SELECT id, "elementTyp", "intervallMonate", "vorlaufTage", pflicht, bezeichnung
        FROM schlosser_pruef_config
        ORDER BY "elementTyp" ASC
      `;
    }

    const vorhanden = new Set(configs.map((c) => c.elementTyp));
    for (const typ of ELEMENT_TYPEN) {
      if (!vorhanden.has(typ)) {
        if (delegate?.create) {
          const neu = await delegate.create({
            data: { elementTyp: typ, intervallMonate: 12, vorlaufTage: 30, pflicht: true },
          });
          configs = [...configs, neu].sort((a, b) => a.elementTyp.localeCompare(b.elementTyp));
        } else {
          const id = randomUUID();
          await prisma.$executeRaw`
            INSERT INTO schlosser_pruef_config (id, "elementTyp", "intervallMonate", "vorlaufTage", pflicht, "createdAt", "updatedAt")
            VALUES (${id}, (${typ})::"ElementTyp", 12, 30, true, NOW(), NOW())
          `;
          const [row] = await prisma.$queryRaw<ConfigRow[]>`
            SELECT id, "elementTyp", "intervallMonate", "vorlaufTage", pflicht, bezeichnung
            FROM schlosser_pruef_config WHERE id = ${id}
          `;
          if (row) configs = [...configs, row].sort((a, b) => a.elementTyp.localeCompare(b.elementTyp));
        }
      }
    }

    return NextResponse.json(configs);
  } catch (err) {
    console.error("Pruef-Config GET Fehler:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Fehler" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();
    const { id, intervallMonate, vorlaufTage, pflicht, bezeichnung } = data;

    if (!id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });

    const delegate = prisma.schlosserPruefConfig;
    let config: ConfigRow;

    if (delegate?.update) {
      config = await delegate.update({
        where: { id },
        data: {
          intervallMonate: intervallMonate ?? undefined,
          vorlaufTage: vorlaufTage ?? undefined,
          pflicht: pflicht ?? undefined,
          bezeichnung: bezeichnung ?? undefined,
        },
      });
    } else {
      const im = intervallMonate ?? 12;
      const vt = vorlaufTage ?? 30;
      const pf = pflicht ?? true;
      const bez = bezeichnung ?? null;
      await prisma.$executeRaw`
        UPDATE schlosser_pruef_config
        SET "intervallMonate" = ${im}, "vorlaufTage" = ${vt}, pflicht = ${pf}, bezeichnung = ${bez}, "updatedAt" = NOW()
        WHERE id = ${id}
      `;
      const [row] = await prisma.$queryRaw<ConfigRow[]>`
        SELECT id, "elementTyp", "intervallMonate", "vorlaufTage", pflicht, bezeichnung
        FROM schlosser_pruef_config WHERE id = ${id}
      `;
      if (!row) throw new Error("Config nicht gefunden");
      config = row;
    }

    return NextResponse.json(config);
  } catch (err) {
    console.error("Pruef-Config PUT Fehler:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Fehler" }, { status: 500 });
  }
}
