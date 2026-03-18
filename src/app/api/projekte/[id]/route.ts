import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      customer: true,
      entries: { orderBy: { date: "desc" }, include: { attachments: true } },
      documents: { orderBy: { createdAt: "desc" } },
      tasks: { orderBy: { createdAt: "desc" } },
      chatMessages: { orderBy: { createdAt: "asc" }, include: { user: { select: { id: true, firstName: true, lastName: true } } } },
      materials: { orderBy: { createdAt: "desc" }, include: { catalogMaterial: true, requestedBy: { select: { firstName: true, lastName: true } } } },
      blueprints: { orderBy: { createdAt: "desc" } },
      timeEntries: { select: { userId: true, user: { select: { id: true, firstName: true, lastName: true } } }, distinct: ["userId"] },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json(project);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const project = await prisma.project.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description || null,
      status: body.status,
      siteStreet: body.siteStreet || null,
      siteZip: body.siteZip || null,
      siteCity: body.siteCity || null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      ...(body.plannedHours !== undefined && { plannedHours: body.plannedHours ? parseFloat(body.plannedHours) : null }),
    },
    include: { customer: true },
  });

  return NextResponse.json(project);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
