"use client";

import { useEffect, useState, useMemo } from "react";
import { Printer, ChevronDown, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";

type KundenInvoice = {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string | null;
  grossTotal: number;
  offen: number;
  status: string;
  paidDate: string | null;
};

type KundenGruppe = {
  customer: { id: string; displayName: string };
  invoices: KundenInvoice[];
  total: number;
};

type LieferantenInvoice = {
  id: string;
  referenceNo: string;
  date: string;
  dueDate: string | null;
  grossAmount: number;
  offen: number;
  status: string;
  paidDate: string | null;
};

type LieferantenGruppe = {
  vendor: { id: string; name: string };
  invoices: LieferantenInvoice[];
  total: number;
};

export default function OffenePostenPage() {
  const [typ, setTyp] = useState<"kunden" | "lieferanten">("kunden");
  const [kundenData, setKundenData] = useState<{ gruppen: KundenGruppe[]; total: number } | null>(null);
  const [lieferantenData, setLieferantenData] = useState<{ gruppen: LieferantenGruppe[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    setLoading(true);
    if (!kundenData && !lieferantenData) {
      Promise.all([
        fetch("/api/buchhaltung/offene-posten?typ=kunden").then((r) => r.json()),
        fetch("/api/buchhaltung/offene-posten?typ=lieferanten").then((r) => r.json()),
      ]).then(([k, l]) => {
        setKundenData(k);
        setLieferantenData(l);
        setLoading(false);
      });
    } else {
      fetch(`/api/buchhaltung/offene-posten?typ=${typ}`)
        .then((r) => r.json())
        .then((data) => {
          if (typ === "kunden") setKundenData(data);
          else setLieferantenData(data);
          setLoading(false);
        });
    }
  }, [typ]);

  function toggleExpand(key: string) {
    setExpanded((e) => ({ ...e, [key]: !e[key] }));
  }

  const kundenFiltered = useMemo(() => {
    if (!kundenData) return [];
    let list = kundenData.gruppen;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((g) => g.customer.displayName.toLowerCase().includes(q));
    }
    return list.sort((a, b) => {
      const cmp = a.customer.displayName.localeCompare(b.customer.displayName);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [kundenData, search, sortDir]);

  const lieferantenFiltered = useMemo(() => {
    if (!lieferantenData) return [];
    let list = lieferantenData.gruppen;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((g) => g.vendor.name.toLowerCase().includes(q));
    }
    return list.sort((a, b) => {
      const cmp = a.vendor.name.localeCompare(b.vendor.name);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [lieferantenData, search, sortDir]);

  function handlePrint() {
    window.print();
  }

  const totalKunden = kundenData?.total ?? 0;
  const totalLieferanten = lieferantenData?.total ?? 0;
  const nochZuErhalten = totalKunden - totalLieferanten;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Offene Posten</h1>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <NativeSelect
          value={typ}
          onChange={(e) => { setTyp(e.target.value as any); setSearch(""); setExpanded({}); }}
          className="w-56"
        >
          <option value="kunden">Offene Kundenrechnungen</option>
          <option value="lieferanten">Offene Lieferantenrechnungen</option>
        </NativeSelect>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={typ === "kunden" ? "Kunde suchen..." : "Lieferant suchen..."}
            className="pl-9"
          />
        </div>
        <div className="ml-auto">
          <Button onClick={handlePrint} className="bg-[#9eb552] hover:bg-[#8da348] text-white">
            <Printer className="h-4 w-4 mr-1.5" />Drucken
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#9eb552] border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Table header */}
          <div className="border-b pb-2">
            <div className="flex items-center text-sm font-medium text-gray-500">
              <button
                className="flex items-center gap-1 hover:text-gray-700"
                onClick={() => setSortDir((d) => d === "asc" ? "desc" : "asc")}
              >
                {typ === "kunden" ? "Kunde" : "Lieferant"}
                <span className="text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>
              </button>
              <span className="ml-auto">Offen gesamt</span>
            </div>
          </div>

          {/* Groups */}
          {typ === "kunden" ? (
            <div className="space-y-1">
              {kundenFiltered.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-12">Keine offenen Kundenrechnungen.</p>
              )}
              {kundenFiltered.map((g) => {
                const isOpen = expanded[g.customer.id];
                return (
                  <div key={g.customer.id}>
                    {/* Group header */}
                    <button
                      className="flex items-center w-full py-3 px-2 hover:bg-gray-50 rounded-lg transition-colors text-left"
                      onClick={() => toggleExpand(g.customer.id)}
                    >
                      {isOpen
                        ? <ChevronDown className="h-4 w-4 text-gray-500 mr-2 shrink-0" />
                        : <ChevronRight className="h-4 w-4 text-gray-500 mr-2 shrink-0" />}
                      <span className="text-sm font-semibold text-gray-900">
                        {g.customer.displayName}
                      </span>
                      <span className="ml-auto text-sm font-semibold text-gray-900">
                        {formatCurrency(g.total)}
                      </span>
                    </button>

                    {/* Expanded invoices */}
                    {isOpen && (
                      <div className="ml-6 mb-4">
                        <table className="w-full">
                          <thead>
                            <tr className="text-xs text-gray-400 border-b">
                              <th className="text-left py-1.5 pr-4 font-medium">Belegnummer</th>
                              <th className="text-left py-1.5 pr-4 font-medium">Erstellt am</th>
                              <th className="text-left py-1.5 pr-4 font-medium">Gesamtbetrag</th>
                              <th className="text-left py-1.5 pr-4 font-medium">Fällig am</th>
                              <th className="text-left py-1.5 pr-4 font-medium">Bereits erfolgte Zahlungen</th>
                              <th className="text-left py-1.5 pr-4 font-medium">Zahldatum</th>
                              <th className="text-right py-1.5 font-medium">Offen</th>
                            </tr>
                          </thead>
                          <tbody>
                            {g.invoices.map((inv) => (
                              <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                <td className="py-2 pr-4 text-sm text-[#9eb552] font-medium">{inv.invoiceNumber}</td>
                                <td className="py-2 pr-4 text-sm text-gray-600">{formatDate(inv.issueDate)}</td>
                                <td className="py-2 pr-4 text-sm text-gray-600">{formatCurrency(inv.grossTotal)}</td>
                                <td className="py-2 pr-4 text-sm text-gray-600">{inv.dueDate ? formatDate(inv.dueDate) : "–"}</td>
                                <td className="py-2 pr-4 text-sm text-gray-400">–</td>
                                <td className="py-2 pr-4 text-sm text-gray-400">{inv.paidDate ? formatDate(inv.paidDate) : ""}</td>
                                <td className="py-2 text-sm text-right font-medium text-gray-900">{formatCurrency(inv.offen)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1">
              {lieferantenFiltered.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-12">Keine offenen Lieferantenrechnungen.</p>
              )}
              {lieferantenFiltered.map((g) => {
                const isOpen = expanded[g.vendor.id];
                return (
                  <div key={g.vendor.id}>
                    <button
                      className="flex items-center w-full py-3 px-2 hover:bg-gray-50 rounded-lg transition-colors text-left"
                      onClick={() => toggleExpand(g.vendor.id)}
                    >
                      {isOpen
                        ? <ChevronDown className="h-4 w-4 text-gray-500 mr-2 shrink-0" />
                        : <ChevronRight className="h-4 w-4 text-gray-500 mr-2 shrink-0" />}
                      <span className="text-sm font-semibold text-gray-900">
                        {g.vendor.name}
                      </span>
                      <span className="ml-auto text-sm font-semibold text-gray-900">
                        {formatCurrency(g.total)}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="ml-6 mb-4">
                        <table className="w-full">
                          <thead>
                            <tr className="text-xs text-gray-400 border-b">
                              <th className="text-left py-1.5 pr-4 font-medium">Rechnungs-Nr.</th>
                              <th className="text-left py-1.5 pr-4 font-medium">Datum</th>
                              <th className="text-left py-1.5 pr-4 font-medium">Gesamtbetrag</th>
                              <th className="text-left py-1.5 pr-4 font-medium">Fällig am</th>
                              <th className="text-left py-1.5 pr-4 font-medium">Zahldatum</th>
                              <th className="text-right py-1.5 font-medium">Offen</th>
                            </tr>
                          </thead>
                          <tbody>
                            {g.invoices.map((inv) => (
                              <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                <td className="py-2 pr-4 text-sm text-[#9eb552] font-medium">{inv.referenceNo}</td>
                                <td className="py-2 pr-4 text-sm text-gray-600">{formatDate(inv.date)}</td>
                                <td className="py-2 pr-4 text-sm text-gray-600">{formatCurrency(inv.grossAmount)}</td>
                                <td className="py-2 pr-4 text-sm text-gray-600">{inv.dueDate ? formatDate(inv.dueDate) : "–"}</td>
                                <td className="py-2 pr-4 text-sm text-gray-400">{inv.paidDate ? formatDate(inv.paidDate) : ""}</td>
                                <td className="py-2 text-sm text-right font-medium text-gray-900">{formatCurrency(inv.offen)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Summary footer */}
          <div className="border-t pt-6 mt-8">
            <div className="flex flex-col items-end gap-2 text-sm">
              <div className="flex items-center gap-4">
                <span className="text-[#9eb552] font-medium">von Kunden insgesamt zu erhalten</span>
                <span className="font-bold text-lg text-gray-900 w-32 text-right">{formatCurrency(totalKunden)}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-500">an Lieferanten insgesamt zu zahlen</span>
                <span className="font-medium text-gray-700 w-32 text-right">{formatCurrency(totalLieferanten)}</span>
              </div>
              <div className="border-t pt-2 mt-1 flex items-center gap-4">
                <span className={`font-semibold ${nochZuErhalten >= 0 ? "text-[#9eb552]" : "text-red-600"}`}>
                  {nochZuErhalten >= 0 ? "noch insgesamt zu erhalten" : "noch insgesamt zu zahlen"}
                </span>
                <span className={`font-bold text-lg w-32 text-right ${nochZuErhalten >= 0 ? "text-[#9eb552]" : "text-red-600"}`}>
                  {formatCurrency(Math.abs(nochZuErhalten))}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
