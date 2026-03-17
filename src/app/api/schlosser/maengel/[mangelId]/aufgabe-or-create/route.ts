import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ mangelId: string }> }
) {
  try {
    const { mangelId } = await params;

    let userId: string | null = null;

    const session = await auth();
    if (session?.user?.id) {
      userId = session.user.id;
    } else {
      const fallbackUser = await prisma.user.findFirst({
        where: { isActive: true },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      });
      userId = fallbackUser?.id ?? null;
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Kein aktiver Benutzer gefunden" },
        { status: 400 }
      );
    }

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
          erstelltVon: userId,
        },
      });
    }

    return NextResponse.json({ aufgabeId: aufgabe.id });
  } catch (err) {
    console.error("aufgabe-or-create error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unbekannter Fehler" },
      { status: 500 }
    );
  }
}
