import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const service = await prisma.catalogService.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description || null,
      unit: body.unit,
      pricePerUnit: parseFloat(body.pricePerUnit) || 0,
      category: body.category || null,
    },
  });
  return NextResponse.json(service);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.catalogService.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
