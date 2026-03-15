import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const entry = await prisma.projectEntry.create({
    data: {
      projectId: id,
      title: body.title,
      content: body.content,
      date: body.date ? new Date(body.date) : new Date(),
    },
    include: { attachments: true },
  });

  return NextResponse.json(entry, { status: 201 });
}
