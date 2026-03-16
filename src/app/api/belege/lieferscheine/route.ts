import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateDeliveryNoteNumber } from "@/lib/numbering";
import { getCustomerDisplayName } from "@/lib/utils";

export async function GET() {
  const list = await prisma.deliveryNote.findMany({
    orderBy: { date: "desc" },
    include: {
      customer: true,
      project: true,
      items: true,
    },
  });
  return NextResponse.json(
    list.map((d) => ({
      ...d,
      customerName: getCustomerDisplayName(d.customer),
    }))
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { customerId, projectId, date, notes } = body;
  if (!customerId) {
    return NextResponse.json({ error: "Kunde erforderlich" }, { status: 400 });
  }
  const noteNumber = await generateDeliveryNoteNumber();
  const note = await prisma.deliveryNote.create({
    data: {
      noteNumber,
      customerId,
      projectId: projectId || null,
      date: date ? new Date(date) : new Date(),
      notes: notes?.trim() || null,
    },
    include: { customer: true, project: true },
  });
  return NextResponse.json(
    { ...note, customerName: getCustomerDisplayName(note.customer) },
    { status: 201 }
  );
}
