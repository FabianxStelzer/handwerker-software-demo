import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: { project: true },
  });
  if (!expense) return NextResponse.json({ error: "Ausgabe nicht gefunden" }, { status: 404 });
  return NextResponse.json(expense);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const amount = parseFloat(body.amount ?? 0) || 0;
  const taxRate = parseFloat(body.taxRate ?? 19) || 19;
  const taxAmount = amount * (taxRate / 100);
  const grossAmount = amount + taxAmount;

  const expense = await prisma.expense.update({
    where: { id },
    data: {
      date: body.date ? new Date(body.date) : undefined,
      category: body.category,
      description: body.description,
      amount,
      taxRate,
      taxAmount,
      grossAmount,
      vendor: body.vendor,
      receiptUrl: body.receiptUrl,
      projectId: body.projectId || null,
    },
    include: { project: true },
  });
  return NextResponse.json(expense);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.expense.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
