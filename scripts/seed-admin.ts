/**
 * Erstellt/aktualisiert nur den Admin-User (admin@handwerker.de / admin123).
 * Nutzen wenn der volle Seed wegen Duplikaten fehlschlägt.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
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
  console.log("Admin aktualisiert:", admin.email);
  console.log("Login: admin@handwerker.de / admin123");
}

main()
  .catch((e) => {
    console.error("Fehler:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
