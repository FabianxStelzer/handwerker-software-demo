"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, Building2, User, Mail, MapPin } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Customer {
  id: string;
  customerNumber: string | null;
  type: string;
  company: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  _count: { projects: number; orders: number };
}

export default function KundenPage() {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch(`/api/kunden?search=${encodeURIComponent(search)}`);
    setCustomers(await res.json());
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries());
    await fetch("/api/kunden", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setDialogOpen(false);
    load();
  }

  function displayName(c: Customer) {
    if (c.type === "GESCHAEFT" && c.company) return c.company;
    return `${c.firstName} ${c.lastName}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("kunden.title")}</h1>
          <p className="text-sm text-gray-500 mt-1">{customers.length} {t("kunden.title")}</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              {t("kunden.neuerKunde")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("kunden.kundeAnlegen")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("kunden.kundentyp")}</label>
                <NativeSelect name="type" defaultValue="PRIVAT">
                  <option value="PRIVAT">{t("kunden.privatkunde")}</option>
                  <option value="GESCHAEFT">{t("kunden.geschaeftskunde")}</option>
                </NativeSelect>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("kunden.firmaOptional")}</label>
                <Input name="company" placeholder={t("kunden.firmenname")} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.vorname")}</label>
                  <Input name="firstName" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.nachname")}</label>
                  <Input name="lastName" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.email")}</label>
                <Input name="email" type="email" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.telefon")}</label>
                <Input name="phone" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.strasse")}</label>
                  <Input name="street" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.plz")}</label>
                  <Input name="zip" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.ort")}</label>
                <Input name="city" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.notizen")}</label>
                <Textarea name="notes" rows={2} />
              </div>
              <Button type="submit" className="w-full">{t("kunden.kundeAnlegen")}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("kunden.kundenSuchen")}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : customers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            {search ? t("kunden.keineGefunden") : t("kunden.keineAngelegt")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {customers.map((c) => (
            <Link key={c.id} href={`/kunden/${c.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${c.type === "GESCHAEFT" ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"}`}>
                      {c.type === "GESCHAEFT" ? <Building2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {displayName(c)}
                        {c.customerNumber && <span className="ml-2 text-xs text-gray-400 font-normal">Nr. {c.customerNumber}</span>}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        {c.type === "GESCHAEFT" && c.company && (
                          <span>{c.firstName} {c.lastName}</span>
                        )}
                        {c.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {c.email}
                          </span>
                        )}
                        {c.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {c.city}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{c._count.projects} {t("nav.projekte")}</Badge>
                    <Badge variant="outline">{c._count.orders} {t("projekte.auftraege")}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
