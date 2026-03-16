import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year") || new Date().getFullYear().toString();

  const y = parseInt(year);
  const start = new Date(y, 0, 1);
  const end = new Date(y, 11, 31, 23, 59, 59);

  const [invoices, expenses] = await Promise.all([
    prisma.invoice.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { grossTotal: true, status: true },
    }),
    prisma.expense.findMany({
      where: { date: { gte: start, lte: end } },
      select: { grossAmount: true, amount: true, taxAmount: true },
    }),
  ]);

  const umsatzBezahlt = invoices
    .filter((i) => i.status === "BEZAHLT")
    .reduce((s, i) => s + i.grossTotal, 0);
  const umsatzOffen = invoices
    .filter((i) => i.status === "VERSENDET" || i.status === "UEBERFAELLIG")
    .reduce((s, i) => s + i.grossTotal, 0);
  const ausgaben = expenses.reduce((s, i) => s + i.grossAmount, 0);
  const mwstAusgaben = expenses.reduce((s, i) => s + i.taxAmount, 0);

  return NextResponse.json({
    year: y,
    umsatzBezahlt,
    umsatzOffen,
    ausgaben,
    gewinn: umsatzBezahlt - ausgaben,
    mwstAusgaben,
  });
}
