import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const itemCount = await prisma.orderItem.count({ where: { orderId: id } });

  const total = (parseFloat(body.quantity) || 1) * (parseFloat(body.pricePerUnit) || 0);

  const item = await prisma.orderItem.create({
    data: {
      orderId: id,
      catalogMaterialId: body.catalogMaterialId || null,
      catalogServiceId: body.catalogServiceId || null,
      description: body.description,
      unit: body.unit || "STUECK",
      quantity: parseFloat(body.quantity) || 1,
      pricePerUnit: parseFloat(body.pricePerUnit) || 0,
      total,
      position: itemCount + 1,
    },
  });

  await recalculateOrder(id);
  return NextResponse.json(item, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  await prisma.orderItem.delete({ where: { id: body.itemId } });
  await recalculateOrder(id);

  return NextResponse.json({ success: true });
}

async function recalculateOrder(orderId: string) {
  const items = await prisma.orderItem.findMany({ where: { orderId } });
  const netTotal = items.reduce((sum, item) => sum + item.quantity * item.pricePerUnit, 0);
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  const taxRate = order?.taxRate || 19;
  const taxAmount = netTotal * (taxRate / 100);
  const grossTotal = netTotal + taxAmount;

  await prisma.order.update({
    where: { id: orderId },
    data: { netTotal, taxAmount, grossTotal },
  });
}
