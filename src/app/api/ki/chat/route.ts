import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  const { conversationId, content, model } = body;

  await prisma.aIMessage.create({
    data: { conversationId, role: "user", content },
  });

  let reply = "KI-Antwort: Um den KI-Assistenten zu nutzen, konfigurieren Sie bitte Ihren API-Schlüssel in der .env-Datei (OPENAI_API_KEY oder ANTHROPIC_API_KEY).";

  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;

  if (hasOpenAI && (model === "gpt-4" || model === "gpt-3.5-turbo")) {
    try {
      const { openai } = await import("@ai-sdk/openai");
      const { generateText } = await import("ai");
      const result = await generateText({
        model: openai(model),
        system: "Du bist ein hilfreicher Assistent für Handwerksbetriebe. Antworte auf Deutsch. Du kennst dich mit DIN-Normen, Baurecht und handwerklichen Berechnungen aus.",
        prompt: content,
      });
      reply = result.text;
    } catch (e: any) {
      reply = `Fehler bei OpenAI: ${e.message}`;
    }
  } else if (hasAnthropic && model === "claude-3") {
    try {
      const { anthropic } = await import("@ai-sdk/anthropic");
      const { generateText } = await import("ai");
      const result = await generateText({
        model: anthropic("claude-sonnet-4-20250514"),
        system: "Du bist ein hilfreicher Assistent für Handwerksbetriebe. Antworte auf Deutsch.",
        prompt: content,
      });
      reply = result.text;
    } catch (e: any) {
      reply = `Fehler bei Anthropic: ${e.message}`;
    }
  }

  const aiMessage = await prisma.aIMessage.create({
    data: { conversationId, role: "assistant", content: reply },
  });

  await prisma.aIConversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json(aiMessage);
}
