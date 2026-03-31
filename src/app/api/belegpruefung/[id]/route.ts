import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const check = await prisma.belegCheck.findUnique({
    where: { id },
    include: { documents: true, createdBy: { select: { firstName: true, lastName: true } } },
  });
  if (!check) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  return NextResponse.json(check);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.belegCheck.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
