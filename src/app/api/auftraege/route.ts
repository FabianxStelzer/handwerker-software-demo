import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/numbering";
import { getCustomerDisplayName } from "@/lib/utils";

export async function GET() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customer: true,
      project: true,
      invoice: true,
      _count: { select: { items: true } },
    },
  });

  return NextResponse.json(
    orders.map((o) => ({
      ...o,
      customerName: getCustomerDisplayName(o.customer),
    }))
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const orderNumber = await generateOrderNumber();

  const order = await prisma.order.create({
    data: {
      orderNumber,
      customerId: body.customerId,
      projectId: body.projectId || null,
      status: "ENTWURF",
      notes: body.notes || null,
    },
    include: { customer: true, project: true },
  });

  return NextResponse.json(order, { status: 201 });
}
