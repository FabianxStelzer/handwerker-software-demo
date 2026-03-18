"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  RefreshCw, Plus, FileText, ChevronRight, Building2,
  Landmark, ArrowRight, Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LineChart } from "@/components/charts/line-chart";
import { formatCurrency } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

export default function BuchhaltungDashboardPage() {
  const searchParams = useSearchParams();
  const [overview, setOverview] = useState<any>(null);
  const [bankData, setBankData] = useState<any>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [valueMode, setValueMode] = useState<"brutto" | "netto">("brutto");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [institutionSearch, setInstitutionSearch] = useState("");
  const [connecting, setConnecting] = useState(false);

  async function load() {
    const [oRes, bRes] = await Promise.all([
      fetch(`/api/buchhaltung/uebersicht?year=${year}`),
      fetch("/api/banking"),
    ]);
    if (oRes.ok) setOverview(await oRes.json());
    if (bRes.ok) setBankData(await bRes.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, [year]);

  // Auto-sync after bank connection callback
  useEffect(() => {
    if (searchParams.get("bankConnected")) {
      handleSync();
    }
  }, [searchParams]);

  async function handleSync() {
    setSyncing(true);
    await fetch("/api/banking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sync" }),
    });
    await load();
    setSyncing(false);
  }

  async function loadInstitutions() {
    setConnectOpen(true);
    if (institutions.length > 0) return;
    try {
      const res = await fetch("/api/banking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "institutions" }),
      });
      if (res.ok) setInstitutions(await res.json());
    } catch {}
  }

  async function connectBank(inst: any) {
    setConnecting(true);
    try {
      const res = await fetch("/api/banking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "connect",
          institutionId: inst.id,
          institutionName: inst.name,
          institutionLogo: inst.logo,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.link) window.location.href = data.link;
      }
    } catch {}
    setConnecting(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const a = overview?.aufgaben || {};
  const ust = overview?.umsatzsteuer || {};
  const monthly = overview?.monthlyData || [];
  const accounts = bankData?.accounts || [];
  const totalBalance = accounts.reduce((s: number, acc: any) => s + acc.balanceAmount, 0);
  const einnahmenTotal = monthly.reduce((s: number, m: any) => s + (valueMode === "brutto" ? m.einnahmen : m.einnahmenNetto), 0);
  const ausgabenTotal = monthly.reduce((s: number, m: any) => s + (valueMode === "brutto" ? m.ausgaben : m.ausgabenNetto), 0);
  const differenz = einnahmenTotal - ausgabenTotal;

  const chartData = monthly.map((m: any, i: number) => ({
    label: MONTHS[i],
    value1: valueMode === "brutto" ? m.einnahmen : m.einnahmenNetto,
    value2: valueMode === "brutto" ? m.ausgaben : m.ausgabenNetto,
  }));

  const filteredInstitutions = institutions.filter((i: any) =>
    i.name.toLowerCase().includes(institutionSearch.toLowerCase())
  ).slice(0, 30);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Buchhaltung</h1>
        <div className="flex items-center gap-2">
          <Link href="/buchhaltung/belege">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />Neuen Beleg erfassen
            </Button>
          </Link>
          <Link href="/rechnungen">
            <Button size="sm" className="gap-1.5">
              <FileText className="h-4 w-4" />Neue Rechnung
            </Button>
          </Link>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* ── Left: Aufgaben ────────────────────── */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-900">Aufgaben</h2>
                <button onClick={load} className="text-gray-400 hover:text-gray-600"><RefreshCw className="h-3.5 w-3.5" /></button>
              </div>

              <div className="space-y-4">
                {/* Finanzen */}
                {a.bankTxUnassigned > 0 && (
                  <div className="border-b pb-3">
                    <p className="text-xs font-semibold text-gray-500 mb-1">Finanzen</p>
                    <Link href="/buchhaltung/belege" className="text-xs text-blue-600 hover:underline">
                      {a.bankTxUnassigned} Kontoumsätze jetzt zuordnen
                    </Link>
                  </div>
                )}

                {/* Einnahmen */}
                <div className="border-b pb-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-gray-500">Einnahmen</p>
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(a.offeneRechnungenSumme || 0)}</p>
                  </div>
                  <p className="text-xs text-gray-600">{a.offeneRechnungen || 0} offene Posten</p>
                  {a.ueberfaelligeRechnungen > 0 && (
                    <Link href="/rechnungen" className="text-xs text-red-600 hover:underline">
                      {a.ueberfaelligeRechnungen} überfällige Rechnungen
                    </Link>
                  )}
                </div>

                {/* Ausgaben */}
                <div className="border-b pb-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-gray-500">Ausgaben</p>
                  </div>
                  <p className="text-xs text-gray-600">{a.offeneEingangsrechnungen || 0} offene Posten</p>
                </div>

                {/* Angebote */}
                <div className="border-b pb-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-gray-500">Angebote</p>
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(a.offeneAngeboteSumme || 0)}</p>
                  </div>
                  <p className="text-xs text-gray-600">{a.offeneAngebote || 0} offene Angebote</p>
                  {a.ueberfaelligeAngebote > 0 && (
                    <Link href="/buchhaltung/belege" className="text-xs text-red-600 hover:underline">
                      {a.ueberfaelligeAngebote} überfällige Angebote
                    </Link>
                  )}
                </div>

                {/* Belege */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Belege</p>
                  <Link href="/buchhaltung/belege" className="text-xs text-gray-600 hover:underline">
                    {(a.offeneRechnungen || 0) + (a.offeneEingangsrechnungen || 0)} Belege zu prüfen
                  </Link>
                </div>

                {/* Buchungen */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Buchungen</p>
                  <Link href="/buchhaltung/uebersicht" className="text-xs text-blue-600 hover:underline">
                    Ausgaben erfassen und verwalten
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Middle: Finanzen ──────────────────── */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-gray-900">Finanzen</h2>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="text-gray-400 hover:text-gray-600"
                    title="Konten synchronisieren"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Gesamtkontostand */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gesamtkontostand</p>
                <div className="flex items-center gap-1">
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(totalBalance)}</p>
                  <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                </div>
              </div>

              {/* Bankkonten */}
              {accounts.length > 0 ? (
                <div className="space-y-3 mb-4">
                  {accounts.map((acc: any) => (
                    <div key={acc.id} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full shrink-0" style={{ backgroundColor: "#354360" }}>
                        {acc.connection?.institutionLogo ? (
                          <img src={acc.connection.institutionLogo} alt="" className="h-5 w-5 rounded-full" />
                        ) : (
                          <Landmark className="h-4 w-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{acc.name}</p>
                        <p className="text-[10px] text-gray-400">{acc.connection?.institutionName || ""}</p>
                      </div>
                      <p className="text-xs font-bold text-gray-900">{formatCurrency(acc.balanceAmount)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 mb-4">
                  <Landmark className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">Noch keine Bankkonten verbunden</p>
                </div>
              )}

              <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs mb-4" onClick={loadInstitutions}>
                <Building2 className="h-3.5 w-3.5" />Bankkonto verbinden
              </Button>

              {/* USt-Voranmeldung */}
              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-gray-900">Umsatzsteuer-Voranmeldung</h3>
                  <button onClick={load} className="text-gray-400 hover:text-gray-600"><RefreshCw className="h-3 w-3" /></button>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Nächste Meldung</span>
                  <span>{ust.naechsteMeldung || "–"}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                  <span>Überschuss</span>
                  <span className={ust.ueberschuss >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                    {formatCurrency(ust.ueberschuss || 0)}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400">Für Jahresmelder sieht das Finanzamt keine Umsatzsteuer-Voranmeldung vor.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right: Übersicht ─────────────────── */}
        <div className="lg:col-span-6">
          <Card>
            <CardContent className="p-4">
              <h2 className="text-sm font-bold text-gray-900 mb-3">Übersicht</h2>

              {/* Summary numbers */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <p className="text-xs text-gray-500">Einnahmen</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(einnahmenTotal)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <p className="text-xs text-gray-500">Ausgaben</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(ausgabenTotal)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-1">Differenz</p>
                  <p className={`text-lg font-bold ${differenz >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(differenz)}
                  </p>
                </div>
              </div>

              {/* Chart */}
              <div className="mb-4">
                <LineChart
                  data={chartData}
                  height={200}
                  color1="#16a34a"
                  color2="#dc2626"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center justify-center gap-3 border-t pt-3">
                <NativeSelect
                  value={valueMode}
                  onChange={(e) => setValueMode(e.target.value as "brutto" | "netto")}
                  className="text-xs h-8 w-auto"
                >
                  <option value="brutto">Nach Belegdatum (Bruttowerte)</option>
                  <option value="netto">Nach Belegdatum (Nettowerte)</option>
                </NativeSelect>
                <NativeSelect
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="text-xs h-8 w-auto"
                >
                  {[year - 2, year - 1, year, year + 1].map((y) => (
                    <option key={y} value={y}>{y === new Date().getFullYear() ? "Aktuelles Jahr" : y}</option>
                  ))}
                </NativeSelect>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bank connection dialog */}
      <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Bankkonto verbinden</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">Wähle deine Bank aus der Liste. Du wirst zur Authentifizierung weitergeleitet.</p>
          <Input
            placeholder="Bank suchen..."
            value={institutionSearch}
            onChange={(e) => setInstitutionSearch(e.target.value)}
            className="mt-2"
          />
          <div className="flex-1 overflow-y-auto mt-2 space-y-1 min-h-[200px]">
            {institutions.length === 0 && (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              </div>
            )}
            {filteredInstitutions.map((inst: any) => (
              <button
                key={inst.id}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 text-left transition-colors"
                onClick={() => connectBank(inst)}
                disabled={connecting}
              >
                {inst.logo ? (
                  <img src={inst.logo} alt="" className="h-8 w-8 rounded-lg object-contain border p-0.5" />
                ) : (
                  <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Landmark className="h-4 w-4 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{inst.name}</p>
                  {inst.bic && <p className="text-xs text-gray-400">{inst.bic}</p>}
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
