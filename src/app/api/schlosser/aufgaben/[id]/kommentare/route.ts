import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const kommentare = await prisma.schlosserAufgabeKommentar.findMany({
    where: { aufgabeId: id },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(kommentare);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await req.json();

  const kommentar = await prisma.schlosserAufgabeKommentar.create({
    data: {
      aufgabeId: id,
      userId: data.userId,
      text: data.text,
      fotoUrl: data.fotoUrl || null,
      fotoName: data.fotoName || null,
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
    },
  });

  return NextResponse.json(kommentar, { status: 201 });
}
