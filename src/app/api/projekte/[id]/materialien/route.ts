import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const material = await prisma.projectMaterial.create({
    data: {
      projectId: id,
      catalogMaterialId: body.catalogMaterialId || null,
      name: body.name,
      unit: body.unit || "STUECK",
      quantityPlanned: body.quantityPlanned || 0,
      quantityUsed: body.quantityUsed || 0,
      pricePerUnit: body.pricePerUnit || 0,
      notes: body.notes || null,
    },
    include: { catalogMaterial: true },
  });

  return NextResponse.json(material, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();

  const material = await prisma.projectMaterial.update({
    where: { id: body.id },
    data: {
      quantityPlanned: body.quantityPlanned,
      quantityUsed: body.quantityUsed,
      pricePerUnit: body.pricePerUnit,
      notes: body.notes,
    },
    include: { catalogMaterial: true },
  });

  return NextResponse.json(material);
}
