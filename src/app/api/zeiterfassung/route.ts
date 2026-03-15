import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  const userId = req.nextUrl.searchParams.get("userId");
  const date = req.nextUrl.searchParams.get("date");

  const where: any = {};
  if (projectId) where.projectId = projectId;
  if (userId) where.userId = userId;
  if (date) {
    const d = new Date(date);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    where.date = { gte: start, lt: end };
  }

  const entries = await prisma.timeEntry.findMany({
    where,
    orderBy: [{ date: "desc" }, { startTime: "asc" }],
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
      project: { select: { id: true, projectNumber: true, name: true } },
    },
  });

  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const entry = await prisma.timeEntry.create({
    data: {
      userId: body.userId,
      projectId: body.projectId,
      date: new Date(body.date),
      startTime: body.startTime,
      endTime: body.endTime,
      breakMin: parseInt(body.breakMin) || 0,
      notes: body.notes || null,
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
      project: { select: { id: true, projectNumber: true, name: true } },
    },
  });

  return NextResponse.json(entry, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  await prisma.timeEntry.delete({ where: { id: body.id } });
  return NextResponse.json({ success: true });
}
