import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const material = await prisma.catalogMaterial.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description || null,
      unit: body.unit,
      pricePerUnit: parseFloat(body.pricePerUnit) || 0,
      weight: body.weight ? parseFloat(body.weight) : null,
      format: body.format || null,
      thermalValue: body.thermalValue ? parseFloat(body.thermalValue) : null,
      minSlope: body.minSlope ? parseFloat(body.minSlope) : null,
      category: body.category || null,
    },
  });
  return NextResponse.json(material);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.catalogMaterial.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
