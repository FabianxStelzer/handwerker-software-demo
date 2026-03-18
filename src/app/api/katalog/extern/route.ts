import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VALID_UNITS = ["STUECK", "METER", "QUADRATMETER", "KUBIKMETER", "KILOGRAMM", "LITER", "PALETTE", "PAUSCHAL", "STUNDE"];

async function validateApiKey(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get("authorization");
  const apiKey = authHeader?.replace(/^Bearer\s+/i, "").trim()
    || req.nextUrl.searchParams.get("api_key");

  if (!apiKey) return false;

  const settings = await prisma.companySettings.findFirst();
  if (!settings?.catalogApiKey) return false;

  return settings.catalogApiKey === apiKey;
}

export async function GET(req: NextRequest) {
  if (!(await validateApiKey(req))) {
    return NextResponse.json({ error: "Ungültiger API-Key. Sende den Key als Bearer Token oder ?api_key=..." }, { status: 401 });
  }

  const category = req.nextUrl.searchParams.get("category");
  const search = req.nextUrl.searchParams.get("search");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "100");
  const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");

  const where: any = {};
  if (category) where.category = category;
  if (search) where.name = { contains: search };

  const [materials, total] = await Promise.all([
    prisma.catalogMaterial.findMany({ where, orderBy: { name: "asc" }, take: limit, skip: offset }),
    prisma.catalogMaterial.count({ where }),
  ]);

  return NextResponse.json({ data: materials, total, limit, offset });
}

export async function POST(req: NextRequest) {
  if (!(await validateApiKey(req))) {
    return NextResponse.json({ error: "Ungültiger API-Key" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const items = Array.isArray(body) ? body : [body];
    const created = [];

    for (const item of items) {
      if (!item.name) continue;
      const unitRaw = (item.unit || "STUECK").toUpperCase();
      const material = await prisma.catalogMaterial.create({
        data: {
          name: item.name,
          description: item.description || null,
          category: item.category || null,
          unit: VALID_UNITS.includes(unitRaw) ? unitRaw : "STUECK",
          pricePerUnit: parseFloat(item.pricePerUnit || item.price || "0") || 0,
          weight: item.weight ? parseFloat(item.weight) : null,
          format: item.format || null,
          imageUrl: item.imageUrl || item.image || null,
          thermalValue: item.thermalValue ? parseFloat(item.thermalValue) : null,
          minSlope: item.minSlope ? parseFloat(item.minSlope) : null,
        },
      });
      created.push(material);
    }

    return NextResponse.json({ success: true, created: created.length, items: created }, { status: 201 });
  } catch (err) {
    console.error("External API error:", err);
    return NextResponse.json({ error: "Fehler beim Anlegen" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!(await validateApiKey(req))) {
    return NextResponse.json({ error: "Ungültiger API-Key" }, { status: 401 });
  }

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "ID fehlt" }, { status: 400 });

  const data: any = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.description !== undefined) data.description = body.description;
  if (body.category !== undefined) data.category = body.category;
  if (body.unit !== undefined) data.unit = VALID_UNITS.includes(body.unit.toUpperCase()) ? body.unit.toUpperCase() : undefined;
  if (body.pricePerUnit !== undefined) data.pricePerUnit = parseFloat(body.pricePerUnit) || 0;
  if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl;

  const material = await prisma.catalogMaterial.update({ where: { id: body.id }, data });
  return NextResponse.json(material);
}

export async function DELETE(req: NextRequest) {
  if (!(await validateApiKey(req))) {
    return NextResponse.json({ error: "Ungültiger API-Key" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID fehlt" }, { status: 400 });

  await prisma.catalogMaterial.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
