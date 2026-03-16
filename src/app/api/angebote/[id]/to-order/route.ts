import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/numbering";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: { items: { orderBy: { position: "asc" } }, order: true },
  });
  if (!quotation) return NextResponse.json({ error: "Angebot nicht gefunden" }, { status: 404 });
  if (quotation.order) return NextResponse.json({ error: "Angebot wurde bereits in Auftrag umgewandelt" }, { status: 400 });

  const orderNumber = await generateOrderNumber();

  const order = await prisma.$transaction(async (tx) => {
    const ord = await tx.order.create({
      data: {
        orderNumber,
        quotationId: id,
        customerId: quotation.customerId,
        projectId: quotation.projectId,
        status: "BESTAETIGT",
        notes: quotation.notes,
        netTotal: quotation.netTotal,
        taxRate: quotation.taxRate,
        taxAmount: quotation.taxAmount,
        grossTotal: quotation.grossTotal,
        items: {
          create: quotation.items.map((it) => ({
            catalogMaterialId: it.catalogMaterialId,
            catalogServiceId: it.catalogServiceId,
            description: it.description,
            unit: it.unit,
            quantity: it.quantity,
            pricePerUnit: it.pricePerUnit,
            total: it.total,
            position: it.position,
          })),
        },
      },
      include: { customer: true, project: true, items: true },
    });

    await tx.quotation.update({
      where: { id },
      data: { status: "ANGENOMMEN" },
    });

    return ord;
  });

  return NextResponse.json(order, { status: 201 });
}
