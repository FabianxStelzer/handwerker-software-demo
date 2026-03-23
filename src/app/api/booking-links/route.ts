import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const links = await prisma.bookingLink.findMany({
    include: { _count: { select: { requests: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(links);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = await req.json();
  const slug = body.slug || body.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const existing = await prisma.bookingLink.findUnique({ where: { slug } });
  if (existing) return NextResponse.json({ error: "Dieser Link existiert bereits" }, { status: 409 });

  const link = await prisma.bookingLink.create({
    data: {
      slug,
      title: body.title,
      description: body.description || null,
      isActive: body.isActive ?? true,
      types: body.types || null,
      availableDays: body.availableDays || undefined,
      startHour: body.startHour ?? 8,
      endHour: body.endHour ?? 17,
      slotDuration: body.slotDuration ?? 60,
      bufferTime: body.bufferTime ?? 15,
      maxDaysAhead: body.maxDaysAhead ?? 30,
      assignedToId: body.assignedToId || null,
    },
  });

  return NextResponse.json(link, { status: 201 });
}
