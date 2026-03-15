import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerDisplayName } from "@/lib/utils";

const emptyDashboard = {
  customerCount: 0,
  activeProjects: 0,
  openOrders: 0,
  unpaidInvoices: 0,
  unpaidTotal: 0,
  recentProjects: [],
};

export async function GET() {
  try {
    const [customerCount, activeProjects, openOrders, unpaidInvoices, recentProjects] =
      await Promise.all([
        prisma.customer.count(),
        prisma.project.count({ where: { status: "AKTIV" } }),
        prisma.order.count({ where: { status: { in: ["AUSSTEHEND", "BESTAETIGT"] } } }),
        prisma.invoice.findMany({ where: { status: { in: ["VERSENDET", "UEBERFAELLIG"] } } }),
        prisma.project.findMany({
          take: 10,
          orderBy: { updatedAt: "desc" },
          include: { customer: true },
        }),
      ]);

    const unpaidTotal = unpaidInvoices.reduce((sum, inv) => sum + inv.grossTotal, 0);

    return NextResponse.json({
      customerCount,
      activeProjects,
      openOrders,
      unpaidInvoices: unpaidInvoices.length,
      unpaidTotal,
      recentProjects: recentProjects.map((p) => ({
        id: p.id,
        projectNumber: p.projectNumber,
        name: p.name,
        status: p.status,
        startDate: p.startDate?.toISOString() || null,
        endDate: p.endDate?.toISOString() || null,
        customerName: getCustomerDisplayName(p.customer),
      })),
    });
  } catch (err) {
    console.error("[Dashboard API]", err);
    return NextResponse.json(emptyDashboard);
  }
}
