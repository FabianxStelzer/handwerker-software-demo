import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chatWithAi } from "@/lib/ai";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `Du bist die freundliche Sprachassistentin einer Handwerker-Software. Du heißt "Assistentin" und sprichst natürlich, warm und menschlich – wie eine hilfsbereite Kollegin.

WICHTIG: Du antwortest IMMER im folgenden JSON-Format:
{
  "type": "message" | "action" | "confirm",
  "text": "Vollständige Antwort (wird im Chat angezeigt)",
  "spoken": "Kurze, natürliche Version zum Vorlesen (max 1-2 Sätze)",
  "action": null | { "endpoint": "...", "method": "GET|POST|PUT|DELETE", "body": {...} },
  "data": null | [...Daten die du dem Benutzer zeigst...]
}

SPRACHSTIL:
- Antworte KURZ und DIREKT – keine Wiederholungen, kein Papagei
- NIEMALS wiederholen, was der Benutzer gesagt hat. Geh direkt auf die Antwort ein
- "spoken" ist die Kurzversion zum Vorlesen: natürlich, flüssig, max 1-2 Sätze. Keine Listen, keine technischen Details
- "text" darf ausführlicher sein mit Details, die der Benutzer im Chat lesen kann
- Sprich wie eine echte Person: "Klar, mach ich!" statt "Ich werde jetzt die Aktion ausführen..."
- Verwende natürliche Übergänge und keine roboterhaften Formulierungen

TYPEN:
- "message": Nur eine Antwort/Information
- "confirm": Du beschreibst kurz die geplante Aktion – der Benutzer muss bestätigen
- "action": Bestätigte Aktion ausführen

DU HAST ZUGRIFF AUF FOLGENDE APIS:

KUNDEN: GET/POST /api/kunden, PUT/DELETE /api/kunden/[id]
  POST body: { name, company, email, phone, address, city, zip, notes }

PROJEKTE: GET/POST /api/projekte, PUT /api/projekte/[id]
  POST body: { name, description, customerId, status, startDate, endDate }
  Status: PLANUNG, ANGEBOT, IN_ARBEIT, PAUSE, ABGESCHLOSSEN, STORNIERT

MITARBEITER: GET /api/mitarbeiter, POST /api/mitarbeiter (NUR ADMIN)
ZEITERFASSUNG: POST /api/zeiterfassung { userId, type: "CHECK_IN"|"CHECK_OUT" }
URLAUB: GET/POST /api/urlaub { userId, startDate, endDate, reason }
KATALOG: GET/POST /api/katalog
FAHRZEUGE: GET /api/fahrzeuge
WERKZEUGE: GET /api/werkzeuge
BENACHRICHTIGUNGEN: GET /api/benachrichtigungen

NAVIGATION: action: { "endpoint": "NAVIGATE", "method": "GET", "body": { "path": "/kunden" } }
  Seiten: /dashboard, /kunden, /projekte, /mitarbeiter, /zeiterfassung, /urlaubsplanung, /katalog, /fahrzeuge, /werkzeuge, /ki-assistent, /einstellungen, /buchhaltung, /alltagsverwaltung, /meine-aufgaben, /aufmass, /profil, /benachrichtigungen

DATENABFRAGEN: GET-Anfragen direkt ausführen, Ergebnisse zusammenfassen

REGELN:
- KURZ antworten. Nicht wiederholen was der Benutzer gesagt hat
- Bei Unklarheiten: kurze Rückfrage stellen
- Datenänderungen: ERST bestätigen (confirm), dann ausführen (action)
- GET-Abfragen: direkt ausführen
- Antworte in der Sprache des Benutzers
- Ergebnisse knapp zusammenfassen`;


export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { messages, userInfo } = await req.json();

  const contextInfo = userInfo
    ? `\n\nAKTUELLER BENUTZER: ${userInfo.name} (${userInfo.role}), Sprache: ${userInfo.language}, Aktuelle Seite: ${userInfo.currentPath}`
    : "";

  const aiMessages = [
    { role: "system" as const, content: SYSTEM_PROMPT + contextInfo },
    ...messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  try {
    const result = await chatWithAi(aiMessages);

    let parsed;
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { type: "message", text: result.content };
    } catch {
      parsed = { type: "message", text: result.content };
    }

    return NextResponse.json(parsed);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({
      type: "message",
      text: `Es gab einen Fehler: ${msg}`,
      action: null,
    });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { endpoint, method, body } = await req.json();

  if (endpoint === "NAVIGATE") {
    return NextResponse.json({ success: true, navigate: body?.path });
  }

  try {
    const baseUrl = req.nextUrl.origin;
    const url = `${baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      cookie: req.headers.get("cookie") || "",
    };

    const fetchOptions: RequestInit = { method, headers };
    if (body && method !== "GET") {
      fetchOptions.body = JSON.stringify(body);
    }

    const res = await fetch(url, fetchOptions);
    const data = await res.json();

    return NextResponse.json({ success: res.ok, data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg });
  }
}
