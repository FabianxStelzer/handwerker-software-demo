import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      projects: { orderBy: { createdAt: "desc" }, take: 20 },
      orders: { orderBy: { createdAt: "desc" }, take: 20, include: { invoice: true } },
    },
  });

  if (!customer) {
    return NextResponse.json({ error: "Kunde nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json(customer);
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
