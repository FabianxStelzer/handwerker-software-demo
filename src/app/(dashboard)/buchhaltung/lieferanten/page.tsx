"use client";

import { useEffect, useState } from "react";
import { Plus, Building2, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function LieferantenPage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch("/api/vendors")
      .then((r) => r.json())
      .then(setVendors)
      .catch(() => setVendors([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch("/api/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    setDialogOpen(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Lieferant wirklich löschen?")) return;
    await fetch(`/api/vendors/${id}`, { method: "DELETE" });
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
          <h1 className="text-2xl font-bold text-gray-900">Lieferanten</h1>
          <p className="text-sm text-gray-500 mt-1">{vendors.length} Lieferanten</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Neuer Lieferant
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neuer Lieferant</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <Input name="name" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Steuernummer</label>
                  <Input name="taxId" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">USt-IdNr.</label>
                  <Input name="vatId" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Straße</label>
                <Input name="street" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PLZ</label>
                  <Input name="zip" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ort</label>
                  <Input name="city" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                  <Input name="email" type="email" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <Input name="phone" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
                <Textarea name="notes" rows={2} />
              </div>
              <Button type="submit" className="w-full">
                Speichern
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lieferantenverzeichnis</CardTitle>
        </CardHeader>
        <CardContent>
          {vendors.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">Noch keine Lieferanten angelegt</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm font-medium text-gray-500">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Adresse</th>
                    <th className="px-4 py-3">Kontakt</th>
                    <th className="px-4 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((v) => (
                    <tr key={v.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900">{v.name}</span>
                        </div>
                        {(v.taxId || v.vatId) && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {[v.taxId && `St.-Nr. ${v.taxId}`, v.vatId && `USt-Id ${v.vatId}`].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {[v.street, [v.zip, v.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "–"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {[v.email, v.phone].filter(Boolean).join(" · ") || "–"}
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)} className="h-8 w-8">
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
  );
}
