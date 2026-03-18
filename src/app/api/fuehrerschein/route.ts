import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const DATA_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "data");

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const role = (session.user as any).role;
  const userId = req.nextUrl.searchParams.get("userId");

  if (role === "ADMIN" || role === "BAULEITER") {
    const uploads = await prisma.licenseUpload.findMany({
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { uploadedAt: "desc" },
    });
    return NextResponse.json(uploads);
  }

  const uploads = await prisma.licenseUpload.findMany({
    where: { userId: session.user.id },
    orderBy: { uploadedAt: "desc" },
  });
  return NextResponse.json(uploads);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Keine Datei" }, { status: 400 });

  const dir = path.join(DATA_DIR, "uploads", "fuehrerschein");
  await mkdir(dir, { recursive: true });

  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${session.user.id}_${Date.now()}.${ext}`;
  const filePath = path.join(dir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const imageUrl = `/api/uploads/fuehrerschein/${fileName}`;
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 6);

  const upload = await prisma.licenseUpload.create({
    data: {
      userId: session.user.id,
      imageUrl,
      expiresAt,
    },
  });

  return NextResponse.json(upload, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!role || (role !== "ADMIN" && role !== "BAULEITER")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const body = await req.json();
  if (body.action === "verify") {
    await prisma.licenseUpload.update({
      where: { id: body.id },
      data: { verified: true, verifiedBy: session!.user!.id },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!role || (role !== "ADMIN" && role !== "BAULEITER")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const { id } = await req.json();
  await prisma.licenseUpload.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
