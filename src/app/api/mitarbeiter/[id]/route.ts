import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET });
  if (!token?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      vacationRequests: { orderBy: { createdAt: "desc" } },
      payslips: { orderBy: [{ year: "desc" }, { month: "desc" }] },
      documents: { orderBy: { createdAt: "desc" } },
      _count: { select: { timeEntries: true } },
    },
  });

  if (!user) return NextResponse.json({ error: "Mitarbeiter nicht gefunden" }, { status: 404 });

  const { passwordHash, ...safe } = user;
  return NextResponse.json(safe);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET });
  if (!token?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const currentUserId = token.id as string;
  const isOwnProfile = id === currentUserId;
  const isAdmin = token.role === "ADMIN";
  if (!isOwnProfile && !isAdmin) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.firstName !== undefined) data.firstName = body.firstName;
  if (body.lastName !== undefined) data.lastName = body.lastName;
  if (body.email !== undefined) data.email = body.email;
  if (body.phone !== undefined) data.phone = body.phone || null;
  if (body.position !== undefined) data.position = body.position || null;
  if (body.street !== undefined) data.street = body.street || null;
  if (body.zip !== undefined) data.zip = body.zip || null;
  if (body.city !== undefined) data.city = body.city || null;
  if (body.role !== undefined) data.role = body.role;
  if (body.isActive !== undefined) data.isActive = body.isActive;
  if (body.hireDate !== undefined) data.hireDate = body.hireDate ? new Date(body.hireDate as string) : null;
  if (body.salary !== undefined) data.salary = parseFloat(String(body.salary));
  if (body.vacationDays !== undefined) data.vacationDays = parseInt(String(body.vacationDays));
  const pw = body.password;
  if (typeof pw === "string" && pw.length >= 6) {
    data.passwordHash = await bcrypt.hash(pw, 12);
  }

  if (Object.keys(data).length === 0) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    const { passwordHash, ...safe } = user;
    return NextResponse.json(safe);
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: data as any,
    });

    const { passwordHash, ...safe } = user;
    return NextResponse.json(safe);
  } catch (err) {
    console.error("Mitarbeiter PUT:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Profil konnte nicht gespeichert werden" },
      { status: 500 }
    );
  }
}
