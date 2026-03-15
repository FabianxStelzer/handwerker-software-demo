import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateObjektStatus } from "@/lib/schlosser-status";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const pruefungen = await prisma.schlosserPruefung.findMany({
      where: { elementId: id },
      include: { maengel: true },
      orderBy: { datum: "desc" },
    });

    const mangelIds = pruefungen.flatMap((p) => p.maengel.map((m) => m.id));
    const aufgaben = await prisma.schlosserAufgabe.findMany({
      where: { mangelId: { in: mangelIds } },
      select: { mangelId: true, id: true },
    });
    const aufgabeByMangel = new Map(aufgaben.map((a) => [a.mangelId, a.id]));

    const result = pruefungen.map((p) => ({
      ...p,
      maengel: p.maengel.map((m) => ({
        ...m,
        aufgabeId: aufgabeByMangel.get(m.id) ?? null,
      })),
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("Pruefungen GET Fehler:", err);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await req.json();

    const pruefung = await prisma.schlosserPruefung.create({
      data: {
        elementId: id,
        datum: data.datum ? new Date(data.datum) : new Date(),
        pruefer: data.pruefer || null,
        ergebnis: data.ergebnis || "BESTANDEN",
        notizen: data.notizen || null,
        naechstePruefung: data.naechstePruefung ? new Date(data.naechstePruefung) : null,
      },
      include: { maengel: true },
    });

    const element = await prisma.schlosserElement.findUnique({
      where: { id },
      select: { objektId: true },
    });

    if (element) {
      await updateObjektStatus(element.objektId);
    }

    return NextResponse.json(pruefung, { status: 201 });
  } catch (err) {
    console.error("Pruefungen POST Fehler:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fehler beim Speichern" },
      { status: 500 }
    );
  }
}
