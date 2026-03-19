"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Save, Pencil, Plus, Receipt, FileText, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LineChart } from "@/components/charts/line-chart";

const STATUS_COLORS: Record<string, string> = {
  OFFEN: "bg-amber-100 text-amber-700", BEZAHLT: "bg-green-100 text-green-700", UEBERFAELLIG: "bg-red-100 text-red-700",
};
const STATUS_LABELS: Record<string, string> = {
  OFFEN: "Offen", BEZAHLT: "Bezahlt", UEBERFAELLIG: "Überfällig",
};

function formatCurrency(v: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v);
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function LieferantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [vendor, setVendor] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"aktivitaeten" | "umsatz">("aktivitaeten");

  useEffect(() => {
    fetch(`/api/vendors/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setVendor(data);
        setForm({
          name: data.name || "", email: data.email || "", phone: data.phone || "",
          street: data.street || "", zip: data.zip || "", city: data.city || "",
          taxId: data.taxId || "", vatId: data.vatId || "", notes: data.notes || "",
        });
      });
  }, [id]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/vendors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const updated = await res.json();
      setVendor((prev: any) => (prev ? { ...prev, ...updated } : prev));
      setEditing(false);
    }
    setSaving(false);
  }

  if (!vendor) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const address = [vendor.street, [vendor.zip, vendor.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  const now = new Date();
  const chartData = (vendor.monthlyExpenses || []).map((val: number, i: number) => {
    const monthIdx = (now.getMonth() - 11 + i + 12) % 12;
    const monthNames = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
    return { label: monthNames[monthIdx], value1: val, value2: 0 };
  });

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{vendor.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/buchhaltung/belege">
            <Button variant="outline" size="sm" className="gap-1.5 border-[#9eb552] text-[#9eb552] hover:bg-[#9eb552]/10">
              <Plus className="h-4 w-4" />Neuer Beleg
            </Button>
          </Link>
          {!editing ? (
            <Button size="sm" className="gap-1.5 bg-[#9eb552] hover:bg-[#8da448] text-white" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />Bearbeiten
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Abbrechen</Button>
              <Button size="sm" className="gap-1.5 bg-[#9eb552] hover:bg-[#8da448] text-white" onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4" />{saving ? "..." : "Speichern"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200 mb-5">
        <button
          onClick={() => setActiveTab("aktivitaeten")}
          className={`px-5 py-2.5 text-xs font-bold tracking-wide border-b-2 transition-colors ${activeTab === "aktivitaeten" ? "border-[#9eb552] text-[#9eb552]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          AKTIVITÄTEN
        </button>
        <button
          onClick={() => setActiveTab("umsatz")}
          className={`px-5 py-2.5 text-xs font-bold tracking-wide border-b-2 transition-colors ${activeTab === "umsatz" ? "border-[#9eb552] text-[#9eb552]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          AUSGABEN
        </button>
      </div>

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left sidebar */}
        <div className="lg:col-span-4 space-y-5">
          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Kontaktdaten</h3>
              <div className="space-y-2.5">
                {vendor.email && (
                  <div>
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">E-Mail</p>
                    <a href={`mailto:${vendor.email}`} className="text-sm text-blue-600 hover:underline">{vendor.email}</a>
                  </div>
                )}
                {vendor.phone && (
                  <div>
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Telefon</p>
                    <a href={`tel:${vendor.phone}`} className="text-sm text-gray-900">{vendor.phone}</a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Firma</h3>
              <div className="space-y-2.5">
                <div>
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Lieferanten-Nr.</p>
                  <p className="text-sm text-gray-900">{vendor.id.slice(-5)}</p>
                </div>
                {address && (
                  <div>
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Adresse</p>
                    <p className="text-sm text-gray-900">{address}</p>
                  </div>
                )}
                {vendor.taxId && (
                  <div>
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Steuernummer</p>
                    <p className="text-sm text-gray-900">{vendor.taxId}</p>
                  </div>
                )}
                {vendor.vatId && (
                  <div>
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">USt-IdNr.</p>
                    <p className="text-sm text-gray-900">{vendor.vatId}</p>
                  </div>
                )}
                {vendor.notes && (
                  <div>
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Notiz</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{vendor.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right main */}
        <div className="lg:col-span-8">
          {activeTab === "aktivitaeten" && (
            <div className="space-y-5">
              {/* Eingangsrechnungen */}
              <Card>
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-orange-500" />
                    Eingangsrechnungen ({vendor.incomingInvoices?.length || 0})
                  </h3>
                  {(!vendor.incomingInvoices || vendor.incomingInvoices.length === 0) ? (
                    <p className="text-sm text-gray-400 py-4 text-center">Keine Eingangsrechnungen</p>
                  ) : (
                    <div className="space-y-2">
                      {vendor.incomingInvoices.map((inv: any) => (
                        <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900">{inv.referenceNo}</p>
                            <p className="text-xs text-gray-500">{formatDate(inv.date)}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-sm font-semibold text-gray-900">{formatCurrency(inv.grossAmount)}</span>
                            <Badge className={STATUS_COLORS[inv.status] || "bg-gray-100 text-gray-700"}>{STATUS_LABELS[inv.status] || inv.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Ausgaben */}
              <Card>
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-red-500" />
                    Ausgaben ({vendor.expenses?.length || 0})
                  </h3>
                  {(!vendor.expenses || vendor.expenses.length === 0) ? (
                    <p className="text-sm text-gray-400 py-4 text-center">Keine Ausgaben</p>
                  ) : (
                    <div className="space-y-2">
                      {vendor.expenses.map((ex: any) => (
                        <div key={ex.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900">{ex.description}</p>
                            <p className="text-xs text-gray-500">{ex.category} · {formatDate(ex.date)}</p>
                          </div>
                          <span className="text-sm font-semibold text-gray-900 shrink-0">{formatCurrency(ex.grossAmount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "umsatz" && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Ausgaben</h2>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <Card className="p-4 text-center">
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">Gesamtausgaben</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(vendor.totalExpenses || 0)}</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">Ausgaben letzte 12 Monate</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(vendor.expenses12m || 0)}</p>
                </Card>
              </div>

              <Card className="p-4">
                <LineChart
                  data={chartData}
                  height={250}
                  color1="#dc2626"
                  color2="transparent"
                  label1="Ausgaben"
                  label2=""
                />
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Lieferant bearbeiten</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Straße</label><Input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">PLZ</label><Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Ort</label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Steuernummer</label><Input value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">USt-IdNr.</label><Input value={form.vatId} onChange={(e) => setForm({ ...form, vatId: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditing(false)}>Abbrechen</Button>
              <Button className="bg-[#9eb552] hover:bg-[#8da448] text-white" onClick={handleSave} disabled={saving}>{saving ? "Speichern..." : "Speichern"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
