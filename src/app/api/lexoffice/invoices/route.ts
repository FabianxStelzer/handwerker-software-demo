import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const LEXWARE_API = "https://api.lexware.io";

async function getApiKey() {
  const settings = await prisma.companySettings.findFirst();
  return settings?.lexofficeApiKey ?? null;
}

/** GET: Rechnungen von Lexoffice abrufen */
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET });
  if (!token?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const apiKey = await getApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "Lexoffice nicht verbunden" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page") ?? "0";
  const size = searchParams.get("size") ?? "25";

  try {
    const res = await fetch(
      `${LEXWARE_API}/v1/voucherlist?voucherType=invoice&voucherStatus=draft,open,paid,voided,overdue&page=${page}&size=${size}&sort=voucherDate,desc`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
      }
    );
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: res.status === 401 ? "Ungültiger API-Schlüssel" : `Lexware API: ${res.status}` },
        { status: res.status >= 500 ? 502 : res.status }
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    console.error("Lexoffice invoices fetch:", e);
    return NextResponse.json({ error: "Verbindung fehlgeschlagen" }, { status: 502 });
  }
}
