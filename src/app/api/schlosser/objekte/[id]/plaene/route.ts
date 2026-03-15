import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const delegate = prisma.schlosserObjektPlan;

    let plaene: { id: string; fileName: string; fileUrl: string; titel: string | null; beschreibung: string | null; createdAt: Date }[];

    if (delegate?.findMany) {
      plaene = await delegate.findMany({
        where: { objektId: id },
        orderBy: { createdAt: "desc" },
      });
    } else {
      plaene = await prisma.$queryRaw`
        SELECT id, "fileName", "fileUrl", titel, beschreibung, "createdAt"
        FROM schlosser_objekt_plaene
        WHERE "objektId" = ${id}
        ORDER BY "createdAt" DESC
      `;
    }

    return NextResponse.json(plaene);
  } catch (err) {
    console.error("Plaene GET Fehler:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Fehler" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await req.json();

    if (!data.fileName || !data.fileUrl) {
      return NextResponse.json({ error: "fileName und fileUrl sind erforderlich" }, { status: 400 });
    }

    const delegate = prisma.schlosserObjektPlan;
    let plan: { id: string; fileName: string; fileUrl: string; titel: string | null; beschreibung: string | null; createdAt: Date };

    if (delegate?.create) {
      plan = await delegate.create({
        data: {
          objektId: id,
          fileName: data.fileName,
          fileUrl: data.fileUrl,
          titel: data.titel || null,
          beschreibung: data.beschreibung || null,
        },
      });
    } else {
      const planId = randomUUID();
      const [row] = await prisma.$queryRaw<
        { id: string; fileName: string; fileUrl: string; titel: string | null; beschreibung: string | null; createdAt: Date }[]
      >`
        INSERT INTO schlosser_objekt_plaene (id, "objektId", "fileName", "fileUrl", titel, beschreibung, "createdAt")
        VALUES (${planId}, ${id}, ${data.fileName}, ${data.fileUrl}, ${data.titel || null}, ${data.beschreibung || null}, NOW())
        RETURNING id, "fileName", "fileUrl", titel, beschreibung, "createdAt"
      `;
      if (!row) throw new Error("Insert fehlgeschlagen");
      plan = row;
    }

    return NextResponse.json(plan, { status: 201 });
  } catch (err) {
    console.error("Plaene POST Fehler:", err);
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const data = await req.json();

  const plan = await prisma.schlosserObjektPlan.update({
    where: { id: data.id },
    data: {
      titel: data.titel ?? undefined,
      beschreibung: data.beschreibung ?? undefined,
    },
  });

  return NextResponse.json(plan);
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const planId = body.planId;
  if (!planId) return NextResponse.json({ error: "planId fehlt" }, { status: 400 });
  await prisma.schlosserObjektPlan.delete({ where: { id: planId } });
  return NextResponse.json({ ok: true });
}
