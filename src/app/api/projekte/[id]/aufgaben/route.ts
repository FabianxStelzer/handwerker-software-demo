import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const task = await prisma.projectTask.create({
    data: {
      projectId: id,
      title: body.title,
      description: body.description || null,
      priority: body.priority || "MITTEL",
      status: body.status || "OFFEN",
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      assigneeId: body.assigneeId || null,
    },
  });

  return NextResponse.json(task, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.priority !== undefined) data.priority = body.priority;
  if (body.status !== undefined) data.status = body.status;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.assigneeId !== undefined) data.assigneeId = body.assigneeId || null;

  const task = await prisma.projectTask.update({
    where: { id: body.id },
    data,
    include: {
      project: { select: { id: true, projectNumber: true, name: true } },
    },
  });

  return NextResponse.json(task);
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  await prisma.projectTask.delete({ where: { id: body.id } });
  return NextResponse.json({ success: true });
}
