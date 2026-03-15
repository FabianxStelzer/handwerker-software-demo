import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const elemente = await prisma.schlosserElement.findMany({
      where: { objektId: id },
      include: {
        pruefungen: {
          orderBy: { datum: "desc" },
          take: 1,
          include: { maengel: true },
        },
      },
      orderBy: { bezeichnung: "asc" },
    });

    return NextResponse.json(elemente);
  } catch (err) {
    console.error("Elemente GET Fehler:", err);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await req.json();

  const element = await prisma.schlosserElement.create({
    data: {
      objektId: id,
      typ: data.typ || "TUER",
      bezeichnung: data.bezeichnung,
      standort: data.standort || null,
      hersteller: data.hersteller || null,
      baujahr: data.baujahr ? parseInt(data.baujahr) : null,
      seriennummer: data.seriennummer || null,
      notizen: data.notizen || null,
    },
  });

  return NextResponse.json(element, { status: 201 });
}
