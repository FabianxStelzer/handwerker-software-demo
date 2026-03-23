import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.type !== undefined) data.type = body.type;
  if (body.status !== undefined) data.status = body.status;
  if (body.startTime !== undefined) data.startTime = new Date(body.startTime);
  if (body.endTime !== undefined) data.endTime = new Date(body.endTime);
  if (body.allDay !== undefined) data.allDay = body.allDay;
  if (body.location !== undefined) data.location = body.location;
  if (body.street !== undefined) data.street = body.street;
  if (body.zip !== undefined) data.zip = body.zip;
  if (body.city !== undefined) data.city = body.city;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.customerId !== undefined) data.customerId = body.customerId || null;
  if (body.customerName !== undefined) data.customerName = body.customerName;
  if (body.customerEmail !== undefined) data.customerEmail = body.customerEmail;
  if (body.customerPhone !== undefined) data.customerPhone = body.customerPhone;
  if (body.assignedToId !== undefined) data.assignedToId = body.assignedToId || null;
  if (body.projectId !== undefined) data.projectId = body.projectId || null;
  if (body.reminder !== undefined) data.reminder = body.reminder;
  if (body.reminderMinutes !== undefined) data.reminderMinutes = body.reminderMinutes;
  if (body.color !== undefined) data.color = body.color;

  const appointment = await prisma.appointment.update({
    where: { id },
    data,
    include: {
      customer: { select: { id: true, firstName: true, lastName: true, company: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
      project: { select: { id: true, name: true, projectNumber: true } },
    },
  });

  return NextResponse.json(appointment);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  await prisma.appointment.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
