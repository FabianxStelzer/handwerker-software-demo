"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, TrendingUp, Users, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/utils";

const statusConfig: Record<string, { label: string; variant: "default" | "success" | "warning" | "secondary" | "destructive" }> = {
  ENTWURF: { label: "Entwurf", variant: "secondary" },
  VERSENDET: { label: "Versendet", variant: "default" },
  BEZAHLT: { label: "Bezahlt", variant: "success" },
  UEBERFAELLIG: { label: "Überfällig", variant: "destructive" },
};

export default function RechnungenPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/rechnungen").then((r) => r.json()),
      fetch("/api/rechnungen/analytics").then((r) => r.json()),
    ]).then(([inv, an]) => {
      setInvoices(inv);
      setAnalytics(an);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rechnungen & Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">{invoices.length} Rechnungen</p>
      </div>

      <Tabs defaultValue="rechnungen">
        <TabsList>
          <TabsTrigger value="rechnungen">Rechnungen</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

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
                    const sc = statusConfig[inv.status];
                    return (
                      <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link href={`/rechnungen/${inv.id}`} className="text-sm text-blue-600 hover:underline font-mono">{inv.invoiceNumber}</Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{inv.customerName}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{inv.order.orderNumber}</td>
                        <td className="px-4 py-3"><Badge variant={sc?.variant || "secondary"}>{sc?.label || inv.status}</Badge></td>
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
                <CardHeader><CardTitle>Top-Kunden nach Umsatz</CardTitle></CardHeader>
                <CardContent>
                  {analytics.topCustomers.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">Keine Daten</p>
                  ) : (
                    <div className="space-y-3">
                      {analytics.topCustomers.map((c: any, i: number) => (
                        <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-sm font-bold">{i + 1}</span>
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
