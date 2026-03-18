import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const vehicles = await prisma.vehicle.findMany({
    include: {
      assignments: {
        include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
      },
    },
    orderBy: { licensePlate: "asc" },
  });

  return NextResponse.json(vehicles);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!role || (role !== "ADMIN" && role !== "BAULEITER")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const body = await req.json();
  const vehicle = await prisma.vehicle.create({
    data: {
      licensePlate: body.licensePlate,
      brand: body.brand,
      model: body.model,
      year: body.year ? parseInt(body.year) : null,
      color: body.color || null,
      vin: body.vin || null,
      nextInspection: body.nextInspection ? new Date(body.nextInspection) : null,
      nextTuv: body.nextTuv ? new Date(body.nextTuv) : null,
      mileage: body.mileage ? parseInt(body.mileage) : null,
      notes: body.notes || null,
      gpsDeviceId: body.gpsDeviceId || null,
    },
    include: { assignments: { include: { user: { select: { id: true, firstName: true, lastName: true } } } } },
  });

  return NextResponse.json(vehicle, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!role || (role !== "ADMIN" && role !== "BAULEITER")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "ID fehlt" }, { status: 400 });

  if (body.action === "assign") {
    await prisma.vehicleAssignment.create({
      data: { vehicleId: body.id, userId: body.userId, isPrimary: body.isPrimary || false },
    });
    return NextResponse.json({ success: true });
  }

  if (body.action === "unassign") {
    await prisma.vehicleAssignment.delete({ where: { id: body.assignmentId } });
    return NextResponse.json({ success: true });
  }

  if (body.action === "gps") {
    await prisma.vehicle.update({
      where: { id: body.id },
      data: { gpsLastLat: body.lat, gpsLastLng: body.lng, gpsLastUpdate: new Date() },
    });
    return NextResponse.json({ success: true });
  }

  const vehicle = await prisma.vehicle.update({
    where: { id: body.id },
    data: {
      licensePlate: body.licensePlate,
      brand: body.brand,
      model: body.model,
      year: body.year ? parseInt(body.year) : null,
      color: body.color || null,
      vin: body.vin || null,
      nextInspection: body.nextInspection ? new Date(body.nextInspection) : null,
      nextTuv: body.nextTuv ? new Date(body.nextTuv) : null,
      mileage: body.mileage ? parseInt(body.mileage) : null,
      notes: body.notes || null,
      gpsDeviceId: body.gpsDeviceId || null,
      isActive: body.isActive ?? true,
    },
  });

  return NextResponse.json(vehicle);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!role || role !== "ADMIN") return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });

  const { id } = await req.json();
  await prisma.vehicle.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
