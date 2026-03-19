import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: {
      expenses: { orderBy: { date: "desc" } },
      incomingInvoices: { orderBy: { date: "desc" } },
    },
  });
  if (!vendor) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const totalExpenses = vendor.expenses.reduce((s, e) => s + e.grossAmount, 0)
    + vendor.incomingInvoices.reduce((s, i) => s + i.grossAmount, 0);

  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const expenses12m = vendor.expenses.filter((e) => new Date(e.date) >= oneYearAgo).reduce((s, e) => s + e.grossAmount, 0)
    + vendor.incomingInvoices.filter((i) => new Date(i.date) >= oneYearAgo).reduce((s, i) => s + i.grossAmount, 0);

  const monthlyExpenses: number[] = Array(12).fill(0);
  for (const ex of vendor.expenses) {
    const d = new Date(ex.date);
    const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth();
    if (monthsAgo >= 0 && monthsAgo < 12) monthlyExpenses[11 - monthsAgo] += ex.grossAmount;
  }
  for (const inv of vendor.incomingInvoices) {
    const d = new Date(inv.date);
    const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth();
    if (monthsAgo >= 0 && monthsAgo < 12) monthlyExpenses[11 - monthsAgo] += inv.grossAmount;
  }

  return NextResponse.json({ ...vendor, totalExpenses, expenses12m, monthlyExpenses });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, taxId, vatId, street, zip, city, email, phone, notes } = body;
  const vendor = await prisma.vendor.update({
    where: { id },
    data: {
      ...(name != null && { name: name.trim() }),
      ...(taxId != null && { taxId: taxId?.trim() || null }),
      ...(vatId != null && { vatId: vatId?.trim() || null }),
      ...(street != null && { street: street?.trim() || null }),
      ...(zip != null && { zip: zip?.trim() || null }),
      ...(city != null && { city: city?.trim() || null }),
      ...(email != null && { email: email?.trim() || null }),
      ...(phone != null && { phone: phone?.trim() || null }),
      ...(notes != null && { notes: notes?.trim() || null }),
    },
  });
  return NextResponse.json(vendor);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.vendor.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
