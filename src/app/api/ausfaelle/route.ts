import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const absences = await prisma.absence.findMany({
    orderBy: { startDate: "desc" },
    include: { user: { select: { id: true, firstName: true, lastName: true, isActive: true } } },
  });

  const employees = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, firstName: true, lastName: true, hireDate: true },
    orderBy: { lastName: "asc" },
  });

  return NextResponse.json({ absences, employees });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const startDate = new Date(body.startDate);
  const endDate = new Date(body.endDate);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const absence = await prisma.absence.create({
    data: {
      userId: body.userId,
      type: body.type || "KRANKHEIT",
      startDate,
      endDate,
      days,
      reason: body.reason || null,
      notes: body.notes || null,
      hasAttest: !!body.hasAttest,
    },
  });

  return NextResponse.json(absence, { status: 201 });
}
