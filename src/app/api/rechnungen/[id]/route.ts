import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      order: { include: { customer: true, project: true } },
      items: { orderBy: { position: "asc" } },
    },
  });

  if (!invoice) return NextResponse.json({ error: "Rechnung nicht gefunden" }, { status: 404 });
  return NextResponse.json(invoice);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const data: any = { status: body.status };
  if (body.status === "BEZAHLT" && !body.paidDate) {
    data.paidDate = new Date();
  }

  const invoice = await prisma.invoice.update({
    where: { id },
    data,
    include: { order: { include: { customer: true } }, items: true },
  });

  return NextResponse.json(invoice);
}
