# Handwerker Software – Startanleitung

## 1. Voraussetzungen

- **Node.js** 20+
- Kein separater Datenbankserver nötig (SQLite)

## 2. Datenbank einrichten

```bash
npm run db:seed:admin
```

(Falls die Datenbank noch nicht existiert, wird sie automatisch erstellt.)

## 3. Dev-Server starten

```bash
npm run dev
```

**Wichtig:** Immer `npm run dev` verwenden – nie `next dev` direkt.

## 4. Im Browser öffnen

- `http://localhost:3000`
- oder `http://localhost:3000/login` (direkt zur Anmeldung)

## 5. Anmelden

- E-Mail: `admin@handwerker.de`
- Passwort: `admin123`

## Fehlerbehebung

- **Lädt nur:** `/login` direkt aufrufen
- **ChunkLoadError:** `npm run dev:fix` ausführen
