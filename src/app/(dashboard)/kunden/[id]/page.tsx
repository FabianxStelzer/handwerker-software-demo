"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Trash2, Building2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";

interface CustomerDetail {
  id: string;
  type: string;
  company: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
  notes: string | null;
  projects: Array<{ id: string; projectNumber: string; name: string; status: string }>;
  orders: Array<{ id: string; orderNumber: string; status: string; grossTotal: number; invoice: { id: string; invoiceNumber: string; status: string } | null }>;
}

export default function KundenDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/kunden/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setCustomer(data);
        setForm({
          type: data.type,
          company: data.company || "",
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email || "",
          phone: data.phone || "",
          street: data.street || "",
          zip: data.zip || "",
          city: data.city || "",
          notes: data.notes || "",
        });
      });
  }, [id]);

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/kunden/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm("Kunde wirklich löschen?")) return;
    await fetch(`/api/kunden/${id}`, { method: "DELETE" });
    router.push("/kunden");
  }

  if (!customer) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    PLANUNG: "Planung", AKTIV: "Aktiv", PAUSIERT: "Pausiert", ABGESCHLOSSEN: "Abgeschlossen",
    ENTWURF: "Entwurf", AUSSTEHEND: "Ausstehend", BESTAETIGT: "Bestätigt", STORNIERT: "Storniert",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/kunden")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${customer.type === "GESCHAEFT" ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"}`}>
              {customer.type === "GESCHAEFT" ? <Building2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {customer.type === "GESCHAEFT" && customer.company ? customer.company : `${customer.firstName} ${customer.lastName}`}
              </h1>
              <p className="text-sm text-gray-500">
                {customer.type === "GESCHAEFT" ? "Geschäftskunde" : "Privatkunde"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Speichern..." : "Speichern"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Kontaktdaten</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kundentyp</label>
                <NativeSelect value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="PRIVAT">Privatkunde</option>
                  <option value="GESCHAEFT">Geschäftskunde</option>
                </NativeSelect>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Firma</label>
                <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vorname</label>
                  <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
                  <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                  <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Straße</label>
                  <Input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PLZ</label>
                  <Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ort</label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Projekte ({customer.projects.length})</CardTitle></CardHeader>
            <CardContent>
              {customer.projects.length === 0 ? (
                <p className="text-sm text-gray-500">Keine Projekte</p>
              ) : (
                <div className="space-y-2">
                  {customer.projects.map((p) => (
                    <Link key={p.id} href={`/projekte/${p.id}`} className="block p-2 rounded-lg hover:bg-gray-50 border border-gray-100">
                      <p className="text-sm font-medium">{p.name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-500">{p.projectNumber}</span>
                        <Badge variant="secondary" className="text-xs">{statusLabels[p.status] || p.status}</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Aufträge ({customer.orders.length})</CardTitle></CardHeader>
            <CardContent>
              {customer.orders.length === 0 ? (
                <p className="text-sm text-gray-500">Keine Aufträge</p>
              ) : (
                <div className="space-y-2">
                  {customer.orders.map((o) => (
                    <Link key={o.id} href={`/auftraege/${o.id}`} className="block p-2 rounded-lg hover:bg-gray-50 border border-gray-100">
                      <p className="text-sm font-medium">{o.orderNumber}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-500">{o.grossTotal.toFixed(2)} €</span>
                        <Badge variant="secondary" className="text-xs">{statusLabels[o.status] || o.status}</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
