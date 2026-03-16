import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const LEXWARE_API = "https://api.lexware.io";

async function getApiKey() {
  const settings = await prisma.companySettings.findFirst();
  return settings?.lexofficeApiKey ?? null;
}

/** GET: Prüft Verbindung und gibt Status zurück */
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET });
  if (!token?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const apiKey = await getApiKey();
  if (!apiKey) {
    return NextResponse.json({ connected: false, message: "Kein API-Schlüssel hinterlegt" });
  }

  try {
    const res = await fetch(`${LEXWARE_API}/v1/voucherlist?voucherType=invoice&voucherStatus=open&page=0&size=1`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      return NextResponse.json({
        connected: false,
        message: res.status === 401 ? "Ungültiger API-Schlüssel" : `Lexware API Fehler: ${res.status}`,
      });
    }
    return NextResponse.json({
      connected: true,
      organizationName: "Lexoffice",
    });
  } catch (e) {
    return NextResponse.json({
      connected: false,
      message: "Verbindung fehlgeschlagen",
    });
  }
}

/** PUT: API-Schlüssel speichern */
export async function PUT(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET });
  if (!token?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { apiKey } = await req.json();
  if (typeof apiKey !== "string") {
    return NextResponse.json({ error: "apiKey erforderlich" }, { status: 400 });
  }

  try {
    let settings = await prisma.companySettings.findFirst();
    if (!settings) {
      settings = await prisma.companySettings.create({
        data: { lexofficeApiKey: apiKey.trim() || null },
      });
    } else {
      settings = await prisma.companySettings.update({
        where: { id: settings.id },
        data: { lexofficeApiKey: apiKey.trim() || null },
      });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Lexoffice API key save:", err);
    return NextResponse.json({ error: "Fehler beim Speichern" }, { status: 500 });
  }
}
