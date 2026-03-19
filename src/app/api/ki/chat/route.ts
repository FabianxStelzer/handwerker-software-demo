import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chatWithAi } from "@/lib/ai";
import { writeFile, mkdir, readFile } from "fs/promises";
import path from "path";
import * as XLSX from "xlsx";

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

    extractedText = await extractFileContent(buffer, file.name, ext);
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

async function extractFileContent(
  buffer: Buffer,
  fileName: string,
  ext: string
): Promise<string> {
  try {
    if ([".txt", ".md", ".csv", ".json", ".xml", ".html", ".css", ".js", ".ts", ".log"].includes(ext)) {
      return buffer.toString("utf-8").slice(0, 50000);
    }

    if ([".xlsx", ".xls"].includes(ext)) {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const lines: string[] = [];
      for (const sheetName of workbook.SheetNames) {
        lines.push(`[Blatt: ${sheetName}]`);
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet, { FS: "\t" });
        lines.push(csv);
      }
      return lines.join("\n").slice(0, 50000);
    }

    if (ext === ".x31") {
      const xmlContent = buffer.toString("utf-8");
      const items: string[] = [];
      const regex = /<Item[^>]*>([\s\S]*?)<\/Item>/gi;
      let match;
      while ((match = regex.exec(xmlContent)) !== null) {
        const block = match[1];
        const qty = block.match(/<Qty>(.*?)<\/Qty>/i)?.[1] || "";
        const desc = block.match(/<Description>(.*?)<\/Description>/i)?.[1] || "";
        const unit = block.match(/<QU>(.*?)<\/QU>/i)?.[1] || "";
        const up = block.match(/<UP>(.*?)<\/UP>/i)?.[1] || "";
        items.push(`${desc} | Menge: ${qty} ${unit} | Preis: ${up}`);
      }
      if (items.length > 0) return `GAEB X31 Positionen:\n${items.join("\n")}`.slice(0, 50000);
      return xmlContent.slice(0, 50000);
    }

    if (ext === ".d11") {
      return buffer.toString("utf-8").slice(0, 50000);
    }

    if (ext === ".pdf") {
      return `[PDF-Datei: ${fileName} – ${(buffer.length / 1024).toFixed(0)} KB. PDF-Textextraktion ist serverseitig begrenzt. Bitte beschreibe, was du über den Inhalt wissen möchtest.]`;
    }

    if ([".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext)) {
      return `[Bild-Datei: ${fileName} – ${(buffer.length / 1024).toFixed(0)} KB]`;
    }

    return `[Datei: ${fileName} – ${(buffer.length / 1024).toFixed(0)} KB, Typ: ${ext}]`;
  } catch (e: any) {
    return `[Fehler beim Lesen der Datei ${fileName}: ${e.message}]`;
  }
}
