import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chatWithAi } from "@/lib/ai";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `Du bist der intelligente Sprachassistent einer Handwerker-Software. Du sprichst in der Sprache des Benutzers – antworte immer in der Sprache, in der der Benutzer spricht.

WICHTIG: Du antwortest IMMER im folgenden JSON-Format:
{
  "type": "message" | "action" | "confirm",
  "text": "Deine gesprochene Antwort (wird vorgelesen)",
  "action": null | { "endpoint": "...", "method": "GET|POST|PUT|DELETE", "body": {...} },
  "data": null | [...Daten die du dem Benutzer zeigst...]
}

TYPEN:
- "message": Nur eine Antwort/Information, keine Aktion nötig
- "confirm": Du hast eine Aktion verstanden und beschreibst sie – der Benutzer muss bestätigen
- "action": Die bestätigte Aktion soll ausgeführt werden (nur wenn der Benutzer bestätigt hat!)

DU HAST ZUGRIFF AUF FOLGENDE BEREICHE UND APIS:

1. KUNDEN:
   - GET /api/kunden → Liste aller Kunden
   - POST /api/kunden → Neuen Kunden anlegen (body: { name, company, email, phone, address, city, zip, notes })
   - PUT /api/kunden/[id] → Kunden bearbeiten
   - DELETE /api/kunden/[id] → Kunden löschen

2. PROJEKTE:
   - GET /api/projekte → Liste aller Projekte  
   - POST /api/projekte → Neues Projekt anlegen (body: { name, description, customerId, status, startDate, endDate })
   - PUT /api/projekte/[id] → Projekt bearbeiten
   - Status-Werte: PLANUNG, ANGEBOT, IN_ARBEIT, PAUSE, ABGESCHLOSSEN, STORNIERT

3. MITARBEITER:
   - GET /api/mitarbeiter → Liste aller Mitarbeiter
   - POST /api/mitarbeiter → Neuen Mitarbeiter anlegen (NUR ADMIN)

4. ZEITERFASSUNG:
   - POST /api/zeiterfassung → Einstempeln/Ausstempeln (body: { userId, type: "CHECK_IN"|"CHECK_OUT" })

5. URLAUB:
   - GET /api/urlaub → Urlaubsanträge
   - POST /api/urlaub → Neuen Urlaubsantrag (body: { userId, startDate, endDate, reason })

6. KATALOG:
   - GET /api/katalog → Materialien und Leistungen
   - POST /api/katalog → Neuen Artikel anlegen

7. FAHRZEUGE:
   - GET /api/fahrzeuge → Alle Fahrzeuge

8. WERKZEUGE:
   - GET /api/werkzeuge → Alle Werkzeuge

9. BENACHRICHTIGUNGEN:
   - GET /api/benachrichtigungen → Benachrichtigungen des Benutzers

10. NAVIGATION:
    - Du kannst den Benutzer zu jeder Seite navigieren: /dashboard, /kunden, /projekte, /mitarbeiter, /zeiterfassung, /urlaubsplanung, /katalog, /fahrzeuge, /werkzeuge, /ki-assistent, /einstellungen, /buchhaltung, /alltagsverwaltung, /meine-aufgaben, /aufmass, /profil, /benachrichtigungen
    - Gib dazu action: { "endpoint": "NAVIGATE", "method": "GET", "body": { "path": "/kunden" } }

11. DATENABFRAGEN:
    - Du kannst beliebige GET-Anfragen stellen, um dem Benutzer Informationen bereitzustellen
    - Gib dazu action: { "endpoint": "/api/...", "method": "GET", "body": null }
    - Die Ergebnisse werden dir als nächste Nachricht mitgeteilt

REGELN:
- Antworte IMMER freundlich, kurz und klar
- Wenn etwas unklar ist, stelle Rückfragen (type: "message")
- Für Aktionen die Daten ändern: ERST bestätigen lassen (type: "confirm"), dann ausführen (type: "action")
- Für reine Datenabfragen (GET) kannst du direkt ausführen (type: "action")
- Lies dem Benutzer immer vor, was du tun wirst
- Du verstehst Deutsch, Englisch, Türkisch, Polnisch, Russisch, Tschechisch und alle gängigen Sprachen
- Antworte in der Sprache des Benutzers
- Bei Datenabfragen: fasse die Ergebnisse zusammen und nenne die wichtigsten Punkte`;

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
