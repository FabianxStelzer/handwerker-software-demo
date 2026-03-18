"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Trash2,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  FolderKanban,
  CheckCircle2,
  FileText,
  Euro,
  Pencil,
  X,
  ChevronRight,
  FileCheck,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface ProjectInfo {
  id: string;
  projectNumber: string;
  name: string;
  description: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  _count: { documents: number };
}

interface OrderInfo {
  id: string;
  orderNumber: string;
  status: string;
  grossTotal: number;
  invoice: { id: string; invoiceNumber: string; status: string; grossTotal: number } | null;
}

interface QuotationInfo {
  id: string;
  quotationNumber: string;
  status: string;
  grossTotal: number;
  createdAt: string;
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
  projects: ProjectInfo[];
  orders: OrderInfo[];
  quotations: QuotationInfo[];
  revenue: number;
  documentCount: number;
}

const STATUS_COLORS: Record<string, string> = {
  PLANUNG: "bg-gray-100 text-gray-700",
  AKTIV: "bg-green-100 text-green-700",
  PAUSIERT: "bg-amber-100 text-amber-700",
  ABGESCHLOSSEN: "bg-blue-100 text-blue-700",
  STORNIERT: "bg-red-100 text-red-700",
  ENTWURF: "bg-gray-100 text-gray-700",
  AUSSTEHEND: "bg-amber-100 text-amber-700",
  BESTAETIGT: "bg-green-100 text-green-700",
  GESENDET: "bg-blue-100 text-blue-700",
  ANGENOMMEN: "bg-green-100 text-green-700",
  ABGELEHNT: "bg-red-100 text-red-700",
  BEZAHLT: "bg-green-100 text-green-700",
  UEBERFAELLIG: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  PLANUNG: "Planung",
  AKTIV: "In Arbeit",
  PAUSIERT: "Pausiert",
  ABGESCHLOSSEN: "Abgeschlossen",
  STORNIERT: "Storniert",
  ENTWURF: "Entwurf",
  AUSSTEHEND: "Ausstehend",
  BESTAETIGT: "Bestätigt",
  GESENDET: "Gesendet",
  ANGENOMMEN: "Angenommen",
  ABGELEHNT: "Abgelehnt",
  BEZAHLT: "Bezahlt",
  UEBERFAELLIG: "Überfällig",
};

function formatCurrency(v: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" });
}

export default function KundenDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/kunden/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setCustomer(data);
        setForm({
          type: data.type,
          company: data.company || "",
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email || "",
          phone: data.phone || "",
          street: data.street || "",
          zip: data.zip || "",
          city: data.city || "",
          notes: data.notes || "",
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

  async function handleDelete() {
    if (!confirm("Kunde wirklich löschen? Alle zugehörigen Daten werden ebenfalls gelöscht.")) return;
    await fetch(`/api/kunden/${id}`, { method: "DELETE" });
    router.push("/kunden");
  }

  if (!customer) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const displayName = customer.type === "GESCHAEFT" && customer.company
    ? customer.company
    : `${customer.firstName} ${customer.lastName}`;
  const contactPerson = customer.type === "GESCHAEFT" && customer.company
    ? `${customer.firstName} ${customer.lastName}`
    : null;

  const activeProjects = customer.projects.filter((p) => p.status === "AKTIV" || p.status === "PLANUNG");
  const completedProjects = customer.projects.filter((p) => p.status === "ABGESCHLOSSEN");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/kunden")} className="mt-1 shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge className={customer.type === "GESCHAEFT" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}>
              {customer.type === "GESCHAEFT" ? "Geschäftskunde" : "Privatkunde"}
            </Badge>
            <span className="text-xs text-gray-400">Kunde seit {formatDate(customer.createdAt)}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
          {contactPerson && (
            <p className="text-sm text-gray-500">{contactPerson}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {!editing ? (
            <>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" />
                Bearbeiten
              </Button>
              <Button variant="destructive" size="sm" className="gap-1.5" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                <X className="h-4 w-4" />
                Abbrechen
              </Button>
              <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4" />
                {saving ? "Speichern..." : "Speichern"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* KPI Karten */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 shrink-0">
              <FolderKanban className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400">Aktive Projekte</p>
              <p className="text-2xl font-bold text-gray-900">{activeProjects.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 shrink-0">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400">Abgeschlossen</p>
              <p className="text-2xl font-bold text-gray-900">{completedProjects.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 shrink-0">
              <FileText className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400">Dokumente</p>
              <p className="text-2xl font-bold text-gray-900">{customer.documentCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 shrink-0">
              <Euro className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400">Umsatz</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(customer.revenue)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Bearbeitungsformular */}
      {editing && (
        <Card className="border-blue-200">
          <CardContent className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Kundendaten bearbeiten</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Kundentyp</label>
                <NativeSelect value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="PRIVAT">Privatkunde</option>
                  <option value="GESCHAEFT">Geschäftskunde</option>
                </NativeSelect>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Firma</label>
                <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Firmenname" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Vorname</label>
                <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nachname</label>
                <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">E-Mail</label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Telefon</label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Straße</label>
                <Input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">PLZ</label>
                  <Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ort</label>
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notizen</label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Interne Notizen..." />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hauptinhalt: Kontakt + Projekte */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kontaktinformationen */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Kontaktinformationen</h3>
              <div className="space-y-4">
                {customer.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">E-Mail</p>
                      <a href={`mailto:${customer.email}`} className="text-sm text-blue-600 hover:underline">
                        {customer.email}
                      </a>
                    </div>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">Telefon</p>
                      <a href={`tel:${customer.phone}`} className="text-sm text-gray-900 hover:text-blue-600">
                        {customer.phone}
                      </a>
                    </div>
                  </div>
                )}
                {(customer.street || customer.city) && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">Adresse</p>
                      {customer.street && <p className="text-sm text-gray-900">{customer.street}</p>}
                      {(customer.zip || customer.city) && (
                        <p className="text-sm text-gray-900">{[customer.zip, customer.city].filter(Boolean).join(" ")}</p>
                      )}
                    </div>
                  </div>
                )}
                {contactPerson && (
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">Ansprechpartner</p>
                      <p className="text-sm text-gray-900">{contactPerson}</p>
                    </div>
                  </div>
                )}
                {!customer.email && !customer.phone && !customer.street && !customer.city && (
                  <p className="text-sm text-gray-400">Keine Kontaktdaten hinterlegt</p>
                )}
              </div>
              {customer.notes && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">Notizen</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{customer.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Projekte + Angebote + Aufträge */}
        <div className="lg:col-span-2 space-y-6">
          {/* Aktuelle Projekte */}
          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Aktuelle Projekte</h3>
              {activeProjects.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Keine aktiven Projekte</p>
              ) : (
                <div className="space-y-2">
                  {activeProjects.map((p) => (
                    <Link key={p.id} href={`/projekte/${p.id}`} className="block group">
                      <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 truncate">{p.name}</p>
                          {p.description && (
                            <p className="text-xs text-gray-500 truncate mt-0.5">{p.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={STATUS_COLORS[p.status] || "bg-gray-100 text-gray-700"}>
                              {STATUS_LABELS[p.status] || p.status}
                            </Badge>
                            {p.startDate && (
                              <span className="text-xs text-gray-400">Start: {formatDate(p.startDate)}</span>
                            )}
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
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Angebote ({customer.quotations.length})
                </h3>
                <div className="space-y-2">
                  {customer.quotations.map((q) => (
                    <Link key={q.id} href={`/angebote/${q.id}`} className="block group">
                      <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileCheck className="h-4 w-4 text-gray-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600">{q.quotationNumber}</p>
                            <p className="text-xs text-gray-500">{formatDate(q.createdAt)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-semibold text-gray-900">{formatCurrency(q.grossTotal)}</span>
                          <Badge className={STATUS_COLORS[q.status] || "bg-gray-100 text-gray-700"}>
                            {STATUS_LABELS[q.status] || q.status}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Aufträge & Rechnungen */}
          {customer.orders.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Aufträge & Rechnungen ({customer.orders.length})
                </h3>
                <div className="space-y-2">
                  {customer.orders.map((o) => (
                    <Link key={o.id} href={`/auftraege/${o.id}`} className="block group">
                      <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <Receipt className="h-4 w-4 text-gray-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600">{o.orderNumber}</p>
                            {o.invoice && (
                              <p className="text-xs text-gray-500">Rechnung: {o.invoice.invoiceNumber}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-semibold text-gray-900">{formatCurrency(o.grossTotal)}</span>
                          <Badge className={STATUS_COLORS[o.status] || "bg-gray-100 text-gray-700"}>
                            {STATUS_LABELS[o.status] || o.status}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Abgeschlossene Projekte */}
          {completedProjects.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Abgeschlossene Projekte ({completedProjects.length})
                </h3>
                <div className="space-y-2">
                  {completedProjects.map((p) => (
                    <Link key={p.id} href={`/projekte/${p.id}`} className="block group">
                      <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors">
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
      </div>
    </div>
  );
}
