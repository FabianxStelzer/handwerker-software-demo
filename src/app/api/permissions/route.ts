import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const isAdmin = (session.user as { role?: string }).role === "ADMIN";
  if (!isAdmin) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, firstName: true, lastName: true, role: true, permissions: true },
    orderBy: { lastName: "asc" },
  });

  return NextResponse.json(users);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const isAdmin = (session.user as { role?: string }).role === "ADMIN";
  if (!isAdmin) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });

  const { userId, permissions } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId erforderlich" }, { status: 400 });

  const user = await prisma.user.update({
    where: { id: userId },
    data: { permissions: JSON.stringify(permissions) },
    select: { id: true, firstName: true, lastName: true, role: true, permissions: true },
  });

  return NextResponse.json(user);
}
