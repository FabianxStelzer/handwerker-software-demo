import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_UNITS = ["STUECK", "METER", "QUADRATMETER", "KUBIKMETER", "KILOGRAMM", "LITER", "PALETTE", "PAUSCHAL", "STUNDE"];

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const sep = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(sep).map((h) => h.trim().replace(/^["']|["']$/g, "").toLowerCase());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(sep).map((v) => v.trim().replace(/^["']|["']$/g, ""));
    if (vals.length < 2) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] || ""; });
    rows.push(row);
  }
  return rows;
}

type MaterialUnit = "STUECK" | "METER" | "QUADRATMETER" | "KUBIKMETER" | "KILOGRAMM" | "LITER" | "PALETTE" | "PAUSCHAL" | "STUNDE";

function mapRow(row: Record<string, string>) {
  const name = row.name || row.bezeichnung || row.titel || row.title || row.artikel || "";
  if (!name) return null;

  const unitRaw = (row.unit || row.einheit || "STUECK").toUpperCase();
  const unit: MaterialUnit = (VALID_UNITS.includes(unitRaw) ? unitRaw : "STUECK") as MaterialUnit;

  return {
    name,
    description: row.description || row.beschreibung || row.desc || null,
    category: row.category || row.kategorie || row.group || row.gruppe || null,
    unit,
    pricePerUnit: parseFloat(row.priceperunit || row.price || row.preis || row.einzelpreis || "0") || 0,
    weight: parseFloat(row.weight || row.gewicht || "0") || null,
    format: row.format || row.groesse || row.size || null,
    imageUrl: row.imageurl || row.image || row.bild || row.bildurl || null,
    thermalValue: parseFloat(row.thermalvalue || row.lambda || "0") || null,
    minSlope: parseFloat(row.minslope || row.neigung || "0") || null,
  };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!role || (role !== "ADMIN" && role !== "BAULEITER")) {
    return NextResponse.json({ error: "Nur Administratoren können importieren" }, { status: 403 });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let items: Record<string, string>[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) return NextResponse.json({ error: "Keine Datei" }, { status: 400 });

      const text = await file.text();
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith(".json")) {
        const parsed = JSON.parse(text);
        items = Array.isArray(parsed) ? parsed : parsed.items || parsed.data || parsed.articles || [parsed];
      } else {
        items = parseCSV(text);
      }
    } else {
      const body = await req.json();
      items = Array.isArray(body) ? body : body.items || body.data || body.articles || [body];
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of items) {
      const mapped = mapRow(row);
      if (!mapped) { skipped++; continue; }

      try {
        await prisma.catalogMaterial.create({ data: mapped });
        imported++;
      } catch (err: any) {
        skipped++;
        errors.push(`"${mapped.name}": ${err.message?.slice(0, 80) || "Fehler"}`);
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      total: items.length,
      errors: errors.slice(0, 10),
    });
  } catch (err) {
    console.error("Import error:", err);
    return NextResponse.json({ error: "Import fehlgeschlagen" }, { status: 500 });
  }
}
