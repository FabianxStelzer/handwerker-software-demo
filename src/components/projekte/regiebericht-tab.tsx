"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Plus, FileText, CheckCircle2, Pen, Download, Trash2,
  ChevronLeft, Users, Wrench, Package, Clock, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/select";

interface Props {
  project: any;
  onUpdate: () => void;
}

interface MitarbeiterEntry {
  userId: string;
  name: string;
  stunden: number;
}

interface MaterialEntry {
  name: string;
  einheit: string;
  menge: number;
  einzelpreis: number;
}

interface Regiebericht {
  id: string;
  berichtNummer: number;
  datum: string;
  durchgefuehrteArbeiten: string;
  status: string;
  unterschriftUrl: string | null;
  invoiceId: string | null;
  mitarbeiter: MitarbeiterEntry[];
  materialien: MaterialEntry[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ENTWURF: { label: "Entwurf", color: "bg-gray-100 text-gray-700" },
  ABGESCHLOSSEN: { label: "Abgeschlossen", color: "bg-blue-100 text-blue-700" },
  UNTERSCHRIEBEN: { label: "Unterschrieben", color: "bg-amber-100 text-amber-700" },
  RECHNUNG_ERSTELLT: { label: "Rechnung erstellt", color: "bg-green-100 text-green-700" },
};

const STUNDEN_OPTIONS: number[] = [];
for (let h = 0; h <= 16; h += 0.25) STUNDEN_OPTIONS.push(h);

function formatHours(h: number): string {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins > 0 ? `${hrs}:${String(mins).padStart(2, "0")} Std.` : `${hrs}:00 Std.`;
}

export function RegieberichtTab({ project, onUpdate }: Props) {
  const [berichte, setBerichte] = useState<Regiebericht[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Create form state
  const [creating, setCreating] = useState(false);
  const [datum, setDatum] = useState(new Date().toISOString().slice(0, 10));
  const [mitarbeiter, setMitarbeiter] = useState<MitarbeiterEntry[]>([]);
  const [arbeiten, setArbeiten] = useState("");
  const [materialien, setMaterialien] = useState<MaterialEntry[]>([]);
  const [catalogMaterials, setCatalogMaterials] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // View / sign state
  const [viewing, setViewing] = useState<Regiebericht | null>(null);
  const [signing, setSigning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  const loadBerichte = useCallback(async () => {
    const res = await fetch(`/api/projekte/${project.id}/regieberichte`);
    if (res.ok) setBerichte(await res.json());
    setLoading(false);
  }, [project.id]);

  useEffect(() => {
    loadBerichte();
    fetch("/api/mitarbeiter").then((r) => r.json()).then((data) =>
      setAllUsers(Array.isArray(data) ? data : data.users || [])
    );
    fetch("/api/settings/company").then((r) => r.json()).then(setCompanySettings);
    fetch("/api/katalog/materialien").then((r) => r.json()).then(setCatalogMaterials);
  }, [loadBerichte]);

  function addMitarbeiter() {
    if (allUsers.length === 0) return;
    const u = allUsers[0];
    setMitarbeiter([...mitarbeiter, { userId: u.id, name: `${u.firstName} ${u.lastName}`, stunden: 8 }]);
  }

  function removeMitarbeiter(idx: number) {
    setMitarbeiter(mitarbeiter.filter((_, i) => i !== idx));
  }

  function updateMitarbeiter(idx: number, field: string, value: any) {
    const updated = [...mitarbeiter];
    if (field === "userId") {
      const u = allUsers.find((u: any) => u.id === value);
      updated[idx] = { ...updated[idx], userId: value, name: u ? `${u.firstName} ${u.lastName}` : "" };
    } else {
      (updated[idx] as any)[field] = value;
    }
    setMitarbeiter(updated);
  }

  function addMaterial() {
    setMaterialien([...materialien, { name: "", einheit: "Stk", menge: 1, einzelpreis: 0 }]);
  }

  function addMaterialFromCatalog(cat: any) {
    setMaterialien([...materialien, {
      name: cat.name,
      einheit: cat.unit === "STUECK" ? "Stk" : cat.unit === "METER" ? "m" : cat.unit === "STUNDE" ? "Std" : cat.unit,
      menge: 1,
      einzelpreis: cat.pricePerUnit,
    }]);
  }

  function removeMaterial(idx: number) {
    setMaterialien(materialien.filter((_, i) => i !== idx));
  }

  function updateMaterial(idx: number, field: string, value: any) {
    const updated = [...materialien];
    (updated[idx] as any)[field] = value;
    setMaterialien(updated);
  }

  async function handleCreate() {
    setSaving(true);
    const res = await fetch(`/api/projekte/${project.id}/regieberichte`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ datum, mitarbeiter, durchgefuehrteArbeiten: arbeiten, materialien }),
    });
    if (res.ok) {
      const bericht = await res.json();
      setCreating(false);
      setViewing(bericht);
      setDatum(new Date().toISOString().slice(0, 10));
      setMitarbeiter([]);
      setArbeiten("");
      setMaterialien([]);
      await loadBerichte();
    }
    setSaving(false);
  }

  async function handleAbschliessen(bericht: Regiebericht) {
    await fetch(`/api/projekte/${project.id}/regieberichte`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ berichtId: bericht.id, action: "abschliessen" }),
    });
    await loadBerichte();
    const updated = berichte.find((b) => b.id === bericht.id);
    if (updated) setViewing({ ...updated, status: "ABGESCHLOSSEN" });
    else setViewing(null);
    await loadBerichte();
  }

  function startSigning() {
    setSigning(true);
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";

      const getPos = (e: MouseEvent | TouchEvent) => {
        const rect = canvas.getBoundingClientRect();
        const touch = "touches" in e ? e.touches[0] : e;
        return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
      };

      const start = (e: MouseEvent | TouchEvent) => {
        e.preventDefault();
        isDrawing.current = true;
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
      };

      const draw = (e: MouseEvent | TouchEvent) => {
        if (!isDrawing.current) return;
        e.preventDefault();
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      };

      const stop = () => { isDrawing.current = false; };

      canvas.onmousedown = start;
      canvas.onmousemove = draw;
      canvas.onmouseup = stop;
      canvas.onmouseleave = stop;
      canvas.ontouchstart = start;
      canvas.ontouchmove = draw;
      canvas.ontouchend = stop;
    }, 100);
  }

  async function handleUnterschreiben() {
    const canvas = canvasRef.current;
    if (!canvas || !viewing) return;
    const dataUrl = canvas.toDataURL("image/png");
    setSaving(true);
    const res = await fetch(`/api/projekte/${project.id}/regieberichte`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ berichtId: viewing.id, action: "unterschreiben", unterschriftUrl: dataUrl }),
    });
    if (res.ok) {
      const result = await res.json();
      setSigning(false);
      setViewing(null);
      await loadBerichte();
    }
    setSaving(false);
  }

  // ─── PDF generation (browser-side, template-based) ────────────
  async function generatePDF(bericht: Regiebericht) {
    const { replaceTemplatePlaceholders, getDefaultTemplate, printDocument } = await import("@/lib/document-templates");

    let templateHtml: string | null = null;
    try {
      const res = await fetch("/api/document-templates?type=REGIEBERICHT");
      if (res.ok) {
        const tpls = await res.json();
        const def = tpls.find((t: any) => t.isDefault);
        if (def) templateHtml = def.html;
        else if (tpls.length > 0) templateHtml = tpls[0].html;
      }
    } catch {}
    if (!templateHtml) templateHtml = getDefaultTemplate("REGIEBERICHT");

    const cs = companySettings || {};
    const dateStr = new Date(bericht.datum).toLocaleDateString("de-DE");
    const customerName = project.customer.company || `${project.customer.firstName} ${project.customer.lastName}`;

    const data = {
      firma: {
        name: cs.name || "", strasse: cs.street || "", plz: cs.zip || "", ort: cs.city || "",
        telefon: cs.phone || "", fax: cs.fax || "", email: cs.email || "",
        website: cs.website || "", steuernr: cs.taxId || "", ustid: cs.vatId || "",
        instagram: cs.instagram || "", logo: cs.logoUrl || "",
      },
      kunde: {
        firma: project.customer.company || "",
        name: `${project.customer.firstName || ""} ${project.customer.lastName || ""}`.trim(),
        strasse: project.customer.street || "",
        plz: project.customer.zip || "",
        ort: project.customer.city || "",
      },
      datum: dateStr,
      nummer: String(bericht.berichtNummer),
      mitarbeiter: bericht.mitarbeiter.map((m) => ({ datum: dateStr, name: m.name, stunden: formatHours(m.stunden) })),
      materialien: bericht.materialien.map((m) => ({ name: m.name, menge: String(m.menge), einheit: m.einheit })),
      arbeiten: bericht.durchgefuehrteArbeiten || "–",
      unterschrift: bericht.unterschriftUrl ? `<img src="${bericht.unterschriftUrl}" style="max-height:60px;" />` : undefined,
    };

    const rendered = replaceTemplatePlaceholders(templateHtml, data);
    printDocument(rendered);
  }

  // ─── RENDER ─────────────────────────────────────────────────────

  if (loading) {
    return <div className="flex justify-center py-10"><div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div>;
  }

  // ─── CREATE FORM ──────────────────────────────────────────────
  if (creating) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>
            <ChevronLeft className="h-4 w-4 mr-1" />Zurück
          </Button>
          <h3 className="text-lg font-semibold">Neuen Regiebericht erstellen</h3>
        </div>

        <Card>
          <CardContent className="p-5 space-y-6">
            {/* Datum */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
              <Input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} className="max-w-xs" />
            </div>

            {/* Mitarbeiter */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Users className="h-4 w-4" />Mitarbeiter & Stunden
                </label>
                <Button size="sm" variant="outline" onClick={addMitarbeiter}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Mitarbeiter hinzufügen
                </Button>
              </div>
              {mitarbeiter.length === 0 && <p className="text-sm text-gray-400">Noch keine Mitarbeiter hinzugefügt</p>}
              <div className="space-y-2">
                {mitarbeiter.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                    <NativeSelect
                      value={m.userId}
                      onChange={(e) => updateMitarbeiter(idx, "userId", e.target.value)}
                      className="flex-1"
                    >
                      {allUsers.map((u: any) => (
                        <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                      ))}
                    </NativeSelect>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <NativeSelect
                        value={String(m.stunden)}
                        onChange={(e) => updateMitarbeiter(idx, "stunden", parseFloat(e.target.value))}
                        className="w-28"
                      >
                        {STUNDEN_OPTIONS.map((h) => (
                          <option key={h} value={h}>{formatHours(h)}</option>
                        ))}
                      </NativeSelect>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeMitarbeiter(idx)}>
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Durchgeführte Arbeiten */}
            <div>
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-1">
                <Wrench className="h-4 w-4" />Durchgeführte Arbeiten
              </label>
              <Textarea
                value={arbeiten}
                onChange={(e) => setArbeiten(e.target.value)}
                rows={6}
                placeholder="Beschreibung der durchgeführten Arbeiten..."
              />
            </div>

            {/* Material */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Package className="h-4 w-4" />Material
                </label>
                <div className="flex gap-2">
                  {catalogMaterials.length > 0 && (
                    <NativeSelect
                      onChange={(e) => {
                        const cat = catalogMaterials.find((c: any) => c.id === e.target.value);
                        if (cat) addMaterialFromCatalog(cat);
                        e.target.value = "";
                      }}
                      className="text-sm"
                    >
                      <option value="">Aus Katalog wählen...</option>
                      {catalogMaterials.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.pricePerUnit.toFixed(2)} €)</option>
                      ))}
                    </NativeSelect>
                  )}
                  <Button size="sm" variant="outline" onClick={addMaterial}>
                    <Plus className="h-3.5 w-3.5 mr-1" />Manuell
                  </Button>
                </div>
              </div>
              {materialien.length === 0 && <p className="text-sm text-gray-400">Kein Material eingetragen</p>}
              <div className="space-y-2">
                {materialien.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                    <Input
                      value={m.name}
                      onChange={(e) => updateMaterial(idx, "name", e.target.value)}
                      placeholder="Bezeichnung"
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={m.menge}
                      onChange={(e) => updateMaterial(idx, "menge", parseFloat(e.target.value) || 0)}
                      className="w-20"
                      step="0.5"
                    />
                    <Input
                      value={m.einheit}
                      onChange={(e) => updateMaterial(idx, "einheit", e.target.value)}
                      className="w-16"
                    />
                    <Input
                      type="number"
                      value={m.einzelpreis}
                      onChange={(e) => updateMaterial(idx, "einzelpreis", parseFloat(e.target.value) || 0)}
                      className="w-24"
                      step="0.01"
                      placeholder="€/Einheit"
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeMaterial(idx)}>
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setCreating(false)}>Abbrechen</Button>
              <Button onClick={handleCreate} disabled={saving || mitarbeiter.length === 0}>
                {saving ? "Wird erstellt..." : "Regiebericht erstellen"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── VIEW / SIGN ──────────────────────────────────────────────
  if (viewing) {
    const b = berichte.find((x) => x.id === viewing.id) || viewing;
    const totalStunden = b.mitarbeiter.reduce((s, m) => s + m.stunden, 0);
    const sc = STATUS_CONFIG[b.status] || STATUS_CONFIG.ENTWURF;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setViewing(null); setSigning(false); }}>
            <ChevronLeft className="h-4 w-4 mr-1" />Zurück
          </Button>
          <h3 className="text-lg font-semibold">Regiebericht Nr. {b.berichtNummer}</h3>
          <Badge className={sc.color}>{sc.label}</Badge>
        </div>

        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-gray-500">Datum</p>
                <p className="font-medium">{new Date(b.datum).toLocaleDateString("de-DE")}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Kunde</p>
                <p className="font-medium">{project.customer.company || `${project.customer.firstName} ${project.customer.lastName}`}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Gesamtstunden</p>
                <p className="font-medium">{formatHours(totalStunden)}</p>
              </div>
            </div>

            {/* Mitarbeiter */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <Users className="h-4 w-4" />Mitarbeiter
              </h4>
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-gray-500">
                      <th className="px-3 py-2">Datum</th>
                      <th className="px-3 py-2">Mitarbeiter</th>
                      <th className="px-3 py-2 text-right">Stunden</th>
                    </tr>
                  </thead>
                  <tbody>
                    {b.mitarbeiter.map((m, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="px-3 py-2">{new Date(b.datum).toLocaleDateString("de-DE")}</td>
                        <td className="px-3 py-2 font-medium">{m.name}</td>
                        <td className="px-3 py-2 text-right">{formatHours(m.stunden)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Durchgeführte Arbeiten */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <Wrench className="h-4 w-4" />Durchgeführte Arbeiten
              </h4>
              <div className="bg-gray-50 rounded-lg p-3 text-sm whitespace-pre-wrap min-h-[80px]">
                {b.durchgefuehrteArbeiten || "–"}
              </div>
            </div>

            {/* Material */}
            {b.materialien.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <Package className="h-4 w-4" />Material
                </h4>
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-gray-500">
                        <th className="px-3 py-2">Bezeichnung</th>
                        <th className="px-3 py-2 text-center">Menge</th>
                        <th className="px-3 py-2 text-right">Einzelpreis</th>
                        <th className="px-3 py-2 text-right">Gesamt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {b.materialien.map((m, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="px-3 py-2">{m.name}</td>
                          <td className="px-3 py-2 text-center">{m.menge} {m.einheit}</td>
                          <td className="px-3 py-2 text-right">{m.einzelpreis.toFixed(2)} €</td>
                          <td className="px-3 py-2 text-right font-medium">{(m.menge * m.einzelpreis).toFixed(2)} €</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Unterschrift */}
            {b.unterschriftUrl && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Unterschrift Auftraggeber</h4>
                <div className="bg-gray-50 rounded-lg p-3 inline-block">
                  <img src={b.unterschriftUrl} alt="Unterschrift" className="h-16" />
                </div>
              </div>
            )}

            {/* Signature Canvas */}
            {signing && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Unterschrift Auftraggeber</h4>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 inline-block bg-white">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={150}
                    className="touch-none cursor-crosshair"
                    style={{ display: "block" }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Hier mit Maus oder Finger unterschreiben</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => generatePDF(b)}>
                <Download className="h-4 w-4" />PDF / Drucken
              </Button>

              {b.status === "ENTWURF" && (
                <Button size="sm" className="gap-1.5" onClick={() => handleAbschliessen(b)}>
                  <CheckCircle2 className="h-4 w-4" />Abschließen
                </Button>
              )}

              {b.status === "ABGESCHLOSSEN" && !signing && (
                <Button size="sm" className="gap-1.5" onClick={startSigning}>
                  <Pen className="h-4 w-4" />Kunde unterschreiben lassen
                </Button>
              )}

              {signing && (
                <Button size="sm" className="gap-1.5" onClick={handleUnterschreiben} disabled={saving}>
                  <Send className="h-4 w-4" />{saving ? "Wird gespeichert..." : "Unterschrift bestätigen & Rechnung erstellen"}
                </Button>
              )}

              {b.invoiceId && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.location.href = `/rechnungen/${b.invoiceId}`}>
                  <FileText className="h-4 w-4" />Rechnung anzeigen
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── LIST ─────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Regieberichte</h3>
          <p className="text-sm text-gray-500">{berichte.length} Bericht{berichte.length !== 1 ? "e" : ""}</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />Regiebericht erstellen
        </Button>
      </div>

      {berichte.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Noch keine Regieberichte für dieses Projekt</p>
            <Button size="sm" className="mt-4 gap-1.5" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />Ersten Regiebericht erstellen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {berichte.map((b) => {
            const sc = STATUS_CONFIG[b.status] || STATUS_CONFIG.ENTWURF;
            const totalStd = b.mitarbeiter.reduce((s, m) => s + m.stunden, 0);
            const totalMat = b.materialien.reduce((s, m) => s + m.menge * m.einzelpreis, 0);
            return (
              <Card key={b.id} className="hover:bg-gray-50/50 cursor-pointer transition-colors" onClick={() => setViewing(b)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Regiebericht Nr. {b.berichtNummer}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(b.datum).toLocaleDateString("de-DE")} · {b.mitarbeiter.length} Mitarbeiter · {formatHours(totalStd)}
                        {totalMat > 0 && ` · Material: ${totalMat.toFixed(2)} €`}
                      </p>
                    </div>
                  </div>
                  <Badge className={sc.color}>{sc.label}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
