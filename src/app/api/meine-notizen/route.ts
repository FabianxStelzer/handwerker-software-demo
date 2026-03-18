import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const notes = await prisma.userNote.findMany({
    where: { userId },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json(notes);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const body = await req.json();
  const note = await prisma.userNote.create({
    data: {
      userId,
      title: body.title || "Neue Notiz",
      content: body.content || "",
      color: body.color || "#FEF3C7",
    },
  });

  return NextResponse.json(note, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const body = await req.json();
  if (!body.id) {
    return NextResponse.json({ error: "ID fehlt" }, { status: 400 });
  }

  const existing = await prisma.userNote.findFirst({ where: { id: body.id, userId } });
  if (!existing) {
    return NextResponse.json({ error: "Notiz nicht gefunden" }, { status: 404 });
  }

  const note = await prisma.userNote.update({
    where: { id: body.id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.content !== undefined && { content: body.content }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.pinned !== undefined && { pinned: body.pinned }),
    },
  });

  return NextResponse.json(note);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "ID fehlt" }, { status: 400 });
  }

  const existing = await prisma.userNote.findFirst({ where: { id, userId } });
  if (!existing) {
    return NextResponse.json({ error: "Notiz nicht gefunden" }, { status: 404 });
  }

  await prisma.userNote.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
