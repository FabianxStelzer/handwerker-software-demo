import * as XLSX from "xlsx";

export interface ParsedPosition {
  bezeichnung: string;
  menge: number;
  einheit: string;
  einzelpreis: number;
  kategorie?: string;
  raum?: string;
  notizen?: string;
}

// ── Excel / CSV ─────────────────────────────────────────────

const COL_MAP: Record<string, string> = {
  bezeichnung: "bezeichnung", beschreibung: "bezeichnung", description: "bezeichnung",
  name: "bezeichnung", titel: "bezeichnung", title: "bezeichnung",
  artikel: "bezeichnung", material: "bezeichnung", position: "bezeichnung",
  leistung: "bezeichnung", text: "bezeichnung", kurztext: "bezeichnung",

  menge: "menge", anzahl: "menge", quantity: "menge", qty: "menge",
  stückzahl: "menge", stueckzahl: "menge", amount: "menge",

  einheit: "einheit", unit: "einheit", me: "einheit", mengeneinheit: "einheit",

  preis: "einzelpreis", einzelpreis: "einzelpreis", ep: "einzelpreis",
  price: "einzelpreis", unitprice: "einzelpreis",

  kategorie: "kategorie", category: "kategorie", gruppe: "kategorie",
  gewerk: "kategorie", leistungsbereich: "kategorie", bereich: "kategorie",

  raum: "raum", room: "raum", ort: "raum", raumbezeichnung: "raum",
  einbauort: "raum", location: "raum",

  notizen: "notizen", bemerkung: "notizen", anmerkung: "notizen",
  notes: "notizen", hinweis: "notizen", kommentar: "notizen",
};

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-zäöüß]/g, "");
}

export function parseExcelOrCsv(buffer: Buffer, fileName: string): ParsedPosition[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const positions: ParsedPosition[] = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    if (rows.length < 2) continue;

    const headerRow = rows[0].map((h: any) => String(h || ""));
    const mapping: Record<number, string> = {};

    headerRow.forEach((h, idx) => {
      const norm = normalizeHeader(h);
      for (const [pattern, field] of Object.entries(COL_MAP)) {
        if (norm.includes(pattern)) {
          if (!Object.values(mapping).includes(field)) {
            mapping[idx] = field;
          }
          break;
        }
      }
    });

    if (!Object.values(mapping).includes("bezeichnung")) {
      for (let idx = 0; idx < headerRow.length; idx++) {
        if (!mapping[idx] && headerRow[idx].trim()) {
          mapping[idx] = "bezeichnung";
          break;
        }
      }
    }

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const pos: any = { bezeichnung: "", menge: 0, einheit: "Stk", einzelpreis: 0 };

      for (const [colIdx, field] of Object.entries(mapping)) {
        const val = row[parseInt(colIdx)];
        if (field === "menge" || field === "einzelpreis") {
          pos[field] = parseFloat(String(val).replace(",", ".")) || 0;
        } else {
          pos[field] = String(val || "").trim();
        }
      }

      if (!pos.bezeichnung && !pos.menge) continue;
      if (!pos.bezeichnung) pos.bezeichnung = `Position ${r}`;
      positions.push(pos);
    }
  }

  return positions;
}

// ── GAEB X31 (XML) ──────────────────────────────────────────

export function parseX31(content: string): ParsedPosition[] {
  const positions: ParsedPosition[] = [];

  const itemRegex = /<Item\b[^>]*>([\s\S]*?)<\/Item>/gi;
  let match;
  while ((match = itemRegex.exec(content)) !== null) {
    const block = match[1];
    const pos: ParsedPosition = { bezeichnung: "", menge: 0, einheit: "Stk", einzelpreis: 0 };

    const descMatch = block.match(/<Description[^>]*>([\s\S]*?)<\/Description>/i)
      || block.match(/<OutlineText[^>]*>([\s\S]*?)<\/OutlineText>/i)
      || block.match(/<TextOutline[^>]*>([\s\S]*?)<\/TextOutline>/i);
    if (descMatch) {
      pos.bezeichnung = descMatch[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    const spanMatch = block.match(/<span[^>]*>([\s\S]*?)<\/span>/i);
    if (!pos.bezeichnung && spanMatch) {
      pos.bezeichnung = spanMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    }

    const qtyMatch = block.match(/<Qty>([\d.,]+)<\/Qty>/i);
    if (qtyMatch) pos.menge = parseFloat(qtyMatch[1].replace(",", ".")) || 0;

    const quMatch = block.match(/<QU>([^<]+)<\/QU>/i);
    if (quMatch) pos.einheit = quMatch[1].trim();

    const upMatch = block.match(/<UP>([\d.,]+)<\/UP>/i)
      || block.match(/<UnitPrice>([\d.,]+)<\/UnitPrice>/i);
    if (upMatch) pos.einzelpreis = parseFloat(upMatch[1].replace(",", ".")) || 0;

    const catMatch = block.match(/<BoQCtgy[^>]*RNoPart="([^"]*)"[^>]*>/i);
    if (catMatch) pos.kategorie = catMatch[1].trim();

    const rdMatch = block.match(/<RNoPart>([^<]+)<\/RNoPart>/i);
    if (rdMatch && !pos.kategorie) pos.kategorie = rdMatch[1].trim();

    if (pos.bezeichnung || pos.menge > 0) {
      if (!pos.bezeichnung) pos.bezeichnung = "Ohne Bezeichnung";
      positions.push(pos);
    }
  }

  if (positions.length === 0) {
    const ctgyRegex = /<BoQCtgy\b[^>]*>([\s\S]*?)<\/BoQCtgy>/gi;
    while ((match = ctgyRegex.exec(content)) !== null) {
      const block = match[1];
      const nameMatch = block.match(/<Description[^>]*>([\s\S]*?)<\/Description>/i);
      if (nameMatch) {
        const name = nameMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        if (name) positions.push({ bezeichnung: name, menge: 1, einheit: "Stk", einzelpreis: 0, kategorie: "GAEB-Gruppe" });
      }
    }
  }

  return positions;
}

// ── GAEB D11 (Text) ─────────────────────────────────────────

export function parseD11(content: string): ParsedPosition[] {
  const positions: ParsedPosition[] = [];
  const lines = content.split(/\r?\n/);

  let currentBez = "";
  let currentKat = "";

  for (const line of lines) {
    if (line.length < 2) continue;

    const satzart = line.substring(0, 2);

    if (satzart === "21" || satzart === "25") {
      const text = line.substring(11).trim();
      if (text) currentKat = text;
    }

    if (satzart === "26" || satzart === "23") {
      const text = line.substring(11).trim();
      if (text) currentBez = currentBez ? currentBez + " " + text : text;
    }

    if (satzart === "24" || satzart === "22") {
      if (currentBez) {
        const pos: ParsedPosition = {
          bezeichnung: currentBez,
          menge: 0,
          einheit: "Stk",
          einzelpreis: 0,
        };
        if (currentKat) pos.kategorie = currentKat;

        try {
          const mengeStr = line.substring(31, 43).trim();
          if (mengeStr) pos.menge = parseFloat(mengeStr.replace(",", ".")) || 0;
          const einheitStr = line.substring(43, 47).trim();
          if (einheitStr) pos.einheit = einheitStr;
          const preisStr = line.substring(47, 60).trim();
          if (preisStr) pos.einzelpreis = parseFloat(preisStr.replace(",", ".")) || 0;
        } catch { /* varying format */ }

        positions.push(pos);
        currentBez = "";
      }
    }
  }

  if (positions.length === 0) {
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.length < 3) continue;

      const parts = trimmed.split(/[;\t|]+/);
      if (parts.length >= 2) {
        const pos: ParsedPosition = {
          bezeichnung: parts[0].trim(),
          menge: parseFloat((parts[1] || "0").replace(",", ".")) || 0,
          einheit: parts[2]?.trim() || "Stk",
          einzelpreis: parseFloat((parts[3] || "0").replace(",", ".")) || 0,
        };
        if (parts[4]) pos.kategorie = parts[4].trim();
        if (parts[5]) pos.raum = parts[5].trim();
        if (pos.bezeichnung) positions.push(pos);
      }
    }
  }

  return positions;
}

// ── Main dispatcher ─────────────────────────────────────────

export function parseAufmassFile(buffer: Buffer, fileName: string): ParsedPosition[] {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  if (["xlsx", "xls", "csv"].includes(ext)) {
    return parseExcelOrCsv(buffer, fileName);
  }

  const content = buffer.toString("utf-8");

  if (ext === "x31") {
    return parseX31(content);
  }

  if (ext === "d11") {
    return parseD11(content);
  }

  return [];
}
