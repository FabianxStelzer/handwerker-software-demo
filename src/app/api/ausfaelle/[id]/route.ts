import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const data: any = {};
  if (body.type !== undefined) data.type = body.type;
  if (body.startDate !== undefined) data.startDate = new Date(body.startDate);
  if (body.endDate !== undefined) data.endDate = new Date(body.endDate);
  if (body.reason !== undefined) data.reason = body.reason || null;
  if (body.notes !== undefined) data.notes = body.notes || null;
  if (body.hasAttest !== undefined) data.hasAttest = !!body.hasAttest;

  if (data.startDate && data.endDate) {
    data.days = Math.ceil(Math.abs(data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }

  const absence = await prisma.absence.update({ where: { id }, data });
  return NextResponse.json(absence);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.absence.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
