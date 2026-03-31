import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const agreements = await prisma.agreement.findMany({
    include: {
      customer: { select: { id: true, firstName: true, lastName: true, company: true } },
      project: { select: { id: true, name: true, projectNumber: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(agreements);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = await req.json();

  const agreement = await prisma.agreement.create({
    data: {
      title: body.title || "Neue Vereinbarung",
      status: body.status || "ENTWURF",
      isTemplate: body.isTemplate ?? false,
      customerId: body.customerId || null,
      projectId: body.projectId || null,
      blocks: body.blocks || "[]",
      createdById: session.user.id,
    },
    include: {
      customer: { select: { id: true, firstName: true, lastName: true, company: true } },
      project: { select: { id: true, name: true, projectNumber: true } },
    },
  });

  return NextResponse.json(agreement, { status: 201 });
}
