import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const [projectTasks, schlosserAufgaben, assignedProjects] = await Promise.all([
    prisma.projectTask.findMany({
      where: {
        assigneeId: userId,
        status: { not: "ERLEDIGT" },
      },
      include: {
        project: {
          select: { id: true, projectNumber: true, name: true, status: true },
        },
      },
      orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
    }),

    prisma.schlosserAufgabe.findMany({
      where: {
        zugewiesenAn: userId,
        status: { notIn: ["ERLEDIGT", "ABGENOMMEN"] },
      },
      include: {
        objekt: { select: { id: true, name: true } },
      },
      orderBy: [{ prioritaet: "desc" }, { faelligAm: "asc" }],
    }),

    prisma.project.findMany({
      where: {
        status: { in: ["AKTIV", "PLANUNG"] },
        OR: [
          { tasks: { some: { assigneeId: userId } } },
          { timeEntries: { some: { userId } } },
        ],
      },
      select: {
        id: true,
        projectNumber: true,
        name: true,
        status: true,
        startDate: true,
        endDate: true,
        customer: { select: { company: true, firstName: true, lastName: true } },
        _count: {
          select: {
            tasks: { where: { assigneeId: userId, status: { not: "ERLEDIGT" } } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return NextResponse.json({ projectTasks, schlosserAufgaben, assignedProjects });
}
