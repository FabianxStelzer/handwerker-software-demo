import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const userId = (formData.get("userId") as string) || session.user.id;

  const isAdmin = (session.user as { role?: string }).role === "ADMIN";
  if (userId !== session.user.id && !isAdmin) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  if (!file || file.size === 0) return NextResponse.json({ error: "Keine Datei" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name).toLowerCase() || ".jpg";
  const fileName = `avatar_${userId}_${Date.now()}${ext}`;
  const dir = path.join(DATA_DIR, "uploads", "avatars");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), buffer);

  const avatarUrl = `/api/uploads/avatars/${fileName}`;
  await prisma.user.update({ where: { id: userId }, data: { avatarUrl } });

  return NextResponse.json({ avatarUrl });
}
