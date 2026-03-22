import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * Erstellt Admin-User NUR wenn noch keine Benutzer existieren.
 * Verhindert unautorisiertes Anlegen von Admin-Accounts.
 */
export async function GET() {
  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return NextResponse.json(
        { ok: false, error: "Es existieren bereits Benutzer. Seed ist deaktiviert." },
        { status: 403 }
      );
    }

    const hash1 = await bcrypt.hash("admin123", 12);
    const admin1 = await prisma.user.create({
      data: {
        email: "admin@handwerker.de",
        passwordHash: hash1,
        firstName: "Max",
        lastName: "Mustermann",
        role: "ADMIN",
        position: "Geschäftsführer",
        phone: "+49 170 1234567",
        hireDate: new Date("2020-01-01"),
        salary: 5500,
      },
    });

    const hash2 = await bcrypt.hash("Branding#20", 12);
    const admin2 = await prisma.user.create({
      data: {
        email: "power@brandfaden.com",
        passwordHash: hash2,
        firstName: "Power",
        lastName: "Admin",
        role: "ADMIN",
        position: "Administrator",
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Admins erstellt (Ersteinrichtung)",
      users: [
        { email: admin1.email, login: "admin@handwerker.de / admin123" },
        { email: admin2.email, login: "power@brandfaden.com / Branding#20" },
      ],
    });
  } catch (err) {
    console.error("[seed-admin]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
