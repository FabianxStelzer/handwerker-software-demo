import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateObjektStatus } from "@/lib/schlosser-status";

export async function GET(req: NextRequest) {
  try {
    const customerId = req.nextUrl.searchParams.get("customerId");
    const search = req.nextUrl.searchParams.get("search") || "";

    const where: Record<string, unknown> = {};
    if (customerId) where.customerId = customerId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { street: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
        { customer: { company: { contains: search, mode: "insensitive" } } },
        { customer: { lastName: { contains: search, mode: "insensitive" } } },
      ];
    }

    const objekte = await prisma.schlosserObjekt.findMany({
      where,
      include: {
        customer: true,
        elemente: {
          include: {
            pruefungen: {
              orderBy: { datum: "desc" },
              take: 1,
              include: { maengel: true },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    for (const o of objekte) {
      try {
        o.status = await updateObjektStatus(o.id);
      } catch (err) {
        console.error(`updateObjektStatus für ${o.id}:`, err);
      }
    }

    return NextResponse.json(objekte);
  } catch (err) {
    console.error("Objekte GET Fehler:", err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  const data = await req.json();

  const objekt = await prisma.schlosserObjekt.create({
    data: {
      customerId: data.customerId,
      name: data.name,
      street: data.street || null,
      zip: data.zip || null,
      city: data.city || null,
      description: data.description || null,
    },
    include: { customer: true, elemente: true },
  });

  return NextResponse.json(objekt, { status: 201 });
}
