import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const element = await prisma.schlosserElement.findUnique({
    where: { id },
    include: {
      pruefungen: {
        orderBy: { datum: "desc" },
        include: { maengel: true },
      },
      bilder: { orderBy: { createdAt: "desc" } },
      objekt: { select: { id: true, name: true } },
    },
  });
  if (!element) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  return NextResponse.json(element);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await req.json();

  const element = await prisma.schlosserElement.update({
    where: { id },
    data: {
      typ: data.typ,
      bezeichnung: data.bezeichnung,
      standort: data.standort || null,
      hersteller: data.hersteller || null,
      baujahr: data.baujahr ? parseInt(data.baujahr) : null,
      seriennummer: data.seriennummer || null,
      notizen: data.notizen || null,
    },
  });

  return NextResponse.json(element);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.schlosserElement.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
