import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DocumentTemplateType } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const type = req.nextUrl.searchParams.get("type") as DocumentTemplateType | null;
  const templates = await prisma.documentTemplate.findMany({
    where: type ? { type } : undefined,
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!role || (role !== "ADMIN" && role !== "BAULEITER")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.type || !body.name || !body.html) {
    return NextResponse.json({ error: "type, name und html sind erforderlich" }, { status: 400 });
  }

  if (body.isDefault) {
    await prisma.documentTemplate.updateMany({
      where: { type: body.type, isDefault: true },
      data: { isDefault: false },
    });
  }

  const template = await prisma.documentTemplate.create({
    data: {
      type: body.type,
      name: body.name,
      html: body.html,
      isDefault: body.isDefault ?? false,
    },
  });

  return NextResponse.json(template, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!role || (role !== "ADMIN" && role !== "BAULEITER")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "ID fehlt" }, { status: 400 });

  if (body.setDefault) {
    const existing = await prisma.documentTemplate.findUnique({ where: { id: body.id } });
    if (!existing) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    await prisma.documentTemplate.updateMany({
      where: { type: existing.type, isDefault: true },
      data: { isDefault: false },
    });
    const updated = await prisma.documentTemplate.update({
      where: { id: body.id },
      data: { isDefault: true },
    });
    return NextResponse.json(updated);
  }

  const updated = await prisma.documentTemplate.update({
    where: { id: body.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.html !== undefined && { html: body.html }),
      ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!role || role !== "ADMIN") {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const { id } = await req.json();
  await prisma.documentTemplate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
