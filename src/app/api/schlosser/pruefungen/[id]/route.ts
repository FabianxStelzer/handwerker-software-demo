import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({
    req: _req,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  });
  if (!token?.role || token.role !== "ADMIN") {
    return NextResponse.json({ error: "Nur Administratoren dürfen Prüfungen löschen" }, { status: 403 });
  }

  const { id } = await params;
  const pruefung = await prisma.schlosserPruefung.findUnique({
    where: { id },
    select: { elementId: true, element: { select: { objektId: true } } },
  });
  if (!pruefung) {
    return NextResponse.json({ error: "Prüfung nicht gefunden" }, { status: 404 });
  }

  await prisma.schlosserPruefung.delete({ where: { id } });

  const { updateObjektStatus } = await import("@/lib/schlosser-status");
  await updateObjektStatus(pruefung.element.objektId);

  return NextResponse.json({ ok: true });
}
