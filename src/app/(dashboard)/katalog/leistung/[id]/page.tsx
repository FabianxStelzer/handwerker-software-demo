"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Save, Trash2, Wrench, FileText, Receipt,
  ToggleLeft, ToggleRight,
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

export default function LeistungDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [service, setService] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/katalog/leistungen/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setService(data);
        setForm({
          name: data.name || "",
          description: data.description || "",
          category: data.category || "",
          unit: data.unit || "STUNDE",
          pricePerUnit: String(data.pricePerUnit || 0),
          artikelNr: data.artikelNr || "",
          taxRate: String(data.taxRate ?? 19),
          duration: data.duration ? String(data.duration) : "",
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
    await fetch(`/api/katalog/leistungen/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function remove() {
    if (!confirm("Leistung wirklich löschen?")) return;
    await fetch(`/api/katalog/leistungen/${id}`, { method: "DELETE" });
    router.push("/katalog");
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#9eb552] border-t-transparent" /></div>;
  }

  if (!service || service.error) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Leistung nicht gefunden.</p>
        <Link href="/katalog" className="text-[#9eb552] hover:underline mt-2 inline-block">Zurück zum Katalog</Link>
      </div>
    );
  }

  const price = parseFloat(form.pricePerUnit) || 0;

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
              <Wrench className="h-5 w-5 text-[#9eb552]" />
              <h1 className="text-xl font-bold text-gray-900">{form.name || "Leistung"}</h1>
              {form.artikelNr && <Badge variant="secondary" className="text-xs">Art.-Nr. {form.artikelNr}</Badge>}
              {!form.isActive && <Badge className="bg-red-100 text-red-700">Inaktiv</Badge>}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{form.category || "Keine Kategorie"} · {unitLabels[form.unit] || form.unit} · {formatCurrency(price)}</p>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Leistungsnummer</label>
                  <Input value={form.artikelNr} onChange={(e) => upd("artikelNr", e.target.value)} placeholder="z.B. LST-001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                  <Input value={form.category} onChange={(e) => upd("category", e.target.value)} placeholder="z.B. Arbeit, Gerüst" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Einheit</label>
                  <NativeSelect value={form.unit} onChange={(e) => upd("unit", e.target.value)}>
                    {Object.entries(unitLabels).map(([k, v]) => <option key={k} value={k}>{v} ({k})</option>)}
                  </NativeSelect>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Geschätzte Dauer (Std)</label>
                  <Input type="number" step="0.25" value={form.duration} onChange={(e) => upd("duration", e.target.value)} placeholder="z.B. 2.5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preise & Kalkulation */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Preise & Kalkulation</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preis / Einheit (€) *</label>
                  <Input type="number" step="0.01" value={form.pricePerUnit} onChange={(e) => upd("pricePerUnit", e.target.value)} />
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
              <p className="text-xs text-gray-400 mt-2">Inaktive Leistungen werden bei Angebots- und Rechnungserstellung nicht vorgeschlagen.</p>
            </CardContent>
          </Card>

          {/* Quick info */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Übersicht</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Preis</span>
                  <span className="font-medium">{formatCurrency(price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">MwSt</span>
                  <span className="font-medium">{form.taxRate} %</span>
                </div>
                {form.duration && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Dauer</span>
                    <span className="font-medium">{form.duration} Std</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Verwendung in Angeboten */}
          {service.quotationItems?.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                  <FileText className="h-4 w-4" />Angebote ({service.quotationItems.length})
                </h3>
                <div className="space-y-2">
                  {service.quotationItems.map((qi: any) => (
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
          {service.orderItems?.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                  <Receipt className="h-4 w-4" />Aufträge ({service.orderItems.length})
                </h3>
                <div className="space-y-2">
                  {service.orderItems.map((oi: any) => (
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
                <p>Erstellt: {service.createdAt ? new Date(service.createdAt).toLocaleDateString("de-DE") : "–"}</p>
                <p>Aktualisiert: {service.updatedAt ? new Date(service.updatedAt).toLocaleDateString("de-DE") : "–"}</p>
                <p className="font-mono text-[10px]">ID: {service.id}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
