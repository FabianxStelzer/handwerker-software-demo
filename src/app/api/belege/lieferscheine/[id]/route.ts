import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const note = await prisma.deliveryNote.findUnique({
    where: { id },
    include: { customer: true, project: true, items: true },
  });
  if (!note) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  return NextResponse.json(note);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { description, quantity, unit } = body;
  if (!description) {
    return NextResponse.json({ error: "Beschreibung erforderlich" }, { status: 400 });
  }
  const item = await prisma.deliveryNoteItem.create({
    data: {
      deliveryId: id,
      description: String(description).trim(),
      quantity: parseFloat(quantity) || 1,
      unit: unit || "STUECK",
    },
  });
  return NextResponse.json(item, { status: 201 });
}
