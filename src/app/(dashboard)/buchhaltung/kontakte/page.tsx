"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus, Search, X, MoreVertical, ArrowUpDown, Users, Building2,
  ChevronUp, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";

interface Kontakt {
  id: string;
  typ: "kunde" | "lieferant";
  nr: string;
  name: string;
  strasse: string;
  ort: string;
  kdUmsatz: number;
  lftUmsatz: number;
  email: string;
  phone: string;
  raw: any;
}

type SortKey = "nr" | "name" | "strasse" | "ort" | "kdUmsatz" | "lftUmsatz";
type SortDir = "asc" | "desc";

export default function KontaktePage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [incomingInvoices, setIncomingInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"alle" | "kunden" | "lieferanten">("alle");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<"kunde" | "lieferant">("kunde");
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/kunden").then((r) => r.json()),
      fetch("/api/vendors").then((r) => r.json()),
      fetch("/api/rechnungen").then((r) => r.json()).catch(() => []),
      fetch("/api/belege/eingangsrechnungen").then((r) => r.json()).catch(() => []),
    ]).then(([c, v, inv, ein]) => {
      setCustomers(c);
      setVendors(v);
      setInvoices(inv);
      setIncomingInvoices(ein);
      setLoading(false);
    });
  }, []);

  const kontakte = useMemo<Kontakt[]>(() => {
    const customerUmsatz: Record<string, number> = {};
    for (const inv of invoices) {
      if (inv.status === "BEZAHLT" && inv.customerId) {
        customerUmsatz[inv.customerId] = (customerUmsatz[inv.customerId] || 0) + (inv.grossTotal || 0);
      }
    }

    const vendorUmsatz: Record<string, number> = {};
    for (const ein of incomingInvoices) {
      if (ein.vendorId) {
        vendorUmsatz[ein.vendorId] = (vendorUmsatz[ein.vendorId] || 0) + (ein.grossAmount || 0);
      }
    }

    const list: Kontakt[] = [];

    for (const c of customers) {
      const name = c.type === "GESCHAEFT" && c.company ? c.company : `${c.firstName} ${c.lastName}`;
      list.push({
        id: `k-${c.id}`,
        typ: "kunde",
        nr: c.customerNumber || c.id.slice(-5),
        name,
        strasse: c.street || "",
        ort: c.city || "",
        kdUmsatz: customerUmsatz[c.id] || 0,
        lftUmsatz: 0,
        email: c.email || "",
        phone: c.phone || "",
        raw: c,
      });
    }

    for (const v of vendors) {
      list.push({
        id: `v-${v.id}`,
        typ: "lieferant",
        nr: v.vendorNumber || v.id.slice(-5),
        name: v.name,
        strasse: v.street || "",
        ort: v.city || "",
        kdUmsatz: 0,
        lftUmsatz: vendorUmsatz[v.id] || 0,
        email: v.email || "",
        phone: v.phone || "",
        raw: v,
      });
    }

    return list;
  }, [customers, vendors, invoices, incomingInvoices]);

  const filtered = useMemo(() => {
    let list = kontakte;
    if (activeTab === "kunden") list = list.filter((k) => k.typ === "kunde");
    if (activeTab === "lieferanten") list = list.filter((k) => k.typ === "lieferant");

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((k) =>
        k.name.toLowerCase().includes(q) ||
        k.nr.toLowerCase().includes(q) ||
        k.strasse.toLowerCase().includes(q) ||
        k.ort.toLowerCase().includes(q) ||
        k.email.toLowerCase().includes(q)
      );
    }

    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "nr") cmp = a.nr.localeCompare(b.nr, "de", { numeric: true });
      else if (sortKey === "name") cmp = a.name.localeCompare(b.name, "de");
      else if (sortKey === "strasse") cmp = a.strasse.localeCompare(b.strasse, "de");
      else if (sortKey === "ort") cmp = a.ort.localeCompare(b.ort, "de");
      else if (sortKey === "kdUmsatz") cmp = a.kdUmsatz - b.kdUmsatz;
      else if (sortKey === "lftUmsatz") cmp = a.lftUmsatz - b.lftUmsatz;
      return sortDir === "desc" ? -cmp : cmp;
    });

    return list;
  }, [kontakte, activeTab, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((k) => k.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError("");
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries()) as Record<string, string>;

    if (createType === "kunde") {
      if (!data.firstName?.trim() || !data.lastName?.trim()) { setCreateError("Vor- und Nachname erforderlich."); return; }
      const res = await fetch("/api/kunden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) { setCreateError("Fehler beim Anlegen."); return; }
      const newC = await res.json();
      setCustomers((prev) => [newC, ...prev]);
    } else {
      if (!data.name?.trim()) { setCreateError("Name erforderlich."); return; }
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) { setCreateError("Fehler beim Anlegen."); return; }
      const newV = await res.json();
      setVendors((prev) => [newV, ...prev]);
    }
    setCreateOpen(false);
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 text-gray-300" />;
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3 text-gray-600" /> : <ChevronDown className="h-3 w-3 text-gray-600" />;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const tabs = [
    { key: "alle" as const, label: "ALLE" },
    { key: "kunden" as const, label: "KUNDEN" },
    { key: "lieferanten" as const, label: "LIEFERANTEN" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Kontakte</h1>
        <div className="flex items-center gap-2">
          <Button className="gap-1.5 bg-[#9eb552] hover:bg-[#8da448] text-white" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Neuen Kontakt anlegen
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setActiveTab(t.key); setSelected(new Set()); }}
            className={`px-5 py-2.5 text-xs font-bold tracking-wide border-b-2 transition-colors ${
              activeTab === t.key
                ? "border-[#9eb552] text-[#9eb552]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nach Kontakten suchen"
            className="pl-9 h-9 text-sm"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50/50">
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </th>
                <th className="px-3 py-3 text-left">
                  <button onClick={() => toggleSort("nr")} className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700">
                    Nr. <SortIcon col="nr" />
                  </button>
                </th>
                <th className="px-3 py-3 text-left">
                  <button onClick={() => toggleSort("name")} className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700">
                    Name <SortIcon col="name" />
                  </button>
                </th>
                <th className="px-3 py-3 text-left">
                  <button onClick={() => toggleSort("strasse")} className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700">
                    Straße <SortIcon col="strasse" />
                  </button>
                </th>
                <th className="px-3 py-3 text-left">
                  <button onClick={() => toggleSort("ort")} className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700">
                    Ort <SortIcon col="ort" />
                  </button>
                </th>
                <th className="px-3 py-3 text-right">
                  <button onClick={() => toggleSort("kdUmsatz")} className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700 ml-auto">
                    Kd. Umsatz <SortIcon col="kdUmsatz" />
                  </button>
                </th>
                <th className="px-3 py-3 text-right">
                  <button onClick={() => toggleSort("lftUmsatz")} className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700 ml-auto">
                    Lft. Umsatz <SortIcon col="lftUmsatz" />
                  </button>
                </th>
                <th className="px-3 py-3 text-left">
                  <span className="text-xs font-semibold text-gray-500">Tags</span>
                </th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400 text-sm">
                    Keine Kontakte gefunden
                  </td>
                </tr>
              ) : (
                filtered.map((k) => {
                    const link = k.typ === "kunde" ? `/kunden/${k.raw.id}?from=buchhaltung` : `/buchhaltung/kontakte/lieferant/${k.raw.id}`;
                  return (
                    <tr key={k.id} className="border-b border-gray-100 hover:bg-gray-50/50 group">
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(k.id)}
                          onChange={() => toggleOne(k.id)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-500 font-mono">{k.nr}</td>
                      <td className="px-3 py-3">
                        <Link href={link} className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate block max-w-[200px]">
                          {k.name}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-500 truncate max-w-[150px]">{k.strasse || "–"}</td>
                      <td className="px-3 py-3 text-sm text-gray-500 truncate max-w-[120px]">{k.ort || "–"}</td>
                      <td className="px-3 py-3 text-sm text-right text-gray-700">
                        {k.kdUmsatz > 0 ? formatCurrency(k.kdUmsatz) : ""}
                      </td>
                      <td className="px-3 py-3 text-sm text-right text-gray-700">
                        {k.lftUmsatz > 0 ? formatCurrency(k.lftUmsatz) : ""}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-400">
                        {k.typ === "lieferant" && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-600 border border-orange-200">
                            <Building2 className="h-2.5 w-2.5" />Lieferant
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right relative">
                        <button
                          onClick={() => setMenuOpen(menuOpen === k.id ? null : k.id)}
                          className="p-1 rounded hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-4 w-4 text-gray-400" />
                        </button>
                        {menuOpen === k.id && (
                          <div className="absolute right-0 top-full z-10 bg-white border rounded-lg shadow-lg py-1 w-40">
                            {link && (
                              <Link href={link} className="block px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setMenuOpen(null)}>
                                Details anzeigen
                              </Link>
                            )}
                            <button className="block w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setMenuOpen(null)}>
                              Bearbeiten
                            </button>
                            <button className="block w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50" onClick={() => setMenuOpen(null)}>
                              Löschen
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-gray-50/50 border-t flex items-center justify-between">
          <span className="text-xs text-gray-500">{filtered.length} Kontakte</span>
          {selected.size > 0 && (
            <span className="text-xs text-blue-600 font-medium">{selected.size} ausgewählt</span>
          )}
        </div>
      </div>

      {/* ── Create Dialog ──────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Neuen Kontakt anlegen</DialogTitle>
          </DialogHeader>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setCreateType("kunde")}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                createType === "kunde" ? "border-[#9eb552] bg-[#9eb552]/10 text-[#9eb552]" : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Users className="h-4 w-4" /> Kunde
            </button>
            <button
              onClick={() => setCreateType("lieferant")}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                createType === "lieferant" ? "border-[#9eb552] bg-[#9eb552]/10 text-[#9eb552]" : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Building2 className="h-4 w-4" /> Lieferant
            </button>
          </div>

          <form onSubmit={handleCreate} className="space-y-3">
            {createError && <p className="text-sm text-red-600">{createError}</p>}

            {createType === "kunde" ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
                  <NativeSelect name="type">
                    <option value="PRIVAT">Privat</option>
                    <option value="GESCHAEFT">Geschäftlich</option>
                  </NativeSelect>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Firma (optional)</label>
                  <Input name="company" placeholder="Firmenname" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vorname *</label>
                    <Input name="firstName" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nachname *</label>
                    <Input name="lastName" required />
                  </div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label><Input name="email" type="email" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label><Input name="phone" /></div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Straße</label><Input name="street" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">PLZ</label><Input name="zip" /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Ort</label><Input name="city" /></div>
              </>
            ) : (
              <>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Name *</label><Input name="name" required placeholder="Firmenname" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label><Input name="email" type="email" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label><Input name="phone" /></div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Straße</label><Input name="street" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">PLZ</label><Input name="zip" /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Ort</label><Input name="city" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Steuernummer</label><Input name="taxId" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">USt-IdNr.</label><Input name="vatId" /></div>
              </>
            )}

            <Button type="submit" className="w-full bg-[#9eb552] hover:bg-[#8da448] text-white">Kontakt anlegen</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
