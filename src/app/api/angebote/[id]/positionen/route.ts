import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const quotation = await prisma.quotation.findUnique({ where: { id }, include: { items: true } });
  if (!quotation) return NextResponse.json({ error: "Angebot nicht gefunden" }, { status: 404 });

  const position = (quotation.items?.length ?? 0) + 1;
  const quantity = body.quantity ?? 1;
  const pricePerUnit = body.pricePerUnit ?? 0;
  const total = quantity * pricePerUnit;

  const item = await prisma.quotationItem.create({
    data: {
      quotationId: id,
      catalogMaterialId: body.catalogMaterialId || null,
      catalogServiceId: body.catalogServiceId || null,
      description: body.description || "Position",
      unit: body.unit || "STUECK",
      quantity,
      pricePerUnit,
      total,
      position,
    },
  });

  const netTotal = (quotation.netTotal ?? 0) + total;
  const taxRate = quotation.taxRate ?? 19;
  const taxAmount = netTotal * (taxRate / 100);
  const grossTotal = netTotal + taxAmount;

  await prisma.quotation.update({
    where: { id },
    data: { netTotal, taxAmount, grossTotal },
  });

  return NextResponse.json(item, { status: 201 });
}
