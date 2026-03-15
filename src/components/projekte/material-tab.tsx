"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";

interface Props {
  project: any;
  onUpdate: () => void;
}

const unitLabels: Record<string, string> = {
  STUECK: "Stk", METER: "m", QUADRATMETER: "m²", KUBIKMETER: "m³",
  KILOGRAMM: "kg", LITER: "l", PALETTE: "Pal.", PAUSCHAL: "psch.", STUNDE: "Std",
};

export function MaterialTab({ project, onUpdate }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [selectedCatalog, setSelectedCatalog] = useState("");

  useEffect(() => {
    fetch("/api/katalog/materialien").then((r) => r.json()).then(setCatalog);
  }, []);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: any = Object.fromEntries(fd.entries());

    if (selectedCatalog) {
      const cm = catalog.find((c) => c.id === selectedCatalog);
      if (cm) {
        data.catalogMaterialId = cm.id;
        data.name = cm.name;
        data.unit = cm.unit;
        data.pricePerUnit = cm.pricePerUnit;
      }
    }

    data.quantityPlanned = parseFloat(data.quantityPlanned) || 0;
    data.pricePerUnit = parseFloat(data.pricePerUnit) || 0;

    await fetch(`/api/projekte/${project.id}/materialien`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setDialogOpen(false);
    setSelectedCatalog("");
    onUpdate();
  }

  const materials = project.materials || [];
  const totalPlanned = materials.reduce((s: number, m: any) => s + m.quantityPlanned * m.pricePerUnit, 0);
  const totalUsed = materials.reduce((s: number, m: any) => s + m.quantityUsed * m.pricePerUnit, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Material</h3>
          <div className="flex gap-4 text-sm text-gray-500 mt-1">
            <span>Geplant: {formatCurrency(totalPlanned)}</span>
            <span>Verbraucht: {formatCurrency(totalUsed)}</span>
            <span className={totalUsed > totalPlanned ? "text-red-600 font-medium" : "text-green-600"}>
              Differenz: {formatCurrency(totalPlanned - totalUsed)}
            </span>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4" />Material hinzufügen</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Material hinzufügen</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aus Katalog wählen</label>
                <NativeSelect value={selectedCatalog} onChange={(e) => setSelectedCatalog(e.target.value)}>
                  <option value="">Manuell eingeben...</option>
                  {catalog.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({formatCurrency(c.pricePerUnit)}/{unitLabels[c.unit] || c.unit})
                    </option>
                  ))}
                </NativeSelect>
              </div>
              {!selectedCatalog && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bezeichnung</label>
                    <Input name="name" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Einheit</label>
                      <NativeSelect name="unit" defaultValue="STUECK">
                        {Object.entries(unitLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </NativeSelect>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Preis/Einheit</label>
                      <Input name="pricePerUnit" type="number" step="0.01" />
                    </div>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Geplante Menge</label>
                <Input name="quantityPlanned" type="number" step="0.01" required />
              </div>
              <Button type="submit" className="w-full">Hinzufügen</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {materials.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-gray-500">Kein Material eingeplant</CardContent></Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm font-medium text-gray-500">
                  <th className="px-4 py-3">Material</th>
                  <th className="px-4 py-3">Einheit</th>
                  <th className="px-4 py-3 text-right">Preis</th>
                  <th className="px-4 py-3 text-right">Geplant</th>
                  <th className="px-4 py-3 text-right">Verbraucht</th>
                  <th className="px-4 py-3 text-right">Summe geplant</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m: any) => (
                  <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {m.name}
                      {m.catalogMaterial && <Badge variant="outline" className="ml-2 text-xs">Katalog</Badge>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{unitLabels[m.unit] || m.unit}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 text-right">{formatCurrency(m.pricePerUnit)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{m.quantityPlanned}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={m.quantityUsed > m.quantityPlanned ? "text-red-600 font-medium" : "text-gray-900"}>
                        {m.quantityUsed}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">{formatCurrency(m.quantityPlanned * m.pricePerUnit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
