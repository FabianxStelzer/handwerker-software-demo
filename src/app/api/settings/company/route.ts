import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

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
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

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
          lunchBreakMinutes: body.lunchBreakMinutes ?? 30,
          workHoursPerDay: body.workHoursPerDay ?? 8,
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
          lunchBreakMinutes: body.lunchBreakMinutes !== undefined ? (parseInt(body.lunchBreakMinutes) || 0) : undefined,
          workHoursPerDay: body.workHoursPerDay !== undefined ? (parseFloat(body.workHoursPerDay) || 8) : undefined,
          catalogApiKey: body.catalogApiKey !== undefined ? body.catalogApiKey : undefined,
          logoUrl: body.logoUrl !== undefined ? body.logoUrl : undefined,
          website: body.website !== undefined ? body.website : undefined,
          fax: body.fax !== undefined ? body.fax : undefined,
          instagram: body.instagram !== undefined ? body.instagram : undefined,
          hourlyRate: body.hourlyRate !== undefined ? (parseFloat(body.hourlyRate) || 55) : undefined,
          gocardlessSecretId: body.gocardlessSecretId !== undefined ? body.gocardlessSecretId : undefined,
          gocardlessSecretKey: body.gocardlessSecretKey !== undefined ? body.gocardlessSecretKey : undefined,
          aiChatProviderId: body.aiChatProviderId !== undefined ? (body.aiChatProviderId || null) : undefined,
          aiAufmassProviderId: body.aiAufmassProviderId !== undefined ? (body.aiAufmassProviderId || null) : undefined,
          aiChatSystemPrompt: body.aiChatSystemPrompt !== undefined ? (body.aiChatSystemPrompt || null) : undefined,
          aiAufmassSystemPrompt: body.aiAufmassSystemPrompt !== undefined ? (body.aiAufmassSystemPrompt || null) : undefined,
        },
      });
    }
    return NextResponse.json(settings);
  } catch (err) {
    console.error("Company settings PUT:", err);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}
