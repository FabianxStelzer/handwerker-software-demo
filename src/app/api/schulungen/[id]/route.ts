import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  if (body.action === "updateType") {
    const type = await prisma.trainingType.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name : undefined,
        description: body.description !== undefined ? (body.description || null) : undefined,
        intervalMonths: body.intervalMonths !== undefined ? (body.intervalMonths ? parseInt(body.intervalMonths) : null) : undefined,
        isRequired: body.isRequired !== undefined ? body.isRequired : undefined,
      },
    });
    return NextResponse.json(type);
  }

  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.trainingType.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
