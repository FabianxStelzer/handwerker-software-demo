import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const status = req.nextUrl.searchParams.get("status");
  const assignedToId = req.nextUrl.searchParams.get("assignedToId");

  const where: Record<string, unknown> = {};
  if (from) where.startTime = { ...(where.startTime as object || {}), gte: new Date(from) };
  if (to) where.startTime = { ...(where.startTime as object || {}), lte: new Date(to) };
  if (status && status !== "all") where.status = status;
  if (assignedToId) where.assignedToId = assignedToId;

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      customer: { select: { id: true, firstName: true, lastName: true, company: true, phone: true, email: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
      project: { select: { id: true, name: true, projectNumber: true } },
    },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json(appointments);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = await req.json();

  const appointment = await prisma.appointment.create({
    data: {
      title: body.title,
      description: body.description || null,
      type: body.type || "BERATUNG",
      status: body.status || "GEPLANT",
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      allDay: body.allDay || false,
      location: body.location || null,
      street: body.street || null,
      zip: body.zip || null,
      city: body.city || null,
      notes: body.notes || null,
      customerId: body.customerId || null,
      customerName: body.customerName || null,
      customerEmail: body.customerEmail || null,
      customerPhone: body.customerPhone || null,
      assignedToId: body.assignedToId || null,
      projectId: body.projectId || null,
      bookingRequestId: body.bookingRequestId || null,
      reminder: body.reminder ?? true,
      reminderMinutes: body.reminderMinutes ?? 60,
      color: body.color || null,
      createdById: session.user.id,
    },
    include: {
      customer: { select: { id: true, firstName: true, lastName: true, company: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
      project: { select: { id: true, name: true, projectNumber: true } },
    },
  });

  return NextResponse.json(appointment, { status: 201 });
}
