import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tool = await prisma.tool.findUnique({
    where: { id },
    include: {
      assignments: {
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { assignedAt: "desc" },
      },
      inspections: { orderBy: { inspectionDate: "desc" } },
    },
  });
  if (!tool) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  return NextResponse.json(tool);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  // Assign tool to user
  if (body.action === "assign") {
    const assignment = await prisma.toolAssignment.create({
      data: {
        toolId: id,
        userId: body.userId,
        notes: body.notes || null,
      },
    });
    await prisma.tool.update({ where: { id }, data: { status: "ZUGEWIESEN" } });
    return NextResponse.json(assignment);
  }

  // Return tool
  if (body.action === "return") {
    const active = await prisma.toolAssignment.findFirst({
      where: { toolId: id, returnedAt: null },
      orderBy: { assignedAt: "desc" },
    });
    if (active) {
      await prisma.toolAssignment.update({
        where: { id: active.id },
        data: { returnedAt: new Date() },
      });
    }
    await prisma.tool.update({ where: { id }, data: { status: "VERFUEGBAR" } });
    return NextResponse.json({ ok: true });
  }

  // Add inspection
  if (body.action === "inspect") {
    const inspection = await prisma.toolInspection.create({
      data: {
        toolId: id,
        inspectionDate: body.inspectionDate ? new Date(body.inspectionDate) : new Date(),
        result: body.result || null,
        inspector: body.inspector || null,
        notes: body.notes || null,
      },
    });
    const tool = await prisma.tool.findUnique({ where: { id } });
    let nextInspection: Date | null = null;
    if (tool?.inspectionInterval) {
      nextInspection = new Date(inspection.inspectionDate);
      nextInspection.setMonth(nextInspection.getMonth() + tool.inspectionInterval);
    }
    await prisma.tool.update({
      where: { id },
      data: { lastInspection: inspection.inspectionDate, nextInspection },
    });
    return NextResponse.json(inspection);
  }

  // Update tool
  const tool = await prisma.tool.update({
    where: { id },
    data: {
      name: body.name !== undefined ? body.name : undefined,
      category: body.category !== undefined ? (body.category || null) : undefined,
      manufacturer: body.manufacturer !== undefined ? (body.manufacturer || null) : undefined,
      model: body.model !== undefined ? (body.model || null) : undefined,
      serialNumber: body.serialNumber !== undefined ? (body.serialNumber || null) : undefined,
      inventoryNumber: body.inventoryNumber !== undefined ? (body.inventoryNumber || null) : undefined,
      purchaseDate: body.purchaseDate !== undefined ? (body.purchaseDate ? new Date(body.purchaseDate) : null) : undefined,
      purchasePrice: body.purchasePrice !== undefined ? (body.purchasePrice ? parseFloat(body.purchasePrice) : null) : undefined,
      status: body.status !== undefined ? body.status : undefined,
      location: body.location !== undefined ? (body.location || null) : undefined,
      notes: body.notes !== undefined ? (body.notes || null) : undefined,
      inspectionInterval: body.inspectionInterval !== undefined ? (body.inspectionInterval ? parseInt(body.inspectionInterval) : null) : undefined,
      lastInspection: body.lastInspection !== undefined ? (body.lastInspection ? new Date(body.lastInspection) : null) : undefined,
      nextInspection: body.nextInspection !== undefined ? (body.nextInspection ? new Date(body.nextInspection) : null) : undefined,
      isActive: body.isActive !== undefined ? body.isActive : undefined,
    },
  });
  return NextResponse.json(tool);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.tool.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
