import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      projects: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true, projectNumber: true, name: true, description: true,
          status: true, startDate: true, endDate: true,
          _count: { select: { documents: true } },
        },
      },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { invoice: true },
      },
      quotations: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true, quotationNumber: true, status: true, grossTotal: true, createdAt: true,
        },
      },
    },
  });

  if (!customer) {
    return NextResponse.json({ error: "Kunde nicht gefunden" }, { status: 404 });
  }

  const invoices = await prisma.invoice.findMany({
    where: { order: { customerId: id } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, invoiceNumber: true, status: true, grossTotal: true, netTotal: true,
      createdAt: true, paidDate: true, dueDate: true,
    },
  });

  const paidInvoices = invoices.filter((i) => i.status === "BEZAHLT");
  const revenue = paidInvoices.reduce((sum, i) => sum + i.grossTotal, 0);
  const documentCount = customer.projects.reduce((sum, p) => sum + p._count.documents, 0);

  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const revenue12m = paidInvoices
    .filter((i) => i.paidDate && new Date(i.paidDate) >= oneYearAgo)
    .reduce((sum, i) => sum + i.grossTotal, 0);

  let avgPayDays = 0;
  const paidWithDates = paidInvoices.filter((i) => i.paidDate && i.createdAt);
  if (paidWithDates.length > 0) {
    const totalDays = paidWithDates.reduce((sum, i) => {
      const created = new Date(i.createdAt).getTime();
      const paid = new Date(i.paidDate!).getTime();
      return sum + Math.max(0, Math.floor((paid - created) / 86400000));
    }, 0);
    avgPayDays = Math.round(totalDays / paidWithDates.length);
  }

  const monthlyRevenue: number[] = Array(12).fill(0);
  for (const inv of paidInvoices) {
    const d = inv.paidDate ? new Date(inv.paidDate) : new Date(inv.createdAt);
    if (d.getFullYear() === now.getFullYear() || d.getFullYear() === now.getFullYear() - 1) {
      const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth();
      if (monthsAgo >= 0 && monthsAgo < 12) {
        monthlyRevenue[11 - monthsAgo] += inv.grossTotal;
      }
    }
  }

  return NextResponse.json({
    ...customer,
    invoices,
    revenue,
    revenue12m,
    avgPayDays,
    monthlyRevenue,
    documentCount,
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      type: body.type,
      company: body.company || null,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email || null,
      phone: body.phone || null,
      street: body.street || null,
      zip: body.zip || null,
      city: body.city || null,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(customer);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.customer.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
