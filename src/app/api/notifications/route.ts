import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json([]);

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(notifications);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();

  if (body.markAllRead && body.userId) {
    await prisma.notification.updateMany({
      where: { userId: body.userId, read: false },
      data: { read: true },
    });
    return NextResponse.json({ success: true });
  }

  if (body.id) {
    await prisma.notification.update({
      where: { id: body.id },
      data: { read: true },
    });
  }

  return NextResponse.json({ success: true });
}
