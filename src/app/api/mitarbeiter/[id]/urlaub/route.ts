import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const request = await prisma.vacationRequest.create({
    data: {
      userId: id,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      days: parseInt(body.days) || 1,
      reason: body.reason || null,
    },
  });

  return NextResponse.json(request, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();

  const request = await prisma.vacationRequest.update({
    where: { id: body.id },
    data: { status: body.status },
  });

  return NextResponse.json(request);
}
