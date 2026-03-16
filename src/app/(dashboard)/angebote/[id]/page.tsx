"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";

const statusConfig: Record<string, { label: string; variant: "default" | "success" | "warning" | "secondary" | "destructive" }> = {
  ENTWURF: { label: "Entwurf", variant: "secondary" },
  VERSENDET: { label: "Versendet", variant: "default" },
  ANGENOMMEN: { label: "Angenommen", variant: "success" },
  ABGELEHNT: { label: "Abgelehnt", variant: "destructive" },
  ABGELAUFEN: { label: "Abgelaufen", variant: "warning" },
};

const unitLabels: Record<string, string> = {
  STUECK: "Stk", METER: "m", QUADRATMETER: "m²", KUBIKMETER: "m³",
  KILOGRAMM: "kg", LITER: "l", PALETTE: "Pal.", PAUSCHAL: "psch.", STUNDE: "Std",
};

export default function AngebotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [quotation, setQuotation] = useState<any>(null);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [catalog, setCatalog] = useState<{ materials: any[]; services: any[] }>({ materials: [], services: [] });

  const load = () => {
    fetch(`/api/angebote/${id}`).then((r) => r.json()).then(setQuotation);
  };

  useEffect(() => {
    load();
    Promise.all([
      fetch("/api/katalog/materialien").then((r) => r.json()),
      fetch("/api/katalog/leistungen").then((r) => r.json()),
    ]).then(([m, s]) => setCatalog({ materials: m, services: s }));
  }, [id]);

  async function updateStatus(status: string) {
    await fetch(`/api/angebote/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...quotation, status }),
    });
    load();
  }

  async function addItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch(`/api/angebote/${id}/positionen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    setItemDialogOpen(false);
    load();
  }

  async function convertToOrder() {
    const res = await fetch(`/api/angebote/${id}/to-order`, { method: "POST" });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Fehler");
      return;
    }
    const order = await res.json();
    router.push(`/auftraege/${order.id}`);
  }

  if (!quotation) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  const sc = statusConfig[quotation.status];
  const customer = quotation.customer;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/buchhaltung/belege")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{quotation.quotationNumber}</h1>
              <Badge variant={sc?.variant || "secondary"}>{sc?.label || quotation.status}</Badge>
            </div>
            <p className="text-sm text-gray-500">
              {customer.type === "GESCHAEFT" && customer.company ? customer.company : `${customer.firstName} ${customer.lastName}`}
              {quotation.project && ` · ${quotation.project.projectNumber}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {quotation.status === "ENTWURF" && (
            <Button variant="outline" onClick={() => updateStatus("VERSENDET")}>Als versendet markieren</Button>
          )}
          {(quotation.status === "VERSENDET" || quotation.status === "ENTWURF") && !quotation.order && (
            <Button onClick={convertToOrder}>
              <FileText className="h-4 w-4" />In Auftrag umwandeln
            </Button>
          )}
          {quotation.order && (
            <Link href={`/auftraege/${quotation.order.id}`}>
              <Button variant="outline">Zum Auftrag</Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Positionen</CardTitle>
              {quotation.status === "ENTWURF" && (
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
                          <NativeSelect name="unit">
                            <option value="STUECK">Stk</option>
                            <option value="METER">m</option>
                            <option value="QUADRATMETER">m²</option>
                            <option value="STUNDE">Std</option>
                            <option value="PAUSCHAL">Pauschal</option>
                          </NativeSelect>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">EP (€)</label>
                          <Input name="pricePerUnit" type="number" step="0.01" defaultValue="0" required />
                        </div>
                      </div>
                      <Button type="submit" className="w-full">Hinzufügen</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-gray-500">
                    <th className="py-2">Pos.</th>
                    <th className="py-2">Beschreibung</th>
                    <th className="py-2 text-right">Menge</th>
                    <th className="py-2">Einheit</th>
                    <th className="py-2 text-right">EP</th>
                    <th className="py-2 text-right">GP</th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.items?.map((item: any, i: number) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="py-3 text-sm text-gray-400">{i + 1}</td>
                      <td className="py-3 text-sm">{item.description}</td>
                      <td className="py-3 text-sm text-right">{item.quantity}</td>
                      <td className="py-3 text-sm text-gray-500">{unitLabels[item.unit] || item.unit}</td>
                      <td className="py-3 text-sm text-right">{formatCurrency(item.pricePerUnit)}</td>
                      <td className="py-3 text-sm text-right font-medium">{formatCurrency(item.quantity * item.pricePerUnit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 pt-4 border-t flex justify-end gap-8 text-sm">
                <span>Netto: {formatCurrency(quotation.netTotal)}</span>
                <span>MwSt. {quotation.taxRate}%: {formatCurrency(quotation.taxAmount)}</span>
                <span className="font-bold">Brutto: {formatCurrency(quotation.grossTotal)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Rechnungsempfänger</p>
                <p className="text-sm font-medium mt-1">
                  {customer.type === "GESCHAEFT" && customer.company ? customer.company : `${customer.firstName} ${customer.lastName}`}
                </p>
                {customer.street && <p className="text-sm text-gray-600">{customer.street}</p>}
                {(customer.zip || customer.city) && <p className="text-sm text-gray-600">{customer.zip} {customer.city}</p>}
              </div>
              <div>
                <p className="text-sm text-gray-500">Gültig bis</p>
                <p className="text-sm">{quotation.validUntil ? formatDate(quotation.validUntil) : "–"}</p>
              </div>
              {quotation.notes && (
                <div>
                  <p className="text-sm text-gray-500">Notizen</p>
                  <p className="text-sm">{quotation.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
