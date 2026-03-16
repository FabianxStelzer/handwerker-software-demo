"use client";

import { useEffect, useState } from "react";
import { Plus, TrendingUp, TrendingDown, Wallet, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/utils";

const EXPENSE_CATEGORIES = ["Material", "Fahrtkosten", "Werkzeug", "Bürobedarf", "Sonstiges"];

export default function BuchhaltungPage() {
  const [overview, setOverview] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    Promise.all([
      fetch(`/api/buchhaltung/uebersicht?year=${year}`).then((r) => r.json()),
      fetch(`/api/buchhaltung/expenses?year=${year}`).then((r) => r.json()),
      fetch("/api/projekte").then((r) => r.json()),
    ]).then(([o, e, p]) => {
      setOverview(o);
      setExpenses(e);
      setProjects(p);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
  }, [year]);

  async function handleAddExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch("/api/buchhaltung/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    setDialogOpen(false);
    load();
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Buchhaltung</h1>
          <p className="text-sm text-gray-500">Umsatz, Ausgaben und Gewinn</p>
        </div>
        <div className="flex gap-2">
          <NativeSelect
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="w-32"
          >
            {[year - 2, year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </NativeSelect>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4" />Ausgabe erfassen</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Ausgabe erfassen</DialogTitle></DialogHeader>
              <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                  <Input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                  <NativeSelect name="category" required>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </NativeSelect>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                  <Input name="description" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Betrag (Netto, €)</label>
                  <Input name="amount" type="number" step="0.01" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MwSt. %</label>
                  <Input name="taxRate" type="number" step="0.01" defaultValue="19" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lieferant (optional)</label>
                  <Input name="vendor" />
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
                <Button type="submit" className="w-full">Speichern</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Umsatz (bezahlt)</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(overview.umsatzBezahlt)}</p>
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
                  <p className="text-2xl font-bold text-amber-600 mt-1">{formatCurrency(overview.umsatzOffen)}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                  <Receipt className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Ausgaben</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(overview.ausgaben)}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600">
                  <TrendingDown className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Gewinn</p>
                  <p className={`text-2xl font-bold mt-1 ${overview.gewinn >= 0 ? "text-blue-600" : "text-red-600"}`}>
                    {formatCurrency(overview.gewinn)}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <Wallet className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ausgaben {year}</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">Keine Ausgaben erfasst</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm font-medium text-gray-500">
                    <th className="px-4 py-3">Datum</th>
                    <th className="px-4 py-3">Kategorie</th>
                    <th className="px-4 py-3">Beschreibung</th>
                    <th className="px-4 py-3">Lieferant</th>
                    <th className="px-4 py-3 text-right">Brutto</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((ex) => (
                    <tr key={ex.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{formatDate(ex.date)}</td>
                      <td className="px-4 py-3 text-sm">{ex.category}</td>
                      <td className="px-4 py-3 text-sm">{ex.description}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{ex.vendor ?? "–"}</td>
                      <td className="px-4 py-3 text-sm font-medium text-right">{formatCurrency(ex.grossAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
