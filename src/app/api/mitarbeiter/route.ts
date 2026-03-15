import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const role = req.nextUrl.searchParams.get("role");

  const users = await prisma.user.findMany({
    orderBy: { lastName: "asc" },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      phone: true,
      position: true,
      avatarUrl: true,
      isActive: true,
      createdAt: true,
      hireDate: role === "ADMIN" ? true : false,
      salary: role === "ADMIN" ? true : false,
      vacationDays: true,
    },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const hash = await bcrypt.hash(body.password || "changeme123", 12);

  const user = await prisma.user.create({
    data: {
      email: body.email,
      passwordHash: hash,
      firstName: body.firstName,
      lastName: body.lastName,
      role: body.role || "MITARBEITER",
      phone: body.phone || null,
      position: body.position || null,
      hireDate: body.hireDate ? new Date(body.hireDate) : null,
      salary: body.salary ? parseFloat(body.salary) : null,
      vacationDays: body.vacationDays ? parseInt(body.vacationDays) : 30,
    },
  });

  return NextResponse.json(user, { status: 201 });
}
