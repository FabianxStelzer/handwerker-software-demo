import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = await prisma.catalogService.findUnique({
    where: { id },
    include: {
      orderItems: { include: { order: { select: { id: true, orderNumber: true } } }, take: 10, orderBy: { createdAt: "desc" } },
      quotationItems: { include: { quotation: { select: { id: true, quotationNumber: true } } }, take: 10, orderBy: { createdAt: "desc" } },
    },
  });
  if (!service) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  return NextResponse.json(service);
}

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
      artikelNr: body.artikelNr || null,
      taxRate: body.taxRate !== undefined ? parseFloat(body.taxRate) : 19,
      duration: body.duration ? parseFloat(body.duration) : null,
      invoiceText: body.invoiceText || null,
      notes: body.notes || null,
      isActive: body.isActive !== undefined ? body.isActive : true,
    },
  });
  return NextResponse.json(service);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.catalogService.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
