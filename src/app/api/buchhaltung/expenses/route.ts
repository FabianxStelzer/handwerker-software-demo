import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  const where: Record<string, unknown> = {};
  if (year) {
    const start = new Date(parseInt(year), 0, 1);
    const end = new Date(parseInt(year), 11, 31, 23, 59, 59);
    where.date = { gte: start, lte: end };
  }
  if (month && year) {
    const start = new Date(parseInt(year), parseInt(month) - 1, 1);
    const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
    where.date = { gte: start, lte: end };
  }

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: { date: "desc" },
    include: { project: true },
  });
  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const amount = parseFloat(body.amount) || 0;
  const taxRate = parseFloat(body.taxRate) || 19;
  const taxAmount = amount * (taxRate / 100);
  const grossAmount = amount + taxAmount;

  const expense = await prisma.expense.create({
    data: {
      date: new Date(body.date || Date.now()),
      category: body.category || "Sonstiges",
      description: body.description || "",
      amount,
      taxRate,
      taxAmount,
      grossAmount,
      vendor: body.vendor || null,
      receiptUrl: body.receiptUrl || null,
      projectId: body.projectId || null,
    },
    include: { project: true },
  });
  return NextResponse.json(expense, { status: 201 });
}
