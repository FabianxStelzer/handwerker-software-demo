import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const agreement = await prisma.agreement.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, firstName: true, lastName: true, company: true } },
      project: { select: { id: true, name: true, projectNumber: true } },
    },
  });

  if (!agreement) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  return NextResponse.json(agreement);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.status !== undefined) data.status = body.status;
  if (body.customerId !== undefined) data.customerId = body.customerId || null;
  if (body.projectId !== undefined) data.projectId = body.projectId || null;
  if (body.blocks !== undefined) data.blocks = body.blocks;
  if (body.isTemplate !== undefined) data.isTemplate = body.isTemplate;

  const agreement = await prisma.agreement.update({
    where: { id },
    data,
    include: {
      customer: { select: { id: true, firstName: true, lastName: true, company: true } },
      project: { select: { id: true, name: true, projectNumber: true } },
    },
  });

  return NextResponse.json(agreement);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  await prisma.agreement.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
