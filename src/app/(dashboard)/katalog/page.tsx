"use client";

import { useEffect, useState, useRef } from "react";
import {
  Plus, Package, Wrench, Trash2, Upload, Download, Pencil,
  Key, Copy, RefreshCw, CheckCircle2, AlertTriangle, FileText, Plug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";

const unitLabels: Record<string, string> = {
  STUECK: "Stk", METER: "m", QUADRATMETER: "m²", KUBIKMETER: "m³",
  KILOGRAMM: "kg", LITER: "l", PALETTE: "Pal.", PAUSCHAL: "psch.", STUNDE: "Std",
};

export default function KatalogPage() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [matDialogOpen, setMatDialogOpen] = useState(false);
  const [svcDialogOpen, setSvcDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [importResult, setImportResult] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Edit states
  const [editMat, setEditMat] = useState<any>(null);
  const [editSvc, setEditSvc] = useState<any>(null);
  const [editMatForm, setEditMatForm] = useState<Record<string, string>>({});
  const [editSvcForm, setEditSvcForm] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/katalog/materialien").then((r) => r.json()),
      fetch("/api/katalog/leistungen").then((r) => r.json()),
    ]).then(([m, s]) => {
      setMaterials(m);
      setServices(s);
      setLoading(false);
    });
  }, []);

  async function handleCreateMaterial(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch("/api/katalog/materialien", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    setMatDialogOpen(false);
    const res = await fetch("/api/katalog/materialien");
    setMaterials(await res.json());
  }

  async function handleCreateService(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch("/api/katalog/leistungen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    setSvcDialogOpen(false);
    const res = await fetch("/api/katalog/leistungen");
    setServices(await res.json());
  }

  async function deleteMaterial(id: string) {
    if (!confirm("Material wirklich löschen?")) return;
    await fetch(`/api/katalog/materialien/${id}`, { method: "DELETE" });
    setMaterials(materials.filter((m) => m.id !== id));
  }

  async function deleteService(id: string) {
    if (!confirm("Leistung wirklich löschen?")) return;
    await fetch(`/api/katalog/leistungen/${id}`, { method: "DELETE" });
    setServices(services.filter((s) => s.id !== id));
  }

  function openEditMat(m: any) {
    setEditMat(m);
    setEditMatForm({
      name: m.name || "", description: m.description || "", category: m.category || "",
      unit: m.unit || "STUECK", pricePerUnit: String(m.pricePerUnit || 0),
      weight: m.weight ? String(m.weight) : "", format: m.format || "",
      thermalValue: m.thermalValue ? String(m.thermalValue) : "",
      minSlope: m.minSlope ? String(m.minSlope) : "",
    });
  }

  async function saveEditMat() {
    if (!editMat) return;
    setSavingEdit(true);
    await fetch(`/api/katalog/materialien/${editMat.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editMatForm),
    });
    const res = await fetch("/api/katalog/materialien");
    setMaterials(await res.json());
    setEditMat(null);
    setSavingEdit(false);
  }

  function openEditSvc(s: any) {
    setEditSvc(s);
    setEditSvcForm({
      name: s.name || "", description: s.description || "", category: s.category || "",
      unit: s.unit || "STUNDE", pricePerUnit: String(s.pricePerUnit || 0),
    });
  }

  async function saveEditSvc() {
    if (!editSvc) return;
    setSavingEdit(true);
    await fetch(`/api/katalog/leistungen/${editSvc.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editSvcForm),
    });
    const res = await fetch("/api/katalog/leistungen");
    setServices(await res.json());
    setEditSvc(null);
    setSavingEdit(false);
  }

  async function handleImport(file: File) {
    setImporting(true);
    setImportResult(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/katalog/import", { method: "POST", body: fd });
    const result = await res.json();
    setImportResult(result);
    setImporting(false);
    if (result.imported > 0) {
      const r = await fetch("/api/katalog/materialien");
      setMaterials(await r.json());
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function loadApiKey() {
    const res = await fetch("/api/settings/company");
    if (res.ok) {
      const data = await res.json();
      setApiKey(data.catalogApiKey || "");
    }
  }

  async function generateApiKey() {
    setApiKeyLoading(true);
    const newKey = "hws_" + Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");
    await fetch("/api/settings/company", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ catalogApiKey: newKey }),
    });
    setApiKey(newKey);
    setApiKeyLoading(false);
  }

  function copyApiKey() {
    navigator.clipboard.writeText(apiKey);
    setApiKeyCopied(true);
    setTimeout(() => setApiKeyCopied(false), 2000);
  }

  async function downloadCSVTemplate() {
    const csv = "name;beschreibung;kategorie;einheit;preis;gewicht;format\nBeispiel Material;Eine Beschreibung;Kategorie;STUECK;12.50;0.5;100x50mm";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "katalog-vorlage.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Katalog</h1>
        <p className="text-sm text-gray-500 mt-1">Materialien und Leistungen verwalten</p>
      </div>

      <Tabs defaultValue="materialien">
        <TabsList className="flex-wrap">
          <TabsTrigger value="materialien" className="flex items-center gap-1.5">
            <Package className="h-4 w-4" />Materialien ({materials.length})
          </TabsTrigger>
          <TabsTrigger value="leistungen" className="flex items-center gap-1.5">
            <Wrench className="h-4 w-4" />Leistungen ({services.length})
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-1.5">
            <Upload className="h-4 w-4" />Import
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-1.5" onClick={loadApiKey}>
            <Plug className="h-4 w-4" />API-Schnittstelle
          </TabsTrigger>
        </TabsList>

        <TabsContent value="materialien">
          <div className="flex justify-end mb-4">
            <Dialog open={matDialogOpen} onOpenChange={setMatDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4" />Neues Material</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Neues Material</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateMaterial} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bezeichnung</label>
                    <Input name="name" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                    <Textarea name="description" rows={2} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Einheit</label>
                      <NativeSelect name="unit" defaultValue="STUECK">
                        {Object.entries(unitLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </NativeSelect>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Preis/Einheit (€)</label>
                      <Input name="pricePerUnit" type="number" step="0.01" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                    <Input name="category" placeholder="z.B. Eindeckung, Dämmung" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gewicht (kg)</label>
                      <Input name="weight" type="number" step="0.01" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                      <Input name="format" placeholder="z.B. 30x50mm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Wärmeleitwert (W/mK)</label>
                      <Input name="thermalValue" type="number" step="0.001" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Min. Dachneigung (°)</label>
                      <Input name="minSlope" type="number" step="0.1" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full">Material anlegen</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm font-medium text-gray-500">
                    <th className="px-4 py-3">Bezeichnung</th>
                    <th className="px-4 py-3">Kategorie</th>
                    <th className="px-4 py-3">Einheit</th>
                    <th className="px-4 py-3 text-right">Preis</th>
                    <th className="px-4 py-3">Details</th>
                    <th className="px-4 py-3 w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((m) => (
                    <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => openEditMat(m)}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{m.name}</p>
                        {m.description && <p className="text-xs text-gray-400">{m.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {m.category && <Badge variant="secondary">{m.category}</Badge>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{unitLabels[m.unit] || m.unit}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(m.pricePerUnit)}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {[m.weight && `${m.weight}kg`, m.format, m.thermalValue && `λ=${m.thermalValue}`, m.minSlope && `≥${m.minSlope}°`].filter(Boolean).join(" · ") || "–"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEditMat(m); }} className="h-8 w-8">
                            <Pencil className="h-3.5 w-3.5 text-gray-400" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteMaterial(m.id); }} className="h-8 w-8">
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Material bearbeiten Dialog */}
          <Dialog open={!!editMat} onOpenChange={(o) => { if (!o) setEditMat(null); }}>
            <DialogContent>
              <DialogHeader><DialogTitle>Material bearbeiten</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bezeichnung</label>
                  <Input value={editMatForm.name || ""} onChange={(e) => setEditMatForm({ ...editMatForm, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                  <Textarea value={editMatForm.description || ""} onChange={(e) => setEditMatForm({ ...editMatForm, description: e.target.value })} rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Einheit</label>
                    <NativeSelect value={editMatForm.unit || "STUECK"} onChange={(e) => setEditMatForm({ ...editMatForm, unit: e.target.value })}>
                      {Object.entries(unitLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </NativeSelect>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preis/Einheit (€)</label>
                    <Input type="number" step="0.01" value={editMatForm.pricePerUnit || ""} onChange={(e) => setEditMatForm({ ...editMatForm, pricePerUnit: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                  <Input value={editMatForm.category || ""} onChange={(e) => setEditMatForm({ ...editMatForm, category: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gewicht (kg)</label>
                    <Input type="number" step="0.01" value={editMatForm.weight || ""} onChange={(e) => setEditMatForm({ ...editMatForm, weight: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                    <Input value={editMatForm.format || ""} onChange={(e) => setEditMatForm({ ...editMatForm, format: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Wärmeleitwert (W/mK)</label>
                    <Input type="number" step="0.001" value={editMatForm.thermalValue || ""} onChange={(e) => setEditMatForm({ ...editMatForm, thermalValue: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min. Dachneigung (°)</label>
                    <Input type="number" step="0.1" value={editMatForm.minSlope || ""} onChange={(e) => setEditMatForm({ ...editMatForm, minSlope: e.target.value })} />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setEditMat(null)}>Abbrechen</Button>
                  <Button onClick={saveEditMat} disabled={savingEdit}>
                    {savingEdit ? "Speichern..." : "Speichern"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="leistungen">
          <div className="flex justify-end mb-4">
            <Dialog open={svcDialogOpen} onOpenChange={setSvcDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4" />Neue Leistung</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Neue Leistung</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateService} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bezeichnung</label>
                    <Input name="name" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                    <Textarea name="description" rows={2} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Einheit</label>
                      <NativeSelect name="unit" defaultValue="STUNDE">
                        {Object.entries(unitLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </NativeSelect>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Preis/Einheit (€)</label>
                      <Input name="pricePerUnit" type="number" step="0.01" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                    <Input name="category" placeholder="z.B. Arbeit, Gerüst" />
                  </div>
                  <Button type="submit" className="w-full">Leistung anlegen</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm font-medium text-gray-500">
                    <th className="px-4 py-3">Bezeichnung</th>
                    <th className="px-4 py-3">Kategorie</th>
                    <th className="px-4 py-3">Einheit</th>
                    <th className="px-4 py-3 text-right">Preis</th>
                    <th className="px-4 py-3 w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((s) => (
                    <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => openEditSvc(s)}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{s.name}</p>
                        {s.description && <p className="text-xs text-gray-400">{s.description}</p>}
                      </td>
                      <td className="px-4 py-3">{s.category && <Badge variant="secondary">{s.category}</Badge>}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{unitLabels[s.unit] || s.unit}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(s.pricePerUnit)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEditSvc(s); }} className="h-8 w-8">
                            <Pencil className="h-3.5 w-3.5 text-gray-400" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteService(s.id); }} className="h-8 w-8">
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Leistung bearbeiten Dialog */}
          <Dialog open={!!editSvc} onOpenChange={(o) => { if (!o) setEditSvc(null); }}>
            <DialogContent>
              <DialogHeader><DialogTitle>Leistung bearbeiten</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bezeichnung</label>
                  <Input value={editSvcForm.name || ""} onChange={(e) => setEditSvcForm({ ...editSvcForm, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                  <Textarea value={editSvcForm.description || ""} onChange={(e) => setEditSvcForm({ ...editSvcForm, description: e.target.value })} rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Einheit</label>
                    <NativeSelect value={editSvcForm.unit || "STUNDE"} onChange={(e) => setEditSvcForm({ ...editSvcForm, unit: e.target.value })}>
                      {Object.entries(unitLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </NativeSelect>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preis/Einheit (€)</label>
                    <Input type="number" step="0.01" value={editSvcForm.pricePerUnit || ""} onChange={(e) => setEditSvcForm({ ...editSvcForm, pricePerUnit: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                  <Input value={editSvcForm.category || ""} onChange={(e) => setEditSvcForm({ ...editSvcForm, category: e.target.value })} />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setEditSvc(null)}>Abbrechen</Button>
                  <Button onClick={saveEditSvc} disabled={savingEdit}>
                    {savingEdit ? "Speichern..." : "Speichern"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="import">
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Materialien importieren</h3>
                <p className="text-sm text-gray-500 mb-4">Importiere Materialien aus einer CSV- oder JSON-Datei</p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">Datei auswählen (CSV oder JSON)</label>
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".csv,.json"
                        onChange={(e) => { if (e.target.files?.[0]) handleImport(e.target.files[0]); }}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                    {importing && (
                      <div className="flex items-center gap-2 text-sm text-blue-600">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                        Import läuft...
                      </div>
                    )}
                    {importResult && (
                      <Card className={importResult.error ? "border-red-200 bg-red-50/50" : "border-green-200 bg-green-50/50"}>
                        <CardContent className="p-4">
                          {importResult.error ? (
                            <div className="flex items-center gap-2 text-red-700">
                              <AlertTriangle className="h-5 w-5" />
                              <p className="text-sm font-medium">{importResult.error}</p>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-green-700">
                                <CheckCircle2 className="h-5 w-5" />
                                <p className="text-sm font-medium">{importResult.imported} von {importResult.total} Artikeln importiert</p>
                              </div>
                              {importResult.skipped > 0 && (
                                <p className="text-xs text-amber-600">{importResult.skipped} übersprungen</p>
                              )}
                              {importResult.errors?.length > 0 && (
                                <div className="mt-2 text-xs text-red-600 space-y-0.5">
                                  {importResult.errors.map((e: string, i: number) => <p key={i}>{e}</p>)}
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={downloadCSVTemplate}>
                      <Download className="h-4 w-4" />
                      CSV-Vorlage herunterladen
                    </Button>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Unterstützte Formate</h4>
                    <div className="space-y-3">
                      <Card className="p-3 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-700 mb-1">CSV (Semikolon oder Komma getrennt)</p>
                        <pre className="text-[11px] text-gray-600 font-mono overflow-x-auto">
{`name;beschreibung;kategorie;einheit;preis
Schraube M8;Edelstahl A2;Befestigung;STUECK;0.35
Dachziegel;Ton, rot;Eindeckung;STUECK;1.20`}
                        </pre>
                      </Card>
                      <Card className="p-3 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-700 mb-1">JSON</p>
                        <pre className="text-[11px] text-gray-600 font-mono overflow-x-auto">
{`[
  {
    "name": "Schraube M8",
    "description": "Edelstahl A2",
    "category": "Befestigung",
    "unit": "STUECK",
    "pricePerUnit": 0.35
  }
]`}
                        </pre>
                      </Card>
                      <div className="text-xs text-gray-500 space-y-1">
                        <p><strong>Spalten:</strong> name*, beschreibung, kategorie, einheit, preis, gewicht, format, bildurl</p>
                        <p><strong>Einheiten:</strong> STUECK, METER, QUADRATMETER, KUBIKMETER, KILOGRAMM, LITER, PALETTE, PAUSCHAL, STUNDE</p>
                        <p className="text-gray-400">* = Pflichtfeld</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="api">
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">API-Schnittstelle</h3>
                <p className="text-sm text-gray-500 mb-4">Binde externe Systeme an, um Artikel automatisch zu synchronisieren</p>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      API-Schlüssel
                    </h4>
                    <div className="flex items-center gap-2">
                      <Input
                        value={apiKey || "Kein API-Key generiert"}
                        readOnly
                        className="font-mono text-sm max-w-lg"
                      />
                      {apiKey && (
                        <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={copyApiKey}>
                          {apiKeyCopied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                          {apiKeyCopied ? "Kopiert" : "Kopieren"}
                        </Button>
                      )}
                      <Button size="sm" className="gap-1.5 shrink-0" onClick={generateApiKey} disabled={apiKeyLoading}>
                        <RefreshCw className={`h-4 w-4 ${apiKeyLoading ? "animate-spin" : ""}`} />
                        {apiKey ? "Neu generieren" : "Generieren"}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Der API-Key wird als Bearer Token oder als Query-Parameter übergeben.
                    </p>
                  </div>

                  <div className="border-t pt-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">API-Endpunkte</h4>
                    <div className="space-y-4">
                      <Card className="p-4 bg-gray-50">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-green-100 text-green-700">GET</Badge>
                          <code className="text-sm font-mono text-gray-800">/api/katalog/extern</code>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">Alle Materialien abrufen. Optional mit Filtern.</p>
                        <pre className="text-[11px] text-gray-500 font-mono bg-white p-2 rounded border">
{`# Alle Artikel abrufen
curl -H "Authorization: Bearer DEIN_API_KEY" \\
  https://DEINE-DOMAIN/api/katalog/extern

# Mit Filtern
?category=Befestigung&search=Schraube&limit=50`}
                        </pre>
                      </Card>

                      <Card className="p-4 bg-gray-50">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-blue-100 text-blue-700">POST</Badge>
                          <code className="text-sm font-mono text-gray-800">/api/katalog/extern</code>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">Neue Materialien anlegen (einzeln oder mehrere).</p>
                        <pre className="text-[11px] text-gray-500 font-mono bg-white p-2 rounded border">
{`curl -X POST -H "Authorization: Bearer DEIN_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '[{"name":"Schraube M8","unit":"STUECK","pricePerUnit":0.35}]' \\
  https://DEINE-DOMAIN/api/katalog/extern`}
                        </pre>
                      </Card>

                      <Card className="p-4 bg-gray-50">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-amber-100 text-amber-700">PUT</Badge>
                          <code className="text-sm font-mono text-gray-800">/api/katalog/extern</code>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">Bestehendes Material aktualisieren.</p>
                        <pre className="text-[11px] text-gray-500 font-mono bg-white p-2 rounded border">
{`curl -X PUT -H "Authorization: Bearer DEIN_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"id":"ARTIKEL_ID","pricePerUnit":0.42}' \\
  https://DEINE-DOMAIN/api/katalog/extern`}
                        </pre>
                      </Card>

                      <Card className="p-4 bg-gray-50">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-red-100 text-red-700">DELETE</Badge>
                          <code className="text-sm font-mono text-gray-800">/api/katalog/extern</code>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">Material löschen.</p>
                        <pre className="text-[11px] text-gray-500 font-mono bg-white p-2 rounded border">
{`curl -X DELETE -H "Authorization: Bearer DEIN_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"id":"ARTIKEL_ID"}' \\
  https://DEINE-DOMAIN/api/katalog/extern`}
                        </pre>
                      </Card>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Felder</h4>
                    <Card>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b text-left font-medium text-gray-500">
                              <th className="px-3 py-2">Feld</th>
                              <th className="px-3 py-2">Typ</th>
                              <th className="px-3 py-2">Pflicht</th>
                              <th className="px-3 py-2">Beschreibung</th>
                            </tr>
                          </thead>
                          <tbody className="text-gray-600">
                            {[
                              ["name", "string", "Ja", "Materialbezeichnung"],
                              ["description", "string", "Nein", "Beschreibung"],
                              ["category", "string", "Nein", "Kategorie (z.B. Befestigung)"],
                              ["unit", "enum", "Nein", "STUECK, METER, KILOGRAMM, etc."],
                              ["pricePerUnit", "number", "Nein", "Preis pro Einheit in Euro"],
                              ["imageUrl", "string", "Nein", "URL zum Produktbild"],
                              ["weight", "number", "Nein", "Gewicht in kg"],
                              ["format", "string", "Nein", "Format/Größe"],
                            ].map(([field, type, req, desc]) => (
                              <tr key={field} className="border-b border-gray-50">
                                <td className="px-3 py-1.5 font-mono">{field}</td>
                                <td className="px-3 py-1.5">{type}</td>
                                <td className="px-3 py-1.5">{req}</td>
                                <td className="px-3 py-1.5">{desc}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
