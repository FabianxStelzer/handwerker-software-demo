import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json([]);

  const conversations = await prisma.aIConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { messages: true } } },
  });

  return NextResponse.json(conversations);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const conversation = await prisma.aIConversation.create({
    data: {
      userId: body.userId,
      title: body.title || "Neues Gespräch",
      model: body.model || "gpt-4",
      folder: body.folder || null,
    },
  });

  return NextResponse.json(conversation, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  await prisma.aIConversation.delete({ where: { id: body.id } });
  return NextResponse.json({ success: true });
}
