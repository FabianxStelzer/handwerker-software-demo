import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;

  const entries = await prisma.vehicleTripEntry.findMany({
    where: { vehicleId: id },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(entries);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { firstName: true, lastName: true },
  });

  const entry = await prisma.vehicleTripEntry.create({
    data: {
      vehicleId: id,
      date: new Date(body.date),
      startKm: body.startKm,
      endKm: body.endKm,
      distance: body.distance || (body.endKm - body.startKm),
      purpose: body.purpose || null,
      destination: body.destination || null,
      driver: body.driver || (user ? `${user.firstName} ${user.lastName}` : null),
      isBusinessTrip: body.isBusinessTrip ?? true,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
