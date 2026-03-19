import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const vendors = await prisma.vendor.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(vendors);
}

async function getNextVendorNumber(): Promise<string> {
  const settings = await prisma.companySettings.findFirst();
  const nextVal = settings?.nkLieferantenNaechster ?? 70089;

  await prisma.companySettings.updateMany({
    data: { nkLieferantenNaechster: nextVal + 1 },
  });

  return String(nextVal);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, taxId, vatId, street, zip, city, email, phone, notes } = body;
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name erforderlich" }, { status: 400 });
  }

  const vendorNumber = await getNextVendorNumber();

  const vendor = await prisma.vendor.create({
    data: {
      vendorNumber,
      name: name.trim(),
      taxId: taxId?.trim() || null,
      vatId: vatId?.trim() || null,
      street: street?.trim() || null,
      zip: zip?.trim() || null,
      city: city?.trim() || null,
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      notes: notes?.trim() || null,
    },
  });
  return NextResponse.json(vendor);
}
