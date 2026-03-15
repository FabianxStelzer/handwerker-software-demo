import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const materials = await prisma.catalogMaterial.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(materials);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const material = await prisma.catalogMaterial.create({
    data: {
      name: body.name,
      description: body.description || null,
      unit: body.unit || "STUECK",
      pricePerUnit: parseFloat(body.pricePerUnit) || 0,
      weight: body.weight ? parseFloat(body.weight) : null,
      format: body.format || null,
      thermalValue: body.thermalValue ? parseFloat(body.thermalValue) : null,
      minSlope: body.minSlope ? parseFloat(body.minSlope) : null,
      category: body.category || null,
    },
  });
  return NextResponse.json(material, { status: 201 });
}
