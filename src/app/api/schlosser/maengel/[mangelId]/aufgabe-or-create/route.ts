import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ mangelId: string }> }
) {
  const token = await getToken({
    req: _req,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  });
  if (!token?.sub) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { mangelId } = await params;

  const mangel = await prisma.schlosserMangel.findUnique({
    where: { id: mangelId },
    include: {
      pruefung: {
        include: {
          element: {
            include: {
              objekt: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  if (!mangel) {
    return NextResponse.json({ error: "Mangel nicht gefunden" }, { status: 404 });
  }

  let aufgabe = await prisma.schlosserAufgabe.findFirst({
    where: { mangelId },
  });

  if (!aufgabe) {
    const element = mangel.pruefung.element;
    const objektId = element.objekt.id;

    aufgabe = await prisma.schlosserAufgabe.create({
      data: {
        objektId,
        elementId: element.id,
        mangelId,
        typ: "REPARATUR",
        titel: `Mangel beheben: ${mangel.beschreibung.substring(0, 80)}${mangel.beschreibung.length > 80 ? "…" : ""}`,
        beschreibung: `Mangel an ${element.bezeichnung} (${element.objekt.name}):\n${mangel.beschreibung}${mangel.notizen ? "\n\nNotizen: " + mangel.notizen : ""}`,
        prioritaet: mangel.schwere === "KRITISCH" ? "DRINGEND" : mangel.schwere === "SCHWER" ? "HOCH" : "NORMAL",
        erstelltVon: token.sub,
      },
    });
  }

  return NextResponse.json({ aufgabeId: aufgabe.id });
}
