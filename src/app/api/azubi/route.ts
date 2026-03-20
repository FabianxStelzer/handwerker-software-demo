import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const profiles = await prisma.azubiProfile.findMany({
    include: {
      user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true, email: true } },
      schulTage: { orderBy: { date: "asc" } },
      pruefungen: { orderBy: { date: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const reports = await prisma.azubiReport.findMany({
    include: { user: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: [{ year: "desc" }, { weekNumber: "desc" }],
  });

  const employees = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, firstName: true, lastName: true, role: true },
    orderBy: { lastName: "asc" },
  });

  return NextResponse.json({ profiles, reports, employees });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = await req.json();

  if (body.action === "create-profile") {
    const profile = await prisma.azubiProfile.create({
      data: {
        userId: body.userId,
        ausbildungsberuf: body.ausbildungsberuf,
        ausbildungsBeginn: body.ausbildungsBeginn ? new Date(body.ausbildungsBeginn) : null,
        ausbildungsEnde: body.ausbildungsEnde ? new Date(body.ausbildungsEnde) : null,
        ausbilderId: body.ausbilderId || null,
        ausbilderName: body.ausbilderName || null,
        berufsschule: body.berufsschule || null,
        klassenbezeichnung: body.klassenbezeichnung || null,
        ausbildungsJahr: body.ausbildungsJahr || 1,
        notes: body.notes || null,
      },
    });
    return NextResponse.json(profile, { status: 201 });
  }

  if (body.action === "update-profile") {
    const profile = await prisma.azubiProfile.update({
      where: { id: body.profileId },
      data: {
        ausbildungsberuf: body.ausbildungsberuf,
        ausbildungsBeginn: body.ausbildungsBeginn ? new Date(body.ausbildungsBeginn) : null,
        ausbildungsEnde: body.ausbildungsEnde ? new Date(body.ausbildungsEnde) : null,
        ausbilderId: body.ausbilderId || null,
        ausbilderName: body.ausbilderName || null,
        berufsschule: body.berufsschule || null,
        klassenbezeichnung: body.klassenbezeichnung || null,
        ausbildungsJahr: body.ausbildungsJahr || 1,
        notes: body.notes || null,
      },
    });
    return NextResponse.json(profile);
  }

  if (body.action === "add-schultag") {
    const tag = await prisma.azubiSchulTag.create({
      data: {
        profileId: body.profileId,
        date: new Date(body.date),
        thema: body.thema || null,
        notes: body.notes || null,
      },
    });
    return NextResponse.json(tag, { status: 201 });
  }

  if (body.action === "delete-schultag") {
    await prisma.azubiSchulTag.delete({ where: { id: body.schultagId } });
    return NextResponse.json({ success: true });
  }

  if (body.action === "add-pruefung") {
    const pruefung = await prisma.azubiPruefung.create({
      data: {
        profileId: body.profileId,
        title: body.title,
        date: new Date(body.date),
        type: body.type || null,
        result: body.result || null,
        passed: body.passed ?? null,
        notes: body.notes || null,
      },
    });
    return NextResponse.json(pruefung, { status: 201 });
  }

  if (body.action === "update-pruefung") {
    const pruefung = await prisma.azubiPruefung.update({
      where: { id: body.pruefungId },
      data: {
        title: body.title,
        date: new Date(body.date),
        type: body.type || null,
        result: body.result || null,
        passed: body.passed ?? null,
        notes: body.notes || null,
      },
    });
    return NextResponse.json(pruefung);
  }

  if (body.action === "delete-pruefung") {
    await prisma.azubiPruefung.delete({ where: { id: body.pruefungId } });
    return NextResponse.json({ success: true });
  }

  if (body.action === "save-report") {
    const existing = await prisma.azubiReport.findUnique({
      where: { userId_weekNumber_year: { userId: body.userId, weekNumber: body.weekNumber, year: body.year } },
    });
    if (existing) {
      const report = await prisma.azubiReport.update({
        where: { id: existing.id },
        data: {
          startDate: new Date(body.startDate),
          endDate: new Date(body.endDate),
          betrieblich: body.betrieblich || null,
          schulisch: body.schulisch || null,
          unterweisungen: body.unterweisungen || null,
          stunden: body.stunden ? parseFloat(body.stunden) : null,
          status: body.status || existing.status,
        },
      });
      return NextResponse.json(report);
    }
    const report = await prisma.azubiReport.create({
      data: {
        userId: body.userId,
        weekNumber: body.weekNumber,
        year: body.year,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        betrieblich: body.betrieblich || null,
        schulisch: body.schulisch || null,
        unterweisungen: body.unterweisungen || null,
        stunden: body.stunden ? parseFloat(body.stunden) : null,
        status: body.status || "ENTWURF",
      },
    });
    return NextResponse.json(report, { status: 201 });
  }

  if (body.action === "submit-report") {
    await prisma.azubiReport.update({
      where: { id: body.reportId },
      data: { status: "EINGEREICHT" },
    });
    return NextResponse.json({ success: true });
  }

  if (body.action === "approve-report") {
    await prisma.azubiReport.update({
      where: { id: body.reportId },
      data: { status: "GENEHMIGT", approvedAt: new Date(), approvedBy: session.user.id, rejectionReason: null },
    });
    return NextResponse.json({ success: true });
  }

  if (body.action === "reject-report") {
    await prisma.azubiReport.update({
      where: { id: body.reportId },
      data: { status: "ABGELEHNT", rejectionReason: body.reason || null, approvedAt: null, approvedBy: null },
    });
    return NextResponse.json({ success: true });
  }

  if (body.action === "delete-report") {
    await prisma.azubiReport.delete({ where: { id: body.reportId } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
}
