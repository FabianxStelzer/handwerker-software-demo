"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  TrendingUp,
  Users,
  FileText,
  FileCheck,
  Plus,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/utils";

const quotationStatusConfig: Record<string, { label: string; variant: "default" | "success" | "warning" | "secondary" | "destructive" }> = {
  ENTWURF: { label: "Entwurf", variant: "secondary" },
  VERSENDET: { label: "Versendet", variant: "default" },
  ANGENOMMEN: { label: "Angenommen", variant: "success" },
  ABGELEHNT: { label: "Abgelehnt", variant: "destructive" },
  ABGELAUFEN: { label: "Abgelaufen", variant: "warning" },
};

const invoiceStatusConfig: Record<string, { label: string; variant: "default" | "success" | "warning" | "secondary" | "destructive" }> = {
  ENTWURF: { label: "Entwurf", variant: "secondary" },
  VERSENDET: { label: "Versendet", variant: "default" },
  BEZAHLT: { label: "Bezahlt", variant: "success" },
  UEBERFAELLIG: { label: "Überfällig", variant: "destructive" },
};

const incomingStatusConfig: Record<string, { label: string; variant: "default" | "success" | "warning" | "secondary" | "destructive" }> = {
  OFFEN: { label: "Offen", variant: "warning" },
  BEZAHLT: { label: "Bezahlt", variant: "success" },
  UEBERFAELLIG: { label: "Überfällig", variant: "destructive" },
};

export default function BelegePage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [incomingInvoices, setIncomingInvoices] = useState<any[]>([]);
  const [deliveryNotes, setDeliveryNotes] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [angebotDialogOpen, setAngebotDialogOpen] = useState(false);
  const [rechnungDialogOpen, setRechnungDialogOpen] = useState(false);
  const [eingangDialogOpen, setEingangDialogOpen] = useState(false);
  const [lieferscheinDialogOpen, setLieferscheinDialogOpen] = useState(false);
  const [createError, setCreateError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    Promise.all([
      fetch("/api/angebote").then((r) => r.json()),
      fetch("/api/rechnungen").then((r) => r.json()),
      fetch("/api/belege/eingangsrechnungen").then((r) => r.json()),
      fetch("/api/belege/lieferscheine").then((r) => r.json()),
      fetch("/api/auftraege").then((r) => r.json()),
      fetch("/api/rechnungen/analytics").then((r) => r.json()),
      fetch("/api/kunden").then((r) => r.json()),
      fetch("/api/projekte").then((r) => r.json()),
      fetch("/api/vendors").then((r) => r.json()).catch(() => []),
    ]).then(([q, inv, ein, ls, ord, an, c, p, v]) => {
      setQuotations(q);
      setInvoices(inv);
      setIncomingInvoices(ein);
      setDeliveryNotes(ls);
      setOrders(ord);
      setAnalytics(an);
      setCustomers(c);
      setProjects(p);
      setVendors(v);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const ordersWithoutInvoice = orders.filter((o) => !o.invoice);

  async function handleCreateAngebot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError("");
    const fd = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    fd.forEach((v, k) => {
      const val = String(v).trim();
      if (k === "projectId" && !val) return;
      data[k] = val;
    });
    if (!data.customerId) {
      setCreateError("Bitte Kunde auswählen.");
      return;
    }
    const res = await fetch("/api/angebote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, projectId: data.projectId || null }),
    });
    if (!res.ok) {
      const err = await res.json();
      setCreateError(err.error || "Fehler beim Anlegen.");
      return;
    }
    const quotation = await res.json();
    setAngebotDialogOpen(false);
    router.push(`/angebote/${quotation.id}`);
  }

  async function handleCreateRechnung(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError("");
    const fd = new FormData(e.currentTarget);
    const orderId = fd.get("orderId") as string;
    if (!orderId) {
      setCreateError("Bitte Auftrag auswählen.");
      return;
    }
    const res = await fetch("/api/rechnungen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    if (!res.ok) {
      const err = await res.json();
      setCreateError(err.error || "Fehler beim Erstellen.");
      return;
    }
    const invoice = await res.json();
    setRechnungDialogOpen(false);
    router.push(`/rechnungen/${invoice.id}`);
  }

  async function handleCreateEingangsrechnung(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError("");
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries()) as Record<string, string>;
    if (!data.vendorId) {
      setCreateError("Bitte Lieferant auswählen.");
      return;
    }
    if (!data.referenceNo?.trim()) {
      setCreateError("Rechnungsnummer erforderlich.");
      return;
    }
    const res = await fetch("/api/belege/eingangsrechnungen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vendorId: data.vendorId,
        referenceNo: data.referenceNo.trim(),
        date: data.date || new Date().toISOString().slice(0, 10),
        dueDate: data.dueDate || null,
        grossAmount: parseFloat(data.grossAmount) || 0,
        notes: data.notes || null,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      setCreateError(err.error || "Fehler beim Anlegen.");
      return;
    }
    setEingangDialogOpen(false);
    load();
  }

  async function handleCreateLieferschein(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError("");
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries()) as Record<string, string>;
    if (!data.customerId) {
      setCreateError("Bitte Kunde auswählen.");
      return;
    }
    const res = await fetch("/api/belege/lieferscheine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: data.customerId,
        projectId: data.projectId || null,
        date: data.date || new Date().toISOString().slice(0, 10),
        notes: data.notes || null,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      setCreateError(err.error || "Fehler beim Anlegen.");
      return;
    }
    const note = await res.json();
    setLieferscheinDialogOpen(false);
    load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Belege</h1>
          <p className="text-sm text-gray-500 mt-1">
            Eingangsrechnungen, Lieferscheine, Angebote und Rechnungen
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={eingangDialogOpen} onOpenChange={setEingangDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <ArrowDownToLine className="h-4 w-4" />
                Eingangsrechnung
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neue Eingangsrechnung</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateEingangsrechnung} className="space-y-4">
                {createError && <p className="text-sm text-red-600">{createError}</p>}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lieferant *</label>
                  <NativeSelect name="vendorId" required>
                    <option value="">Lieferant wählen...</option>
                    {vendors.map((v: any) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </NativeSelect>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rechnungsnummer *</label>
                  <Input name="referenceNo" required placeholder="z.B. RE-2024-001" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Datum *</label>
                    <Input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fällig am</label>
                    <Input name="dueDate" type="date" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bruttobetrag (€) *</label>
                  <Input name="grossAmount" type="number" step="0.01" required defaultValue="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
                  <Textarea name="notes" rows={2} />
                </div>
                <Button type="submit" className="w-full">Anlegen</Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={lieferscheinDialogOpen} onOpenChange={setLieferscheinDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Package className="h-4 w-4" />
                Lieferschein
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neuer Lieferschein</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateLieferschein} className="space-y-4">
                {createError && <p className="text-sm text-red-600">{createError}</p>}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kunde *</label>
                  <NativeSelect name="customerId" required>
                    <option value="">Kunde wählen...</option>
                    {customers.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.type === "GESCHAEFT" && c.company ? c.company : `${c.firstName} ${c.lastName}`}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Projekt (optional)</label>
                  <NativeSelect name="projectId">
                    <option value="">Kein Projekt</option>
                    {projects.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.projectNumber} – {p.name}</option>
                    ))}
                  </NativeSelect>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                  <Input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
                  <Textarea name="notes" rows={2} />
                </div>
                <Button type="submit" className="w-full">Anlegen</Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={angebotDialogOpen} onOpenChange={setAngebotDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <FileCheck className="h-4 w-4" />
                Angebot
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neues Angebot</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateAngebot} className="space-y-4">
                {createError && <p className="text-sm text-red-600">{createError}</p>}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kunde *</label>
                  <NativeSelect name="customerId" required>
                    <option value="">Kunde wählen...</option>
                    {customers.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.type === "GESCHAEFT" && c.company ? c.company : `${c.firstName} ${c.lastName}`}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Projekt (optional)</label>
                  <NativeSelect name="projectId">
                    <option value="">Kein Projekt</option>
                    {projects.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.projectNumber} – {p.name}</option>
                    ))}
                  </NativeSelect>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gültig bis (optional)</label>
                  <Input name="validUntil" type="date" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
                  <Textarea name="notes" rows={2} />
                </div>
                <Button type="submit" className="w-full">Angebot anlegen</Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={rechnungDialogOpen} onOpenChange={setRechnungDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <ArrowUpFromLine className="h-4 w-4" />
                Rechnung erstellen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rechnung aus Auftrag erstellen</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateRechnung} className="space-y-4">
                {createError && <p className="text-sm text-red-600">{createError}</p>}
                {ordersWithoutInvoice.length === 0 ? (
                  <p className="text-sm text-gray-500">Keine Aufträge ohne Rechnung vorhanden.</p>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Auftrag *</label>
                      <NativeSelect name="orderId" required>
                        <option value="">Auftrag wählen...</option>
                        {ordersWithoutInvoice.map((o: any) => (
                          <option key={o.id} value={o.id}>
                            {o.orderNumber} – {o.customerName} – {formatCurrency(o.grossTotal)}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                    <Button type="submit" className="w-full">Rechnung erstellen</Button>
                  </>
                )}
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="eingang">
        <TabsList className="flex-wrap">
          <TabsTrigger value="eingang" className="flex items-center gap-1.5">
            <ArrowDownToLine className="h-4 w-4" />
            Eingangsrechnungen ({incomingInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="lieferscheine" className="flex items-center gap-1.5">
            <Package className="h-4 w-4" />
            Lieferscheine ({deliveryNotes.length})
          </TabsTrigger>
          <TabsTrigger value="angebote" className="flex items-center gap-1.5">
            <FileCheck className="h-4 w-4" />
            Angebote ({quotations.length})
          </TabsTrigger>
          <TabsTrigger value="rechnungen" className="flex items-center gap-1.5">
            <ArrowUpFromLine className="h-4 w-4" />
            Rechnungen ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="eingang">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm font-medium text-gray-500">
                    <th className="px-4 py-3">Ref.-Nr.</th>
                    <th className="px-4 py-3">Lieferant</th>
                    <th className="px-4 py-3">Datum</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Brutto</th>
                  </tr>
                </thead>
                <tbody>
                  {incomingInvoices.map((inv) => {
                    const sc = incomingStatusConfig[inv.status];
                    return (
                      <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-mono">{inv.referenceNo}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{inv.vendor?.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(inv.date)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={sc?.variant || "secondary"}>{sc?.label || inv.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-right">{formatCurrency(inv.grossAmount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="lieferscheine">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm font-medium text-gray-500">
                    <th className="px-4 py-3">Nr.</th>
                    <th className="px-4 py-3">Kunde</th>
                    <th className="px-4 py-3">Projekt</th>
                    <th className="px-4 py-3">Datum</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveryNotes.map((d) => (
                    <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono text-blue-600">{d.noteNumber}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{d.customerName}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{d.project?.projectNumber ?? "–"}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(d.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="angebote">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm font-medium text-gray-500">
                    <th className="px-4 py-3">Nr.</th>
                    <th className="px-4 py-3">Kunde</th>
                    <th className="px-4 py-3">Projekt</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Brutto</th>
                    <th className="px-4 py-3">Erstellt</th>
                    <th className="px-4 py-3">Gültig bis</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((q) => {
                    const sc = quotationStatusConfig[q.status];
                    return (
                      <tr key={q.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link href={`/angebote/${q.id}`} className="text-sm text-blue-600 hover:underline font-mono">
                            {q.quotationNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{q.customerName}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{q.project?.projectNumber ?? "–"}</td>
                        <td className="px-4 py-3">
                          <Badge variant={sc?.variant || "secondary"}>{sc?.label || q.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(q.grossTotal)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(q.createdAt)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{q.validUntil ? formatDate(q.validUntil) : "–"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="rechnungen">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm font-medium text-gray-500">
                    <th className="px-4 py-3">Nr.</th>
                    <th className="px-4 py-3">Kunde</th>
                    <th className="px-4 py-3">Auftrag</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Brutto</th>
                    <th className="px-4 py-3">Erstellt</th>
                    <th className="px-4 py-3">Fällig</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => {
                    const sc = invoiceStatusConfig[inv.status];
                    return (
                      <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link href={`/rechnungen/${inv.id}`} className="text-sm text-blue-600 hover:underline font-mono">
                            {inv.invoiceNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{inv.customerName}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{inv.order?.orderNumber}</td>
                        <td className="px-4 py-3">
                          <Badge variant={sc?.variant || "secondary"}>{sc?.label || inv.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(inv.grossTotal)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(inv.createdAt)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{inv.dueDate ? formatDate(inv.dueDate) : "–"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          {analytics && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Umsatz (bezahlt)</p>
                        <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(analytics.totalRevenue)}</p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-600">
                        <TrendingUp className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Offene Forderungen</p>
                        <p className="text-2xl font-bold text-yellow-600 mt-1">{formatCurrency(analytics.outstandingRevenue)}</p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100 text-yellow-600">
                        <FileText className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Ø Auftragswert</p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(analytics.avgOrderValue)}</p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                        <BarChart3 className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Aufträge gesamt</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.totalOrders}</p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                        <Users className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Top-Kunden nach Umsatz</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.topCustomers?.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">Keine Daten</p>
                  ) : (
                    <div className="space-y-3">
                      {analytics.topCustomers?.map((c: any, i: number) => (
                        <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-sm font-bold">
                              {i + 1}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{c.name}</p>
                              <p className="text-xs text-gray-400">{c.orderCount} Aufträge</p>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-gray-900">{formatCurrency(c.total)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
