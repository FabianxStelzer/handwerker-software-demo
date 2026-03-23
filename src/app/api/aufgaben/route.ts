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

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (!role || (role !== "ADMIN" && role !== "BAULEITER")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { title, description, assignedToId, projectId, priority, dueDate } = body;

    if (!title) {
      return NextResponse.json({ error: "Titel ist erforderlich" }, { status: 400 });
    }
    if (!projectId) {
      return NextResponse.json({ error: "Projekt ist erforderlich" }, { status: 400 });
    }

    const task = await prisma.projectTask.create({
      data: {
        title,
        description: description || null,
        assigneeId: assignedToId || null,
        projectId,
        priority: priority || "MITTEL",
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        project: { select: { id: true, projectNumber: true, name: true } },
      },
    });

    return NextResponse.json(task);
  } catch (e) {
    console.error("Aufgaben POST:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Aufgabe konnte nicht erstellt werden" },
      { status: 500 }
    );
  }
}
