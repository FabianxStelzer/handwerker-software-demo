"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, AlertTriangle, CheckCircle2, Clock, GraduationCap, Trash2, Pencil } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

function formatDate(d: string | null) {
  if (!d) return "–";
  return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function SchulungenPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<{ types: any[]; employees: any[] }>({ types: [], employees: [] });
  const [loading, setLoading] = useState(true);
  const [createTypeOpen, setCreateTypeOpen] = useState(false);
  const [addRecordOpen, setAddRecordOpen] = useState<string | null>(null);
  const [editTypeId, setEditTypeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"types" | "matrix">("types");

  useEffect(() => { load(); }, []);

  async function load() {
    const res = await fetch("/api/schulungen");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  async function handleCreateType(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    await fetch("/api/schulungen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "createType", ...Object.fromEntries(fd.entries()), isRequired: fd.get("isRequired") === "on" }),
    });
    setSaving(false);
    setCreateTypeOpen(false);
    load();
  }

  async function handleEditType(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editTypeId) return;
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    await fetch(`/api/schulungen/${editTypeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "updateType", ...Object.fromEntries(fd.entries()), isRequired: fd.get("isRequired") === "on" }),
    });
    setSaving(false);
    setEditTypeId(null);
    load();
  }

  async function handleAddRecord(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!addRecordOpen) return;
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    await fetch("/api/schulungen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "addRecord", trainingTypeId: addRecordOpen, ...Object.fromEntries(fd.entries()) }),
    });
    setSaving(false);
    setAddRecordOpen(null);
    load();
  }

  async function deleteType(id: string) {
    if (!confirm(t("schulungen.loeschen"))) return;
    await fetch(`/api/schulungen/${id}`, { method: "DELETE" });
    load();
  }

  const stats = useMemo(() => {
    const now = new Date();
    let overdueCount = 0;
    let soonCount = 0;
    const soon = new Date(); soon.setMonth(soon.getMonth() + 1);

    for (const trainingType of data.types) {
      for (const emp of data.employees) {
        const latest = trainingType.records.filter((r: any) => r.userId === emp.id).sort((a: any, b: any) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];
        if (latest?.expiresAt) {
          const exp = new Date(latest.expiresAt);
          if (exp < now) overdueCount++;
          else if (exp < soon) soonCount++;
        } else if (trainingType.isRequired) {
          const hasAny = trainingType.records.some((r: any) => r.userId === emp.id);
          if (!hasAny) overdueCount++;
        }
      }
    }
    return { overdueCount, soonCount, totalTypes: data.types.length, totalRecords: data.types.reduce((s: number, trainingType: any) => s + trainingType.records.length, 0) };
  }, [data]);

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#9eb552] border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("schulungen.title")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("schulungen.subtitle")}</p>
        </div>
        <Button className="bg-[#9eb552] hover:bg-[#8da348] text-white" onClick={() => setCreateTypeOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />{t("schulungen.neueSchulung")}
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4"><p className="text-[10px] text-gray-400 uppercase font-medium">Schulungstypen</p><p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalTypes}</p></Card>
        <Card className="p-4"><p className="text-[10px] text-gray-400 uppercase font-medium">Nachweise gesamt</p><p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalRecords}</p></Card>
        <Card className="p-4"><p className="text-[10px] text-gray-400 uppercase font-medium flex items-center gap-1">Überfällig {stats.overdueCount > 0 && <AlertTriangle className="h-3 w-3 text-red-500" />}</p><p className={`text-2xl font-bold mt-1 ${stats.overdueCount > 0 ? "text-red-600" : "text-gray-900"}`}>{stats.overdueCount}</p></Card>
        <Card className="p-4"><p className="text-[10px] text-gray-400 uppercase font-medium">Bald fällig (30 Tage)</p><p className={`text-2xl font-bold mt-1 ${stats.soonCount > 0 ? "text-amber-600" : "text-gray-900"}`}>{stats.soonCount}</p></Card>
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-0 border-b border-gray-200">
        {(["types", "matrix"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={`px-5 py-2.5 text-xs font-bold tracking-wide border-b-2 transition-colors ${view === v ? "border-[#9eb552] text-[#9eb552]" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {v === "types" ? "SCHULUNGSTYPEN" : "MITARBEITER-MATRIX"}
          </button>
        ))}
      </div>

      {view === "types" && (
        <div className="space-y-4">
          {data.types.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-gray-500">Noch keine Schulungen angelegt</CardContent></Card>
          ) : data.types.map((trainingType) => {
            const now = new Date();
            return (
              <Card key={trainingType.id}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-[#9eb552]" />
                      <h3 className="text-base font-bold text-gray-900">{trainingType.name}</h3>
                      {trainingType.isRequired && <Badge className="bg-red-50 text-red-600 text-[10px]">{t("common.pflichtfeld")}</Badge>}
                      {trainingType.intervalMonths && <Badge variant="outline" className="text-[10px]">{t("schulungen.alleMonate").replace("{n}", String(trainingType.intervalMonths))}</Badge>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setAddRecordOpen(trainingType.id)} className="text-[#9eb552]"><Plus className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditTypeId(trainingType.id)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteType(trainingType.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  {trainingType.description && <p className="text-sm text-gray-500 mb-3">{trainingType.description}</p>}

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 text-xs text-gray-500 font-medium">{t("common.mitarbeiter")}</th>
                          <th className="text-left py-2 text-xs text-gray-500 font-medium">{t("schulungen.datumSchulung")}</th>
                          <th className="text-left py-2 text-xs text-gray-500 font-medium">Gültig bis</th>
                          <th className="text-left py-2 text-xs text-gray-500 font-medium">{t("common.status")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.employees.map((emp) => {
                          const records = trainingType.records.filter((r: any) => r.userId === emp.id).sort((a: any, b: any) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
                          const latest = records[0];
                          const expires = latest?.expiresAt ? new Date(latest.expiresAt) : null;
                          const isExpired = expires && expires < now;
                          const isSoon = expires && !isExpired && expires < new Date(now.getTime() + 30 * 86400000);
                          const noRecord = !latest && trainingType.isRequired;

                          return (
                            <tr key={emp.id} className="border-b border-gray-50">
                              <td className="py-2 text-gray-900">{emp.firstName} {emp.lastName}</td>
                              <td className="py-2 text-gray-600">{latest ? formatDate(latest.completedAt) : "–"}</td>
                              <td className="py-2 text-gray-600">{expires ? formatDate(latest.expiresAt) : latest ? "Unbegrenzt" : "–"}</td>
                              <td className="py-2">
                                {isExpired || noRecord ? (
                                  <Badge className="bg-red-100 text-red-700 text-[10px]"><AlertTriangle className="h-3 w-3 mr-0.5" />{noRecord ? "Fehlt" : "Abgelaufen"}</Badge>
                                ) : isSoon ? (
                                  <Badge className="bg-amber-100 text-amber-700 text-[10px]"><Clock className="h-3 w-3 mr-0.5" />Bald fällig</Badge>
                                ) : latest ? (
                                  <Badge className="bg-green-100 text-green-700 text-[10px]"><CheckCircle2 className="h-3 w-3 mr-0.5" />Gültig</Badge>
                                ) : (
                                  <span className="text-xs text-gray-400">–</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {view === "matrix" && (
        <Card>
          <CardContent className="p-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-xs text-gray-500 font-medium sticky left-0 bg-white">{t("common.mitarbeiter")}</th>
                  {data.types.map((trainingType) => (
                    <th key={trainingType.id} className="text-center py-2 text-xs text-gray-500 font-medium px-3 min-w-[120px]">{trainingType.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.employees.map((emp) => (
                  <tr key={emp.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-900 font-medium sticky left-0 bg-white">{emp.firstName} {emp.lastName}</td>
                    {data.types.map((trainingType) => {
                      const now = new Date();
                      const records = trainingType.records.filter((r: any) => r.userId === emp.id);
                      const latest = records.sort((a: any, b: any) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];
                      const expires = latest?.expiresAt ? new Date(latest.expiresAt) : null;
                      const isExpired = expires && expires < now;
                      const noRecord = !latest && trainingType.isRequired;

                      return (
                        <td key={trainingType.id} className="py-2 text-center px-3">
                          {isExpired || noRecord ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600"><AlertTriangle className="h-3 w-3" /></span>
                          ) : latest ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600"><CheckCircle2 className="h-3 w-3" /></span>
                          ) : (
                            <span className="text-gray-300">–</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Create Type Dialog */}
      <Dialog open={createTypeOpen} onOpenChange={setCreateTypeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t("schulungen.neueSchulung")}</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateType} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Bezeichnung *</label><Input name="name" required placeholder="z. B. Absturzsicherung" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("common.beschreibung")}</label><Textarea name="description" rows={2} placeholder="Zusätzliche Informationen..." /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("schulungen.intervall")}</label><Input type="number" name="intervalMonths" placeholder="z. B. 24 für alle 2 Jahre" /></div>
            <label className="flex items-center gap-2"><input type="checkbox" name="isRequired" defaultChecked className="h-4 w-4 accent-[#354360] rounded" /><span className="text-sm text-gray-700">Pflichtschulung</span></label>
            <Button type="submit" disabled={saving} className="w-full bg-[#9eb552] hover:bg-[#8da348] text-white">{saving ? `${t("schulungen.neueSchulung")}…` : t("schulungen.neueSchulung")}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Type Dialog */}
      <Dialog open={!!editTypeId} onOpenChange={() => setEditTypeId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Schulung bearbeiten</DialogTitle></DialogHeader>
          {editTypeId && (() => {
            const editingType = data.types.find((x) => x.id === editTypeId);
            if (!editingType) return null;
            return (
              <form onSubmit={handleEditType} className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Bezeichnung *</label><Input name="name" required defaultValue={editingType.name} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("common.beschreibung")}</label><Textarea name="description" rows={2} defaultValue={editingType.description || ""} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("schulungen.intervall")}</label><Input type="number" name="intervalMonths" defaultValue={editingType.intervalMonths || ""} /></div>
                <label className="flex items-center gap-2"><input type="checkbox" name="isRequired" defaultChecked={editingType.isRequired} className="h-4 w-4 accent-[#354360] rounded" /><span className="text-sm text-gray-700">Pflichtschulung</span></label>
                <Button type="submit" disabled={saving} className="w-full bg-[#9eb552] hover:bg-[#8da348] text-white">{saving ? `${t("common.speichern")}…` : t("common.speichern")}</Button>
              </form>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Add Record Dialog */}
      <Dialog open={!!addRecordOpen} onOpenChange={() => setAddRecordOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Schulungsnachweis eintragen</DialogTitle></DialogHeader>
          <form onSubmit={handleAddRecord} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{`${t("common.mitarbeiter")} *`}</label>
              <NativeSelect name="userId" required>
                <option value="">{t("common.auswaehlen")}</option>
                {data.employees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
              </NativeSelect>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{`${t("schulungen.datumSchulung")} *`}</label><Input type="date" name="completedAt" required defaultValue={new Date().toISOString().split("T")[0]} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Schulungsleiter</label><Input name="instructor" placeholder="Name des Schulungsleiters" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Zertifikat-Nr.</label><Input name="certificate" placeholder="Falls vorhanden" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("common.notizen")}</label><Textarea name="notes" rows={2} /></div>
            <Button type="submit" disabled={saving} className="w-full bg-[#9eb552] hover:bg-[#8da348] text-white">{saving ? `${t("common.speichern")}…` : t("schulungen.nachweis")}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
