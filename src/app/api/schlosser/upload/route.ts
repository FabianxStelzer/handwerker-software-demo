import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const type = formData.get("type") as string | null;

  if (!file) {
    return NextResponse.json({ error: "Keine Datei" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadDir = path.join(process.cwd(), "public", "uploads", type || "allgemein");
  await mkdir(uploadDir, { recursive: true });

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = `${timestamp}_${safeName}`;
  const filePath = path.join(uploadDir, fileName);

  await writeFile(filePath, buffer);

  const url = `/uploads/${type || "allgemein"}/${fileName}`;

  return NextResponse.json({ url, fileName: file.name });
}
