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

  const task = await prisma.projectTask.update({
    where: { id: body.id },
    data: {
      title: body.title,
      description: body.description,
      priority: body.priority,
      status: body.status,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
    },
  });

  return NextResponse.json(task);
}
