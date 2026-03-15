import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      project: true,
      items: { orderBy: { position: "asc" } },
      invoice: true,
    },
  });

  if (!order) return NextResponse.json({ error: "Auftrag nicht gefunden" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const order = await prisma.order.update({
    where: { id },
    data: {
      status: body.status,
      notes: body.notes,
      netTotal: body.netTotal,
      taxRate: body.taxRate,
      taxAmount: body.taxAmount,
      grossTotal: body.grossTotal,
    },
    include: { customer: true, items: { orderBy: { position: "asc" } } },
  });

  return NextResponse.json(order);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.order.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
