import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const texte = await prisma.schlosserPruefungText.findMany({
    where: { pruefungId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(texte);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { text } = await req.json();

  const eintrag = await prisma.schlosserPruefungText.create({
    data: { pruefungId: id, text },
  });

  return NextResponse.json(eintrag, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!role || role !== "ADMIN") {
    return NextResponse.json({ error: "Nur Administratoren dürfen Texteinträge löschen" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const eintragId = body.id;
  if (!eintragId) return NextResponse.json({ error: "id fehlt" }, { status: 400 });
  await prisma.schlosserPruefungText.delete({ where: { id: eintragId } });
  return NextResponse.json({ ok: true });
}
