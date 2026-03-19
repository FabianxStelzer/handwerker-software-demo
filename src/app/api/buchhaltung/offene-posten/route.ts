import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const typ = searchParams.get("typ") || "kunden";

  if (typ === "kunden") {
    const invoices = await prisma.invoice.findMany({
      where: { status: { in: ["VERSENDET", "UEBERFAELLIG", "ENTWURF"] } },
      include: {
        order: {
          include: {
            customer: { select: { id: true, firstName: true, lastName: true, company: true } },
          },
        },
      },
      orderBy: { issueDate: "desc" },
    });

    const grouped: Record<string, { customer: any; invoices: any[]; total: number }> = {};

    for (const inv of invoices) {
      const cust = inv.order?.customer;
      if (!cust) continue;
      const key = cust.id;
      if (!grouped[key]) {
        const displayName = cust.company || `${cust.firstName} ${cust.lastName}`;
        grouped[key] = { customer: { ...cust, displayName }, invoices: [], total: 0 };
      }
      const offen = inv.grossTotal;
      grouped[key].invoices.push({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        grossTotal: inv.grossTotal,
        offen,
        status: inv.status,
        paidDate: inv.paidDate,
      });
      grouped[key].total += offen;
    }

    const list = Object.values(grouped).sort((a, b) => {
      const nameA = a.customer.displayName.toLowerCase();
      const nameB = b.customer.displayName.toLowerCase();
      return nameA.localeCompare(nameB);
    });

    const totalKunden = list.reduce((s, g) => s + g.total, 0);

    return NextResponse.json({ typ: "kunden", gruppen: list, total: totalKunden });
  }

  // Lieferanten
  const incoming = await prisma.incomingInvoice.findMany({
    where: { status: { in: ["OFFEN", "UEBERFAELLIG"] } },
    include: {
      vendor: { select: { id: true, name: true } },
    },
    orderBy: { date: "desc" },
  });

  const grouped: Record<string, { vendor: any; invoices: any[]; total: number }> = {};

  for (const inv of incoming) {
    const key = inv.vendorId;
    if (!grouped[key]) {
      grouped[key] = { vendor: inv.vendor, invoices: [], total: 0 };
    }
    grouped[key].invoices.push({
      id: inv.id,
      referenceNo: inv.referenceNo,
      date: inv.date,
      dueDate: inv.dueDate,
      grossAmount: inv.grossAmount,
      offen: inv.grossAmount,
      status: inv.status,
      paidDate: inv.paidDate,
    });
    grouped[key].total += inv.grossAmount;
  }

  const list = Object.values(grouped).sort((a, b) =>
    a.vendor.name.toLowerCase().localeCompare(b.vendor.name.toLowerCase())
  );

  const totalLieferanten = list.reduce((s, g) => s + g.total, 0);

  return NextResponse.json({ typ: "lieferanten", gruppen: list, total: totalLieferanten });
}
