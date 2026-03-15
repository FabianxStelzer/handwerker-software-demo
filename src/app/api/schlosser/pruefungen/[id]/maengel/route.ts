import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const maengel = await prisma.schlosserMangel.findMany({
    where: { pruefungId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(maengel);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await req.json();

  const beschreibung = typeof data.beschreibung === "string" ? data.beschreibung.trim() : "";
  if (!beschreibung) {
    return NextResponse.json({ error: "Beschreibung ist erforderlich" }, { status: 400 });
  }

  const fotoUrls = Array.isArray(data.fotoUrls) ? data.fotoUrls : null;
  const firstFoto = fotoUrls?.[0];
  const mangel = await prisma.schlosserMangel.create({
    data: {
      pruefungId: id,
      beschreibung,
      schwere: data.schwere || "MITTEL",
      fotoUrl: (firstFoto?.url ?? data.fotoUrl) || null,
      fotoName: (firstFoto?.fileName ?? data.fotoName) || null,
      fotoUrls: fotoUrls ?? undefined,
      notizen: data.notizen || null,
    },
  });

  // Prüfergebnis auf MAENGEL setzen wenn noch BESTANDEN
  const pruefung = await prisma.schlosserPruefung.findUnique({ where: { id } });
  if (pruefung && pruefung.ergebnis === "BESTANDEN") {
    await prisma.schlosserPruefung.update({
      where: { id },
      data: { ergebnis: "MAENGEL" },
    });
  }

  return NextResponse.json(mangel, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const data = await req.json();

  const mangel = await prisma.schlosserMangel.update({
    where: { id: data.id },
    data: {
      behoben: data.behoben,
      behobenAm: data.behoben ? new Date() : null,
      behobenVon: data.behoben ? (data.behobenVon ?? null) : null,
      behobenNotiz: data.behoben ? (data.behobenNotiz ?? null) : null,
    },
  });

  // Wenn alle Mängel dieser Prüfung behoben sind → Prüfung auf BESTANDEN setzen
  if (data.behoben) {
    const alleMaengel = await prisma.schlosserMangel.findMany({
      where: { pruefungId: mangel.pruefungId },
    });
    const alleBehoben = alleMaengel.every((m) => m.behoben);
    if (alleBehoben) {
      const pruefung = await prisma.schlosserPruefung.findUnique({
        where: { id: mangel.pruefungId },
        include: { element: { select: { objektId: true } } },
      });
      await prisma.schlosserPruefung.update({
        where: { id: mangel.pruefungId },
        data: { ergebnis: "BESTANDEN" },
      });
      if (pruefung?.element) {
        const { updateObjektStatus } = await import("@/lib/schlosser-status");
        await updateObjektStatus(pruefung.element.objektId);
      }
    }
  }

  return NextResponse.json(mangel);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  });
  if (!token?.role || token.role !== "ADMIN") {
    return NextResponse.json({ error: "Nur Administratoren dürfen Mängel löschen" }, { status: 403 });
  }
  const { id: pruefungId } = await params;
  const body = await request.json().catch(() => ({}));
  const mangelId = body.id;
  if (!mangelId) return NextResponse.json({ error: "id fehlt" }, { status: 400 });
  const mangel = await prisma.schlosserMangel.findUnique({
    where: { id: mangelId, pruefungId },
    include: { pruefung: { include: { element: { select: { objektId: true } } } } },
  });
  if (!mangel) return NextResponse.json({ error: "Mangel nicht gefunden" }, { status: 404 });
  await prisma.schlosserAufgabe.updateMany({ where: { mangelId }, data: { mangelId: null } });
  await prisma.schlosserMangel.delete({ where: { id: mangelId } });
  const { updateObjektStatus } = await import("@/lib/schlosser-status");
  await updateObjektStatus(mangel.pruefung.element.objektId);
  return NextResponse.json({ ok: true });
}
