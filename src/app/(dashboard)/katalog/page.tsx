"use client";

import { useEffect, useState } from "react";
import { Plus, Package, Wrench, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";

const unitLabels: Record<string, string> = {
  STUECK: "Stk", METER: "m", QUADRATMETER: "m²", KUBIKMETER: "m³",
  KILOGRAMM: "kg", LITER: "l", PALETTE: "Pal.", PAUSCHAL: "psch.", STUNDE: "Std",
};

export default function KatalogPage() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [matDialogOpen, setMatDialogOpen] = useState(false);
  const [svcDialogOpen, setSvcDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/katalog/materialien").then((r) => r.json()),
      fetch("/api/katalog/leistungen").then((r) => r.json()),
    ]).then(([m, s]) => {
      setMaterials(m);
      setServices(s);
      setLoading(false);
    });
  }, []);

  async function handleCreateMaterial(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch("/api/katalog/materialien", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    setMatDialogOpen(false);
    const res = await fetch("/api/katalog/materialien");
    setMaterials(await res.json());
  }

  async function handleCreateService(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch("/api/katalog/leistungen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    setSvcDialogOpen(false);
    const res = await fetch("/api/katalog/leistungen");
    setServices(await res.json());
  }

  async function deleteMaterial(id: string) {
    if (!confirm("Material wirklich löschen?")) return;
    await fetch(`/api/katalog/materialien/${id}`, { method: "DELETE" });
    setMaterials(materials.filter((m) => m.id !== id));
  }

  async function deleteService(id: string) {
    if (!confirm("Leistung wirklich löschen?")) return;
    await fetch(`/api/katalog/leistungen/${id}`, { method: "DELETE" });
    setServices(services.filter((s) => s.id !== id));
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  const categories = [...new Set(materials.map((m) => m.category).filter(Boolean))];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Katalog</h1>
        <p className="text-sm text-gray-500 mt-1">Materialien und Leistungen verwalten</p>
      </div>

      <Tabs defaultValue="materialien">
        <TabsList>
          <TabsTrigger value="materialien" className="flex items-center gap-1.5">
            <Package className="h-4 w-4" />Materialien ({materials.length})
          </TabsTrigger>
          <TabsTrigger value="leistungen" className="flex items-center gap-1.5">
            <Wrench className="h-4 w-4" />Leistungen ({services.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="materialien">
          <div className="flex justify-end mb-4">
            <Dialog open={matDialogOpen} onOpenChange={setMatDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4" />Neues Material</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Neues Material</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateMaterial} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bezeichnung</label>
                    <Input name="name" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                    <Textarea name="description" rows={2} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Einheit</label>
                      <NativeSelect name="unit" defaultValue="STUECK">
                        {Object.entries(unitLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </NativeSelect>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Preis/Einheit (€)</label>
                      <Input name="pricePerUnit" type="number" step="0.01" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                    <Input name="category" placeholder="z.B. Eindeckung, Dämmung" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gewicht (kg)</label>
                      <Input name="weight" type="number" step="0.01" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                      <Input name="format" placeholder="z.B. 30x50mm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Wärmeleitwert (W/mK)</label>
                      <Input name="thermalValue" type="number" step="0.001" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Min. Dachneigung (°)</label>
                      <Input name="minSlope" type="number" step="0.1" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full">Material anlegen</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm font-medium text-gray-500">
                    <th className="px-4 py-3">Bezeichnung</th>
                    <th className="px-4 py-3">Kategorie</th>
                    <th className="px-4 py-3">Einheit</th>
                    <th className="px-4 py-3 text-right">Preis</th>
                    <th className="px-4 py-3">Details</th>
                    <th className="px-4 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((m) => (
                    <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{m.name}</p>
                        {m.description && <p className="text-xs text-gray-400">{m.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {m.category && <Badge variant="secondary">{m.category}</Badge>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{unitLabels[m.unit] || m.unit}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(m.pricePerUnit)}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {[m.weight && `${m.weight}kg`, m.format, m.thermalValue && `λ=${m.thermalValue}`, m.minSlope && `≥${m.minSlope}°`].filter(Boolean).join(" · ") || "–"}
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="icon" onClick={() => deleteMaterial(m.id)} className="h-8 w-8">
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="leistungen">
          <div className="flex justify-end mb-4">
            <Dialog open={svcDialogOpen} onOpenChange={setSvcDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4" />Neue Leistung</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Neue Leistung</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateService} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bezeichnung</label>
                    <Input name="name" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                    <Textarea name="description" rows={2} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Einheit</label>
                      <NativeSelect name="unit" defaultValue="STUNDE">
                        {Object.entries(unitLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </NativeSelect>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Preis/Einheit (€)</label>
                      <Input name="pricePerUnit" type="number" step="0.01" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                    <Input name="category" placeholder="z.B. Arbeit, Gerüst" />
                  </div>
                  <Button type="submit" className="w-full">Leistung anlegen</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm font-medium text-gray-500">
                    <th className="px-4 py-3">Bezeichnung</th>
                    <th className="px-4 py-3">Kategorie</th>
                    <th className="px-4 py-3">Einheit</th>
                    <th className="px-4 py-3 text-right">Preis</th>
                    <th className="px-4 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((s) => (
                    <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{s.name}</p>
                        {s.description && <p className="text-xs text-gray-400">{s.description}</p>}
                      </td>
                      <td className="px-4 py-3">{s.category && <Badge variant="secondary">{s.category}</Badge>}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{unitLabels[s.unit] || s.unit}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(s.pricePerUnit)}</td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="icon" onClick={() => deleteService(s.id)} className="h-8 w-8">
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
