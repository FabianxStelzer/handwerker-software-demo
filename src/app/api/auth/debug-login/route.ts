import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";

/**
 * Debug-Endpoint: Prüft ob Login mit admin@handwerker.de / admin123 funktionieren würde.
 * Nur in Entwicklung nutzen – in Produktion entfernen!
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Nicht in Produktion" }, { status: 403 });
  }

  const checks: Record<string, string | boolean> = {};

  // 1. AUTH_SECRET
  checks.AUTH_SECRET = !!(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET);

  // 2. Datenbank-Verbindung & User
  try {
    const user = await prisma.user.findUnique({
      where: { email: "admin@handwerker.de" },
    });

    if (!user) {
      checks.userExists = false;
      checks.hint = "User nicht gefunden. Führe aus: npm run db:seed";
      return NextResponse.json(checks);
    }

    checks.userExists = true;
    checks.userActive = user.isActive;

    // 3. Passwort-Check
    const isValid = await compare("admin123", user.passwordHash);
    checks.passwordValid = isValid;

    if (!isValid) {
      checks.hint = "Passwort stimmt nicht. Führe aus: npm run db:seed (aktualisiert Admin-Passwort)";
    }
  } catch (err) {
    checks.dbError = err instanceof Error ? err.message : String(err);
    checks.hint = "Datenbank-Fehler. Prüfe DATABASE_URL und ob PostgreSQL läuft.";
  }

  return NextResponse.json(checks);
}
