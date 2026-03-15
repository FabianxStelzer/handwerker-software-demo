import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateProjectNumber } from "@/lib/numbering";
import { getCustomerDisplayName } from "@/lib/utils";

export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      customer: true,
      _count: { select: { tasks: true, entries: true, documents: true } },
    },
  });

  return NextResponse.json(
    projects.map((p) => ({
      ...p,
      customerName: getCustomerDisplayName(p.customer),
    }))
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const projectNumber = await generateProjectNumber();

  const customer = await prisma.customer.findUnique({ where: { id: body.customerId } });
  const autoName = customer
    ? `${getCustomerDisplayName(customer)} – Projekt`
    : "Neues Projekt";

  const project = await prisma.project.create({
    data: {
      projectNumber,
      name: body.name || autoName,
      description: body.description || null,
      status: body.status || "PLANUNG",
      customerId: body.customerId,
      siteStreet: body.siteStreet || null,
      siteZip: body.siteZip || null,
      siteCity: body.siteCity || null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
    },
    include: { customer: true },
  });

  return NextResponse.json(project, { status: 201 });
}
