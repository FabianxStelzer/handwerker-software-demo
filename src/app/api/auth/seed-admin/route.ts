import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * Erstellt/aktualisiert den Admin-User (admin@handwerker.de / admin123).
 * Aufruf: GET /api/auth/seed-admin
 */
export async function GET() {
  try {
    const hash = await bcrypt.hash("admin123", 12);
    const admin = await prisma.user.upsert({
      where: { email: "admin@handwerker.de" },
      update: { passwordHash: hash, isActive: true },
      create: {
        email: "admin@handwerker.de",
        passwordHash: hash,
        firstName: "Max",
        lastName: "Mustermann",
        role: "ADMIN",
        position: "Geschäftsführer",
        phone: "+49 170 1234567",
        hireDate: new Date("2020-01-01"),
        salary: 5500,
      },
    });
    return NextResponse.json({
      ok: true,
      message: "Admin erstellt/aktualisiert",
      email: admin.email,
      login: "admin@handwerker.de / admin123",
    });
  } catch (err) {
    console.error("[seed-admin]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
