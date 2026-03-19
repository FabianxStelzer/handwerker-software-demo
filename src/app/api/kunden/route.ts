import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search") || "";

  const where = search
    ? {
        OR: [
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName: { contains: search, mode: "insensitive" as const } },
          { company: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { city: { contains: search, mode: "insensitive" as const } },
          { customerNumber: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { projects: true, orders: true } } },
  });

  return NextResponse.json(customers);
}

async function getNextCustomerNumber(): Promise<string> {
  const settings = await prisma.companySettings.findFirst();
  const nextVal = settings?.nkKundenNaechster ?? 10064;

  await prisma.companySettings.updateMany({
    data: { nkKundenNaechster: nextVal + 1 },
  });

  return String(nextVal);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const customerNumber = await getNextCustomerNumber();

  const customer = await prisma.customer.create({
    data: {
      customerNumber,
      type: body.type || "PRIVAT",
      company: body.company || null,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email || null,
      phone: body.phone || null,
      street: body.street || null,
      zip: body.zip || null,
      city: body.city || null,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(customer, { status: 201 });
}
