import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const aufgabe = await prisma.schlosserAufgabe.findUnique({
    where: { id },
    include: {
      objekt: { include: { customer: true } },
      zugewiesen: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      ersteller: { select: { id: true, firstName: true, lastName: true } },
      kommentare: {
        include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!aufgabe) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  let pruefer: string | null = null;
  let mangelPruefungId: string | null = null;
  let mangel: { beschreibung: string; schwere: string; fotoUrl: string | null; fotoUrls: unknown } | null = null;
  if (aufgabe.mangelId) {
    const m = await prisma.schlosserMangel.findUnique({
      where: { id: aufgabe.mangelId },
      include: { pruefung: { select: { pruefer: true, id: true } } },
    });
    pruefer = m?.pruefung?.pruefer ?? null;
    mangelPruefungId = m?.pruefung?.id ?? null;
    if (m) {
      mangel = { beschreibung: m.beschreibung, schwere: m.schwere, fotoUrl: m.fotoUrl, fotoUrls: m.fotoUrls };
    }
  }

  return NextResponse.json({ ...aufgabe, pruefer, mangelPruefungId, mangel });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await req.json();

  const updateData: Record<string, unknown> = {};
  if (data.status !== undefined) updateData.status = data.status;
  if (data.prioritaet !== undefined) updateData.prioritaet = data.prioritaet;
  if (data.zugewiesenAn !== undefined) updateData.zugewiesenAn = data.zugewiesenAn || null;
  if (data.titel !== undefined) updateData.titel = data.titel;
  if (data.beschreibung !== undefined) updateData.beschreibung = data.beschreibung;
  if (data.faelligAm !== undefined) updateData.faelligAm = data.faelligAm ? new Date(data.faelligAm) : null;
  if (data.typ !== undefined) updateData.typ = data.typ;

  let objektIdForStatus: string | null = null;
  if (data.status === "ERLEDIGT" || data.status === "ABGENOMMEN") {
    updateData.erledigtAm = new Date();
    // Mangel als behoben markieren, wenn Aufgabe mit Mangel verknüpft ist
    try {
      const aufgabeVorher = await prisma.schlosserAufgabe.findUnique({
        where: { id },
        select: { mangelId: true, objektId: true },
      });
      if (aufgabeVorher?.mangelId) {
        objektIdForStatus = aufgabeVorher.objektId;
        const mangel = await prisma.schlosserMangel.update({
          where: { id: aufgabeVorher.mangelId },
          data: {
            behoben: true,
            behobenAm: new Date(),
            behobenVon: null,
            behobenNotiz: null,
          },
        });
        const alleMaengel = await prisma.schlosserMangel.findMany({
          where: { pruefungId: mangel.pruefungId },
        });
        if (alleMaengel.every((m) => m.behoben)) {
          await prisma.schlosserPruefung.update({
            where: { id: mangel.pruefungId },
            data: { ergebnis: "BESTANDEN" },
          });
        }
      }
    } catch (err) {
      console.error("Mangel/Objekt-Status bei Aufgabe ERLEDIGT:", err);
    }
  }

  const aufgabe = await prisma.schlosserAufgabe.update({
    where: { id },
    data: updateData,
    include: {
      objekt: { include: { customer: true } },
      zugewiesen: { select: { id: true, firstName: true, lastName: true } },
      ersteller: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  // Objekt-Status nach Aufgabe-Update aktualisieren (ERLEDIGT vs ABGENOMMEN)
  if (objektIdForStatus) {
    try {
      const { updateObjektStatus } = await import("@/lib/schlosser-status");
      await updateObjektStatus(objektIdForStatus);
    } catch (err) {
      console.error("updateObjektStatus nach Aufgabe-Update:", err);
    }
  }

  return NextResponse.json(aufgabe);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.schlosserAufgabe.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
