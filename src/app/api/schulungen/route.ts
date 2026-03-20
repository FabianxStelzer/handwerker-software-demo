import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const types = await prisma.trainingType.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: {
      records: {
        include: { user: { select: { id: true, firstName: true, lastName: true, isActive: true } } },
        orderBy: { completedAt: "desc" },
      },
    },
  });

  const employees = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { lastName: "asc" },
  });

  return NextResponse.json({ types, employees });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === "createType") {
    const type = await prisma.trainingType.create({
      data: {
        name: body.name,
        description: body.description || null,
        intervalMonths: body.intervalMonths ? parseInt(body.intervalMonths) : null,
        isRequired: body.isRequired !== false,
      },
    });
    return NextResponse.json(type, { status: 201 });
  }

  if (body.action === "addRecord") {
    const completedAt = new Date(body.completedAt);
    let expiresAt: Date | null = null;

    if (body.trainingTypeId) {
      const tt = await prisma.trainingType.findUnique({ where: { id: body.trainingTypeId } });
      if (tt?.intervalMonths) {
        expiresAt = new Date(completedAt);
        expiresAt.setMonth(expiresAt.getMonth() + tt.intervalMonths);
      }
    }

    const record = await prisma.trainingRecord.create({
      data: {
        trainingTypeId: body.trainingTypeId,
        userId: body.userId,
        completedAt,
        expiresAt,
        certificate: body.certificate || null,
        instructor: body.instructor || null,
        notes: body.notes || null,
      },
    });
    return NextResponse.json(record, { status: 201 });
  }

  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
}
