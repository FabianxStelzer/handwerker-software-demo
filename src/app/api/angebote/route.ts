import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateQuotationNumber } from "@/lib/numbering";
import { getCustomerDisplayName } from "@/lib/utils";

export async function GET() {
  const quotations = await prisma.quotation.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customer: true,
      project: true,
      order: true,
      items: { orderBy: { position: "asc" } },
    },
  });

  return NextResponse.json(
    quotations.map((q) => ({
      ...q,
      customerName: getCustomerDisplayName(q.customer),
    }))
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const quotationNumber = await generateQuotationNumber();

  const quotation = await prisma.quotation.create({
    data: {
      quotationNumber,
      customerId: body.customerId,
      projectId: body.projectId || null,
      status: "ENTWURF",
      validUntil: body.validUntil ? new Date(body.validUntil) : null,
      notes: body.notes || null,
    },
    include: { customer: true, project: true },
  });

  return NextResponse.json(quotation, { status: 201 });
}
