import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import path from "path";
import { mkdir, writeFile } from "fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const plans = await prisma.einbauPlan.findMany({
    where: { projectId: id },
    include: {
      markers: {
        include: { materialien: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(plans);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id: projectId } = await params;
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart")) {
    let step = "init";
    try {
      step = "formData";
      const formData = await req.formData();

      step = "getFile";
      const file = formData.get("file") as File | null;
      const titel = (formData.get("titel") as string) || "Bauplan";

      if (!file) return NextResponse.json({ error: "Keine Datei im Upload gefunden" }, { status: 400 });
      if (file.size > 50 * 1024 * 1024) return NextResponse.json({ error: "Datei zu groß (max. 50 MB)" }, { status: 400 });
      if (file.size === 0) return NextResponse.json({ error: "Datei ist leer" }, { status: 400 });

      step = "mkdir";
      const dir = path.join(DATA_DIR, "uploads", "einbau");
      await mkdir(dir, { recursive: true });

      step = "readFile";
      const ext = file.name.split(".").pop() || "pdf";
      const fileName = `${projectId}_${Date.now()}.${ext}`;
      const filePath = path.join(dir, fileName);
      const arrayBuf = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuf);

      step = "writeFile";
      await writeFile(filePath, bytes);

      step = "prismaCreate";
      const dateiUrl = `/api/uploads/einbau/${fileName}`;
      const plan = await prisma.einbauPlan.create({
        data: { projectId, titel, dateiUrl, dateiName: file.name },
        include: { markers: { include: { materialien: true } } },
      });

      return NextResponse.json(plan, { status: 201 });
    } catch (err: any) {
      console.error(`Einbau upload error at step [${step}]:`, err);
      const msg = err?.message || err?.toString() || "Unbekannter Fehler";
      return NextResponse.json({ error: `Upload fehlgeschlagen (${step}): ${msg}` }, { status: 500 });
    }
  }

  // JSON actions (marker, material, updateMarker)
  try {
    const body = await req.json();

    if (body.action === "marker") {
      const userName = (session.user as any)?.name || "Unbekannt";
      const marker = await prisma.einbauMarker.create({
        data: {
          planId: body.planId,
          xPercent: body.xPercent,
          yPercent: body.yPercent,
          beschreibung: body.beschreibung || "",
          mitarbeiterId: session.user.id,
          mitarbeiterName: userName,
        },
        include: { materialien: true },
      });
      return NextResponse.json(marker, { status: 201 });
    }

    if (body.action === "material") {
      const material = await prisma.einbauMaterial.create({
        data: {
          markerId: body.markerId,
          name: body.name,
          menge: parseFloat(body.menge) || 1,
          einheit: body.einheit || "Stk",
        },
      });
      return NextResponse.json(material, { status: 201 });
    }

    if (body.action === "updateMarker") {
      const updated = await prisma.einbauMarker.update({
        where: { id: body.markerId },
        data: { beschreibung: body.beschreibung },
        include: { materialien: true },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
  } catch (err: any) {
    console.error("Einbau JSON action error:", err);
    return NextResponse.json({ error: err?.message || "Fehler bei Aktion" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = await req.json();

  if (body.planId) {
    await prisma.einbauPlan.delete({ where: { id: body.planId } });
    return NextResponse.json({ success: true });
  }

  if (body.markerId) {
    await prisma.einbauMarker.delete({ where: { id: body.markerId } });
    return NextResponse.json({ success: true });
  }

  if (body.materialId) {
    await prisma.einbauMaterial.delete({ where: { id: body.materialId } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "ID fehlt" }, { status: 400 });
}
