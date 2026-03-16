import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const payslips = await prisma.payslip.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });
  return NextResponse.json(payslips);
}
