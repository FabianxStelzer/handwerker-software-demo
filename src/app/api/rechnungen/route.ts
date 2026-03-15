import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInvoiceNumber } from "@/lib/numbering";
import { getCustomerDisplayName } from "@/lib/utils";

export async function GET() {
  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      order: { include: { customer: true, project: true } },
      items: { orderBy: { position: "asc" } },
    },
  });

  return NextResponse.json(
    invoices.map((inv) => ({
      ...inv,
      customerName: getCustomerDisplayName(inv.order.customer),
    }))
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const invoiceNumber = await generateInvoiceNumber();

  const order = await prisma.order.findUnique({
    where: { id: body.orderId },
    include: { items: true },
  });

  if (!order) return NextResponse.json({ error: "Auftrag nicht gefunden" }, { status: 404 });

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      orderId: order.id,
      netTotal: order.netTotal,
      taxRate: order.taxRate,
      taxAmount: order.taxAmount,
      grossTotal: order.grossTotal,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      items: {
        create: order.items.map((item) => ({
          description: item.description,
          unit: item.unit,
          quantity: item.quantity,
          pricePerUnit: item.pricePerUnit,
          total: item.total,
          position: item.position,
        })),
      },
    },
    include: { order: { include: { customer: true } }, items: true },
  });

  return NextResponse.json(invoice, { status: 201 });
}
