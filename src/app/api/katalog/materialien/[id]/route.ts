import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const material = await prisma.catalogMaterial.findUnique({
    where: { id },
    include: {
      projectMaterials: { include: { project: { select: { id: true, name: true, projectNumber: true } } }, take: 10, orderBy: { createdAt: "desc" } },
      orderItems: { include: { order: { select: { id: true, orderNumber: true } } }, take: 10, orderBy: { createdAt: "desc" } },
      quotationItems: { include: { quotation: { select: { id: true, quotationNumber: true } } }, take: 10, orderBy: { createdAt: "desc" } },
    },
  });
  if (!material) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  return NextResponse.json(material);
}

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
      artikelNr: body.artikelNr || null,
      ean: body.ean || null,
      taxRate: body.taxRate !== undefined ? parseFloat(body.taxRate) : 19,
      purchasePrice: body.purchasePrice ? parseFloat(body.purchasePrice) : null,
      margin: body.margin ? parseFloat(body.margin) : null,
      minStock: body.minStock ? parseFloat(body.minStock) : null,
      currentStock: body.currentStock ? parseFloat(body.currentStock) : null,
      invoiceText: body.invoiceText || null,
      notes: body.notes || null,
      isActive: body.isActive !== undefined ? body.isActive : true,
    },
  });
  return NextResponse.json(material);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.catalogMaterial.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
