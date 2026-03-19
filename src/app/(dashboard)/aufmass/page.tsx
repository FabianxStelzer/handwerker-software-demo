"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Plus, Upload, FileText, Trash2, Save, ChevronRight, ChevronDown,
  Bot, FolderKanban, FileSpreadsheet, Ruler, X, Eye, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Aufmass {
  id: string;
  titel: string;
  beschreibung: string | null;
  status: string;
  kiAnweisung: string | null;
  kiErgebnis: string | null;
  projectId: string | null;
  project: { id: string; name: string; projectNumber: string } | null;
  dateien: { id: string; dateiTyp: string; dateiName: string; dateiUrl: string }[];
  positionen: { id: string; position: number; bezeichnung: string; menge: number; einheit: string; einzelpreis: number; kategorie: string | null; raum: string | null; notizen: string | null }[];
  createdAt: string;
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "success" | "warning" }> = {
  ENTWURF: { label: "Entwurf", variant: "secondary" },
  IN_BEARBEITUNG: { label: "In Bearbeitung", variant: "warning" },
  FERTIG: { label: "Fertig", variant: "success" },
};

export default function AufmassPage() {
  const [aufmasse, setAufmasse] = useState<Aufmass[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Aufmass | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitel, setNewTitel] = useState("");
  const [newBeschreibung, setNewBeschreibung] = useState("");
  const [newKiAnweisung, setNewKiAnweisung] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [editPositionen, setEditPositionen] = useState<any[]>([]);
  const [editingPositionen, setEditingPositionen] = useState(false);
  const [createFiles, setCreateFiles] = useState<File[]>([]);
  const createFileRef = useRef<HTMLInputElement>(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerFile, setViewerFile] = useState<{ name: string; typ: string; url: string } | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerData, setViewerData] = useState<{ sheets: { name: string; headers: string[]; rows: string[][] }[] } | null>(null);
  const [viewerText, setViewerText] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [aRes, pRes] = await Promise.all([
      fetch("/api/aufmass"),
      fetch("/api/projekte"),
    ]);
    if (aRes.ok) setAufmasse(await aRes.json());
    if (pRes.ok) {
      const data = await pRes.json();
      setProjects(Array.isArray(data) ? data : data.projects || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createAufmass() {
    setSaving(true);
    const res = await fetch("/api/aufmass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titel: newTitel || "Neues Aufmaß", beschreibung: newBeschreibung, kiAnweisung: newKiAnweisung }),
    });
    if (res.ok) {
      const created = await res.json();

      // Upload pre-selected files
      for (const file of createFiles) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("aufmassId", created.id);
        await fetch("/api/aufmass", { method: "POST", body: fd });
      }

      await load();
      const refreshed = await fetch("/api/aufmass").then((r) => r.json());
      setSelected(refreshed.find((a: any) => a.id === created.id) || created);
      setAufmasse(refreshed);
      setCreateOpen(false);
      setNewTitel("");
      setNewBeschreibung("");
      setNewKiAnweisung("");
      setCreateFiles([]);
    }
    setSaving(false);
  }

  async function uploadFile(aufmassId: string, file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("aufmassId", aufmassId);
    await fetch("/api/aufmass", { method: "POST", body: fd });
    const updated = await fetch("/api/aufmass").then((r) => r.json());
    setAufmasse(updated);
    const refreshed = updated.find((a: any) => a.id === aufmassId);
    if (refreshed) setSelected(refreshed);
    setUploading(false);
  }

  async function deleteFile(dateiId: string) {
    await fetch("/api/aufmass", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dateiId }),
    });
    await load();
    if (selected) {
      const updated = await fetch("/api/aufmass").then((r) => r.json());
      setSelected(updated.find((a: any) => a.id === selected.id) || null);
      setAufmasse(updated);
    }
  }

  async function deleteAufmass(id: string) {
    if (!confirm("Aufmaß wirklich löschen?")) return;
    await fetch("/api/aufmass", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setSelected(null);
    await load();
  }

  async function updateAufmass(id: string, data: any) {
    setSaving(true);
    const res = await fetch("/api/aufmass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSelected(updated);
      setAufmasse((prev) => prev.map((a) => (a.id === id ? updated : a)));
    }
    setSaving(false);
  }

  async function savePositionen() {
    if (!selected) return;
    setSaving(true);
    const res = await fetch("/api/aufmass", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "positionen", aufmassId: selected.id, positionen: editPositionen }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSelected(updated);
      setAufmasse((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setEditingPositionen(false);
    }
    setSaving(false);
  }

  async function assignProject(aufmassId: string, projectId: string | null) {
    const res = await fetch("/api/aufmass", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "assign", aufmassId, projectId }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSelected(updated);
      setAufmasse((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    }
  }

  function openEditPositionen() {
    setEditPositionen(
      selected?.positionen.map((p) => ({ ...p })) || []
    );
    setEditingPositionen(true);
  }

  function fileIcon(typ: string) {
    if (typ === "pdf") return <FileText className="h-4 w-4 text-red-500" />;
    if (["xlsx", "xls", "csv"].includes(typ)) return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
    return <FileText className="h-4 w-4 text-blue-500" />;
  }

  async function openFileViewer(datei: { dateiName: string; dateiTyp: string; dateiUrl: string }) {
    setViewerFile({ name: datei.dateiName, typ: datei.dateiTyp, url: datei.dateiUrl });
    setViewerData(null);
    setViewerText(null);
    setViewerOpen(true);

    if (datei.dateiTyp === "pdf") return;

    setViewerLoading(true);
    try {
      const res = await fetch(datei.dateiUrl);
      const buf = await res.arrayBuffer();

      if (["xlsx", "xls", "csv"].includes(datei.dateiTyp)) {
        const XLSX = await import("xlsx");
        const wb = XLSX.read(buf, { type: "array" });
        const sheets = wb.SheetNames.map((name) => {
          const ws = wb.Sheets[name];
          const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
          const headers = rows.length > 0 ? rows[0].map((h: any) => String(h || "")) : [];
          const dataRows = rows.slice(1).map((r) => r.map((c: any) => String(c ?? "")));
          return { name, headers, rows: dataRows };
        });
        setViewerData({ sheets });
      } else {
        const text = new TextDecoder("utf-8").decode(buf);
        setViewerText(text);
      }
    } catch (e) {
      console.error("Viewer error:", e);
      setViewerText("Datei konnte nicht gelesen werden.");
    }
    setViewerLoading(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aufmaß</h1>
          <p className="text-sm text-gray-500 mt-0.5">Aufmaße erstellen aus Bauplänen und Materialdateien</p>
        </div>
        <Button className="gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />Neues Aufmaß
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ── Left: List ─────────── */}
        <div className="lg:col-span-4">
          <Card>
            <CardContent className="p-0">
              {aufmasse.length === 0 ? (
                <div className="p-8 text-center">
                  <Ruler className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Noch keine Aufmaße vorhanden</p>
                  <Button size="sm" className="mt-3 gap-1.5" onClick={() => setCreateOpen(true)}>
                    <Plus className="h-3.5 w-3.5" />Erstellen
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {aufmasse.map((a) => {
                    const sc = statusLabels[a.status] || statusLabels.ENTWURF;
                    return (
                      <button
                        key={a.id}
                        className={`w-full text-left p-3 hover:bg-gray-50 transition-colors ${selected?.id === a.id ? "bg-blue-50/50 border-l-2 border-blue-600" : ""}`}
                        onClick={() => {
                          setSelected(a);
                          setEditingPositionen(false);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">{a.titel}</p>
                          <Badge variant={sc.variant} className="text-[10px] ml-2">{sc.label}</Badge>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {a.dateien.length} Dateien · {a.positionen.length} Positionen
                          {a.project && <span> · {a.project.name}</span>}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {new Date(a.createdAt).toLocaleDateString("de-DE")}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right: Detail ──────── */}
        <div className="lg:col-span-8">
          {!selected ? (
            <Card>
              <CardContent className="p-10 text-center">
                <Ruler className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Wähle ein Aufmaß aus oder erstelle ein neues</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Header */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Input
                      value={selected.titel}
                      onChange={(e) => setSelected({ ...selected, titel: e.target.value })}
                      onBlur={() => updateAufmass(selected.id, { titel: selected.titel })}
                      className="text-lg font-bold border-0 p-0 h-auto focus-visible:ring-0 shadow-none"
                    />
                    <div className="flex items-center gap-2">
                      <NativeSelect
                        value={selected.status}
                        onChange={(e) => updateAufmass(selected.id, { status: e.target.value })}
                        className="text-xs h-8 w-auto"
                      >
                        <option value="ENTWURF">Entwurf</option>
                        <option value="IN_BEARBEITUNG">In Bearbeitung</option>
                        <option value="FERTIG">Fertig</option>
                      </NativeSelect>
                      <Button variant="ghost" size="icon" className="text-red-500 h-8 w-8" onClick={() => deleteAufmass(selected.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    placeholder="Beschreibung (optional)"
                    value={selected.beschreibung || ""}
                    onChange={(e) => setSelected({ ...selected, beschreibung: e.target.value })}
                    onBlur={() => updateAufmass(selected.id, { beschreibung: selected.beschreibung })}
                    rows={2}
                    className="text-sm"
                  />

                  {/* Projekt-Zuordnung */}
                  <div className="mt-3 flex items-center gap-2">
                    <FolderKanban className="h-4 w-4 text-gray-400" />
                    <NativeSelect
                      value={selected.projectId || ""}
                      onChange={(e) => assignProject(selected.id, e.target.value || null)}
                      className="text-xs h-8 flex-1"
                    >
                      <option value="">– Keinem Projekt zugeordnet –</option>
                      {projects.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.projectNumber} – {p.name}</option>
                      ))}
                    </NativeSelect>
                  </div>
                </CardContent>
              </Card>

              {/* Dateien */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-900">Dateien</h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        {uploading ? "Wird hochgeladen…" : "Datei hochladen"}
                      </Button>
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pdf,.x31,.d11,.xlsx,.xls,.csv"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadFile(selected.id, f);
                        e.target.value = "";
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mb-3">
                    Unterstützte Formate: PDF (Bauplan), X31, D11, Excel/CSV (Materialien)
                  </p>
                  {selected.dateien.length === 0 ? (
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
                      onClick={() => fileRef.current?.click()}
                    >
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-600">Dateien hierher ziehen oder klicken</p>
                      <p className="text-xs text-gray-400 mt-1">PDF · X31 · D11 · Excel · CSV</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selected.dateien.map((d) => (
                        <div key={d.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                          {fileIcon(d.dateiTyp)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{d.dateiName}</p>
                            <p className="text-xs text-gray-400 uppercase">{d.dateiTyp}</p>
                          </div>
                          <Button variant="ghost" size="sm" className="gap-1 text-xs text-blue-600 h-7"
                            onClick={() => openFileViewer(d)}>
                            <Eye className="h-3.5 w-3.5" />Öffnen
                          </Button>
                          <a href={d.dateiUrl} download={d.dateiName} className="text-gray-400 hover:text-gray-600">
                            <Download className="h-3.5 w-3.5" />
                          </a>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => deleteFile(d.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* KI-Anweisung */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Bot className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-gray-900">KI-Anweisung</h3>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    Beschreibe, worauf es ankommt und was berechnet werden soll (z.B. Wärmepumpen-Leistung, Fußbodenheizung, Rohrleitungen, etc.)
                  </p>
                  <Textarea
                    placeholder="z.B. Erstelle ein Aufmaß für die Heizungsinstallation. Berechne die benötigte Wärmepumpen-Leistung basierend auf der Gebäudefläche. Berücksichtige Fußbodenheizung für alle Räume im EG und OG..."
                    value={selected.kiAnweisung || ""}
                    onChange={(e) => setSelected({ ...selected, kiAnweisung: e.target.value })}
                    onBlur={() => updateAufmass(selected.id, { kiAnweisung: selected.kiAnweisung })}
                    rows={4}
                    className="text-sm"
                  />
                  <Button
                    size="sm"
                    className="mt-2 gap-1.5"
                    onClick={() => updateAufmass(selected.id, { status: "IN_BEARBEITUNG", kiAnweisung: selected.kiAnweisung })}
                    disabled={saving}
                  >
                    <Bot className="h-3.5 w-3.5" />Aufmaß generieren lassen
                  </Button>

                  {selected.kiErgebnis && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs font-medium text-blue-800 mb-1">KI-Ergebnis</p>
                      <div className="text-sm text-blue-900 whitespace-pre-wrap">{selected.kiErgebnis}</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Positionen */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-900">Positionen</h3>
                    {!editingPositionen ? (
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={openEditPositionen}>
                        Bearbeiten
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => setEditingPositionen(false)}>
                          Abbrechen
                        </Button>
                        <Button size="sm" className="gap-1.5 text-xs" onClick={savePositionen} disabled={saving}>
                          <Save className="h-3.5 w-3.5" />Speichern
                        </Button>
                      </div>
                    )}
                  </div>

                  {editingPositionen ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-12 gap-2 text-[10px] text-gray-500 font-medium px-1">
                        <span className="col-span-3">Bezeichnung</span>
                        <span className="col-span-2">Kategorie</span>
                        <span className="col-span-1">Raum</span>
                        <span className="col-span-1">Menge</span>
                        <span className="col-span-1">Einheit</span>
                        <span className="col-span-2">Preis</span>
                      </div>
                      {editPositionen.map((p, i) => (
                        <div key={i} className="grid grid-cols-12 gap-2 items-center">
                          <Input className="col-span-3 text-xs" placeholder="Bezeichnung" value={p.bezeichnung}
                            onChange={(e) => { const np = [...editPositionen]; np[i].bezeichnung = e.target.value; setEditPositionen(np); }} />
                          <Input className="col-span-2 text-xs" placeholder="Kategorie" value={p.kategorie || ""}
                            onChange={(e) => { const np = [...editPositionen]; np[i].kategorie = e.target.value; setEditPositionen(np); }} />
                          <Input className="col-span-1 text-xs" placeholder="Raum" value={p.raum || ""}
                            onChange={(e) => { const np = [...editPositionen]; np[i].raum = e.target.value; setEditPositionen(np); }} />
                          <Input className="col-span-1 text-xs" type="number" placeholder="Menge" value={p.menge}
                            onChange={(e) => { const np = [...editPositionen]; np[i].menge = e.target.value; setEditPositionen(np); }} />
                          <Input className="col-span-1 text-xs" placeholder="Einheit" value={p.einheit}
                            onChange={(e) => { const np = [...editPositionen]; np[i].einheit = e.target.value; setEditPositionen(np); }} />
                          <Input className="col-span-2 text-xs" type="number" step="0.01" placeholder="Preis" value={p.einzelpreis}
                            onChange={(e) => { const np = [...editPositionen]; np[i].einzelpreis = e.target.value; setEditPositionen(np); }} />
                          <Button variant="ghost" size="icon" className="col-span-1 h-8 w-8 text-red-400"
                            onClick={() => setEditPositionen(editPositionen.filter((_, idx) => idx !== i))}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs mt-2"
                        onClick={() => setEditPositionen([...editPositionen, { bezeichnung: "", menge: 1, einheit: "Stk", einzelpreis: 0, kategorie: "", raum: "" }])}>
                        <Plus className="h-3.5 w-3.5" />Position hinzufügen
                      </Button>
                    </div>
                  ) : selected.positionen.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">Noch keine Positionen. Bearbeiten klicken oder KI generieren lassen.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs text-gray-500">
                            <th className="pb-2 pr-2">#</th>
                            <th className="pb-2 pr-2">Bezeichnung</th>
                            <th className="pb-2 pr-2">Kategorie</th>
                            <th className="pb-2 pr-2">Raum</th>
                            <th className="pb-2 pr-2 text-right">Menge</th>
                            <th className="pb-2 pr-2">Einheit</th>
                            <th className="pb-2 pr-2 text-right">Einzelpreis</th>
                            <th className="pb-2 text-right">Gesamt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selected.positionen.map((p) => (
                            <tr key={p.id} className="border-b last:border-0">
                              <td className="py-2 pr-2 text-xs text-gray-400">{p.position}</td>
                              <td className="py-2 pr-2 text-xs text-gray-900">{p.bezeichnung}</td>
                              <td className="py-2 pr-2 text-xs text-gray-500">{p.kategorie || "–"}</td>
                              <td className="py-2 pr-2 text-xs text-gray-500">{p.raum || "–"}</td>
                              <td className="py-2 pr-2 text-xs text-right">{p.menge}</td>
                              <td className="py-2 pr-2 text-xs text-gray-500">{p.einheit}</td>
                              <td className="py-2 pr-2 text-xs text-right">{p.einzelpreis.toFixed(2)} €</td>
                              <td className="py-2 text-xs text-right font-medium">{(p.menge * p.einzelpreis).toFixed(2)} €</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t font-bold">
                            <td colSpan={7} className="py-2 text-xs text-right">Gesamt:</td>
                            <td className="py-2 text-xs text-right">
                              {selected.positionen.reduce((s, p) => s + p.menge * p.einzelpreis, 0).toFixed(2)} €
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neues Aufmaß erstellen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Titel</label>
              <Input
                value={newTitel}
                onChange={(e) => setNewTitel(e.target.value)}
                placeholder="z.B. Heizungsinstallation EFH Müller"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Beschreibung</label>
              <Textarea
                value={newBeschreibung}
                onChange={(e) => setNewBeschreibung(e.target.value)}
                placeholder="Optional: Was soll das Aufmaß enthalten?"
                className="mt-1"
                rows={2}
              />
            </div>
            {/* Bauplan + Materialdateien */}
            <div>
              <label className="text-sm font-medium text-gray-700">Bauplan & Materialdateien</label>
              <p className="text-xs text-gray-400 mt-0.5 mb-2">Lade einen PDF-Bauplan hoch, damit sich das Aufmaß daran orientiert. Zusätzlich X31-, D11- oder Excel-Dateien mit Materialien.</p>
              {createFiles.length > 0 && (
                <div className="space-y-1.5 mb-2">
                  {createFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                      <FileText className="h-4 w-4 text-gray-500 shrink-0" />
                      <span className="text-xs text-gray-900 flex-1 truncate">{f.name}</span>
                      <span className="text-[10px] text-gray-400 uppercase">{f.name.split(".").pop()}</span>
                      <button className="text-red-400 hover:text-red-600" onClick={() => setCreateFiles(createFiles.filter((_, idx) => idx !== i))}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
                onClick={() => createFileRef.current?.click()}
              >
                <Upload className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                <p className="text-xs font-medium text-gray-600">Dateien auswählen</p>
                <p className="text-[10px] text-gray-400 mt-0.5">PDF · X31 · D11 · Excel · CSV</p>
              </div>
              <input
                ref={createFileRef}
                type="file"
                accept=".pdf,.x31,.d11,.xlsx,.xls,.csv"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length > 0) setCreateFiles((prev) => [...prev, ...files]);
                  e.target.value = "";
                }}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Bot className="h-4 w-4 text-blue-600" />KI-Anweisung (optional)
              </label>
              <Textarea
                value={newKiAnweisung}
                onChange={(e) => setNewKiAnweisung(e.target.value)}
                placeholder="z.B. Berechne die benötigte Wärmepumpen-Leistung, Fußbodenheizung für alle Räume..."
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setCreateOpen(false); setCreateFiles([]); }}>Abbrechen</Button>
              <Button onClick={createAufmass} disabled={saving}>
                {saving ? "Erstelle…" : "Erstellen"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* File Viewer Dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              {viewerFile && fileIcon(viewerFile.typ)}
              {viewerFile?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto mt-2 min-h-0">
            {viewerFile?.typ === "pdf" ? (
              <iframe src={viewerFile.url} className="w-full h-[70vh] rounded-lg border" />
            ) : viewerLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <span className="ml-3 text-sm text-gray-500">Datei wird geladen…</span>
              </div>
            ) : viewerData ? (
              <div className="space-y-4">
                {viewerData.sheets.map((sheet, si) => (
                  <div key={si}>
                    {viewerData.sheets.length > 1 && (
                      <h4 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                        <FileSpreadsheet className="h-3.5 w-3.5" />{sheet.name}
                      </h4>
                    )}
                    <div className="overflow-x-auto border rounded-lg">
                      <table className="w-full text-xs">
                        {sheet.headers.length > 0 && (
                          <thead>
                            <tr className="bg-gray-100 border-b">
                              {sheet.headers.map((h, hi) => (
                                <th key={hi} className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">{h || `Spalte ${hi + 1}`}</th>
                              ))}
                            </tr>
                          </thead>
                        )}
                        <tbody>
                          {sheet.rows.map((row, ri) => (
                            <tr key={ri} className="border-b last:border-0 hover:bg-gray-50">
                              {row.map((cell, ci) => (
                                <td key={ci} className="px-3 py-1.5 text-gray-900 whitespace-nowrap">{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">{sheet.rows.length} Zeilen</p>
                  </div>
                ))}
              </div>
            ) : viewerText !== null ? (
              <div className="bg-gray-50 rounded-lg border p-4 overflow-auto max-h-[70vh]">
                <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">{viewerText}</pre>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
