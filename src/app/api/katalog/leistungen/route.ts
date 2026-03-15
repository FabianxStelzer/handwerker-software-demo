import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const services = await prisma.catalogService.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(services);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const service = await prisma.catalogService.create({
    data: {
      name: body.name,
      description: body.description || null,
      unit: body.unit || "STUNDE",
      pricePerUnit: parseFloat(body.pricePerUnit) || 0,
      category: body.category || null,
    },
  });
  return NextResponse.json(service, { status: 201 });
}
