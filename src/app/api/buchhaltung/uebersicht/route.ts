import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year") || new Date().getFullYear().toString();

  const y = parseInt(year);
  const start = new Date(y, 0, 1);
  const end = new Date(y, 11, 31, 23, 59, 59);

  const [invoicesAll, expensesAll, quotationsAll, incomingInvoicesAll, bankTxUnassigned] =
    await Promise.all([
      prisma.invoice.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: { grossTotal: true, netTotal: true, taxAmount: true, status: true, createdAt: true, paidDate: true },
      }),
      prisma.expense.findMany({
        where: { date: { gte: start, lte: end } },
        select: { grossAmount: true, amount: true, taxAmount: true, date: true },
      }),
      prisma.quotation.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: { grossTotal: true, status: true, validUntil: true },
      }),
      prisma.incomingInvoice.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: { grossAmount: true, status: true },
      }).catch(() => []),
      prisma.bankTransaction.count({
        where: { invoiceId: null, expenseId: null },
      }).catch(() => 0),
    ]);

  // Totals
  const umsatzBezahlt = invoicesAll
    .filter((i) => i.status === "BEZAHLT")
    .reduce((s, i) => s + i.grossTotal, 0);
  const umsatzOffen = invoicesAll
    .filter((i) => i.status === "VERSENDET" || i.status === "UEBERFAELLIG")
    .reduce((s, i) => s + i.grossTotal, 0);
  const ausgaben = expensesAll.reduce((s, i) => s + i.grossAmount, 0);
  const mwstEinnahmen = invoicesAll
    .filter((i) => i.status === "BEZAHLT")
    .reduce((s, i) => s + i.taxAmount, 0);
  const mwstAusgaben = expensesAll.reduce((s, i) => s + i.taxAmount, 0);

  // Monthly data for chart
  const monthlyData = Array.from({ length: 12 }, (_, m) => ({
    month: m + 1,
    einnahmen: 0,
    einnahmenNetto: 0,
    ausgaben: 0,
    ausgabenNetto: 0,
  }));

  for (const inv of invoicesAll) {
    if (inv.status !== "BEZAHLT") continue;
    const d = inv.paidDate || inv.createdAt;
    const m = new Date(d).getMonth();
    monthlyData[m].einnahmen += inv.grossTotal;
    monthlyData[m].einnahmenNetto += inv.netTotal;
  }
  for (const exp of expensesAll) {
    const m = new Date(exp.date).getMonth();
    monthlyData[m].ausgaben += exp.grossAmount;
    monthlyData[m].ausgabenNetto += exp.amount;
  }

  // Task counters
  const now = new Date();
  const offeneRechnungen = invoicesAll.filter((i) => i.status === "VERSENDET" || i.status === "ENTWURF").length;
  const offeneRechnungenSumme = invoicesAll
    .filter((i) => i.status === "VERSENDET" || i.status === "ENTWURF")
    .reduce((s, i) => s + i.grossTotal, 0);
  const ueberfaelligeRechnungen = invoicesAll.filter((i) => i.status === "UEBERFAELLIG").length;
  const offeneAngebote = quotationsAll.filter((q) => q.status === "ENTWURF" || q.status === "VERSENDET").length;
  const offeneAngeboteSumme = quotationsAll
    .filter((q) => q.status === "ENTWURF" || q.status === "VERSENDET")
    .reduce((s, q) => s + q.grossTotal, 0);
  const ueberfaelligeAngebote = quotationsAll.filter(
    (q) => (q.status === "VERSENDET") && q.validUntil && new Date(q.validUntil) < now
  ).length;
  const offeneAusgaben = expensesAll.length;
  const offeneEingangsrechnungen = (incomingInvoicesAll as any[]).filter((i: any) => i.status === "OFFEN").length;

  // USt calculation (simplified)
  const ueberschuss = mwstEinnahmen - mwstAusgaben;
  const currentQuarter = Math.floor(now.getMonth() / 3);
  const nextMeldung = `Q${currentQuarter + 1} ${y}`;

  return NextResponse.json({
    year: y,
    umsatzBezahlt,
    umsatzOffen,
    ausgaben,
    gewinn: umsatzBezahlt - ausgaben,
    mwstEinnahmen,
    mwstAusgaben,
    monthlyData,
    aufgaben: {
      offeneRechnungen,
      offeneRechnungenSumme,
      ueberfaelligeRechnungen,
      offeneAngebote,
      offeneAngeboteSumme,
      ueberfaelligeAngebote,
      offeneAusgaben,
      offeneEingangsrechnungen,
      bankTxUnassigned,
    },
    umsatzsteuer: {
      naechsteMeldung: nextMeldung,
      ueberschuss,
    },
  });
}
