import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET });
  if (!token?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  try {
    let settings = await prisma.companySettings.findFirst();
    if (!settings) {
      settings = await prisma.companySettings.create({
        data: {},
      });
    }
    return NextResponse.json(settings);
  } catch (err) {
    console.error("Company settings GET:", err);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET });
  if (!token?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  try {
    const body = await req.json();
    let settings = await prisma.companySettings.findFirst();
    if (!settings) {
      settings = await prisma.companySettings.create({
        data: {
          name: body.name ?? null,
          street: body.street ?? null,
          zip: body.zip ?? null,
          city: body.city ?? null,
          phone: body.phone ?? null,
          email: body.email ?? null,
          taxId: body.taxId ?? null,
          vatId: body.vatId ?? null,
        },
      });
    } else {
      settings = await prisma.companySettings.update({
        where: { id: settings.id },
        data: {
          name: body.name ?? undefined,
          street: body.street ?? undefined,
          zip: body.zip ?? undefined,
          city: body.city ?? undefined,
          phone: body.phone ?? undefined,
          email: body.email ?? undefined,
          taxId: body.taxId ?? undefined,
          vatId: body.vatId ?? undefined,
        },
      });
    }
    return NextResponse.json(settings);
  } catch (err) {
    console.error("Company settings PUT:", err);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}
