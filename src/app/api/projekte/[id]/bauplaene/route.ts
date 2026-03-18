import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const DATA_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "data");

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "Allgemein";

    if (!file) {
      return NextResponse.json({ error: "Keine Datei" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name);
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const uploadDir = path.join(DATA_DIR, "uploads", "bauplaene");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, fileName), buffer);

    const fileUrl = `/api/uploads/bauplaene/${fileName}`;

    const blueprint = await prisma.projectBlueprint.create({
      data: {
        projectId: id,
        name: file.name,
        fileUrl,
        folder,
      },
    });

    return NextResponse.json(blueprint, { status: 201 });
  } catch (err) {
    console.error("Bauplan Upload Fehler:", err);
    return NextResponse.json({ error: "Upload fehlgeschlagen" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await prisma.projectBlueprint.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
