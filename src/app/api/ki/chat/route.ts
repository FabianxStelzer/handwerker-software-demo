import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chatWithAi } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const conversationId = req.nextUrl.searchParams.get("conversationId");
  if (!conversationId) return NextResponse.json([]);

  const messages = await prisma.aIMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { conversationId, content } = body;

  await prisma.aIMessage.create({
    data: { conversationId, role: "user", content },
  });

  let reply: string;
  let usedModel = "";

  try {
    const prevMessages = await prisma.aIMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    const aiMessages = [
      { role: "system" as const, content: "Du bist ein hilfreicher Assistent für Handwerksbetriebe. Antworte auf Deutsch. Du kennst dich mit DIN-Normen, Baurecht, handwerklichen Berechnungen, Heizung, Sanitär, Elektro und Bau aus." },
      ...prevMessages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];

    const result = await chatWithAi(aiMessages);
    reply = result.content;
    usedModel = result.model;
  } catch (e: any) {
    reply = `Fehler: ${e.message}`;
  }

  const aiMessage = await prisma.aIMessage.create({
    data: { conversationId, role: "assistant", content: reply },
  });

  await prisma.aIConversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ ...aiMessage, usedModel });
}
