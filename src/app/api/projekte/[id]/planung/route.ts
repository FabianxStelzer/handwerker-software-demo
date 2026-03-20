import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const phases = await prisma.projectPhase.findMany({
    where: { projectId: id },
    orderBy: [{ sortOrder: "asc" }, { startDate: "asc" }],
  });

  const employees = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, firstName: true, lastName: true, role: true },
    orderBy: { lastName: "asc" },
  });

  const vehicles = await prisma.vehicle.findMany({
    where: { isActive: true },
    select: { id: true, licensePlate: true, brand: true, model: true },
    orderBy: { licensePlate: "asc" },
  });

  return NextResponse.json({ phases, employees, vehicles });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  if (body.action === "delete") {
    await prisma.projectPhase.delete({ where: { id: body.phaseId } });
    return NextResponse.json({ success: true });
  }

  if (body.action === "update") {
    const phase = await prisma.projectPhase.update({
      where: { id: body.phaseId },
      data: {
        title: body.title,
        description: body.description || null,
        startDate: new Date(body.startDate),
        endDate: body.endDate ? new Date(body.endDate) : null,
        color: body.color || null,
        category: body.category || null,
        assignedTo: body.assignedTo || null,
        vehicleIds: body.vehicleIds || null,
        subcontractor: body.subcontractor || null,
        groupName: body.groupName || null,
        isMilestone: body.isMilestone || false,
        status: body.status || "GEPLANT",
        sortOrder: body.sortOrder ?? 0,
      },
    });
    return NextResponse.json(phase);
  }

  if (body.action === "reorder") {
    const updates = (body.items as { id: string; sortOrder: number }[]).map(item =>
      prisma.projectPhase.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } })
    );
    await prisma.$transaction(updates);
    return NextResponse.json({ success: true });
  }

  const maxOrder = await prisma.projectPhase.aggregate({
    where: { projectId: id },
    _max: { sortOrder: true },
  });

  const phase = await prisma.projectPhase.create({
    data: {
      projectId: id,
      title: body.title,
      description: body.description || null,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : null,
      color: body.color || null,
      category: body.category || null,
      assignedTo: body.assignedTo || null,
      vehicleIds: body.vehicleIds || null,
      subcontractor: body.subcontractor || null,
      groupName: body.groupName || null,
      isMilestone: body.isMilestone || false,
      status: body.status || "GEPLANT",
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
    },
  });

  return NextResponse.json(phase, { status: 201 });
}
