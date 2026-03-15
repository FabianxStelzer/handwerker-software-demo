import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const objektId = req.nextUrl.searchParams.get("objektId");
  const zugewiesenAn = req.nextUrl.searchParams.get("zugewiesenAn");
  const status = req.nextUrl.searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (objektId) where.objektId = objektId;
  if (zugewiesenAn) where.zugewiesenAn = zugewiesenAn;
  if (status && status !== "alle") where.status = status;

  const aufgaben = await prisma.schlosserAufgabe.findMany({
    where,
    include: {
      objekt: { include: { customer: true } },
      zugewiesen: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      ersteller: { select: { id: true, firstName: true, lastName: true } },
      kommentare: {
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: { select: { kommentare: true } },
    },
    orderBy: [{ prioritaet: "desc" }, { faelligAm: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(aufgaben);
}

export async function POST(req: NextRequest) {
  const data = await req.json();

  const aufgabe = await prisma.schlosserAufgabe.create({
    data: {
      objektId: data.objektId,
      elementId: data.elementId || null,
      mangelId: data.mangelId || null,
      typ: data.typ || "REPARATUR",
      titel: data.titel,
      beschreibung: data.beschreibung || null,
      prioritaet: data.prioritaet || "NORMAL",
      zugewiesenAn: data.zugewiesenAn || null,
      erstelltVon: data.erstelltVon,
      faelligAm: data.faelligAm ? new Date(data.faelligAm) : null,
    },
    include: {
      objekt: { include: { customer: true } },
      zugewiesen: { select: { id: true, firstName: true, lastName: true } },
      ersteller: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return NextResponse.json(aufgabe, { status: 201 });
}
