import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = process.env.DATA_DIR || process.env.NEXT_PUBLIC_DATA_DIR || path.join(process.cwd(), "data");

export async function GET() {
  const docs = await prisma.belegDokument.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(docs);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;

  const formData = await req.formData();
  const files = formData.getAll("files") as File[];

  if (!files || files.length === 0) {
    return NextResponse.json({ error: "Keine Dateien" }, { status: 400 });
  }

  const uploadDir = path.join(DATA_DIR, "uploads", "belege");
  await mkdir(uploadDir, { recursive: true });

  const results = [];

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const safeName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = path.join(uploadDir, safeName);

    await writeFile(filePath, buffer);

    const doc = await prisma.belegDokument.create({
      data: {
        fileName: file.name,
        fileUrl: `/uploads/belege/${safeName}`,
        fileType: ext,
        fileSize: buffer.length,
        uploadedById: userId || null,
      },
    });

    results.push(doc);
  }

  return NextResponse.json(results, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await prisma.belegDokument.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
