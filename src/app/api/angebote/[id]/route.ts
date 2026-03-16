import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerDisplayName } from "@/lib/utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      customer: true,
      project: true,
      order: true,
      items: { orderBy: { position: "asc" }, include: { catalogMaterial: true, catalogService: true } },
    },
  });
  if (!quotation) return NextResponse.json({ error: "Angebot nicht gefunden" }, { status: 404 });
  return NextResponse.json({
    ...quotation,
    customerName: getCustomerDisplayName(quotation.customer),
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const updateData: Record<string, unknown> = {};
  if (body.status !== undefined) updateData.status = body.status;
  if (body.validUntil !== undefined) updateData.validUntil = body.validUntil ? new Date(body.validUntil) : null;
  if (body.notes !== undefined) updateData.notes = body.notes;

  const quotation = await prisma.quotation.update({
    where: { id },
    data: updateData,
    include: { customer: true, project: true, items: true },
  });
  return NextResponse.json(quotation);
}
