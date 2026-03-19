"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Save, Pencil, X, Plus, FileText,
  Receipt, FileCheck, ChevronRight, FolderKanban, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { LineChart } from "@/components/charts/line-chart";

const STATUS_COLORS: Record<string, string> = {
  PLANUNG: "bg-gray-100 text-gray-700", AKTIV: "bg-green-100 text-green-700",
  PAUSIERT: "bg-amber-100 text-amber-700", ABGESCHLOSSEN: "bg-blue-100 text-blue-700",
  ENTWURF: "bg-gray-100 text-gray-700", VERSENDET: "bg-blue-100 text-blue-700",
  ANGENOMMEN: "bg-green-100 text-green-700", ABGELEHNT: "bg-red-100 text-red-700",
  BEZAHLT: "bg-green-100 text-green-700", UEBERFAELLIG: "bg-red-100 text-red-700",
};
const STATUS_LABELS: Record<string, string> = {
  PLANUNG: "Planung", AKTIV: "In Arbeit", PAUSIERT: "Pausiert", ABGESCHLOSSEN: "Abgeschlossen",
  ENTWURF: "Entwurf", VERSENDET: "Versendet", ANGENOMMEN: "Angenommen", ABGELEHNT: "Abgelehnt",
  BEZAHLT: "Bezahlt", UEBERFAELLIG: "Überfällig",
};

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
  customerNumber: string | null;
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


export default function KundenDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"aktivitaeten" | "umsatz">("aktivitaeten");

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

  const activeProjects = customer.projects.filter((p: any) => p.status === "AKTIV" || p.status === "PLANUNG");
  const completedProjects = customer.projects.filter((p: any) => p.status === "ABGESCHLOSSEN");

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
                  <p className="text-sm text-gray-900">{customer.customerNumber || customer.id.slice(-5)}</p>
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
            <div className="space-y-5">
              {/* Aktuelle Projekte */}
              <Card>
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FolderKanban className="h-4 w-4 text-blue-500" />
                    Aktuelle Projekte ({activeProjects.length})
                  </h3>
                  {activeProjects.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 text-center">Keine aktiven Projekte</p>
                  ) : (
                    <div className="space-y-2">
                      {activeProjects.map((p: any) => (
                        <Link key={p.id} href={`/projekte/${p.id}`} className="block group">
                          <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-colors">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 truncate">{p.name}</p>
                              {p.description && <p className="text-xs text-gray-500 truncate mt-0.5">{p.description}</p>}
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={STATUS_COLORS[p.status] || "bg-gray-100 text-gray-700"}>{STATUS_LABELS[p.status] || p.status}</Badge>
                                {p.startDate && <span className="text-xs text-gray-400">Start: {formatDate(p.startDate)}</span>}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 shrink-0 ml-3" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Angebote */}
              {customer.quotations.length > 0 && (
                <Card>
                  <CardContent className="p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-green-500" />
                      Angebote ({customer.quotations.length})
                    </h3>
                    <div className="space-y-2">
                      {customer.quotations.map((q: any) => (
                        <div key={q.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900">{q.quotationNumber}</p>
                              <p className="text-xs text-gray-500">{formatDate(q.createdAt)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-sm font-semibold text-gray-900">{formatCurrency(q.grossTotal)}</span>
                            <Badge className={STATUS_COLORS[q.status] || "bg-gray-100 text-gray-700"}>{STATUS_LABELS[q.status] || q.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Aufträge & Rechnungen */}
              {customer.orders.length > 0 && (
                <Card>
                  <CardContent className="p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-amber-500" />
                      Aufträge & Rechnungen ({customer.orders.length})
                    </h3>
                    <div className="space-y-2">
                      {customer.orders.map((o: any) => (
                        <div key={o.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900">{o.orderNumber}</p>
                            {o.invoice && <p className="text-xs text-gray-500">Rechnung: {o.invoice.invoiceNumber}</p>}
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-sm font-semibold text-gray-900">{formatCurrency(o.grossTotal)}</span>
                            <Badge className={STATUS_COLORS[o.status] || "bg-gray-100 text-gray-700"}>{STATUS_LABELS[o.status] || o.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Abgeschlossene Projekte */}
              {completedProjects.length > 0 && (
                <Card>
                  <CardContent className="p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                      Abgeschlossene Projekte ({completedProjects.length})
                    </h3>
                    <div className="space-y-2">
                      {completedProjects.map((p: any) => (
                        <Link key={p.id} href={`/projekte/${p.id}`} className="block group">
                          <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-700 group-hover:text-blue-600 truncate">{p.name}</p>
                              <p className="text-xs text-gray-400">{p.projectNumber}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-300 shrink-0 ml-3" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
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
