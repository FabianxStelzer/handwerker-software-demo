# Handwerker-Betriebssoftware

Umfassende webbasierte Betriebssoftware für Handwerksunternehmen. Verwaltet den gesamten Lebenszyklus von Kundenanfrage über Projektabwicklung bis zur Abrechnung.

## Features

- **Kundenverwaltung** – Privat- & Geschäftskunden, Echtzeit-Suche
- **Projektmanagement** – Tabelle/Kanban/Kacheln, Bautagebuch, Dokumente, Chat, Aufgaben, Baupläne, Material
- **Material-/Leistungskatalog** – Technische Eigenschaften, Preise, Kategorien
- **Aufträge & Rechnungen** – Status-Workflow, automatische Berechnung (Netto/MwSt/Brutto), Analytics
- **Mitarbeiterverwaltung** – Rollenbasiertes Zugriffssystem, Urlaubsverwaltung, HR-Daten
- **Zeiterfassung** – Bauleiter-geführte Erfassung pro Mitarbeiter und Projekt
- **KI-Assistent** – Multi-Provider (OpenAI, Anthropic), persistente Gespräche
- **Sprachassistent** – Freihändige Bedienung auf der Baustelle
- **Dashboard** – Kennzahlen, aktuelle Projekte, offene Rechnungen

## Tech-Stack

- **Frontend/Backend:** Next.js 14 (App Router), TypeScript
- **Datenbank:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth.js v5
- **UI:** Tailwind CSS + shadcn/ui-inspirierte Komponenten
- **KI:** Vercel AI SDK (OpenAI, Anthropic)
- **Deployment:** Docker + Docker Compose

## Schnellstart (Entwicklung)

```bash
# 1. Abhängigkeiten installieren
npm install

# 2. PostgreSQL starten (Docker)
docker compose up db -d

# 3. Datenbank migrieren
npx prisma migrate dev --name init

# 4. Beispieldaten laden
npm run db:seed

# 5. Entwicklungsserver starten
npm run dev
```

Anmeldung: `admin@handwerker.de` / `admin123`

## Deployment (Hetzner VPS)

```bash
# 1. Repository auf den Server klonen
git clone <repo-url>
cd handwerker-software

# 2. .env-Datei erstellen
cp .env.example .env
# NEXTAUTH_SECRET und NEXTAUTH_URL anpassen!

# 3. Alles mit Docker starten
docker compose up -d --build

# 4. Datenbank migrieren und seeden
docker compose exec app npx prisma migrate deploy
docker compose exec app npx tsx prisma/seed.ts
```

Die App ist dann unter `http://<server-ip>:3000` erreichbar.

## Strato-Domain verbinden

1. In der Strato-Domainverwaltung einen A-Record auf die Hetzner-IP setzen
2. Optional: Nginx als Reverse Proxy mit SSL (Let's Encrypt) vor die App schalten
3. `NEXTAUTH_URL` in `.env` auf die Domain setzen (z.B. `https://software.meine-firma.de`)

## Demo-Konten

| Rolle       | E-Mail                    | Passwort  |
|-------------|---------------------------|-----------|
| Admin       | admin@handwerker.de       | admin123  |
| Bauleiter   | bauleiter@handwerker.de   | user123   |
| Mitarbeiter | mitarbeiter@handwerker.de | user123   |

## KI-Konfiguration

Für den KI-Assistenten API-Schlüssel in `.env` hinterlegen:

```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```
