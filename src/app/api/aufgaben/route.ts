import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!role || (role !== "ADMIN" && role !== "BAULEITER")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const status = req.nextUrl.searchParams.get("status");
  const assigneeId = req.nextUrl.searchParams.get("assigneeId");

  const where: Record<string, unknown> = {};
  if (status && status !== "all") where.status = status;
  if (assigneeId) where.assigneeId = assigneeId;

  const tasks = await prisma.projectTask.findMany({
    where,
    include: {
      project: { select: { id: true, projectNumber: true, name: true, status: true } },
    },
    orderBy: [{ status: "asc" }, { priority: "asc" }, { dueDate: "asc" }],
  });

  return NextResponse.json(tasks);
}
