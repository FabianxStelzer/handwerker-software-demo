"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

export default function AuftragDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [catalog, setCatalog] = useState<{ materials: any[]; services: any[] }>({ materials: [], services: [] });

  const load = () => {
    fetch(`/api/auftraege/${id}`).then((r) => r.json()).then(setOrder);
  };

  useEffect(() => {
    load();
    Promise.all([
      fetch("/api/katalog/materialien").then((r) => r.json()),
      fetch("/api/katalog/leistungen").then((r) => r.json()),
    ]).then(([m, s]) => setCatalog({ materials: m, services: s }));
  }, [id]);

  async function updateStatus(status: string) {
    await fetch(`/api/auftraege/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...order, status }),
    });
    load();
  }

  async function addItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch(`/api/auftraege/${id}/positionen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    setItemDialogOpen(false);
    load();
  }

  async function removeItem(itemId: string) {
    await fetch(`/api/auftraege/${id}/positionen`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });
    load();
  }

  async function createInvoice() {
    await fetch("/api/rechnungen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: id }),
    });
    load();
  }

  if (!order) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  const sc = statusConfig[order.status];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/auftraege")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
              <Badge variant={sc?.variant || "secondary"}>{sc?.label || order.status}</Badge>
            </div>
            <p className="text-sm text-gray-500">
              {order.customer.type === "GESCHAEFT" && order.customer.company ? order.customer.company : `${order.customer.firstName} ${order.customer.lastName}`}
              {order.project && ` · ${order.project.projectNumber}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {order.status === "ENTWURF" && (
            <Button variant="outline" onClick={() => updateStatus("AUSSTEHEND")}>Absenden</Button>
          )}
          {order.status === "AUSSTEHEND" && (
            <Button onClick={() => updateStatus("BESTAETIGT")}>Bestätigen</Button>
          )}
          {order.status === "BESTAETIGT" && (
            <Button variant="outline" onClick={() => updateStatus("ABGESCHLOSSEN")}>Abschließen</Button>
          )}
          {order.status === "ABGESCHLOSSEN" && !order.invoice && (
            <Button onClick={createInvoice}>
              <FileText className="h-4 w-4" />Rechnung erstellen
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Positionen</CardTitle>
              <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4" />Position</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Position hinzufügen</DialogTitle></DialogHeader>
                  <form onSubmit={addItem} className="space-y-4">
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
            </CardHeader>
            <CardContent>
              {order.items.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">Keine Positionen</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-sm text-gray-500">
                        <th className="py-2 pr-4">Pos.</th>
                        <th className="py-2 pr-4">Beschreibung</th>
                        <th className="py-2 pr-4 text-right">Menge</th>
                        <th className="py-2 pr-4">Einheit</th>
                        <th className="py-2 pr-4 text-right">EP</th>
                        <th className="py-2 pr-4 text-right">GP</th>
                        <th className="py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item: any, i: number) => (
                        <tr key={item.id} className="border-b border-gray-100">
                          <td className="py-2 pr-4 text-sm text-gray-400">{i + 1}</td>
                          <td className="py-2 pr-4 text-sm text-gray-900">{item.description}</td>
                          <td className="py-2 pr-4 text-sm text-right">{item.quantity}</td>
                          <td className="py-2 pr-4 text-sm text-gray-500">{unitLabels[item.unit] || item.unit}</td>
                          <td className="py-2 pr-4 text-sm text-right">{formatCurrency(item.pricePerUnit)}</td>
                          <td className="py-2 pr-4 text-sm text-right font-medium">{formatCurrency(item.quantity * item.pricePerUnit)}</td>
                          <td className="py-2">
                            <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="h-7 w-7">
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Zusammenfassung</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Netto</span>
                <span className="text-gray-900">{formatCurrency(order.netTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">MwSt. ({order.taxRate}%)</span>
                <span className="text-gray-900">{formatCurrency(order.taxAmount)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t pt-3">
                <span>Brutto</span>
                <span>{formatCurrency(order.grossTotal)}</span>
              </div>
            </CardContent>
          </Card>

          {order.invoice && (
            <Card>
              <CardHeader><CardTitle>Rechnung</CardTitle></CardHeader>
              <CardContent>
                <a href={`/rechnungen/${order.invoice.id}`} className="text-blue-600 hover:underline text-sm font-medium">
                  {order.invoice.invoiceNumber}
                </a>
                <Badge variant="secondary" className="ml-2">{order.invoice.status}</Badge>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Status ändern</CardTitle></CardHeader>
            <CardContent>
              <NativeSelect value={order.status} onChange={(e) => updateStatus(e.target.value)}>
                <option value="ENTWURF">Entwurf</option>
                <option value="AUSSTEHEND">Ausstehend</option>
                <option value="BESTAETIGT">Bestätigt</option>
                <option value="ABGESCHLOSSEN">Abgeschlossen</option>
                <option value="STORNIERT">Storniert</option>
              </NativeSelect>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
