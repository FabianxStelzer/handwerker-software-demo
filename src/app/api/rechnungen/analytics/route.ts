import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerDisplayName } from "@/lib/utils";

export async function GET() {
  const [allInvoices, allOrders, customers] = await Promise.all([
    prisma.invoice.findMany({ include: { order: { include: { customer: true } } } }),
    prisma.order.findMany(),
    prisma.customer.findMany({ include: { orders: { include: { invoice: true } } } }),
  ]);

  const totalRevenue = allInvoices
    .filter((i) => i.status === "BEZAHLT")
    .reduce((sum, i) => sum + i.grossTotal, 0);

  const outstandingRevenue = allInvoices
    .filter((i) => i.status === "VERSENDET" || i.status === "UEBERFAELLIG")
    .reduce((sum, i) => sum + i.grossTotal, 0);

  const avgOrderValue = allOrders.length > 0
    ? allOrders.reduce((sum, o) => sum + o.grossTotal, 0) / allOrders.length
    : 0;

  const topCustomers = customers
    .map((c) => ({
      id: c.id,
      name: getCustomerDisplayName(c),
      total: c.orders.reduce((sum, o) => sum + o.grossTotal, 0),
      orderCount: c.orders.length,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return NextResponse.json({
    totalRevenue,
    outstandingRevenue,
    avgOrderValue,
    totalOrders: allOrders.length,
    totalInvoices: allInvoices.length,
    paidInvoices: allInvoices.filter((i) => i.status === "BEZAHLT").length,
    topCustomers,
  });
}
