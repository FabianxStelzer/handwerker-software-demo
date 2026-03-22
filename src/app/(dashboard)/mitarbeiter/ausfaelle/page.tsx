"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trophy, TrendingDown, Calendar, HeartPulse, Trash2, User, AlertTriangle } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translations";

function getTypeLabels(t: (key: TranslationKey) => string): Record<string, string> {
  return {
    KRANKHEIT: t("ausfaelle.krankheit"),
    UNFALL_ARBEIT: "Arbeitsunfall",
    UNFALL_PRIVAT: "Privatunfall",
    KIND_KRANK: "Kind krank",
    ARZTBESUCH: "Arztbesuch",
    REHA: "Reha",
    QUARANTAENE: t("ausfaelle.quarantaene"),
    SONSTIGES: t("ausfaelle.sonstiges"),
  };
}

const TYPE_COLORS: Record<string, string> = {
  KRANKHEIT: "bg-red-100 text-red-700", UNFALL_ARBEIT: "bg-orange-100 text-orange-700",
  UNFALL_PRIVAT: "bg-amber-100 text-amber-700", KIND_KRANK: "bg-purple-100 text-purple-700",
  ARZTBESUCH: "bg-blue-100 text-blue-700", REHA: "bg-teal-100 text-teal-700",
  QUARANTAENE: "bg-gray-100 text-gray-700", SONSTIGES: "bg-gray-100 text-gray-500",
};

function formatDate(d: string | null) {
  if (!d) return "–";
  return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function AusfaellePage() {
  const { t } = useTranslation();
  const typeLabels = useMemo(() => getTypeLabels(t), [t]);
  const MONTHS_T = useMemo(
    () => [
      t("monat.jan"), t("monat.feb"), t("monat.mar"), t("monat.apr"),
      t("monat.maiK"), t("monat.jun"), t("monat.jul"), t("monat.aug"),
      t("monat.sep"), t("monat.okt"), t("monat.nov"), t("monat.dez"),
    ],
    [t],
  );

  const [data, setData] = useState<{ absences: any[]; employees: any[] }>({ absences: [], employees: [] });
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterEmployee, setFilterEmployee] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const res = await fetch("/api/ausfaelle");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    await fetch("/api/ausfaelle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...Object.fromEntries(fd.entries()), hasAttest: fd.get("hasAttest") === "on" }),
    });
    setSaving(false);
    setCreateOpen(false);
    load();
  }

  async function deleteAbsence(id: string) {
    if (!confirm(t("ausfaelle.loeschen"))) return;
    await fetch(`/api/ausfaelle/${id}`, { method: "DELETE" });
    load();
  }

  const stats = useMemo(() => {
    const yearAbsences = data.absences.filter((a) => new Date(a.startDate).getFullYear() === filterYear);
    const totalDays = yearAbsences.reduce((s, a) => s + a.days, 0);
    const avgDays = data.employees.length > 0 ? Math.round(totalDays / data.employees.length * 10) / 10 : 0;

    // By type
    const byType: Record<string, number> = {};
    for (const a of yearAbsences) {
      byType[a.type] = (byType[a.type] || 0) + a.days;
    }
    const topType = Object.entries(byType).sort(([, a], [, b]) => b - a)[0];

    // By month
    const byMonth = Array.from({ length: 12 }, () => 0);
    for (const a of yearAbsences) {
      const m = new Date(a.startDate).getMonth();
      byMonth[m] += a.days;
    }
    const peakMonth = byMonth.indexOf(Math.max(...byMonth));
    const maxMonthVal = Math.max(...byMonth, 1);

    // Per employee
    const empStats: Record<string, { days: number; count: number; name: string }> = {};
    for (const emp of data.employees) {
      empStats[emp.id] = { days: 0, count: 0, name: `${emp.firstName} ${emp.lastName}` };
    }
    for (const a of yearAbsences) {
      if (empStats[a.userId]) {
        empStats[a.userId].days += a.days;
        empStats[a.userId].count += 1;
      }
    }

    // Awards: 0 sick days (whole years)
    const awards: { name: string; years: number }[] = [];
    for (const emp of data.employees) {
      const empAbsences = data.absences.filter((a) => a.userId === emp.id);
      const hireYear = emp.hireDate ? new Date(emp.hireDate).getFullYear() : filterYear;
      let streakYears = 0;
      for (let y = filterYear; y >= hireYear; y--) {
        const yearA = empAbsences.filter((a: any) => new Date(a.startDate).getFullYear() === y);
        if (yearA.length === 0) streakYears++;
        else break;
      }
      if (streakYears >= 1) awards.push({ name: `${emp.firstName} ${emp.lastName}`, years: streakYears });
    }
    awards.sort((a, b) => b.years - a.years);

    const accidents = yearAbsences.filter((a) => a.type === "UNFALL_ARBEIT" || a.type === "UNFALL_PRIVAT");

    return { totalDays, avgDays, byType, topType, byMonth, peakMonth, maxMonthVal, empStats, awards, accidents, yearAbsences };
  }, [data, filterYear]);

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#9eb552] border-t-transparent" /></div>;

  const years = Array.from(new Set(data.absences.map((a) => new Date(a.startDate).getFullYear()).concat(new Date().getFullYear()))).sort((a, b) => b - a);

  const filteredAbsences = stats.yearAbsences.filter((a: any) => !filterEmployee || a.userId === filterEmployee).sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("ausfaelle.title")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("ausfaelle.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <NativeSelect value={filterYear} onChange={(e) => setFilterYear(parseInt(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </NativeSelect>
          <Button className="bg-[#9eb552] hover:bg-[#8da348] text-white" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />Ausfall eintragen
          </Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-[10px] text-gray-400 uppercase font-medium">Ausfalltage {filterYear}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalDays}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] text-gray-400 uppercase font-medium">Ø pro Mitarbeiter</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.avgDays} Tage</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] text-gray-400 uppercase font-medium">{t("ausfaelle.haeufigsterGrund")}</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{stats.topType ? typeLabels[stats.topType[0]] : "–"}</p>
          {stats.topType && <p className="text-xs text-gray-400">{stats.topType[1]} Tage</p>}
        </Card>
        <Card className="p-4">
          <p className="text-[10px] text-gray-400 uppercase font-medium flex items-center gap-1">{t("ausfaelle.unfaelle")} <AlertTriangle className="h-3 w-3 text-orange-500" /></p>
          <p className={`text-2xl font-bold mt-1 ${stats.accidents.length > 0 ? "text-orange-600" : "text-gray-900"}`}>{stats.accidents.length}</p>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Distribution */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">{t("ausfaelle.nachMonat")}</h3>
            <div className="flex items-end gap-1.5 h-32">
              {stats.byMonth.map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t" style={{ height: `${(val / stats.maxMonthVal) * 100}%`, minHeight: val > 0 ? 4 : 0, backgroundColor: i === stats.peakMonth && val > 0 ? "#ef4444" : "#9eb552" }} />
                  <span className="text-[10px] text-gray-400">{MONTHS_T[i]}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">Meiste Ausfälle im <strong>{MONTHS_T[stats.peakMonth]}</strong></p>
          </CardContent>
        </Card>

        {/* By Type */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Ausfälle nach Grund</h3>
            <div className="space-y-2">
              {Object.entries(stats.byType).sort(([, a], [, b]) => (b as number) - (a as number)).map(([type, days]) => (
                <div key={type} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-28 shrink-0">{typeLabels[type] || type}</span>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#9eb552]" style={{ width: `${((days as number) / stats.totalDays) * 100}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-900 w-12 text-right">{days as number} T.</span>
                </div>
              ))}
              {Object.keys(stats.byType).length === 0 && <p className="text-sm text-gray-400 text-center py-4">Keine Ausfälle in {filterYear}</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per Employee Stats */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Ausfälle pro Mitarbeiter</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b">
                <th className="text-left py-2 text-xs text-gray-500 font-medium">{t("common.mitarbeiter")}</th>
                <th className="text-right py-2 text-xs text-gray-500 font-medium">{t("ausfaelle.title")}</th>
                <th className="text-right py-2 text-xs text-gray-500 font-medium">Tage</th>
                <th className="text-right py-2 text-xs text-gray-500 font-medium">Ø Dauer</th>
                <th className="py-2 text-xs text-gray-500 font-medium w-48"></th>
              </tr></thead>
              <tbody>
                {Object.entries(stats.empStats).sort(([, a], [, b]) => (b as any).days - (a as any).days).map(([empId, s]) => (
                  <tr key={empId} className="border-b border-gray-50">
                    <td className="py-2 text-gray-900 font-medium">{(s as any).name}</td>
                    <td className="py-2 text-right text-gray-600">{(s as any).count}</td>
                    <td className="py-2 text-right text-gray-900 font-semibold">{(s as any).days}</td>
                    <td className="py-2 text-right text-gray-600">{(s as any).count > 0 ? Math.round((s as any).days / (s as any).count * 10) / 10 : 0} T.</td>
                    <td className="py-2">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${stats.totalDays > 0 ? ((s as any).days / stats.totalDays) * 100 : 0}%`, backgroundColor: (s as any).days > stats.avgDays ? "#ef4444" : "#9eb552" }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Awards */}
      {stats.awards.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" /> Auszeichnungen – Kein Ausfall
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats.awards.map((a, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white border border-amber-100">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600 shrink-0">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{a.name}</p>
                    <p className="text-xs text-amber-600">{a.years} {a.years === 1 ? "Jahr" : "Jahre"} ohne Ausfall</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Absence List */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900">Alle Ausfälle {filterYear}</h3>
            <NativeSelect value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)}>
              <option value="">{`${t("common.alle")} ${t("common.mitarbeiter")}`}</option>
              {data.employees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
            </NativeSelect>
          </div>
          {filteredAbsences.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Keine Ausfälle in {filterYear}</p>
          ) : (
            <div className="divide-y">
              {filteredAbsences.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 text-xs font-bold shrink-0">
                      {a.user.firstName[0]}{a.user.lastName[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{a.user.firstName} {a.user.lastName}</p>
                      <p className="text-xs text-gray-500">{formatDate(a.startDate)} – {formatDate(a.endDate)} ({a.days} {a.days === 1 ? "Tag" : "Tage"})</p>
                      {a.reason && <p className="text-xs text-gray-400 mt-0.5">{a.reason}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={TYPE_COLORS[a.type]}>{typeLabels[a.type]}</Badge>
                    {a.hasAttest && <Badge variant="outline" className="text-[10px]">Attest</Badge>}
                    <button onClick={() => deleteAbsence(a.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Ausfall eintragen</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{`${t("common.mitarbeiter")} *`}</label>
              <NativeSelect name="userId" required>
                <option value="">{t("common.auswaehlen")}</option>
                {data.employees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
              </NativeSelect>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Art *</label>
              <NativeSelect name="type" required>
                {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </NativeSelect>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">{`${t("common.von")} *`}</label><Input type="date" name="startDate" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">{`${t("common.bis")} *`}</label><Input type="date" name="endDate" required /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Grund</label><Input name="reason" placeholder="z. B. Grippe, Bandscheibe..." /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("common.notizen")}</label><Textarea name="notes" rows={2} /></div>
            <label className="flex items-center gap-2"><input type="checkbox" name="hasAttest" className="h-4 w-4 accent-[#354360] rounded" /><span className="text-sm text-gray-700">Ärztliches Attest vorhanden</span></label>
            <Button type="submit" disabled={saving} className="w-full bg-[#9eb552] hover:bg-[#8da348] text-white">{saving ? `${t("common.speichern")}...` : "Ausfall eintragen"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
