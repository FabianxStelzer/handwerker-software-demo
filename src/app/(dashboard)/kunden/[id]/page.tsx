"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Save, Pencil, X, Plus, Search, FileText, Calendar,
  Receipt, FileCheck, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LineChart } from "@/components/charts/line-chart";

interface InvoiceInfo {
  id: string;
  invoiceNumber: string;
  status: string;
  grossTotal: number;
  createdAt: string;
  paidDate: string | null;
  dueDate: string | null;
}

interface CustomerDetail {
  id: string;
  type: string;
  company: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
  notes: string | null;
  createdAt: string;
  projects: any[];
  orders: any[];
  quotations: any[];
  invoices: InvoiceInfo[];
  revenue: number;
  revenue12m: number;
  avgPayDays: number;
  monthlyRevenue: number[];
  documentCount: number;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateLong(d: string) {
  return new Date(d).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "long", year: "numeric" });
}

const MONTHS_SHORT = ["Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez", "Jan", "Feb", "Mär"];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  BEZAHLT: { label: "bezahlt", color: "text-green-600" },
  VERSENDET: { label: "offen", color: "text-amber-600" },
  ENTWURF: { label: "Entwurf", color: "text-gray-500" },
  UEBERFAELLIG: { label: "überfällig", color: "text-red-600" },
  ANGENOMMEN: { label: "angenommen", color: "text-green-600" },
  ABGELEHNT: { label: "abgelehnt", color: "text-red-600" },
};

export default function KundenDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"aktivitaeten" | "umsatz">("aktivitaeten");
  const [actSearch, setActSearch] = useState("");

  useEffect(() => {
    fetch(`/api/kunden/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setCustomer(data);
        setForm({
          type: data.type, company: data.company || "",
          firstName: data.firstName, lastName: data.lastName,
          email: data.email || "", phone: data.phone || "",
          street: data.street || "", zip: data.zip || "",
          city: data.city || "", notes: data.notes || "",
        });
      });
  }, [id]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/kunden/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const updated = await res.json();
      setCustomer((prev) => (prev ? { ...prev, ...updated } : prev));
      setEditing(false);
    }
    setSaving(false);
  }

  if (!customer) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const displayName = customer.type === "GESCHAEFT" && customer.company ? customer.company : `${customer.firstName} ${customer.lastName}`;
  const contactName = `${customer.firstName} ${customer.lastName}`;
  const address = [customer.street, [customer.zip, customer.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  // Build timeline from invoices, quotations, orders
  interface TimelineEntry {
    id: string;
    datum: string;
    typ: string;
    typIcon: "rechnung" | "angebot" | "auftrag";
    nummer: string;
    betrag: number;
    status: string;
    statusColor: string;
    link: string | null;
  }

  const timeline: TimelineEntry[] = [];

  for (const inv of customer.invoices || []) {
    const s = STATUS_MAP[inv.status] || { label: inv.status, color: "text-gray-500" };
    timeline.push({
      id: `inv-${inv.id}`,
      datum: inv.paidDate || inv.createdAt,
      typ: "Rechnung",
      typIcon: "rechnung",
      nummer: inv.invoiceNumber,
      betrag: inv.grossTotal,
      status: s.label,
      statusColor: s.color,
      link: `/rechnungen/${inv.id}`,
    });
  }

  for (const q of customer.quotations || []) {
    const s = STATUS_MAP[q.status] || { label: q.status, color: "text-gray-500" };
    timeline.push({
      id: `q-${q.id}`,
      datum: q.createdAt,
      typ: "Angebot",
      typIcon: "angebot",
      nummer: q.quotationNumber,
      betrag: q.grossTotal,
      status: s.label,
      statusColor: s.color,
      link: null,
    });
  }

  timeline.sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime());

  const filteredTimeline = actSearch.trim()
    ? timeline.filter((t) => t.nummer.toLowerCase().includes(actSearch.toLowerCase()) || t.typ.toLowerCase().includes(actSearch.toLowerCase()))
    : timeline;

  // Group by date
  const grouped: { dateLabel: string; items: TimelineEntry[] }[] = [];
  const today = new Date().toDateString();
  for (const entry of filteredTimeline) {
    const d = new Date(entry.datum);
    const dateStr = d.toDateString();
    const label = dateStr === today ? `Heute, ${formatDateLong(entry.datum)}` : formatDateLong(entry.datum);
    const existing = grouped.find((g) => g.dateLabel === label);
    if (existing) existing.items.push(entry);
    else grouped.push({ dateLabel: label, items: [entry] });
  }

  // Monthly chart data
  const now = new Date();
  const chartData = (customer.monthlyRevenue || []).map((val: number, i: number) => {
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
          <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
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
          UMSATZ
        </button>
      </div>

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left sidebar - Contact info */}
        <div className="lg:col-span-4 space-y-5">
          {/* Ansprechpartner */}
          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Ansprechpartner</h3>
              <div className="space-y-2.5">
                <div>
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Name</p>
                  <p className="text-sm text-gray-900">{customer.type === "GESCHAEFT" ? "Herr " : ""}{contactName}</p>
                </div>
                {customer.email && (
                  <div>
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Geschäftlich</p>
                    <a href={`mailto:${customer.email}`} className="text-sm text-blue-600 hover:underline">{customer.email}</a>
                  </div>
                )}
                {customer.phone && (
                  <div>
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Geschäftlich</p>
                    <a href={`tel:${customer.phone}`} className="text-sm text-gray-900">{customer.phone}</a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Firma */}
          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Firma</h3>
              <div className="space-y-2.5">
                <div>
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Kunden-Nr.</p>
                  <p className="text-sm text-gray-900">{customer.id.slice(-5)}</p>
                </div>
                {address && (
                  <div>
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Rechnungsadresse</p>
                    <p className="text-sm text-gray-900">{address}</p>
                  </div>
                )}
                {customer.notes && (
                  <div>
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Notiz</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{customer.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right main content */}
        <div className="lg:col-span-8">
          {activeTab === "aktivitaeten" && (
            <div>
              {/* Search + Actions */}
              <div className="flex items-center gap-3 mb-5">
                <Button variant="outline" size="sm" className="gap-1.5 border-[#9eb552] text-[#9eb552] hover:bg-[#9eb552]/10">
                  <Plus className="h-4 w-4" />Hinzufügen
                </Button>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={actSearch}
                    onChange={(e) => setActSearch(e.target.value)}
                    placeholder="Suche in Aktivitäten"
                    className="pl-9 h-9 text-sm"
                  />
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-0">
                {grouped.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <Calendar className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">Keine Aktivitäten vorhanden</p>
                  </div>
                )}

                {grouped.map((group) => {
                  const isToday = group.dateLabel.startsWith("Heute");
                  return (
                    <div key={group.dateLabel} className="relative">
                      {/* Date header */}
                      <div className="flex items-center gap-2.5 py-3">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-md ${isToday ? "bg-green-100" : "bg-gray-100"}`}>
                          <Calendar className={`h-3.5 w-3.5 ${isToday ? "text-green-600" : "text-gray-500"}`} />
                        </div>
                        <span className={`text-sm font-semibold ${isToday ? "text-green-700" : "text-gray-700"}`}>
                          {group.dateLabel}
                        </span>
                      </div>

                      {/* Entries */}
                      <div className="ml-3.5 border-l-2 border-gray-200 pl-6 pb-2">
                        {group.items.length === 0 ? (
                          <p className="text-xs text-gray-400 py-2">Keine Einträge für heute.</p>
                        ) : (
                          group.items.map((entry) => (
                            <div key={entry.id} className="flex items-center gap-3 py-2.5 group">
                              <div className="relative -ml-[31px]">
                                <div className="h-2 w-2 rounded-full bg-gray-400 ring-2 ring-white" />
                              </div>
                              <div className="flex h-7 w-7 items-center justify-center rounded bg-gray-100 shrink-0">
                                {entry.typIcon === "rechnung" && <Receipt className="h-3.5 w-3.5 text-gray-500" />}
                                {entry.typIcon === "angebot" && <FileCheck className="h-3.5 w-3.5 text-gray-500" />}
                                {entry.typIcon === "auftrag" && <FileText className="h-3.5 w-3.5 text-gray-500" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900">
                                  <span className="font-medium">{entry.typ}</span>
                                </p>
                                <p className="text-xs text-gray-500">{entry.nummer}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-semibold text-gray-900">{formatCurrency(entry.betrag)}</p>
                                <p className={`text-xs font-medium ${entry.statusColor}`}>{entry.status}</p>
                              </div>
                              {entry.link && (
                                <Link href={entry.link} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <ChevronRight className="h-4 w-4 text-gray-400" />
                                </Link>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Show "today" if no entries today */}
                {grouped.length > 0 && !grouped[0]?.dateLabel.startsWith("Heute") && (
                  <div className="relative mb-2">
                    <div className="flex items-center gap-2.5 py-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-green-100">
                        <Calendar className="h-3.5 w-3.5 text-green-600" />
                      </div>
                      <span className="text-sm font-semibold text-green-700">
                        Heute, {formatDateLong(new Date().toISOString())}
                      </span>
                    </div>
                    <div className="ml-3.5 border-l-2 border-gray-200 pl-6 pb-2">
                      <div className="flex items-center gap-3 py-2 text-gray-400">
                        <div className="relative -ml-[31px]"><div className="h-2 w-2 rounded-full bg-gray-300 ring-2 ring-white" /></div>
                        <p className="text-xs">Keine Einträge für heute.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "umsatz" && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Umsatz</h2>

              {/* KPI Cards */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <Card className="p-4 text-center">
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">Gesamtumsatz</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(customer.revenue)}</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">Umsatz der letzten 12 Monate</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(customer.revenue12m)}</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">zahlt durchschnittlich in:</p>
                  <p className="text-xl font-bold text-gray-900">{customer.avgPayDays} Tagen</p>
                </Card>
              </div>

              {/* Chart */}
              <Card className="p-4">
                <LineChart
                  data={chartData}
                  height={250}
                  color1="#16a34a"
                  color2="transparent"
                  label1="Umsatz"
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
          <DialogHeader><DialogTitle>Kontaktdaten bearbeiten</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kundentyp</label>
              <NativeSelect value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="PRIVAT">Privatkunde</option>
                <option value="GESCHAEFT">Geschäftskunde</option>
              </NativeSelect>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Firma</label>
              <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Vorname</label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nachname</label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Straße</label><Input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">PLZ</label><Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Ort</label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditing(false)}>Abbrechen</Button>
              <Button className="bg-[#9eb552] hover:bg-[#8da448] text-white" onClick={handleSave} disabled={saving}>
                {saving ? "Speichern..." : "Speichern"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
