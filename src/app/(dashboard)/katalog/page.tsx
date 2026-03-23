"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Package, Wrench, Trash2, Upload, Download,
  Key, Copy, RefreshCw, CheckCircle2, AlertTriangle, Plug, ChevronRight,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";

export default function KatalogPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const unitLabels: Record<string, string> = useMemo(() => ({
    STUECK: t("common.stk"), METER: t("common.m"), QUADRATMETER: t("common.m2"), KUBIKMETER: t("common.m3"),
    KILOGRAMM: t("common.kg"), LITER: t("common.l"), PALETTE: "Pal.", PAUSCHAL: t("common.psch"), STUNDE: t("common.std"),
  }), [t]);
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
  const [matSearch, setMatSearch] = useState("");
  const [svcSearch, setSvcSearch] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

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
    const res = await fetch("/api/katalog/materialien", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    const newMat = await res.json();
    setMatDialogOpen(false);
    if (newMat?.id) {
      router.push(`/katalog/material/${newMat.id}`);
    } else {
      const r = await fetch("/api/katalog/materialien");
      setMaterials(await r.json());
    }
  }

  async function handleCreateService(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/katalog/leistungen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    const newSvc = await res.json();
    setSvcDialogOpen(false);
    if (newSvc?.id) {
      router.push(`/katalog/leistung/${newSvc.id}`);
    } else {
      const r = await fetch("/api/katalog/leistungen");
      setServices(await r.json());
    }
  }

  async function deleteMaterial(id: string) {
    if (!confirm(t("katalog.materialLoeschen"))) return;
    await fetch(`/api/katalog/materialien/${id}`, { method: "DELETE" });
    setMaterials(materials.filter((m) => m.id !== id));
  }

  async function deleteService(id: string) {
    if (!confirm(t("katalog.leistungLoeschen"))) return;
    await fetch(`/api/katalog/leistungen/${id}`, { method: "DELETE" });
    setServices(services.filter((s) => s.id !== id));
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

  const filteredMats = materials.filter((m) => {
    if (!matSearch) return true;
    const q = matSearch.toLowerCase();
    return m.name?.toLowerCase().includes(q) || m.category?.toLowerCase().includes(q) || m.artikelNr?.toLowerCase().includes(q);
  });

  const filteredSvcs = services.filter((s) => {
    if (!svcSearch) return true;
    const q = svcSearch.toLowerCase();
    return s.name?.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q) || s.artikelNr?.toLowerCase().includes(q);
  });

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#9eb552] border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("katalog.title")}</h1>
        <p className="text-sm text-gray-500 mt-1">{t("katalog.subtitle")}</p>
      </div>

      <Tabs defaultValue="materialien">
        <TabsList className="flex-wrap">
          <TabsTrigger value="materialien" className="flex items-center gap-1.5">
            <Package className="h-4 w-4" />{t("katalog.materialien")} ({materials.length})
          </TabsTrigger>
          <TabsTrigger value="leistungen" className="flex items-center gap-1.5">
            <Wrench className="h-4 w-4" />{t("katalog.leistungen")} ({services.length})
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-1.5">
            <Upload className="h-4 w-4" />{t("katalog.importieren")}
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-1.5" onClick={loadApiKey}>
            <Plug className="h-4 w-4" />{t("katalog.apiSchnittstelle")}
          </TabsTrigger>
        </TabsList>

        {/* ── Materialien ─── */}
        <TabsContent value="materialien">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <Input
              placeholder={t("katalog.materialSuchen")}
              value={matSearch}
              onChange={(e) => setMatSearch(e.target.value)}
              className="max-w-xs"
            />
            <Dialog open={matDialogOpen} onOpenChange={setMatDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4" />{t("katalog.neuesMaterial")}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t("katalog.neuesMaterial")}</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateMaterial} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("katalog.bezeichnung")} *</label>
                    <Input name="name" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t("material.einheit")}</label>
                      <NativeSelect name="unit" defaultValue="STUECK">
                        {Object.entries(unitLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </NativeSelect>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t("material.preis")}/{t("material.einheit")} (€)</label>
                      <Input name="pricePerUnit" type="number" step="0.01" defaultValue="0" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("material.kategorie")}</label>
                    <Input name="category" />
                  </div>
                  <Button type="submit" className="w-full">{t("katalog.anlegen")}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm font-medium text-gray-500">
                    <th className="px-4 py-3">{t("katalog.bezeichnung")}</th>
                    <th className="px-4 py-3">{t("katalog.artikelNr")}</th>
                    <th className="px-4 py-3">{t("material.kategorie")}</th>
                    <th className="px-4 py-3">{t("material.einheit")}</th>
                    <th className="px-4 py-3 text-right">{t("katalog.vkPreis")}</th>
                    <th className="px-4 py-3 text-right">{t("common.mwst")}</th>
                    <th className="px-4 py-3">{t("common.status")}</th>
                    <th className="px-4 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMats.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">{t("katalog.keineGefunden")}</td></tr>
                  )}
                  {filteredMats.map((m) => (
                    <tr
                      key={m.id}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/katalog/material/${m.id}`)}
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{m.name}</p>
                        {m.description && <p className="text-xs text-gray-400 truncate max-w-xs">{m.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 font-mono">{m.artikelNr || "–"}</td>
                      <td className="px-4 py-3">
                        {m.category ? <Badge variant="secondary">{m.category}</Badge> : <span className="text-xs text-gray-300">–</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{unitLabels[m.unit] || m.unit}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(m.pricePerUnit)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-right">{m.taxRate ?? 19} %</td>
                      <td className="px-4 py-3">
                        {m.isActive === false
                          ? <Badge className="bg-red-100 text-red-700 text-[10px]">{t("common.inaktiv")}</Badge>
                          : <Badge className="bg-green-100 text-green-700 text-[10px]">{t("common.aktiv")}</Badge>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteMaterial(m.id); }} className="h-8 w-8">
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                          <ChevronRight className="h-4 w-4 text-gray-300" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ── Leistungen ─── */}
        <TabsContent value="leistungen">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <Input
              placeholder={t("katalog.leistungenSuchen")}
              value={svcSearch}
              onChange={(e) => setSvcSearch(e.target.value)}
              className="max-w-xs"
            />
            <Dialog open={svcDialogOpen} onOpenChange={setSvcDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4" />{t("katalog.neueLeistung")}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t("katalog.neueLeistung")}</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateService} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("katalog.bezeichnung")} *</label>
                    <Input name="name" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t("material.einheit")}</label>
                      <NativeSelect name="unit" defaultValue="STUNDE">
                        {Object.entries(unitLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </NativeSelect>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t("material.preis")}/{t("material.einheit")} (€)</label>
                      <Input name="pricePerUnit" type="number" step="0.01" defaultValue="0" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("material.kategorie")}</label>
                    <Input name="category" />
                  </div>
                  <Button type="submit" className="w-full">{t("katalog.anlegen")}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm font-medium text-gray-500">
                    <th className="px-4 py-3">{t("katalog.bezeichnung")}</th>
                    <th className="px-4 py-3">{t("katalog.leistungsNr")}</th>
                    <th className="px-4 py-3">{t("material.kategorie")}</th>
                    <th className="px-4 py-3">{t("material.einheit")}</th>
                    <th className="px-4 py-3 text-right">{t("material.preis")}</th>
                    <th className="px-4 py-3 text-right">{t("common.mwst")}</th>
                    <th className="px-4 py-3">{t("common.status")}</th>
                    <th className="px-4 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSvcs.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">{t("katalog.keineGefunden")}</td></tr>
                  )}
                  {filteredSvcs.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/katalog/leistung/${s.id}`)}
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{s.name}</p>
                        {s.description && <p className="text-xs text-gray-400 truncate max-w-xs">{s.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 font-mono">{s.artikelNr || "–"}</td>
                      <td className="px-4 py-3">
                        {s.category ? <Badge variant="secondary">{s.category}</Badge> : <span className="text-xs text-gray-300">–</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{unitLabels[s.unit] || s.unit}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(s.pricePerUnit)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-right">{s.taxRate ?? 19} %</td>
                      <td className="px-4 py-3">
                        {s.isActive === false
                          ? <Badge className="bg-red-100 text-red-700 text-[10px]">{t("common.inaktiv")}</Badge>
                          : <Badge className="bg-green-100 text-green-700 text-[10px]">{t("common.aktiv")}</Badge>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteService(s.id); }} className="h-8 w-8">
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                          <ChevronRight className="h-4 w-4 text-gray-300" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ── Import ─── */}
        <TabsContent value="import">
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{t("katalog.materialien")} {t("common.import")}</h3>
                {/* Descriptive sentence – no exact translation key available */}
                <p className="text-sm text-gray-500 mb-4">{t("katalog.dateiAuswaehlen")} (CSV / JSON)</p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">{t("katalog.dateiAuswaehlen")} (CSV / JSON)</label>
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
                        {t("katalog.importLaeuft")}
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
                                <p className="text-sm font-medium">{importResult.imported} / {importResult.total} {t("katalog.artikelImportiert")}</p>
                              </div>
                              {importResult.skipped > 0 && (
                                <p className="text-xs text-amber-600">{importResult.skipped} {t("katalog.uebersprungen")}</p>
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
                      {t("katalog.csvVorlage")}
                    </Button>
                  </div>

                  <div>
                    {/* "Unterstützte Formate" – no exact translation key */}
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">CSV / JSON</h4>
                    <div className="space-y-3">
                      <Card className="p-3 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-700 mb-1">CSV (Semicolon / Comma)</p>
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
                        <p><strong>{t("katalog.spalten")}:</strong> name*, beschreibung, kategorie, einheit, preis, gewicht, format, bildurl</p>
                        <p><strong>{t("katalog.einheiten")}:</strong> STUECK, METER, QUADRATMETER, KUBIKMETER, KILOGRAMM, LITER, PALETTE, PAUSCHAL, STUNDE</p>
                        <p className="text-gray-400">* = {t("common.pflichtfeld")}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── API ─── */}
        <TabsContent value="api">
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{t("katalog.apiSchnittstelle")}</h3>
                {/* Descriptive sentence – no exact translation key */}
                <p className="text-sm text-gray-500 mb-4">{t("katalog.apiSchnittstelle")}</p>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      {t("katalog.apiKey")}
                    </h4>
                    <div className="flex items-center gap-2">
                      <Input
                        value={apiKey || t("katalog.keinApiKey")}
                        readOnly
                        className="font-mono text-sm max-w-lg"
                      />
                      {apiKey && (
                        <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={copyApiKey}>
                          {apiKeyCopied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                          {apiKeyCopied ? t("katalog.kopiert") : t("common.kopieren")}
                        </Button>
                      )}
                      <Button size="sm" className="gap-1.5 shrink-0" onClick={generateApiKey} disabled={apiKeyLoading}>
                        <RefreshCw className={`h-4 w-4 ${apiKeyLoading ? "animate-spin" : ""}`} />
                        {apiKey ? t("katalog.neuGenerieren") : t("katalog.generieren")}
                      </Button>
                    </div>
                    {/* Technical API description – no translation key available */}
                    <p className="text-xs text-gray-400 mt-1">
                      Bearer Token / Query Parameter
                    </p>
                  </div>

                  <div className="border-t pt-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">{t("katalog.apiEndpunkte")}</h4>
                    <div className="space-y-4">
                      <Card className="p-4 bg-gray-50">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-green-100 text-green-700">GET</Badge>
                          <code className="text-sm font-mono text-gray-800">/api/katalog/extern</code>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{t("katalog.materialien")} – GET</p>
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
                        <p className="text-xs text-gray-600 mb-2">{t("katalog.neuesMaterial")} – POST</p>
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
                        <p className="text-xs text-gray-600 mb-2">{t("common.aktualisieren")} – PUT</p>
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
                        <p className="text-xs text-gray-600 mb-2">{t("common.loeschen")} – DELETE</p>
                        <pre className="text-[11px] text-gray-500 font-mono bg-white p-2 rounded border">
{`curl -X DELETE -H "Authorization: Bearer DEIN_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"id":"ARTIKEL_ID"}' \\
  https://DEINE-DOMAIN/api/katalog/extern`}
                        </pre>
                      </Card>
                    </div>
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
