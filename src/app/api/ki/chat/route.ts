import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chatWithAi } from "@/lib/ai";
import { extractFileContent } from "@/lib/file-extract";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

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
  const contentType = req.headers.get("content-type") || "";

  let conversationId: string;
  let content: string;
  let file: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    conversationId = formData.get("conversationId") as string;
    content = (formData.get("content") as string) || "";
    file = formData.get("file") as File | null;
  } else {
    const body = await req.json();
    conversationId = body.conversationId;
    content = body.content;
  }

  let fileName: string | null = null;
  let fileUrl: string | null = null;
  let fileType: string | null = null;
  let extractedText = "";

  if (file && file.size > 0) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name).toLowerCase();
    fileType = ext.replace(".", "");
    fileName = file.name;

    const uploadDir = path.join(process.cwd(), "uploads", "ki-dateien");
    await mkdir(uploadDir, { recursive: true });
    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = path.join(uploadDir, safeName);
    await writeFile(filePath, buffer);
    fileUrl = `/api/uploads/ki-dateien/${safeName}`;

    extractedText = await extractFileContent(buffer, file.name);
  }

  const userContent = extractedText
    ? `${content}\n\n--- Datei: ${fileName} ---\n${extractedText}`
    : content;

  const userMsg = await prisma.aIMessage.create({
    data: {
      conversationId,
      role: "user",
      content,
      fileName,
      fileUrl,
      fileType,
    },
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
      {
        role: "system" as const,
        content:
          "Du bist ein hilfreicher Assistent für Handwerksbetriebe. Antworte auf Deutsch. Du kennst dich mit DIN-Normen, Baurecht, handwerklichen Berechnungen, Heizung, Sanitär, Elektro und Bau aus. Wenn der Benutzer eine Datei hochlädt, analysiere den Inhalt gründlich und beantworte Fragen dazu.",
      },
      ...prevMessages.map((m) => {
        let msgContent = m.content;
        if (m.id === userMsg.id && extractedText) {
          msgContent = userContent;
        }
        return { role: m.role as "user" | "assistant", content: msgContent };
      }),
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
