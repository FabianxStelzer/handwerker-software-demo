import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const year = parseInt(req.nextUrl.searchParams.get("year") || "") || new Date().getFullYear();
  const statusFilter = req.nextUrl.searchParams.get("status");

  const where: Record<string, unknown> = {
    startDate: { lt: new Date(year + 1, 0, 1) },
    endDate: { gte: new Date(year, 0, 1) },
  };
  if (statusFilter && statusFilter !== "all") {
    where.status = statusFilter;
  } else if (!statusFilter) {
    where.status = { in: ["GENEHMIGT", "AUSSTEHEND"] };
  }

  const requests = await prisma.vacationRequest.findMany({
    where,
    include: {
      user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
    },
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json(requests);
}
