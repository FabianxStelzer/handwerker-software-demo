import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import path from "path";
import { mkdir, writeFile, readFile } from "fs/promises";
import { parseAufmassFile } from "@/lib/aufmass-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const projectId = req.nextUrl.searchParams.get("projectId");
  const where: any = {};
  if (projectId) where.projectId = projectId;

  const aufmasse = await prisma.aufmass.findMany({
    where,
    include: {
      dateien: true,
      positionen: { orderBy: { position: "asc" } },
      project: { select: { id: true, name: true, projectNumber: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(aufmasse);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const contentType = req.headers.get("content-type") || "";

  // File upload via multipart
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const aufmassId = formData.get("aufmassId") as string;
    const file = formData.get("file") as File | null;

    if (!file || !aufmassId) {
      return NextResponse.json({ error: "Datei und aufmassId erforderlich" }, { status: 400 });
    }

    const dir = path.join(DATA_DIR, "uploads", "aufmass");
    await mkdir(dir, { recursive: true });

    const ext = file.name.split(".").pop() || "pdf";
    const fileName = `${aufmassId}_${Date.now()}.${ext}`;
    const filePath = path.join(dir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const dateiUrl = `/api/uploads/aufmass/${fileName}`;
    const dateiTyp = ext.toLowerCase();

    const datei = await prisma.aufmassDatei.create({
      data: { aufmassId, dateiTyp, dateiName: file.name, dateiUrl },
    });

    // Auto-parse material files and create positions
    const parsableExtensions = ["xlsx", "xls", "csv", "x31", "d11"];
    if (parsableExtensions.includes(dateiTyp)) {
      try {
        const parsed = parseAufmassFile(buffer, file.name);
        if (parsed.length > 0) {
          const existing = await prisma.aufmassPosition.count({ where: { aufmassId } });
          const posData = parsed.map((p, i) => ({
            aufmassId,
            position: existing + i + 1,
            bezeichnung: p.bezeichnung,
            menge: p.menge,
            einheit: p.einheit,
            einzelpreis: p.einzelpreis,
            kategorie: p.kategorie || null,
            raum: p.raum || null,
            notizen: p.notizen || null,
          }));
          await prisma.aufmassPosition.createMany({ data: posData });
        }
      } catch (e) {
        console.error("Aufmass file parse error:", e);
      }
    }

    return NextResponse.json(datei, { status: 201 });
  }

  // JSON: create or update Aufmass
  const body = await req.json();

  if (body.id) {
    // Update
    const data: any = {};
    if (body.titel !== undefined) data.titel = body.titel;
    if (body.beschreibung !== undefined) data.beschreibung = body.beschreibung;
    if (body.status !== undefined) data.status = body.status;
    if (body.kiAnweisung !== undefined) data.kiAnweisung = body.kiAnweisung;
    if (body.kiErgebnis !== undefined) data.kiErgebnis = body.kiErgebnis;
    if (body.projectId !== undefined) data.projectId = body.projectId || null;

    const updated = await prisma.aufmass.update({
      where: { id: body.id },
      data,
      include: { dateien: true, positionen: { orderBy: { position: "asc" } }, project: { select: { id: true, name: true, projectNumber: true } } },
    });
    return NextResponse.json(updated);
  }

  // Create
  const aufmass = await prisma.aufmass.create({
    data: {
      titel: body.titel || "Neues Aufmaß",
      beschreibung: body.beschreibung || null,
      kiAnweisung: body.kiAnweisung || null,
      projectId: body.projectId || null,
      createdById: session.user.id,
    },
    include: { dateien: true, positionen: { orderBy: { position: "asc" } }, project: { select: { id: true, name: true, projectNumber: true } } },
  });

  return NextResponse.json(aufmass, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = await req.json();

  // Add/update positions
  if (body.action === "positionen" && body.aufmassId) {
    // Delete existing and re-create
    await prisma.aufmassPosition.deleteMany({ where: { aufmassId: body.aufmassId } });
    const positionen = (body.positionen || []).map((p: any, i: number) => ({
      aufmassId: body.aufmassId,
      position: i + 1,
      bezeichnung: p.bezeichnung || "",
      menge: parseFloat(p.menge) || 0,
      einheit: p.einheit || "Stk",
      einzelpreis: parseFloat(p.einzelpreis) || 0,
      kategorie: p.kategorie || null,
      raum: p.raum || null,
      notizen: p.notizen || null,
    }));

    if (positionen.length > 0) {
      await prisma.aufmassPosition.createMany({ data: positionen });
    }

    const updated = await prisma.aufmass.findUnique({
      where: { id: body.aufmassId },
      include: { dateien: true, positionen: { orderBy: { position: "asc" } }, project: { select: { id: true, name: true, projectNumber: true } } },
    });
    return NextResponse.json(updated);
  }

  // Re-parse a file and import positions
  if (body.action === "parse" && body.dateiId) {
    const datei = await prisma.aufmassDatei.findUnique({ where: { id: body.dateiId } });
    if (!datei) return NextResponse.json({ error: "Datei nicht gefunden" }, { status: 404 });

    const parsableExtensions = ["xlsx", "xls", "csv", "x31", "d11"];
    if (!parsableExtensions.includes(datei.dateiTyp)) {
      return NextResponse.json({ error: "Dateiformat nicht unterstützt" }, { status: 400 });
    }

    try {
      const urlParts = datei.dateiUrl.replace("/api/uploads/", "").split("/");
      const filePath = path.join(DATA_DIR, "uploads", ...urlParts);
      const buffer = await readFile(filePath);
      const parsed = parseAufmassFile(buffer, datei.dateiName);

      if (parsed.length === 0) {
        return NextResponse.json({ error: "Keine Positionen in Datei gefunden", count: 0 });
      }

      const existing = await prisma.aufmassPosition.count({ where: { aufmassId: datei.aufmassId } });
      const posData = parsed.map((p, i) => ({
        aufmassId: datei.aufmassId,
        position: existing + i + 1,
        bezeichnung: p.bezeichnung,
        menge: p.menge,
        einheit: p.einheit,
        einzelpreis: p.einzelpreis,
        kategorie: p.kategorie || null,
        raum: p.raum || null,
        notizen: p.notizen || null,
      }));
      await prisma.aufmassPosition.createMany({ data: posData });

      const updated = await prisma.aufmass.findUnique({
        where: { id: datei.aufmassId },
        include: { dateien: true, positionen: { orderBy: { position: "asc" } }, project: { select: { id: true, name: true, projectNumber: true } } },
      });
      return NextResponse.json({ ...updated, importedCount: parsed.length });
    } catch (e: any) {
      console.error("Parse error:", e);
      return NextResponse.json({ error: "Fehler beim Parsen: " + (e.message || "Unbekannt") }, { status: 500 });
    }
  }

  // Assign to project
  if (body.action === "assign" && body.aufmassId) {
    const updated = await prisma.aufmass.update({
      where: { id: body.aufmassId },
      data: { projectId: body.projectId || null },
      include: { dateien: true, positionen: { orderBy: { position: "asc" } }, project: { select: { id: true, name: true, projectNumber: true } } },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!role || (role !== "ADMIN" && role !== "BAULEITER")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const { id, dateiId } = await req.json();

  if (dateiId) {
    await prisma.aufmassDatei.delete({ where: { id: dateiId } });
    return NextResponse.json({ success: true });
  }

  if (id) {
    await prisma.aufmass.delete({ where: { id } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "ID fehlt" }, { status: 400 });
}
