import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const DATA_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "data");

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!role || (role !== "ADMIN" && role !== "BAULEITER")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Keine Datei" }, { status: 400 });

  const allowed = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Nur Bilddateien (PNG, JPG, SVG, WebP) erlaubt" }, { status: 400 });
  }

  const dir = path.join(DATA_DIR, "uploads", "logo");
  await mkdir(dir, { recursive: true });

  const ext = file.name.split(".").pop() || "png";
  const fileName = `firmenlogo_${Date.now()}.${ext}`;
  const filePath = path.join(dir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const logoUrl = `/api/uploads/logo/${fileName}`;

  let settings = await prisma.companySettings.findFirst();
  if (settings) {
    settings = await prisma.companySettings.update({
      where: { id: settings.id },
      data: { logoUrl },
    });
  } else {
    settings = await prisma.companySettings.create({
      data: { logoUrl },
    });
  }

  return NextResponse.json({ logoUrl, settings });
}
