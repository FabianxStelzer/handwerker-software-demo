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

// ── Helpers ──────────────────────────────────────────────────

function stripXmlTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseGermanFloat(s: string): number {
  return parseFloat(s.replace(/\s/g, "").replace(",", ".")) || 0;
}

// ── GAEB X31 / X83 / GAEB-XML ───────────────────────────────

export function parseX31(content: string): ParsedPosition[] {
  const positions: ParsedPosition[] = [];

  const categoryMap = new Map<string, string>();
  const ctgyNameRegex = /<BoQCtgy\b[^>]*>([\s\S]*?)<\/BoQCtgy>/gi;
  let cm;
  while ((cm = ctgyNameRegex.exec(content)) !== null) {
    const block = cm[1];
    const rno = block.match(/<RNoPart>([^<]+)<\/RNoPart>/i);
    const descMatch = block.match(/<Description[^>]*>([\s\S]*?)<\/Description>/i)
      || block.match(/<LblTx[^>]*>([\s\S]*?)<\/LblTx>/i);
    if (rno && descMatch) {
      categoryMap.set(rno[1].trim(), stripXmlTags(descMatch[1]));
    }
  }

  const itemRegex = /<Item\b[^>]*>([\s\S]*?)<\/Item>/gi;
  let match;
  while ((match = itemRegex.exec(content)) !== null) {
    const block = match[1];
    const pos: ParsedPosition = { bezeichnung: "", menge: 0, einheit: "Stk", einzelpreis: 0 };

    const descMatch = block.match(/<Description[^>]*>([\s\S]*?)<\/Description>/i)
      || block.match(/<OutlineText[^>]*>([\s\S]*?)<\/OutlineText>/i)
      || block.match(/<TextOutline[^>]*>([\s\S]*?)<\/TextOutline>/i)
      || block.match(/<CompleteText[^>]*>([\s\S]*?)<\/CompleteText>/i)
      || block.match(/<OutlTxt[^>]*>([\s\S]*?)<\/OutlTxt>/i)
      || block.match(/<TextOutlTxt[^>]*>([\s\S]*?)<\/TextOutlTxt>/i);
    if (descMatch) {
      pos.bezeichnung = stripXmlTags(descMatch[1]);
    }

    if (!pos.bezeichnung) {
      const spanMatch = block.match(/<span[^>]*>([\s\S]*?)<\/span>/i);
      if (spanMatch) pos.bezeichnung = stripXmlTags(spanMatch[1]);
    }
    if (!pos.bezeichnung) {
      const pMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      if (pMatch) pos.bezeichnung = stripXmlTags(pMatch[1]);
    }

    const qtyMatch = block.match(/<Qty>([\d.,\s]+)<\/Qty>/i);
    if (qtyMatch) pos.menge = parseGermanFloat(qtyMatch[1]);

    const quMatch = block.match(/<QU>([^<]+)<\/QU>/i);
    if (quMatch) pos.einheit = quMatch[1].trim();

    const upMatch = block.match(/<UP>([\d.,\s]+)<\/UP>/i)
      || block.match(/<UnitPrice>([\d.,\s]+)<\/UnitPrice>/i);
    if (upMatch) pos.einzelpreis = parseGermanFloat(upMatch[1]);

    const tpMatch = block.match(/<TP>([\d.,\s]+)<\/TP>/i)
      || block.match(/<TotalPrice>([\d.,\s]+)<\/TotalPrice>/i);
    if (tpMatch && pos.menge > 0 && pos.einzelpreis === 0) {
      pos.einzelpreis = parseGermanFloat(tpMatch[1]) / pos.menge;
    }

    const catMatch = block.match(/<BoQCtgy[^>]*RNoPart="([^"]*)"[^>]*>/i);
    if (catMatch) pos.kategorie = catMatch[1].trim();

    const rdMatch = block.match(/<RNoPart>([^<]+)<\/RNoPart>/i);
    if (rdMatch && !pos.kategorie) pos.kategorie = rdMatch[1].trim();

    if (pos.kategorie && categoryMap.has(pos.kategorie)) {
      pos.kategorie = categoryMap.get(pos.kategorie);
    }

    if (pos.bezeichnung || pos.menge > 0) {
      if (!pos.bezeichnung) pos.bezeichnung = "Ohne Bezeichnung";
      positions.push(pos);
    }
  }

  if (positions.length === 0) {
    const ctgyRegex2 = /<BoQCtgy\b[^>]*>([\s\S]*?)<\/BoQCtgy>/gi;
    while ((match = ctgyRegex2.exec(content)) !== null) {
      const block = match[1];
      if (/<Item\b/i.test(block)) continue;
      const nameMatch = block.match(/<Description[^>]*>([\s\S]*?)<\/Description>/i)
        || block.match(/<LblTx[^>]*>([\s\S]*?)<\/LblTx>/i);
      if (nameMatch) {
        const name = stripXmlTags(nameMatch[1]);
        if (name) positions.push({ bezeichnung: name, menge: 1, einheit: "Stk", einzelpreis: 0, kategorie: "GAEB-Gruppe" });
      }
    }
  }

  return positions;
}

// ── GAEB D11 / D83 (Text/DA) ────────────────────────────────

export function parseD11(content: string): ParsedPosition[] {
  const positions: ParsedPosition[] = [];
  const lines = content.split(/\r?\n/);

  let currentBez = "";
  let currentKat = "";

  for (const line of lines) {
    if (line.length < 2) continue;

    const satzart = line.substring(0, 2);

    if (satzart === "00") {
      continue;
    }

    if (satzart === "21" || satzart === "25") {
      const text = line.length > 11 ? line.substring(11).trim() : "";
      if (text) currentKat = text;
    }

    if (satzart === "26" || satzart === "23") {
      const text = line.length > 11 ? line.substring(11).trim() : "";
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
          if (line.length > 31) {
            const mengeStr = line.substring(31, Math.min(43, line.length)).trim();
            if (mengeStr) pos.menge = parseGermanFloat(mengeStr);
          }
          if (line.length > 43) {
            const einheitStr = line.substring(43, Math.min(47, line.length)).trim();
            if (einheitStr) pos.einheit = einheitStr;
          }
          if (line.length > 47) {
            const preisStr = line.substring(47, Math.min(60, line.length)).trim();
            if (preisStr) pos.einzelpreis = parseGermanFloat(preisStr);
          }
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
          menge: parseGermanFloat(parts[1] || "0"),
          einheit: parts[2]?.trim() || "Stk",
          einzelpreis: parseGermanFloat(parts[3] || "0"),
        };
        if (parts[4]) pos.kategorie = parts[4].trim();
        if (parts[5]) pos.raum = parts[5].trim();
        if (pos.bezeichnung) positions.push(pos);
      }
    }
  }

  return positions;
}

// ── GAEB file extension mapping ──────────────────────────────

const GAEB_XML_EXTENSIONS = ["x31", "x83", "x84", "x86", "x89", "gaeb"];
const GAEB_TEXT_EXTENSIONS = ["d11", "d83", "d84", "d86", "p83", "p84"];
const SPREADSHEET_EXTENSIONS = ["xlsx", "xls", "csv"];

export const ALL_PARSABLE_EXTENSIONS = [...GAEB_XML_EXTENSIONS, ...GAEB_TEXT_EXTENSIONS, ...SPREADSHEET_EXTENSIONS];

export const GAEB_FILE_ACCEPT = ".pdf,.x31,.x83,.x84,.gaeb,.d11,.d83,.d84,.p83,.p84,.xlsx,.xls,.csv";

// ── Main dispatcher ─────────────────────────────────────────

export function parseAufmassFile(buffer: Buffer, fileName: string): ParsedPosition[] {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  if (SPREADSHEET_EXTENSIONS.includes(ext)) {
    return parseExcelOrCsv(buffer, fileName);
  }

  const content = buffer.toString("utf-8");

  if (GAEB_XML_EXTENSIONS.includes(ext) || (ext === "xml" && content.includes("<GAEB"))) {
    return parseX31(content);
  }

  if (GAEB_TEXT_EXTENSIONS.includes(ext)) {
    return parseD11(content);
  }

  if (!ext || ext === "txt") {
    if (content.includes("<GAEB") || content.includes("<Item") || content.includes("<BoQ")) {
      return parseX31(content);
    }
    const firstLine = content.split("\n")[0] || "";
    if (/^\d{2}/.test(firstLine) && firstLine.length > 20) {
      return parseD11(content);
    }
  }

  return [];
}
