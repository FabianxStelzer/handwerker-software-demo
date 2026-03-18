/**
 * Document template engine: placeholder replacement and default templates.
 *
 * Placeholders use the syntax {{key}} and support nested keys like {{firma.name}}.
 * Table placeholders ({{positionen}}, {{mitarbeiter}}, {{materialien}}) are rendered
 * from arrays passed in the data object.
 */

export interface TemplatePlaceholders {
  firma?: {
    name?: string;
    strasse?: string;
    plz?: string;
    ort?: string;
    telefon?: string;
    fax?: string;
    email?: string;
    website?: string;
    steuernr?: string;
    ustid?: string;
    instagram?: string;
    logo?: string; // URL
  };
  kunde?: {
    firma?: string;
    name?: string;
    strasse?: string;
    plz?: string;
    ort?: string;
  };
  datum?: string;
  nummer?: string;
  // Rechnung / Angebot
  positionen?: { pos: number; beschreibung: string; menge: number; einheit: string; ep: number; gp: number }[];
  netto?: string;
  mwst?: string;
  mwst_satz?: string;
  brutto?: string;
  faellig?: string;
  notizen?: string;
  // Regiebericht
  mitarbeiter?: { datum: string; name: string; stunden: string }[];
  materialien?: { name: string; menge: string; einheit: string }[];
  arbeiten?: string;
  unterschrift?: string; // img tag or placeholder line
}

const UNIT_LABELS: Record<string, string> = {
  STUECK: "Stk", METER: "m", QUADRATMETER: "m²", KUBIKMETER: "m³",
  KILOGRAMM: "kg", LITER: "l", PALETTE: "Pal.", PAUSCHAL: "psch.", STUNDE: "Std",
};

export function unitLabel(unit: string): string {
  return UNIT_LABELS[unit] || unit;
}

function fmt(n: number): string {
  return new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function renderPositionenTable(items: TemplatePlaceholders["positionen"]): string {
  if (!items || items.length === 0) return "";
  const rows = items.map((it) =>
    `<tr><td style="padding:4px 8px;border-bottom:1px solid #ddd;text-align:center;">${it.pos}</td><td style="padding:4px 8px;border-bottom:1px solid #ddd;">${it.beschreibung}</td><td style="padding:4px 8px;border-bottom:1px solid #ddd;text-align:right;">${it.menge}</td><td style="padding:4px 8px;border-bottom:1px solid #ddd;">${it.einheit}</td><td style="padding:4px 8px;border-bottom:1px solid #ddd;text-align:right;">${fmt(it.ep)} €</td><td style="padding:4px 8px;border-bottom:1px solid #ddd;text-align:right;">${fmt(it.gp)} €</td></tr>`
  ).join("");
  return `<table style="width:100%;border-collapse:collapse;"><thead><tr><th style="text-align:center;padding:4px 8px;border-bottom:2px solid #666;font-size:10px;color:#666;">Pos.</th><th style="text-align:left;padding:4px 8px;border-bottom:2px solid #666;font-size:10px;color:#666;">Beschreibung</th><th style="text-align:right;padding:4px 8px;border-bottom:2px solid #666;font-size:10px;color:#666;">Menge</th><th style="text-align:left;padding:4px 8px;border-bottom:2px solid #666;font-size:10px;color:#666;">Einheit</th><th style="text-align:right;padding:4px 8px;border-bottom:2px solid #666;font-size:10px;color:#666;">EP</th><th style="text-align:right;padding:4px 8px;border-bottom:2px solid #666;font-size:10px;color:#666;">GP</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderMitarbeiterTable(items: TemplatePlaceholders["mitarbeiter"]): string {
  if (!items || items.length === 0) return "";
  const rows = items.map((m) =>
    `<tr><td style="padding:4px 8px;border-bottom:1px solid #ddd;">${m.datum}</td><td style="padding:4px 8px;border-bottom:1px solid #ddd;">${m.name}</td><td style="padding:4px 8px;border-bottom:1px solid #ddd;text-align:right;">${m.stunden}</td></tr>`
  ).join("");
  return `<table style="width:100%;border-collapse:collapse;"><thead><tr><th style="text-align:left;padding:4px 8px;border-bottom:2px solid #666;font-size:10px;color:#666;">Datum</th><th style="text-align:left;padding:4px 8px;border-bottom:2px solid #666;font-size:10px;color:#666;">Mitarbeiter</th><th style="text-align:right;padding:4px 8px;border-bottom:2px solid #666;font-size:10px;color:#666;">Stunden</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderMaterialienTable(items: TemplatePlaceholders["materialien"]): string {
  if (!items || items.length === 0) return "";
  const rows = items.map((m) =>
    `<tr><td style="padding:4px 8px;border-bottom:1px solid #ddd;">${m.name}</td><td style="padding:4px 8px;border-bottom:1px solid #ddd;text-align:center;">${m.menge} ${m.einheit}</td></tr>`
  ).join("");
  return `<table style="width:100%;border-collapse:collapse;"><thead><tr><th style="text-align:left;padding:4px 8px;border-bottom:2px solid #666;font-size:10px;color:#666;">Bezeichnung</th><th style="text-align:center;padding:4px 8px;border-bottom:2px solid #666;font-size:10px;color:#666;">Menge</th></tr></thead><tbody>${rows}</tbody></table>`;
}

export function replaceTemplatePlaceholders(html: string, data: TemplatePlaceholders): string {
  let result = html;

  // Table placeholders first
  result = result.replace(/\{\{positionen\}\}/g, renderPositionenTable(data.positionen));
  result = result.replace(/\{\{mitarbeiter\}\}/g, renderMitarbeiterTable(data.mitarbeiter));
  result = result.replace(/\{\{materialien\}\}/g, renderMaterialienTable(data.materialien));

  // Logo placeholder → img tag or empty
  if (data.firma?.logo) {
    result = result.replace(/\{\{firma\.logo\}\}/g, `<img src="${data.firma.logo}" style="max-height:70px;max-width:200px;" />`);
  } else {
    result = result.replace(/\{\{firma\.logo\}\}/g, "");
  }

  // Signature
  if (data.unterschrift) {
    result = result.replace(/\{\{unterschrift\}\}/g, data.unterschrift);
  } else {
    result = result.replace(/\{\{unterschrift\}\}/g, `<div style="height:40px;border-bottom:1px solid #333;width:200px;"></div>`);
  }

  // Flatten nested data for simple replacement
  const flat: Record<string, string> = {};
  if (data.firma) Object.entries(data.firma).forEach(([k, v]) => { flat[`firma.${k}`] = v || ""; });
  if (data.kunde) Object.entries(data.kunde).forEach(([k, v]) => { flat[`kunde.${k}`] = v || ""; });
  if (data.datum) flat["datum"] = data.datum;
  if (data.nummer) flat["nummer"] = data.nummer;
  if (data.netto) flat["netto"] = data.netto;
  if (data.mwst) flat["mwst"] = data.mwst;
  if (data.mwst_satz) flat["mwst_satz"] = data.mwst_satz;
  if (data.brutto) flat["brutto"] = data.brutto;
  if (data.faellig) flat["faellig"] = data.faellig;
  if (data.notizen) flat["notizen"] = data.notizen;
  if (data.arbeiten !== undefined) flat["arbeiten"] = data.arbeiten || "–";

  // Replace all {{key}} placeholders
  result = result.replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g, (_match, key: string) => {
    return flat[key] ?? "";
  });

  return result;
}

export function getPlaceholdersForType(type: "RECHNUNG" | "ANGEBOT" | "REGIEBERICHT"): { key: string; label: string }[] {
  const common = [
    { key: "firma.logo", label: "Firmenlogo (Bild)" },
    { key: "firma.name", label: "Firmenname" },
    { key: "firma.strasse", label: "Firmen-Straße" },
    { key: "firma.plz", label: "Firmen-PLZ" },
    { key: "firma.ort", label: "Firmen-Ort" },
    { key: "firma.telefon", label: "Telefon" },
    { key: "firma.fax", label: "Fax" },
    { key: "firma.email", label: "E-Mail" },
    { key: "firma.website", label: "Website" },
    { key: "firma.steuernr", label: "Steuernummer" },
    { key: "firma.ustid", label: "USt-IdNr." },
    { key: "kunde.firma", label: "Kundenunternehmen" },
    { key: "kunde.name", label: "Kundenname" },
    { key: "kunde.strasse", label: "Kunden-Straße" },
    { key: "kunde.plz", label: "Kunden-PLZ" },
    { key: "kunde.ort", label: "Kunden-Ort" },
    { key: "datum", label: "Datum" },
    { key: "nummer", label: "Dokumentnummer" },
  ];

  if (type === "RECHNUNG" || type === "ANGEBOT") {
    return [
      ...common,
      { key: "positionen", label: "Positionen-Tabelle" },
      { key: "netto", label: "Netto-Betrag" },
      { key: "mwst", label: "MwSt.-Betrag" },
      { key: "mwst_satz", label: "MwSt.-Satz (%)" },
      { key: "brutto", label: "Brutto-Betrag" },
      ...(type === "RECHNUNG" ? [{ key: "faellig", label: "Fälligkeitsdatum" }] : []),
      { key: "notizen", label: "Notizen" },
    ];
  }

  return [
    ...common,
    { key: "mitarbeiter", label: "Mitarbeiter-Tabelle" },
    { key: "materialien", label: "Material-Tabelle" },
    { key: "arbeiten", label: "Durchgeführte Arbeiten" },
    { key: "unterschrift", label: "Kundenunterschrift" },
  ];
}

// ─── Default Templates ─────────────────────────────────────────

const PAGE_STYLE = `@page { size: A4; margin: 20mm; }
body { font-family: Arial, sans-serif; font-size: 11px; color: #333; margin: 0; padding: 20mm; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #333; }
.header-right { text-align: right; font-size: 10px; color: #666; }
h1 { font-size: 18px; margin: 0 0 20px 0; }
.section { margin-bottom: 16px; }
.section-title { font-weight: bold; background: #e5e7eb; padding: 6px 10px; margin-bottom: 4px; font-size: 11px; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; padding: 4px 8px; border-bottom: 2px solid #666; font-size: 10px; color: #666; }
.footer { position: fixed; bottom: 10mm; left: 20mm; right: 20mm; text-align: center; font-size: 8px; color: #888; border-top: 1px solid #ccc; padding-top: 6px; }
.signatures { display: flex; justify-content: space-between; margin-top: 40px; }
.sig-block { width: 45%; }
.sig-label { font-size: 10px; color: #666; margin-bottom: 4px; }
.sig-line { border-bottom: 1px solid #333; height: 30px; margin-bottom: 4px; }
.arbeiten-box { min-height: 120px; padding: 8px; border: 1px solid #ccc; white-space: pre-wrap; line-height: 1.6; }
.totals { margin-top: 16px; border-top: 1px solid #ccc; padding-top: 8px; }
.total-row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 11px; }
.total-row.bold { font-weight: bold; font-size: 13px; border-top: 2px solid #333; padding-top: 6px; margin-top: 4px; }`;

export const DEFAULT_RECHNUNG_TEMPLATE = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${PAGE_STYLE}
</style></head><body>
<div class="header">
  <div>{{firma.logo}}<div style="font-weight:bold;font-size:14px;margin-top:4px;">{{firma.name}}</div></div>
  <div class="header-right">{{firma.strasse}}<br/>{{firma.plz}} {{firma.ort}}<br/>{{firma.telefon}}<br/>{{firma.email}}</div>
</div>

<div style="margin-bottom:20px;">
  <div style="font-size:9px;color:#999;border-bottom:1px solid #ccc;padding-bottom:2px;margin-bottom:4px;">{{firma.name}} · {{firma.strasse}} · {{firma.plz}} {{firma.ort}}</div>
  <strong>{{kunde.firma}}</strong><br/>
  {{kunde.name}}<br/>
  {{kunde.strasse}}<br/>
  {{kunde.plz}} {{kunde.ort}}
</div>

<div style="display:flex;justify-content:space-between;margin-bottom:20px;">
  <h1>Rechnung {{nummer}}</h1>
  <div style="text-align:right;font-size:11px;">
    <strong>Rechnungsdatum:</strong> {{datum}}<br/>
    <strong>Fällig:</strong> {{faellig}}<br/>
    <strong>Steuernr.:</strong> {{firma.steuernr}}<br/>
    <strong>USt-IdNr.:</strong> {{firma.ustid}}
  </div>
</div>

<div class="section">
  {{positionen}}
</div>

<div class="totals">
  <div class="total-row"><span>Netto</span><span>{{netto}}</span></div>
  <div class="total-row"><span>MwSt. {{mwst_satz}}%</span><span>{{mwst}}</span></div>
  <div class="total-row bold"><span>Brutto</span><span>{{brutto}}</span></div>
</div>

<div style="margin-top:30px;font-size:10px;color:#666;">
  <p>Bitte überweisen Sie den Betrag innerhalb von 14 Tagen auf unser Konto.</p>
</div>

<div class="footer">{{firma.name}} · {{firma.strasse}} · {{firma.plz}} {{firma.ort}} · {{firma.telefon}} · {{firma.email}}</div>
</body></html>`;

export const DEFAULT_ANGEBOT_TEMPLATE = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${PAGE_STYLE}
</style></head><body>
<div class="header">
  <div>{{firma.logo}}<div style="font-weight:bold;font-size:14px;margin-top:4px;">{{firma.name}}</div></div>
  <div class="header-right">{{firma.strasse}}<br/>{{firma.plz}} {{firma.ort}}<br/>{{firma.telefon}}<br/>{{firma.email}}</div>
</div>

<div style="margin-bottom:20px;">
  <div style="font-size:9px;color:#999;border-bottom:1px solid #ccc;padding-bottom:2px;margin-bottom:4px;">{{firma.name}} · {{firma.strasse}} · {{firma.plz}} {{firma.ort}}</div>
  <strong>{{kunde.firma}}</strong><br/>
  {{kunde.name}}<br/>
  {{kunde.strasse}}<br/>
  {{kunde.plz}} {{kunde.ort}}
</div>

<div style="display:flex;justify-content:space-between;margin-bottom:20px;">
  <h1>Angebot {{nummer}}</h1>
  <div style="text-align:right;font-size:11px;">
    <strong>Datum:</strong> {{datum}}
  </div>
</div>

<div class="section">
  {{positionen}}
</div>

<div class="totals">
  <div class="total-row"><span>Netto</span><span>{{netto}}</span></div>
  <div class="total-row"><span>MwSt. {{mwst_satz}}%</span><span>{{mwst}}</span></div>
  <div class="total-row bold"><span>Brutto</span><span>{{brutto}}</span></div>
</div>

<div style="margin-top:30px;font-size:10px;color:#666;">
  <p>Dieses Angebot ist 30 Tage gültig. Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
</div>

<div class="footer">{{firma.name}} · {{firma.strasse}} · {{firma.plz}} {{firma.ort}} · {{firma.telefon}} · {{firma.email}}</div>
</body></html>`;

export const DEFAULT_REGIEBERICHT_TEMPLATE = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${PAGE_STYLE}
</style></head><body>
<div class="header">
  <div>{{firma.logo}}<div style="font-weight:bold;font-size:14px;margin-top:4px;">{{firma.name}}</div></div>
  <div class="header-right">{{firma.strasse}} · {{firma.plz}} {{firma.ort}}<br/>{{firma.telefon}} · {{firma.email}}</div>
</div>

<h1>Regiebericht Nr. {{nummer}}</h1>

<div style="display:flex;justify-content:space-between;margin-bottom:16px;">
  <div><strong>Datum:</strong> {{datum}}</div>
</div>

<div class="section">
  <div class="section-title">Kunde</div>
  <div style="padding:6px 10px;">{{kunde.firma}} {{kunde.name}}<br/>{{kunde.strasse}}<br/>{{kunde.plz}} {{kunde.ort}}</div>
</div>

<div class="section">
  <div class="section-title">Mitarbeiter / Stunden</div>
  {{mitarbeiter}}
</div>

<div class="section">
  <div class="section-title">Durchgeführte Arbeiten</div>
  <div class="arbeiten-box">{{arbeiten}}</div>
</div>

<div class="section">
  <div class="section-title">Material</div>
  {{materialien}}
</div>

<div class="signatures">
  <div class="sig-block">
    <div class="sig-label">Auftragnehmer</div>
    <div class="sig-label">Ort, Datum</div>
    <div class="sig-line"></div>
    <div class="sig-label">Unterschrift</div>
  </div>
  <div class="sig-block">
    <div class="sig-label">Auftraggeber / Richtigkeit anerkannt</div>
    <div class="sig-label">Ort, Datum</div>
    <div class="sig-line"></div>
    <div class="sig-label">Unterschrift</div>
    {{unterschrift}}
  </div>
</div>

<div class="footer">{{firma.name}} · {{firma.strasse}} · {{firma.plz}} {{firma.ort}} · {{firma.telefon}} · {{firma.email}}</div>
</body></html>`;

export function getDefaultTemplate(type: "RECHNUNG" | "ANGEBOT" | "REGIEBERICHT"): string {
  switch (type) {
    case "RECHNUNG": return DEFAULT_RECHNUNG_TEMPLATE;
    case "ANGEBOT": return DEFAULT_ANGEBOT_TEMPLATE;
    case "REGIEBERICHT": return DEFAULT_REGIEBERICHT_TEMPLATE;
  }
}

export function getSampleData(type: "RECHNUNG" | "ANGEBOT" | "REGIEBERICHT"): TemplatePlaceholders {
  const firma = {
    name: "Mustermann Bau GmbH",
    strasse: "Hauptstraße 42",
    plz: "12345",
    ort: "Musterstadt",
    telefon: "0123 456789",
    fax: "0123 456780",
    email: "info@mustermann-bau.de",
    website: "www.mustermann-bau.de",
    steuernr: "123/456/78901",
    ustid: "DE123456789",
  };
  const kunde = {
    firma: "Kunde AG",
    name: "Hans Beispiel",
    strasse: "Kundenweg 7",
    plz: "54321",
    ort: "Kundenstadt",
  };

  if (type === "RECHNUNG") {
    return {
      firma, kunde, datum: "09.03.2026", nummer: "RE-2026-001", faellig: "23.03.2026",
      positionen: [
        { pos: 1, beschreibung: "Montagearbeiten", menge: 8, einheit: "Std", ep: 55, gp: 440 },
        { pos: 2, beschreibung: "Materialkosten Fliesen", menge: 25, einheit: "m²", ep: 32.5, gp: 812.5 },
        { pos: 3, beschreibung: "Anfahrt", menge: 1, einheit: "psch.", ep: 45, gp: 45 },
      ],
      netto: "1.297,50 €", mwst: "246,53 €", mwst_satz: "19", brutto: "1.544,03 €",
    };
  }

  if (type === "ANGEBOT") {
    return {
      firma, kunde, datum: "09.03.2026", nummer: "AN-2026-001",
      positionen: [
        { pos: 1, beschreibung: "Badezimmer-Sanierung komplett", menge: 1, einheit: "psch.", ep: 8500, gp: 8500 },
        { pos: 2, beschreibung: "Fliesenarbeiten Boden", menge: 12, einheit: "m²", ep: 65, gp: 780 },
      ],
      netto: "9.280,00 €", mwst: "1.763,20 €", mwst_satz: "19", brutto: "11.043,20 €",
    };
  }

  return {
    firma, kunde, datum: "09.03.2026", nummer: "RB-001",
    mitarbeiter: [
      { datum: "09.03.2026", name: "Max Mustermann", stunden: "8:00" },
      { datum: "09.03.2026", name: "Erika Muster", stunden: "6:30" },
    ],
    materialien: [
      { name: "Silikon transparent", menge: "2", einheit: "Stk" },
      { name: "Kupferrohr 15mm", menge: "6", einheit: "m" },
    ],
    arbeiten: "Wasserleitung im EG verlegt.\nAnschlüsse für Waschbecken und Spüle hergestellt.\nDichtheitsprüfung durchgeführt.",
  };
}

/**
 * Opens a browser print dialog with the rendered HTML.
 */
export function printDocument(html: string) {
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }
}
