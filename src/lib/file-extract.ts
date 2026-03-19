import { readFile } from "fs/promises";
import path from "path";
import * as XLSX from "xlsx";

export async function extractFileContent(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  const ext = path.extname(fileName).toLowerCase();

  try {
    if ([".txt", ".md", ".csv", ".json", ".xml", ".html", ".css", ".js", ".ts", ".log"].includes(ext)) {
      return buffer.toString("utf-8").slice(0, 60000);
    }

    if ([".xlsx", ".xls"].includes(ext)) {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const lines: string[] = [];
      for (const sheetName of workbook.SheetNames) {
        lines.push(`[Blatt: ${sheetName}]`);
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet, { FS: "\t" });
        lines.push(csv);
      }
      return lines.join("\n").slice(0, 60000);
    }

    if (ext === ".x31") {
      const xmlContent = buffer.toString("utf-8");
      const items: string[] = [];
      const regex = /<Item[^>]*>([\s\S]*?)<\/Item>/gi;
      let match;
      while ((match = regex.exec(xmlContent)) !== null) {
        const block = match[1];
        const qty = block.match(/<Qty>(.*?)<\/Qty>/i)?.[1] || "";
        const desc = block.match(/<Description>(.*?)<\/Description>/i)?.[1] || "";
        const unit = block.match(/<QU>(.*?)<\/QU>/i)?.[1] || "";
        const up = block.match(/<UP>(.*?)<\/UP>/i)?.[1] || "";
        items.push(`${desc} | Menge: ${qty} ${unit} | Preis: ${up}`);
      }
      if (items.length > 0) return `GAEB X31 Positionen:\n${items.join("\n")}`.slice(0, 60000);
      return xmlContent.slice(0, 60000);
    }

    if (ext === ".d11") {
      return `GAEB D11 Inhalt:\n${buffer.toString("utf-8").slice(0, 60000)}`;
    }

    if (ext === ".pdf") {
      try {
        const pdfParseModule = await import("pdf-parse");
        const pdfParse = (pdfParseModule as any).default || pdfParseModule;
        const data = await pdfParse(buffer);
        const text = data.text?.trim();
        if (text && text.length > 10) {
          return `PDF-Inhalt (${data.numpages} Seiten):\n${text}`.slice(0, 60000);
        }
        return `[PDF-Datei: ${fileName} – ${data.numpages} Seiten, ${(buffer.length / 1024).toFixed(0)} KB. Kein lesbarer Text extrahierbar (evtl. gescanntes Dokument).]`;
      } catch {
        return `[PDF-Datei: ${fileName} – ${(buffer.length / 1024).toFixed(0)} KB. Text konnte nicht extrahiert werden.]`;
      }
    }

    if ([".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext)) {
      return `[Bild-Datei: ${fileName} – ${(buffer.length / 1024).toFixed(0)} KB]`;
    }

    return `[Datei: ${fileName} – ${(buffer.length / 1024).toFixed(0)} KB, Typ: ${ext}]`;
  } catch (e: any) {
    return `[Fehler beim Lesen der Datei ${fileName}: ${e.message}]`;
  }
}

const DATA_DIR = process.env.DATA_DIR || process.env.UPLOAD_DIR || path.join(process.cwd(), "data");

const MIME_MAP: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

export function resolveUploadPath(fileUrl: string): string {
  const urlPath = fileUrl.replace(/^\/api\/uploads\//, "");
  const segments = urlPath.split("/");
  return path.join(DATA_DIR, "uploads", ...segments);
}

export async function loadFileBuffer(fileUrl: string): Promise<Buffer | null> {
  try {
    return await readFile(resolveUploadPath(fileUrl));
  } catch {
    return null;
  }
}

export function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  return MIME_MAP[ext] || "application/octet-stream";
}

export function isVisualFile(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  return [".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext);
}

export async function extractFileFromUrl(
  fileUrl: string,
  fileName: string
): Promise<string> {
  try {
    const filePath = resolveUploadPath(fileUrl);
    const buffer = await readFile(filePath);
    return extractFileContent(buffer, fileName);
  } catch (e: any) {
    return `[Datei ${fileName} konnte nicht gelesen werden: ${e.message}]`;
  }
}
