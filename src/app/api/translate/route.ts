import { NextRequest, NextResponse } from "next/server";
import { chatWithAi } from "@/lib/ai";
import { auth } from "@/lib/auth";
import { languageNames } from "@/lib/i18n/translations";
import type { Language } from "@/lib/i18n/translations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cache = new Map<string, { text: string; ts: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1h

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { text, targetLang } = await req.json();
  if (!text || !targetLang) return NextResponse.json({ error: "text und targetLang erforderlich" }, { status: 400 });

  const langName = languageNames[targetLang as Language] || targetLang;
  const cacheKey = `${targetLang}:${text.slice(0, 200)}`;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({ translated: cached.text });
  }

  try {
    const response = await chatWithAi([
      {
        role: "system",
        content: `Du bist ein professioneller Übersetzer. Übersetze den folgenden Text exakt nach ${langName}. Gib NUR die Übersetzung zurück, ohne Erklärungen, Anführungszeichen oder zusätzlichen Text.`,
      },
      { role: "user", content: text },
    ]);

    const translated = response.content.trim();
    cache.set(cacheKey, { text: translated, ts: Date.now() });

    if (cache.size > 5000) {
      const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts);
      for (let i = 0; i < 1000; i++) cache.delete(oldest[i][0]);
    }

    return NextResponse.json({ translated });
  } catch (err) {
    console.error("Translation error:", err);
    return NextResponse.json({ translated: text });
  }
}
