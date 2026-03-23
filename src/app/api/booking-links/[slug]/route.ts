import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const link = await prisma.bookingLink.findUnique({
    where: { slug },
    include: { requests: { orderBy: { createdAt: "desc" } }, _count: { select: { requests: true } } },
  });

  if (!link) return NextResponse.json({ error: "Link nicht gefunden" }, { status: 404 });

  return NextResponse.json(link);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json();

  const link = await prisma.bookingLink.update({
    where: { slug },
    data: {
      title: body.title,
      description: body.description,
      isActive: body.isActive,
      types: body.types,
      availableDays: body.availableDays,
      startHour: body.startHour,
      endHour: body.endHour,
      slotDuration: body.slotDuration,
      bufferTime: body.bufferTime,
      maxDaysAhead: body.maxDaysAhead,
      assignedToId: body.assignedToId,
    },
  });

  return NextResponse.json(link);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await prisma.bookingLink.delete({ where: { slug } });
  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const link = await prisma.bookingLink.findUnique({ where: { slug } });
  if (!link || !link.isActive) return NextResponse.json({ error: "Buchungsseite nicht verfügbar" }, { status: 404 });

  const body = await req.json();

  const request = await prisma.appointmentRequest.create({
    data: {
      bookingLinkId: link.id,
      customerName: body.customerName,
      customerEmail: body.customerEmail || null,
      customerPhone: body.customerPhone || null,
      message: body.message || null,
      type: body.type || "BERATUNG",
      preferredDate: new Date(body.preferredDate),
      preferredTime: body.preferredTime || null,
      alternativeDate: body.alternativeDate ? new Date(body.alternativeDate) : null,
      status: "NEU",
    },
  });

  return NextResponse.json(request, { status: 201 });
}
