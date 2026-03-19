import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const tools = await prisma.tool.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: {
      assignments: {
        where: { returnedAt: null },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { assignedAt: "desc" },
        take: 1,
      },
      inspections: { orderBy: { inspectionDate: "desc" }, take: 1 },
    },
  });
  return NextResponse.json(tools);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const tool = await prisma.tool.create({
    data: {
      name: body.name,
      category: body.category || null,
      manufacturer: body.manufacturer || null,
      model: body.model || null,
      serialNumber: body.serialNumber || null,
      inventoryNumber: body.inventoryNumber || null,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
      purchasePrice: body.purchasePrice ? parseFloat(body.purchasePrice) : null,
      status: body.status || "VERFUEGBAR",
      location: body.location || null,
      notes: body.notes || null,
      inspectionInterval: body.inspectionInterval ? parseInt(body.inspectionInterval) : null,
      lastInspection: body.lastInspection ? new Date(body.lastInspection) : null,
      nextInspection: body.nextInspection ? new Date(body.nextInspection) : null,
    },
  });

  return NextResponse.json(tool, { status: 201 });
}
