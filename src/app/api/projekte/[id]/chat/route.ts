import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const message = await prisma.projectChatMessage.create({
    data: {
      projectId: id,
      userId: body.userId,
      content: body.content,
    },
    include: { user: { select: { id: true, firstName: true, lastName: true } } },
  });

  return NextResponse.json(message, { status: 201 });
}
