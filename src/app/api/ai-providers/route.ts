import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const providers = await prisma.aiProvider.findMany({ orderBy: { createdAt: "asc" } });
  const safe = providers.map((p) => ({
    ...p,
    apiKey: p.apiKey ? "•".repeat(8) + p.apiKey.slice(-4) : null,
  }));
  return NextResponse.json(safe);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Nur Admin" }, { status: 403 });

  const body = await req.json();

  if (body.action === "test") {
    return testConnection(body);
  }

  const provider = await prisma.aiProvider.create({
    data: {
      name: body.name,
      provider: body.provider,
      apiKey: body.apiKey || null,
      apiUrl: body.apiUrl || null,
      model: body.model || null,
      isLocal: body.isLocal || false,
      isDefault: false,
    },
  });

  return NextResponse.json(provider, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Nur Admin" }, { status: 403 });

  const body = await req.json();

  if (body.action === "setDefault" && body.id) {
    await prisma.aiProvider.updateMany({ data: { isDefault: false } });
    await prisma.aiProvider.update({ where: { id: body.id }, data: { isDefault: true } });
    const all = await prisma.aiProvider.findMany({ orderBy: { createdAt: "asc" } });
    return NextResponse.json(all);
  }

  const data: any = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.apiKey !== undefined) data.apiKey = body.apiKey;
  if (body.apiUrl !== undefined) data.apiUrl = body.apiUrl;
  if (body.model !== undefined) data.model = body.model;
  if (body.isActive !== undefined) data.isActive = body.isActive;

  const updated = await prisma.aiProvider.update({
    where: { id: body.id },
    data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Nur Admin" }, { status: 403 });

  const { id } = await req.json();
  await prisma.aiProvider.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

async function testConnection(body: any) {
  let { provider, apiKey, apiUrl, model } = body;

  if (body.providerId) {
    const existing = await prisma.aiProvider.findUnique({ where: { id: body.providerId } });
    if (!existing) return NextResponse.json({ success: false, error: "Provider nicht gefunden" });
    provider = existing.provider;
    apiKey = existing.apiKey;
    apiUrl = existing.apiUrl;
    model = existing.model;
  }

  try {
    if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: model || "gpt-4o-mini", messages: [{ role: "user", content: "Antworte nur mit: OK" }], max_tokens: 5 }),
      });
      if (!res.ok) { const e = await res.text(); return NextResponse.json({ success: false, error: `OpenAI Fehler: ${res.status} – ${e.slice(0, 200)}` }); }
      return NextResponse.json({ success: true, message: "OpenAI Verbindung erfolgreich" });
    }

    if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
        body: JSON.stringify({ model: model || "claude-sonnet-4-6", max_tokens: 5, messages: [{ role: "user", content: "Antworte nur mit: OK" }] }),
      });
      if (!res.ok) { const e = await res.text(); return NextResponse.json({ success: false, error: `Anthropic Fehler: ${res.status} – ${e.slice(0, 200)}` }); }
      return NextResponse.json({ success: true, message: "Claude Verbindung erfolgreich" });
    }

    if (provider === "google") {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model || "gemini-2.0-flash"}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "Antworte nur mit: OK" }] }] }),
      });
      if (!res.ok) { const e = await res.text(); return NextResponse.json({ success: false, error: `Google Fehler: ${res.status} – ${e.slice(0, 200)}` }); }
      return NextResponse.json({ success: true, message: "Gemini Verbindung erfolgreich" });
    }

    if (provider === "ollama") {
      const base = apiUrl || "http://localhost:11434";
      const res = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return NextResponse.json({ success: false, error: `Ollama nicht erreichbar: ${res.status}` });
      const data = await res.json();
      const models = (data.models || []).map((m: any) => m.name);
      return NextResponse.json({ success: true, message: `Ollama verbunden – ${models.length} Modelle verfügbar`, models });
    }

    return NextResponse.json({ success: false, error: "Unbekannter Provider" });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || "Verbindungsfehler" });
  }
}
