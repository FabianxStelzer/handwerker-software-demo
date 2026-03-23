import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const role = (session.user as any)?.role;
  if (!role || (role !== "ADMIN" && role !== "BAULEITER")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const [projects, vehicles, employees, pendingMaterials, staffAssignments] = await Promise.all([
    prisma.project.findMany({
      where: { status: { not: "ABGESCHLOSSEN" } },
      orderBy: { updatedAt: "desc" },
      include: {
        customer: true,
        staffAssignments: true,
        _count: { select: { tasks: true, materials: true } },
      },
    }),
    prisma.vehicle.findMany({
      where: { isActive: true },
      include: {
        assignments: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, firstName: true, lastName: true, role: true, avatarUrl: true },
      orderBy: { lastName: "asc" },
    }),
    prisma.projectMaterial.findMany({
      where: { isAdditional: true, approvedAt: null },
      include: {
        project: { select: { id: true, name: true, projectNumber: true } },
        requestedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { requestedAt: "desc" },
    }),
    prisma.projectStaffAssignment.findMany({
      include: {
        project: { select: { id: true, name: true, projectNumber: true, siteStreet: true, siteZip: true, siteCity: true } },
      },
      orderBy: { startDate: "desc" },
    }),
  ]);

  const todayStart = new Date(new Date().toDateString());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const checkedInToday = await prisma.timeEntry.findMany({
    where: {
      date: { gte: todayStart, lt: todayEnd },
      endTime: null,
    },
    select: { userId: true },
  });
  const checkedInUserIds = new Set(checkedInToday.map(t => t.userId));

  return NextResponse.json({
    projects: projects.map(p => ({
      id: p.id,
      name: p.name,
      projectNumber: p.projectNumber,
      status: p.status,
      siteStreet: p.siteStreet,
      siteZip: p.siteZip,
      siteCity: p.siteCity,
      startDate: p.startDate,
      endDate: p.endDate,
      customerName: p.customer?.company || `${p.customer?.firstName || ""} ${p.customer?.lastName || ""}`.trim(),
      taskCount: p._count.tasks,
      materialCount: p._count.materials,
      staffAssignments: p.staffAssignments,
    })),
    vehicles: vehicles.map(v => ({
      id: v.id,
      licensePlate: v.licensePlate,
      brand: v.brand,
      model: v.model,
      gpsLastLat: v.gpsLastLat,
      gpsLastLng: v.gpsLastLng,
      gpsLastUpdate: v.gpsLastUpdate,
      assignments: v.assignments.map(a => ({
        id: a.id,
        userId: a.userId,
        userName: `${a.user.firstName} ${a.user.lastName}`,
        isPrimary: a.isPrimary,
      })),
    })),
    employees: employees.map(e => ({
      ...e,
      fullName: `${e.firstName} ${e.lastName}`,
      isCheckedIn: checkedInUserIds.has(e.id),
    })),
    pendingMaterials,
    staffAssignments,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const role = (session.user as any)?.role;
  if (!role || (role !== "ADMIN" && role !== "BAULEITER")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const body = await req.json();

  if (body.action === "assign-staff") {
    const assignment = await prisma.projectStaffAssignment.create({
      data: {
        projectId: body.projectId,
        userId: body.userId,
        vehicleId: body.vehicleId || null,
        role: body.role || null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        notes: body.notes || null,
      },
    });
    return NextResponse.json(assignment, { status: 201 });
  }

  if (body.action === "remove-staff") {
    await prisma.projectStaffAssignment.delete({ where: { id: body.assignmentId } });
    return NextResponse.json({ success: true });
  }

  if (body.action === "approve-material") {
    const updateData: Record<string, unknown> = { approvedAt: new Date() };
    if (body.pricePerUnit !== undefined) updateData.pricePerUnit = body.pricePerUnit;
    if (body.quantity !== undefined) updateData.quantityPlanned = body.quantity;
    if (body.notes !== undefined) updateData.notes = body.notes;

    await prisma.projectMaterial.update({
      where: { id: body.materialId },
      data: updateData,
    });
    return NextResponse.json({ success: true });
  }

  if (body.action === "reject-material") {
    await prisma.projectMaterial.delete({ where: { id: body.materialId } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
}
