import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;

  const material = await prisma.projectMaterial.create({
    data: {
      projectId: id,
      catalogMaterialId: body.catalogMaterialId || null,
      name: body.name,
      description: body.description || null,
      imageUrl: body.imageUrl || null,
      unit: body.unit || "STUECK",
      quantityPlanned: body.quantityPlanned || 0,
      quantityUsed: body.quantityUsed || 0,
      pricePerUnit: body.pricePerUnit || 0,
      notes: body.notes || null,
      isAdditional: body.isAdditional || false,
      requestedById: body.isAdditional ? userId : null,
      requestedAt: body.isAdditional ? new Date() : null,
    },
    include: { catalogMaterial: true, requestedBy: { select: { firstName: true, lastName: true } } },
  });

  if (body.isAdditional && userId) {
    const project = await prisma.project.findUnique({ where: { id }, select: { name: true, projectNumber: true } });
    const admins = await prisma.user.findMany({ where: { role: { in: ["ADMIN", "BAULEITER"] }, isActive: true, id: { not: userId } }, select: { id: true } });

    const requesterName = material.requestedBy
      ? `${material.requestedBy.firstName} ${material.requestedBy.lastName}`
      : "Ein Mitarbeiter";

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: "Neues Material angefordert",
          message: `${requesterName} benötigt "${material.name}" (${body.quantityPlanned || 0} ${body.unit || "Stk"}) für ${project?.name || "Projekt"}`,
          link: `/projekte/${id}?tab=material`,
        },
      });
    }
  }

  return NextResponse.json(material, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.quantityPlanned !== undefined) data.quantityPlanned = body.quantityPlanned;
  if (body.quantityUsed !== undefined) data.quantityUsed = body.quantityUsed;
  if (body.pricePerUnit !== undefined) data.pricePerUnit = body.pricePerUnit;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.isInstalled !== undefined) {
    data.isInstalled = body.isInstalled;
    data.installedAt = body.isInstalled ? new Date() : null;
  }

  const material = await prisma.projectMaterial.update({
    where: { id: body.id },
    data,
    include: { catalogMaterial: true, requestedBy: { select: { firstName: true, lastName: true } } },
  });

  return NextResponse.json(material);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await prisma.projectMaterial.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
