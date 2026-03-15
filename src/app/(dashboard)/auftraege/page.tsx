"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/utils";

const statusConfig: Record<string, { label: string; variant: "default" | "success" | "warning" | "secondary" | "destructive" }> = {
  ENTWURF: { label: "Entwurf", variant: "secondary" },
  AUSSTEHEND: { label: "Ausstehend", variant: "warning" },
  BESTAETIGT: { label: "Bestätigt", variant: "default" },
  ABGESCHLOSSEN: { label: "Abgeschlossen", variant: "success" },
  STORNIERT: { label: "Storniert", variant: "destructive" },
};

export default function AuftraegePage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/auftraege").then((r) => r.json()),
      fetch("/api/kunden").then((r) => r.json()),
      fetch("/api/projekte").then((r) => r.json()),
    ]).then(([o, c, p]) => {
      setOrders(o);
      setCustomers(c);
      setProjects(p);
      setLoading(false);
    });
  }, []);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch("/api/auftraege", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    setDialogOpen(false);
    const res = await fetch("/api/auftraege");
    setOrders(await res.json());
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aufträge</h1>
          <p className="text-sm text-gray-500 mt-1">{orders.length} Aufträge</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" />Neuer Auftrag</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Neuer Auftrag</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kunde</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
                <Textarea name="notes" rows={2} />
              </div>
              <Button type="submit" className="w-full">Auftrag anlegen</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm font-medium text-gray-500">
                <th className="px-4 py-3">Nr.</th>
                <th className="px-4 py-3">Kunde</th>
                <th className="px-4 py-3">Projekt</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Netto</th>
                <th className="px-4 py-3 text-right">Brutto</th>
                <th className="px-4 py-3">Rechnung</th>
                <th className="px-4 py-3">Datum</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const sc = statusConfig[o.status];
                return (
                  <tr key={o.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/auftraege/${o.id}`} className="text-sm text-blue-600 hover:underline font-mono">{o.orderNumber}</Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{o.customerName}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{o.project?.projectNumber || "–"}</td>
                    <td className="px-4 py-3"><Badge variant={sc?.variant || "secondary"}>{sc?.label || o.status}</Badge></td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(o.netTotal)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(o.grossTotal)}</td>
                    <td className="px-4 py-3 text-sm">
                      {o.invoice ? (
                        <Link href={`/rechnungen/${o.invoice.id}`} className="text-blue-600 hover:underline">{o.invoice.invoiceNumber}</Link>
                      ) : "–"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(o.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
