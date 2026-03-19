"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, FileText, ChevronDown, ChevronRight, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";

const statusConfig: Record<string, { label: string; variant: "default" | "success" | "warning" | "secondary" | "destructive" }> = {
  ENTWURF: { label: "Entwurf", variant: "secondary" },
  AUSSTEHEND: { label: "Ausstehend", variant: "warning" },
  BESTAETIGT: { label: "Bestätigt", variant: "default" },
  ABGESCHLOSSEN: { label: "Abgeschlossen", variant: "success" },
  STORNIERT: { label: "Storniert", variant: "destructive" },
};

const unitLabels: Record<string, string> = {
  STUECK: "Stk", METER: "m", QUADRATMETER: "m²", KUBIKMETER: "m³",
  KILOGRAMM: "kg", LITER: "l", PALETTE: "Pal.", PAUSCHAL: "psch.", STUNDE: "Std",
};

interface OrderItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  notes: string | null;
  netTotal: number;
  taxRate: number;
  taxAmount: number;
  grossTotal: number;
  items: OrderItem[];
  invoice: { id: string; invoiceNumber: string; status: string } | null;
  createdAt: string;
}

export function AuftraegeTab({ project }: { project: any }) {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createNotes, setCreateNotes] = useState("");
  const [itemDialogOrder, setItemDialogOrder] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/auftraege");
    if (res.ok) {
      const all = await res.json();
      setOrders(all.filter((o: any) => o.projectId === project.id));
    }
    setLoading(false);
  }, [project.id]);

  useEffect(() => { load(); }, [load]);

  async function createOrder() {
    const res = await fetch("/api/auftraege", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: project.customerId,
        projectId: project.id,
        notes: createNotes || null,
      }),
    });
    if (res.ok) {
      const order = await res.json();
      setCreateOpen(false);
      setCreateNotes("");
      await load();
      setExpandedId(order.id);
    }
  }

  async function updateStatus(orderId: string, status: string) {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    await fetch(`/api/auftraege/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...order, status }),
    });
    await load();
  }

  async function deleteOrder(orderId: string) {
    if (!confirm("Auftrag wirklich löschen?")) return;
    await fetch(`/api/auftraege/${orderId}`, { method: "DELETE" });
    if (expandedId === orderId) setExpandedId(null);
    await load();
  }

  async function addItem(orderId: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch(`/api/auftraege/${orderId}/positionen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    setItemDialogOrder(null);
    await load();
  }

  async function removeItem(orderId: string, itemId: string) {
    await fetch(`/api/auftraege/${orderId}/positionen`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });
    await load();
  }

  async function createInvoice(orderId: string) {
    const res = await fetch("/api/rechnungen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Fehler beim Erstellen der Rechnung");
      return;
    }
    const invoice = await res.json();
    router.push(`/rechnungen/${invoice.id}`);
  }

  if (loading) {
    return <div className="flex justify-center py-10"><div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Aufträge</h3>
        <Button size="sm" className="gap-1.5 text-xs" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />Neuer Auftrag
        </Button>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Noch keine Aufträge für dieses Projekt</p>
            <Button size="sm" className="mt-3 gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5" />Auftrag erstellen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const sc = statusConfig[order.status] || statusConfig.ENTWURF;
            const isExpanded = expandedId === order.id;

            return (
              <Card key={order.id}>
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <button className="flex items-center gap-3 text-left" onClick={() => setExpandedId(isExpanded ? null : order.id)}>
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 shrink-0">
                        {isExpanded ? <ChevronDown className="h-5 w-5 text-blue-600" /> : <FileText className="h-5 w-5 text-blue-600" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-900 font-mono">{order.orderNumber}</p>
                          <Badge variant={sc.variant} className="text-[10px]">{sc.label}</Badge>
                          {order.invoice && (
                            <Badge variant="success" className="text-[10px] gap-1">
                              <Receipt className="h-2.5 w-2.5" />Rechnung
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {order.items.length} Positionen · {formatCurrency(order.grossTotal)} brutto
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      <NativeSelect value={order.status} onChange={(e) => updateStatus(order.id, e.target.value)} className="text-xs h-8 w-auto">
                        <option value="ENTWURF">Entwurf</option>
                        <option value="AUSSTEHEND">Ausstehend</option>
                        <option value="BESTAETIGT">Bestätigt</option>
                        <option value="ABGESCHLOSSEN">Abgeschlossen</option>
                        <option value="STORNIERT">Storniert</option>
                      </NativeSelect>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => deleteOrder(order.id)} title="Löschen">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded */}
                  {isExpanded && (
                    <div className="mt-4 border-t pt-4 space-y-4">
                      {/* Positionen */}
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-gray-500 uppercase">Positionen</p>
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" onClick={() => setItemDialogOrder(order.id)}>
                          <Plus className="h-3 w-3" />Position
                        </Button>
                      </div>

                      {order.items.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-3">Keine Positionen. Füge Leistungen und Materialien hinzu.</p>
                      ) : (
                        <div className="overflow-x-auto border rounded-lg">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-gray-50 text-left text-gray-500">
                                <th className="p-2">#</th>
                                <th className="p-2">Beschreibung</th>
                                <th className="p-2 text-right">Menge</th>
                                <th className="p-2">Einheit</th>
                                <th className="p-2 text-right">EP</th>
                                <th className="p-2 text-right">GP</th>
                                <th className="p-2 w-8"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {order.items.map((item, i) => (
                                <tr key={item.id} className="border-t hover:bg-gray-50">
                                  <td className="p-2 text-gray-400">{i + 1}</td>
                                  <td className="p-2 text-gray-900 font-medium">{item.description}</td>
                                  <td className="p-2 text-right">{item.quantity}</td>
                                  <td className="p-2 text-gray-500">{unitLabels[item.unit] || item.unit}</td>
                                  <td className="p-2 text-right">{formatCurrency(item.pricePerUnit)}</td>
                                  <td className="p-2 text-right font-medium">{formatCurrency(item.quantity * item.pricePerUnit)}</td>
                                  <td className="p-2">
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(order.id, item.id)}>
                                      <Trash2 className="h-3 w-3 text-red-400" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Zusammenfassung */}
                      <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Netto</span>
                          <span className="text-gray-900">{formatCurrency(order.netTotal)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">MwSt. ({order.taxRate}%)</span>
                          <span className="text-gray-900">{formatCurrency(order.taxAmount)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold border-t pt-1.5">
                          <span>Brutto</span>
                          <span>{formatCurrency(order.grossTotal)}</span>
                        </div>
                      </div>

                      {/* Rechnung */}
                      <div className="flex items-center gap-2">
                        {order.invoice ? (
                          <a href={`/rechnungen/${order.invoice.id}`} className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium">
                            <Receipt className="h-3.5 w-3.5" />
                            Rechnung {order.invoice.invoiceNumber}
                            <Badge variant="secondary" className="text-[10px]">{order.invoice.status}</Badge>
                          </a>
                        ) : order.status === "ABGESCHLOSSEN" ? (
                          <Button size="sm" className="gap-1.5 text-xs" onClick={() => createInvoice(order.id)}>
                            <Receipt className="h-3.5 w-3.5" />Rechnung erstellen
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog: Neuer Auftrag */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Neuer Auftrag</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-gray-500">
              Auftrag wird automatisch dem Projekt <strong>{project.name}</strong> und dem Kunden zugeordnet.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notizen (optional)</label>
              <Textarea value={createNotes} onChange={(e) => setCreateNotes(e.target.value)} rows={2} placeholder="Hinweise zum Auftrag..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Abbrechen</Button>
              <Button onClick={createOrder}>Auftrag anlegen</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Position hinzufügen */}
      <Dialog open={!!itemDialogOrder} onOpenChange={(open) => { if (!open) setItemDialogOrder(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Position hinzufügen</DialogTitle></DialogHeader>
          <form onSubmit={(e) => itemDialogOrder && addItem(itemDialogOrder, e)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
              <Input name="description" required />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Menge</label>
                <Input name="quantity" type="number" step="0.01" defaultValue="1" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Einheit</label>
                <NativeSelect name="unit" defaultValue="STUECK">
                  {Object.entries(unitLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </NativeSelect>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preis/Einheit</label>
                <Input name="pricePerUnit" type="number" step="0.01" required />
              </div>
            </div>
            <Button type="submit" className="w-full">Hinzufügen</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
