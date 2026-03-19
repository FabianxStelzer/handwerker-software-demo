"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Save, Trash2, Package, FileText, Receipt,
  FolderKanban, ToggleLeft, ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

const unitLabels: Record<string, string> = {
  STUECK: "Stk", METER: "m", QUADRATMETER: "m²", KUBIKMETER: "m³",
  KILOGRAMM: "kg", LITER: "l", PALETTE: "Pal.", PAUSCHAL: "psch.", STUNDE: "Std",
};

const TAX_OPTIONS = [
  { value: "19", label: "19 % (Standard)" },
  { value: "7", label: "7 % (ermäßigt)" },
  { value: "0", label: "0 % (steuerfrei)" },
];

export default function MaterialDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [material, setMaterial] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/katalog/materialien/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setMaterial(data);
        setForm({
          name: data.name || "",
          description: data.description || "",
          category: data.category || "",
          unit: data.unit || "STUECK",
          pricePerUnit: String(data.pricePerUnit || 0),
          weight: data.weight ? String(data.weight) : "",
          format: data.format || "",
          thermalValue: data.thermalValue ? String(data.thermalValue) : "",
          minSlope: data.minSlope ? String(data.minSlope) : "",
          artikelNr: data.artikelNr || "",
          ean: data.ean || "",
          taxRate: String(data.taxRate ?? 19),
          purchasePrice: data.purchasePrice ? String(data.purchasePrice) : "",
          margin: data.margin ? String(data.margin) : "",
          minStock: data.minStock ? String(data.minStock) : "",
          currentStock: data.currentStock ? String(data.currentStock) : "",
          invoiceText: data.invoiceText || "",
          notes: data.notes || "",
          isActive: data.isActive !== false,
        });
        setLoading(false);
      });
  }, [id]);

  function upd(key: string, val: any) {
    setForm((f) => ({ ...f, [key]: val }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    await fetch(`/api/katalog/materialien/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function remove() {
    if (!confirm("Material wirklich löschen?")) return;
    await fetch(`/api/katalog/materialien/${id}`, { method: "DELETE" });
    router.push("/katalog");
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#9eb552] border-t-transparent" /></div>;
  }

  if (!material || material.error) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Material nicht gefunden.</p>
        <Link href="/katalog" className="text-[#9eb552] hover:underline mt-2 inline-block">Zurück zum Katalog</Link>
      </div>
    );
  }

  const sellPrice = parseFloat(form.pricePerUnit) || 0;
  const buyPrice = parseFloat(form.purchasePrice) || 0;
  const calcMargin = buyPrice > 0 ? (((sellPrice - buyPrice) / buyPrice) * 100).toFixed(1) : "–";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/katalog")} className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-[#9eb552]" />
              <h1 className="text-xl font-bold text-gray-900">{form.name || "Material"}</h1>
              {form.artikelNr && <Badge variant="secondary" className="text-xs">Art.-Nr. {form.artikelNr}</Badge>}
              {!form.isActive && <Badge className="bg-red-100 text-red-700">Inaktiv</Badge>}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{form.category || "Keine Kategorie"} · {unitLabels[form.unit] || form.unit} · {formatCurrency(sellPrice)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={remove}>
            <Trash2 className="h-4 w-4 mr-1" />Löschen
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            <Save className="h-4 w-4 mr-1" />{saving ? "Speichern..." : saved ? "Gespeichert!" : "Speichern"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stammdaten */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Stammdaten</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bezeichnung *</label>
                  <Input value={form.name} onChange={(e) => upd("name", e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                  <Textarea value={form.description} onChange={(e) => upd("description", e.target.value)} rows={2} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Artikelnummer</label>
                  <Input value={form.artikelNr} onChange={(e) => upd("artikelNr", e.target.value)} placeholder="z.B. MAT-001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">EAN / Barcode</label>
                  <Input value={form.ean} onChange={(e) => upd("ean", e.target.value)} placeholder="z.B. 4012345678901" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                  <Input value={form.category} onChange={(e) => upd("category", e.target.value)} placeholder="z.B. Eindeckung" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Einheit</label>
                  <NativeSelect value={form.unit} onChange={(e) => upd("unit", e.target.value)}>
                    {Object.entries(unitLabels).map(([k, v]) => <option key={k} value={k}>{v} ({k})</option>)}
                  </NativeSelect>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preise & Kalkulation */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Preise & Kalkulation</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Verkaufspreis / Einheit (€) *</label>
                  <Input type="number" step="0.01" value={form.pricePerUnit} onChange={(e) => upd("pricePerUnit", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Einkaufspreis / Einheit (€)</label>
                  <Input type="number" step="0.01" value={form.purchasePrice} onChange={(e) => upd("purchasePrice", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marge</label>
                  <div className="flex items-center h-10 px-3 bg-gray-50 border rounded-md text-sm text-gray-700">
                    {calcMargin} %
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MwSt-Satz</label>
                  <NativeSelect value={form.taxRate} onChange={(e) => upd("taxRate", e.target.value)}>
                    {TAX_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </NativeSelect>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rechnung & Angebot */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Rechnung & Angebot</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rechnungstext</label>
                  <Textarea
                    value={form.invoiceText}
                    onChange={(e) => upd("invoiceText", e.target.value)}
                    rows={3}
                    placeholder="Dieser Text wird auf Rechnungen und Angeboten als Positionstext verwendet. Leer = Bezeichnung wird verwendet."
                  />
                  <p className="text-xs text-gray-400 mt-1">Wird als Positionstext auf Rechnungen und Angeboten übernommen.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Technische Daten */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Technische Daten</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gewicht (kg)</label>
                  <Input type="number" step="0.01" value={form.weight} onChange={(e) => upd("weight", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Format / Abmessung</label>
                  <Input value={form.format} onChange={(e) => upd("format", e.target.value)} placeholder="z.B. 30x50mm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Wärmeleitwert (W/mK)</label>
                  <Input type="number" step="0.001" value={form.thermalValue} onChange={(e) => upd("thermalValue", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min. Dachneigung (°)</label>
                  <Input type="number" step="0.1" value={form.minSlope} onChange={(e) => upd("minSlope", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lager */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Lagerbestand</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aktueller Bestand</label>
                  <Input type="number" step="1" value={form.currentStock} onChange={(e) => upd("currentStock", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mindestbestand</label>
                  <Input type="number" step="1" value={form.minStock} onChange={(e) => upd("minStock", e.target.value)} />
                  <p className="text-xs text-gray-400 mt-1">Warnung wenn Bestand unter diesen Wert fällt.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notizen */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Interne Notizen</h2>
              <Textarea
                value={form.notes}
                onChange={(e) => upd("notes", e.target.value)}
                rows={3}
                placeholder="Interne Notizen, nur für Mitarbeiter sichtbar..."
              />
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Status</h3>
              <button
                onClick={() => upd("isActive", !form.isActive)}
                className="flex items-center gap-2 w-full text-left"
              >
                {form.isActive
                  ? <ToggleRight className="h-6 w-6 text-[#9eb552]" />
                  : <ToggleLeft className="h-6 w-6 text-gray-400" />}
                <span className="text-sm">{form.isActive ? "Aktiv" : "Inaktiv"}</span>
              </button>
              <p className="text-xs text-gray-400 mt-2">Inaktive Artikel werden bei Angebots- und Rechnungserstellung nicht vorgeschlagen.</p>
            </CardContent>
          </Card>

          {/* Quick info */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Übersicht</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">VK-Preis</span>
                  <span className="font-medium">{formatCurrency(sellPrice)}</span>
                </div>
                {buyPrice > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">EK-Preis</span>
                    <span className="font-medium">{formatCurrency(buyPrice)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">MwSt</span>
                  <span className="font-medium">{form.taxRate} %</span>
                </div>
                {form.currentStock && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Bestand</span>
                    <span className={`font-medium ${parseFloat(form.currentStock) <= (parseFloat(form.minStock) || 0) ? "text-red-600" : "text-green-600"}`}>
                      {form.currentStock} {unitLabels[form.unit]}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Verwendung in Projekten */}
          {material.projectMaterials?.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                  <FolderKanban className="h-4 w-4" />Projekte ({material.projectMaterials.length})
                </h3>
                <div className="space-y-2">
                  {material.projectMaterials.map((pm: any) => (
                    <Link key={pm.id} href={`/projekte/${pm.project?.id}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-[#9eb552]">
                      <span className="text-xs text-gray-400">{pm.project?.projectNumber}</span>
                      <span>{pm.project?.name}</span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Verwendung in Angeboten */}
          {material.quotationItems?.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                  <FileText className="h-4 w-4" />Angebote ({material.quotationItems.length})
                </h3>
                <div className="space-y-2">
                  {material.quotationItems.map((qi: any) => (
                    <div key={qi.id} className="flex justify-between text-sm">
                      <span className="text-gray-700">{qi.quotation?.quotationNumber}</span>
                      <span className="text-gray-500">{qi.quantity} × {formatCurrency(qi.pricePerUnit)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Verwendung in Aufträgen */}
          {material.orderItems?.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                  <Receipt className="h-4 w-4" />Aufträge ({material.orderItems.length})
                </h3>
                <div className="space-y-2">
                  {material.orderItems.map((oi: any) => (
                    <div key={oi.id} className="flex justify-between text-sm">
                      <span className="text-gray-700">{oi.order?.orderNumber}</span>
                      <span className="text-gray-500">{oi.quantity} × {formatCurrency(oi.pricePerUnit)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Meta */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Details</h3>
              <div className="space-y-1 text-xs text-gray-400">
                <p>Erstellt: {material.createdAt ? new Date(material.createdAt).toLocaleDateString("de-DE") : "–"}</p>
                <p>Aktualisiert: {material.updatedAt ? new Date(material.updatedAt).toLocaleDateString("de-DE") : "–"}</p>
                <p className="font-mono text-[10px]">ID: {material.id}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
