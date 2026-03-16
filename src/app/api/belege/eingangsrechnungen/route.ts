import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const list = await prisma.incomingInvoice.findMany({
    orderBy: { date: "desc" },
    include: { vendor: true },
  });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { vendorId, referenceNo, date, dueDate, grossAmount, notes } = body;
  if (!vendorId || !referenceNo || !date) {
    return NextResponse.json(
      { error: "Lieferant, Rechnungsnummer und Datum erforderlich" },
      { status: 400 }
    );
  }
  const inv = await prisma.incomingInvoice.create({
    data: {
      vendorId,
      referenceNo: String(referenceNo).trim(),
      date: new Date(date),
      dueDate: dueDate ? new Date(dueDate) : null,
      grossAmount: parseFloat(grossAmount) || 0,
      notes: notes?.trim() || null,
    },
    include: { vendor: true },
  });
  return NextResponse.json(inv, { status: 201 });
}
