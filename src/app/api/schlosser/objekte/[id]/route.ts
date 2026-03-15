import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateObjektStatus } from "@/lib/schlosser-status";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const objekt = await prisma.schlosserObjekt.findUnique({
    where: { id },
    include: {
      customer: true,
      elemente: {
        include: {
          pruefungen: {
            orderBy: { datum: "desc" },
            include: { maengel: true },
          },
        },
        orderBy: { bezeichnung: "asc" },
      },
    },
  });

  if (!objekt) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  objekt.status = await updateObjektStatus(id);
  return NextResponse.json(objekt);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await req.json();

  const objekt = await prisma.schlosserObjekt.update({
    where: { id },
    data: {
      name: data.name,
      street: data.street,
      zip: data.zip,
      city: data.city,
      description: data.description,
      planFileName: data.planFileName,
      planUrl: data.planUrl,
      status: data.status,
    },
    include: { customer: true, elemente: true },
  });

  return NextResponse.json(objekt);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.schlosserObjekt.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
