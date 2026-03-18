import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  const userId = req.nextUrl.searchParams.get("userId");
  const date = req.nextUrl.searchParams.get("date");
  const month = req.nextUrl.searchParams.get("month");
  const active = req.nextUrl.searchParams.get("active");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (projectId) where.projectId = projectId;
  if (userId) where.userId = userId;

  if (active === "true") {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    where.date = { gte: todayStart, lte: todayEnd };
    where.endTime = null;
  } else if (date) {
    const d = new Date(date);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    where.date = { gte: start, lt: end };
  } else if (month) {
    const [y, m] = month.split("-").map(Number);
    where.date = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
  }

  const entries = await prisma.timeEntry.findMany({
    where,
    orderBy: [{ date: "desc" }, { startTime: "asc" }],
    include: {
      user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
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
      projectId: body.projectId || null,
      date: new Date(body.date),
      startTime: body.startTime,
      endTime: body.endTime || null,
      breakMin: parseInt(body.breakMin) || 0,
      notes: body.notes || null,
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      project: { select: { id: true, projectNumber: true, name: true } },
    },
  });

  return NextResponse.json(entry, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};
  if (body.endTime !== undefined) data.endTime = body.endTime;
  if (body.breakMin !== undefined) data.breakMin = parseInt(body.breakMin) || 0;
  if (body.projectId !== undefined) data.projectId = body.projectId || null;
  if (body.notes !== undefined) data.notes = body.notes || null;

  const entry = await prisma.timeEntry.update({
    where: { id: body.id },
    data,
    include: {
      user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      project: { select: { id: true, projectNumber: true, name: true } },
    },
  });

  return NextResponse.json(entry);
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  await prisma.timeEntry.delete({ where: { id: body.id } });
  return NextResponse.json({ success: true });
}
