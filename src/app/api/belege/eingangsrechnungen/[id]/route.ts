import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { status, paidDate } = body;
  const data: Record<string, unknown> = {};
  if (status !== undefined) data.status = status;
  if (paidDate !== undefined) data.paidDate = paidDate ? new Date(paidDate) : null;
  const inv = await prisma.incomingInvoice.update({
    where: { id },
    data,
    include: { vendor: true },
  });
  return NextResponse.json(inv);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.incomingInvoice.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
