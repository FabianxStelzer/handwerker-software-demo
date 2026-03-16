import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * Erstellt Demo-Daten (Kunden, Projekte, Katalog).
 * Aufruf: GET /api/seed-demo
 */
export async function GET() {
  try {
    const count = await prisma.customer.count();
    if (count > 0) {
      return NextResponse.json({
        ok: true,
        message: "Demo-Daten existieren bereits",
        hint: "Die Datenbank enthält bereits Daten.",
      });
    }

    const adminHash = await bcrypt.hash("admin123", 12);
    const userHash = await bcrypt.hash("user123", 12);

    await prisma.user.upsert({
      where: { email: "admin@handwerker.de" },
      update: { passwordHash: adminHash, isActive: true },
      create: {
        email: "admin@handwerker.de",
        passwordHash: adminHash,
        firstName: "Max",
        lastName: "Mustermann",
        role: "ADMIN",
        position: "Geschäftsführer",
        phone: "+49 170 1234567",
        hireDate: new Date("2020-01-01"),
        salary: 5500,
      },
    });

    await prisma.user.upsert({
      where: { email: "bauleiter@handwerker.de" },
      update: {},
      create: {
        email: "bauleiter@handwerker.de",
        passwordHash: userHash,
        firstName: "Thomas",
        lastName: "Schmidt",
        role: "BAULEITER",
        position: "Bauleiter",
        phone: "+49 170 2345678",
        hireDate: new Date("2021-03-15"),
        salary: 4200,
      },
    });

    await prisma.user.upsert({
      where: { email: "mitarbeiter@handwerker.de" },
      update: {},
      create: {
        email: "mitarbeiter@handwerker.de",
        passwordHash: userHash,
        firstName: "Stefan",
        lastName: "Weber",
        role: "MITARBEITER",
        position: "Dachdecker",
        phone: "+49 170 3456789",
        hireDate: new Date("2022-06-01"),
        salary: 3200,
      },
    });

    const customer1 = await prisma.customer.create({
      data: {
        type: "PRIVAT",
        firstName: "Anna",
        lastName: "Müller",
        email: "anna.mueller@email.de",
        phone: "+49 151 1111111",
        street: "Gartenstr. 12",
        zip: "80331",
        city: "München",
      },
    });

    await prisma.customer.create({
      data: {
        type: "GESCHAEFT",
        company: "Bau GmbH",
        firstName: "Peter",
        lastName: "Fischer",
        email: "fischer@bau-gmbh.de",
        phone: "+49 151 2222222",
        street: "Industriestr. 5",
        zip: "80333",
        city: "München",
      },
    });

    const project = await prisma.project.create({
      data: {
        projectNumber: "PRJ-2026-001",
        name: "Dachsanierung Müller",
        description: "Komplette Neueindeckung des Steildachs inkl. Wärmedämmung",
        status: "AKTIV",
        customerId: customer1.id,
        siteStreet: "Gartenstr. 12",
        siteZip: "80331",
        siteCity: "München",
        startDate: new Date("2026-03-01"),
        endDate: new Date("2026-04-15"),
      },
    });

    await prisma.projectEntry.create({
      data: {
        projectId: project.id,
        title: "Projektstart",
        content: "Gerüst aufgebaut, alte Eindeckung wird morgen abgetragen.",
        date: new Date("2026-03-01"),
      },
    });

    await prisma.catalogMaterial.createMany({
      data: [
        { name: "Dachziegel Braas Frankfurter Pfanne", unit: "STUECK", pricePerUnit: 1.25, weight: 4.3, category: "Eindeckung" },
        { name: "Dachlatte 30x50mm", unit: "METER", pricePerUnit: 2.8, category: "Unterkonstruktion" },
        { name: "Mineralwolle 160mm WLG 035", unit: "QUADRATMETER", pricePerUnit: 18.5, thermalValue: 0.035, category: "Dämmung" },
        { name: "Unterspannbahn Typ A", unit: "QUADRATMETER", pricePerUnit: 3.2, category: "Abdichtung" },
        { name: "Firstziegel", unit: "STUECK", pricePerUnit: 4.5, category: "Eindeckung" },
      ],
    });

    await prisma.catalogService.createMany({
      data: [
        { name: "Dachdeckerarbeiten", unit: "STUNDE", pricePerUnit: 58, category: "Arbeit" },
        { name: "Gerüstbau", unit: "PAUSCHAL", pricePerUnit: 2500, category: "Gerüst" },
        { name: "Entsorgung Altmaterial", unit: "PAUSCHAL", pricePerUnit: 800, category: "Entsorgung" },
      ],
    });

    return NextResponse.json({
      ok: true,
      message: "Demo-Daten erfolgreich erstellt",
      hint: "Seite neu laden, um die Daten anzuzeigen.",
    });
  } catch (err) {
    console.error("[seed-demo]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
