import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * Erstellt/aktualisiert Admin-User.
 * Aufruf: GET /api/auth/seed-admin
 * Erstellt: admin@handwerker.de / admin123 und power@brandfaden.com / Branding#20
 */
export async function GET() {
  try {
    const hash1 = await bcrypt.hash("admin123", 12);
    const admin1 = await prisma.user.upsert({
      where: { email: "admin@handwerker.de" },
      update: { passwordHash: hash1, isActive: true },
      create: {
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
    const admin2 = await prisma.user.upsert({
      where: { email: "power@brandfaden.com" },
      update: { passwordHash: hash2, isActive: true },
      create: {
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
      message: "Admins erstellt/aktualisiert",
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
