import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: { expenses: { take: 10, orderBy: { date: "desc" } } },
  });
  if (!vendor) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  return NextResponse.json(vendor);
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
