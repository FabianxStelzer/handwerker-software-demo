import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = process.env.DATA_DIR || process.env.NEXT_PUBLIC_DATA_DIR || path.join(process.cwd(), "data");

export async function GET() {
  const checks = await prisma.belegCheck.findMany({
    include: { documents: true, createdBy: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(checks);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;

  const formData = await req.formData();
  const title = formData.get("title") as string | null;

  const roles = formData.getAll("roles") as string[];
  const files = formData.getAll("files") as File[];

  if (!files || files.length < 2) {
    return NextResponse.json({ error: "Mindestens 2 Dokumente erforderlich (z.B. Angebot + Rechnung)" }, { status: 400 });
  }

  const uploadDir = path.join(DATA_DIR, "uploads", "belegpruefung");
  await mkdir(uploadDir, { recursive: true });

  const check = await prisma.belegCheck.create({
    data: {
      title: title || `Prüfung vom ${new Date().toLocaleDateString("de-DE")}`,
      createdById: userId || null,
    },
  });

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const role = roles[i] || (i === 0 ? "angebot" : "rechnung");
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const safeName = `${check.id}_${role}_${Date.now()}.${ext}`;
    const filePath = path.join(uploadDir, safeName);

    await writeFile(filePath, buffer);

    await prisma.belegCheckDoc.create({
      data: {
        belegCheckId: check.id,
        role,
        fileName: file.name,
        fileUrl: `/uploads/belegpruefung/${safeName}`,
        fileType: ext,
        fileSize: buffer.length,
      },
    });
  }

  const result = await prisma.belegCheck.findUnique({
    where: { id: check.id },
    include: { documents: true },
  });

  return NextResponse.json(result, { status: 201 });
}
