import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const nurOffen = req.nextUrl.searchParams.get("offen") !== "false";
    const schwere = req.nextUrl.searchParams.get("schwere");

    const where: Record<string, unknown> = {};
    if (nurOffen) where.behoben = false;
    if (schwere) where.schwere = schwere;

    const maengel = await prisma.schlosserMangel.findMany({
    where,
    include: {
      pruefung: {
        include: {
          element: {
            include: {
              objekt: {
                include: {
                  customer: {
                    select: { id: true, firstName: true, lastName: true, company: true, type: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ schwere: "desc" }, { createdAt: "desc" }],
  });

  // Prüfen ob bereits eine Aufgabe für diesen Mangel existiert
  const mangelIds = maengel.map((m) => m.id);
  const existingTasks = await prisma.schlosserAufgabe.findMany({
    where: { mangelId: { in: mangelIds } },
    select: { mangelId: true, id: true, status: true, zugewiesen: { select: { id: true, firstName: true, lastName: true } } },
  });
  const taskByMangel = new Map(existingTasks.map((t) => [t.mangelId, t]));

  const result = maengel.map((m) => ({
    id: m.id,
    beschreibung: m.beschreibung,
    schwere: m.schwere,
    fotoUrl: m.fotoUrl,
    fotoName: m.fotoName,
    fotoUrls: m.fotoUrls,
    notizen: m.notizen,
    behoben: m.behoben,
    behobenAm: m.behobenAm,
    createdAt: m.createdAt,
    element: {
      id: m.pruefung.element.id,
      bezeichnung: m.pruefung.element.bezeichnung,
      typ: m.pruefung.element.typ,
      standort: m.pruefung.element.standort,
    },
    objekt: {
      id: m.pruefung.element.objekt.id,
      name: m.pruefung.element.objekt.name,
      street: m.pruefung.element.objekt.street,
      city: m.pruefung.element.objekt.city,
    },
    customer: m.pruefung.element.objekt.customer,
    pruefungDatum: m.pruefung.datum,
    aufgabe: taskByMangel.get(m.id) || null,
  }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("Maengel API Fehler:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fehler beim Laden der Mängel" },
      { status: 500 }
    );
  }
}
