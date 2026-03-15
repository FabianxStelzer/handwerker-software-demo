import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bilder = await prisma.schlosserObjektBild.findMany({
    where: { objektId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(bilder);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await req.json();

  const bild = await prisma.schlosserObjektBild.create({
    data: {
      objektId: id,
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      beschreibung: data.beschreibung || null,
    },
  });

  return NextResponse.json(bild, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { bildId } = await req.json();
  await prisma.schlosserObjektBild.delete({ where: { id: bildId } });
  return NextResponse.json({ ok: true });
}
