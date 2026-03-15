"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";

const statusConfig: Record<string, { label: string; variant: "default" | "success" | "warning" | "secondary" | "destructive" }> = {
  ENTWURF: { label: "Entwurf", variant: "secondary" },
  VERSENDET: { label: "Versendet", variant: "default" },
  BEZAHLT: { label: "Bezahlt", variant: "success" },
  UEBERFAELLIG: { label: "Überfällig", variant: "destructive" },
};

const unitLabels: Record<string, string> = {
  STUECK: "Stk", METER: "m", QUADRATMETER: "m²", KUBIKMETER: "m³",
  KILOGRAMM: "kg", LITER: "l", PALETTE: "Pal.", PAUSCHAL: "psch.", STUNDE: "Std",
};

export default function RechnungDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [invoice, setInvoice] = useState<any>(null);

  const load = () => {
    fetch(`/api/rechnungen/${id}`).then((r) => r.json()).then(setInvoice);
  };

  useEffect(() => { load(); }, [id]);

  async function updateStatus(status: string) {
    await fetch(`/api/rechnungen/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  if (!invoice) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  const sc = statusConfig[invoice.status];
  const customer = invoice.order.customer;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/rechnungen")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{invoice.invoiceNumber}</h1>
              <Badge variant={sc?.variant || "secondary"}>{sc?.label || invoice.status}</Badge>
            </div>
            <p className="text-sm text-gray-500">Auftrag: {invoice.order.orderNumber}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {invoice.status === "ENTWURF" && (
            <Button onClick={() => updateStatus("VERSENDET")}>Als versendet markieren</Button>
          )}
          {invoice.status === "VERSENDET" && (
            <Button onClick={() => updateStatus("BEZAHLT")} className="bg-green-600 hover:bg-green-700">Als bezahlt markieren</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between">
                <div>
                  <CardTitle>Rechnung {invoice.invoiceNumber}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Erstellt: {formatDate(invoice.createdAt)}
                    {invoice.dueDate && ` · Fällig: ${formatDate(invoice.dueDate)}`}
                    {invoice.paidDate && ` · Bezahlt: ${formatDate(invoice.paidDate)}`}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Rechnungsempfänger</p>
                <p className="text-sm text-gray-900 mt-1">
                  {customer.type === "GESCHAEFT" && customer.company ? customer.company : `${customer.firstName} ${customer.lastName}`}
                </p>
                {customer.street && <p className="text-sm text-gray-500">{customer.street}</p>}
                {(customer.zip || customer.city) && <p className="text-sm text-gray-500">{customer.zip} {customer.city}</p>}
              </div>

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
                  {invoice.items.map((item: any, i: number) => (
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
                <tfoot>
                  <tr className="border-t">
                    <td colSpan={5} className="py-2 text-sm text-right text-gray-500">Netto</td>
                    <td className="py-2 text-sm text-right">{formatCurrency(invoice.netTotal)}</td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="py-2 text-sm text-right text-gray-500">MwSt. ({invoice.taxRate}%)</td>
                    <td className="py-2 text-sm text-right">{formatCurrency(invoice.taxAmount)}</td>
                  </tr>
                  <tr className="border-t">
                    <td colSpan={5} className="py-3 text-right font-bold">Brutto</td>
                    <td className="py-3 text-right text-lg font-bold">{formatCurrency(invoice.grossTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader><CardTitle>Status ändern</CardTitle></CardHeader>
            <CardContent>
              <NativeSelect value={invoice.status} onChange={(e) => updateStatus(e.target.value)}>
                <option value="ENTWURF">Entwurf</option>
                <option value="VERSENDET">Versendet</option>
                <option value="BEZAHLT">Bezahlt</option>
                <option value="UEBERFAELLIG">Überfällig</option>
              </NativeSelect>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
