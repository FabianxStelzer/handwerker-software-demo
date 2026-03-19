"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus, Search, Drill, User, Calendar, AlertTriangle, CheckCircle2,
  ArrowLeft, Trash2, RotateCcw, ClipboardCheck, X,
} from "lucide-react";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  VERFUEGBAR: { label: "Verfügbar", color: "bg-green-100 text-green-700" },
  ZUGEWIESEN: { label: "Zugewiesen", color: "bg-blue-100 text-blue-700" },
  IN_REPARATUR: { label: "In Reparatur", color: "bg-amber-100 text-amber-700" },
  AUSGEMUSTERT: { label: "Ausgemustert", color: "bg-gray-100 text-gray-500" },
};

const CATEGORIES = [
  "Bohrmaschine", "Bohrhammer", "Flex/Winkelschleifer", "Stichsäge", "Kreissäge",
  "Akkuschrauber", "Schlagbohrmaschine", "Meißelhammer", "Kompressor",
  "Schweißgerät", "Messgerät", "Laser", "Stativ", "Leiter/Gerüst",
  "Handwerkzeug", "Sonstige",
];

function formatDate(d: string | null) {
  if (!d) return "–";
  return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v);
}

export default function WerkzeugePage() {
  const [tools, setTools] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [detailTool, setDetailTool] = useState<any>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [inspectOpen, setInspectOpen] = useState(false);

  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTools();
    fetch("/api/mitarbeiter").then((r) => r.json()).then(setEmployees).catch(() => {});
  }, []);

  async function loadTools() {
    const res = await fetch("/api/werkzeuge");
    if (res.ok) setTools(await res.json());
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries());
    await fetch("/api/werkzeuge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    setCreateOpen(false);
    loadTools();
  }

  async function openDetail(toolId: string) {
    const res = await fetch(`/api/werkzeuge/${toolId}`);
    if (res.ok) setDetailTool(await res.json());
  }

  async function handleAssign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    await fetch(`/api/werkzeuge/${detailTool.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "assign", userId: fd.get("userId"), notes: fd.get("notes") }),
    });
    setSaving(false);
    setAssignOpen(false);
    await openDetail(detailTool.id);
    loadTools();
  }

  async function handleReturn() {
    await fetch(`/api/werkzeuge/${detailTool.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "return" }),
    });
    await openDetail(detailTool.id);
    loadTools();
  }

  async function handleInspect(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries());
    await fetch(`/api/werkzeuge/${detailTool.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "inspect", ...data }),
    });
    setSaving(false);
    setInspectOpen(false);
    await openDetail(detailTool.id);
    loadTools();
  }

  async function handleDelete(toolId: string) {
    if (!confirm("Werkzeug wirklich löschen?")) return;
    await fetch(`/api/werkzeuge/${toolId}`, { method: "DELETE" });
    setDetailTool(null);
    loadTools();
  }

  async function handleStatusChange(toolId: string, status: string) {
    await fetch(`/api/werkzeuge/${toolId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await openDetail(toolId);
    loadTools();
  }

  const filtered = tools.filter((t) => {
    const q = search.toLowerCase();
    if (q && !t.name.toLowerCase().includes(q) && !(t.serialNumber || "").toLowerCase().includes(q) && !(t.inventoryNumber || "").toLowerCase().includes(q) && !(t.manufacturer || "").toLowerCase().includes(q)) return false;
    if (filterCat && t.category !== filterCat) return false;
    if (filterStatus && t.status !== filterStatus) return false;
    return true;
  });

  const overdueCount = tools.filter((t) => t.nextInspection && new Date(t.nextInspection) < new Date()).length;
  const assignedCount = tools.filter((t) => t.status === "ZUGEWIESEN").length;

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#9eb552] border-t-transparent" /></div>;
  }

  // Detail View
  if (detailTool) {
    const currentAssignment = detailTool.assignments?.find((a: any) => !a.returnedAt);
    const isOverdue = detailTool.nextInspection && new Date(detailTool.nextInspection) < new Date();

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setDetailTool(null)} className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-2xl font-bold text-gray-900">{detailTool.name}</h1>
          <Badge className={STATUS_MAP[detailTool.status]?.color}>{STATUS_MAP[detailTool.status]?.label}</Badge>
        </div>

        <div className="flex gap-2 flex-wrap">
          {detailTool.status === "VERFUEGBAR" && (
            <Button size="sm" className="bg-[#9eb552] hover:bg-[#8da348] text-white" onClick={() => setAssignOpen(true)}>
              <User className="h-4 w-4 mr-1" />Zuweisen
            </Button>
          )}
          {detailTool.status === "ZUGEWIESEN" && (
            <Button size="sm" variant="outline" onClick={handleReturn}><RotateCcw className="h-4 w-4 mr-1" />Rückgabe</Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setInspectOpen(true)}><ClipboardCheck className="h-4 w-4 mr-1" />Prüfung eintragen</Button>
          {detailTool.status !== "IN_REPARATUR" && (
            <Button size="sm" variant="outline" onClick={() => handleStatusChange(detailTool.id, "IN_REPARATUR")}>In Reparatur</Button>
          )}
          {detailTool.status === "IN_REPARATUR" && (
            <Button size="sm" variant="outline" onClick={() => handleStatusChange(detailTool.id, "VERFUEGBAR")}>Reparatur beendet</Button>
          )}
          <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleDelete(detailTool.id)}>
            <Trash2 className="h-4 w-4 mr-1" />Löschen
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Stammdaten</h3>
              <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                <div><p className="text-[10px] text-gray-400 uppercase">Kategorie</p><p className="text-gray-900">{detailTool.category || "–"}</p></div>
                <div><p className="text-[10px] text-gray-400 uppercase">Hersteller</p><p className="text-gray-900">{detailTool.manufacturer || "–"}</p></div>
                <div><p className="text-[10px] text-gray-400 uppercase">Modell</p><p className="text-gray-900">{detailTool.model || "–"}</p></div>
                <div><p className="text-[10px] text-gray-400 uppercase">Seriennummer</p><p className="text-gray-900">{detailTool.serialNumber || "–"}</p></div>
                <div><p className="text-[10px] text-gray-400 uppercase">Inventarnummer</p><p className="text-gray-900">{detailTool.inventoryNumber || "–"}</p></div>
                <div><p className="text-[10px] text-gray-400 uppercase">Standort</p><p className="text-gray-900">{detailTool.location || "–"}</p></div>
                <div><p className="text-[10px] text-gray-400 uppercase">Kaufdatum</p><p className="text-gray-900">{formatDate(detailTool.purchaseDate)}</p></div>
                <div><p className="text-[10px] text-gray-400 uppercase">Kaufpreis</p><p className="text-gray-900">{detailTool.purchasePrice ? formatCurrency(detailTool.purchasePrice) : "–"}</p></div>
              </div>
              {detailTool.notes && <p className="text-sm text-gray-600 mt-3 whitespace-pre-wrap border-t pt-3">{detailTool.notes}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Prüfungen</h3>
              <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm mb-4">
                <div><p className="text-[10px] text-gray-400 uppercase">Prüfintervall</p><p className="text-gray-900">{detailTool.inspectionInterval ? `${detailTool.inspectionInterval} Monate` : "–"}</p></div>
                <div><p className="text-[10px] text-gray-400 uppercase">Letzte Prüfung</p><p className="text-gray-900">{formatDate(detailTool.lastInspection)}</p></div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase">Nächste Prüfung</p>
                  <p className={`text-gray-900 ${isOverdue ? "text-red-600 font-semibold" : ""}`}>
                    {formatDate(detailTool.nextInspection)} {isOverdue && "⚠ Überfällig"}
                  </p>
                </div>
              </div>

              {currentAssignment && (
                <div className="border-t pt-3">
                  <h4 className="text-sm font-bold text-gray-900 mb-2">Aktuelle Zuordnung</h4>
                  <p className="text-sm text-gray-700">
                    <User className="h-3.5 w-3.5 inline mr-1" />
                    {currentAssignment.user.firstName} {currentAssignment.user.lastName}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">seit {formatDate(currentAssignment.assignedAt)}</p>
                  {currentAssignment.notes && <p className="text-xs text-gray-500 mt-1">{currentAssignment.notes}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Zuweisungsverlauf */}
        {detailTool.assignments?.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Zuweisungsverlauf</h3>
              <div className="divide-y">
                {detailTool.assignments.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm text-gray-900">{a.user.firstName} {a.user.lastName}</p>
                      {a.notes && <p className="text-xs text-gray-500">{a.notes}</p>}
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <p>{formatDate(a.assignedAt)}{a.returnedAt ? ` – ${formatDate(a.returnedAt)}` : ""}</p>
                      {!a.returnedAt && <Badge className="bg-blue-100 text-blue-700 text-[10px]">Aktuell</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Prüfungsverlauf */}
        {detailTool.inspections?.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Prüfungsverlauf</h3>
              <div className="divide-y">
                {detailTool.inspections.map((ins: any) => (
                  <div key={ins.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm text-gray-900">{formatDate(ins.inspectionDate)}</p>
                      {ins.inspector && <p className="text-xs text-gray-500">Prüfer: {ins.inspector}</p>}
                      {ins.notes && <p className="text-xs text-gray-500">{ins.notes}</p>}
                    </div>
                    <Badge className={ins.result === "bestanden" ? "bg-green-100 text-green-700" : ins.result === "maengel" ? "bg-amber-100 text-amber-700" : ins.result === "nicht_bestanden" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}>
                      {ins.result === "bestanden" ? "Bestanden" : ins.result === "maengel" ? "Mängel" : ins.result === "nicht_bestanden" ? "Nicht bestanden" : "–"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Assign Dialog */}
        <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Werkzeug zuweisen</DialogTitle></DialogHeader>
            <form onSubmit={handleAssign} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mitarbeiter *</label>
                <NativeSelect name="userId" required>
                  <option value="">Auswählen...</option>
                  {employees.filter((e: any) => e.isActive !== false).map((e: any) => (
                    <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                  ))}
                </NativeSelect>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notiz</label>
                <Input name="notes" placeholder="z. B. Baustelle XY" />
              </div>
              <Button type="submit" disabled={saving} className="w-full bg-[#9eb552] hover:bg-[#8da348] text-white">
                {saving ? "Zuweisen..." : "Zuweisen"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Inspect Dialog */}
        <Dialog open={inspectOpen} onOpenChange={setInspectOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Prüfung eintragen</DialogTitle></DialogHeader>
            <form onSubmit={handleInspect} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                <Input type="date" name="inspectionDate" defaultValue={new Date().toISOString().split("T")[0]} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ergebnis *</label>
                <NativeSelect name="result" required>
                  <option value="">Auswählen...</option>
                  <option value="bestanden">Bestanden</option>
                  <option value="maengel">Mängel festgestellt</option>
                  <option value="nicht_bestanden">Nicht bestanden</option>
                </NativeSelect>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prüfer</label>
                <Input name="inspector" placeholder="Name des Prüfers" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Anmerkungen</label>
                <Textarea name="notes" rows={2} />
              </div>
              <Button type="submit" disabled={saving} className="w-full bg-[#9eb552] hover:bg-[#8da348] text-white">
                {saving ? "Speichern..." : "Prüfung speichern"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // List View
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Werkzeuge</h1>
          <p className="text-sm text-gray-500 mt-1">{tools.length} Werkzeuge verwaltet</p>
        </div>
        <Button className="bg-[#9eb552] hover:bg-[#8da348] text-white" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />Werkzeug anlegen
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Gesamt</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{tools.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Zugewiesen</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{assignedCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Verfügbar</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{tools.filter((t) => t.status === "VERFUEGBAR").length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1">
            Prüfung fällig {overdueCount > 0 && <AlertTriangle className="h-3 w-3 text-red-500" />}
          </p>
          <p className={`text-2xl font-bold mt-1 ${overdueCount > 0 ? "text-red-600" : "text-gray-900"}`}>{overdueCount}</p>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Suchen nach Name, Seriennummer, Hersteller..." className="pl-10" />
        </div>
        <NativeSelect value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
          <option value="">Alle Kategorien</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </NativeSelect>
        <NativeSelect value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Alle Status</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </NativeSelect>
      </div>

      {/* Werkzeug-Liste */}
      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-gray-500">{search || filterCat || filterStatus ? "Keine Werkzeuge gefunden" : "Noch keine Werkzeuge angelegt"}</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((t) => {
            const currentUser = t.assignments?.[0]?.user;
            const isOverdue = t.nextInspection && new Date(t.nextInspection) < new Date();
            return (
              <Card key={t.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openDetail(t.id)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                      <Drill className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{t.name}</p>
                        {t.inventoryNumber && <span className="text-xs text-gray-400">#{t.inventoryNumber}</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        {t.category && <span>{t.category}</span>}
                        {t.manufacturer && <span>{t.manufacturer}{t.model ? ` ${t.model}` : ""}</span>}
                        {currentUser && (
                          <span className="flex items-center gap-1 text-blue-600">
                            <User className="h-3 w-3" />{currentUser.firstName} {currentUser.lastName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isOverdue && (
                      <Badge className="bg-red-100 text-red-700 text-[10px]">
                        <AlertTriangle className="h-3 w-3 mr-0.5" />Prüfung fällig
                      </Badge>
                    )}
                    <Badge className={STATUS_MAP[t.status]?.color}>{STATUS_MAP[t.status]?.label}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Neues Werkzeug anlegen</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bezeichnung *</label>
              <Input name="name" required placeholder="z. B. Bosch Bohrhammer GBH 2-26" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                <NativeSelect name="category">
                  <option value="">Auswählen...</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </NativeSelect>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hersteller</label>
                <Input name="manufacturer" placeholder="z. B. Bosch, Makita, Hilti" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modell</label>
                <Input name="model" placeholder="Modellbezeichnung" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seriennummer</label>
                <Input name="serialNumber" placeholder="S/N" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Inventarnummer</label>
                <Input name="inventoryNumber" placeholder="INV-001" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Standort</label>
                <Input name="location" placeholder="z. B. Lager, Firmenwagen 1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kaufdatum</label>
                <Input type="date" name="purchaseDate" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kaufpreis (€)</label>
                <Input type="number" step="0.01" name="purchasePrice" placeholder="0,00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prüfintervall (Monate)</label>
                <Input type="number" name="inspectionInterval" placeholder="z. B. 12" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Letzte Prüfung</label>
                <Input type="date" name="lastInspection" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
              <Textarea name="notes" rows={2} placeholder="Zusätzliche Informationen..." />
            </div>
            <Button type="submit" disabled={saving} className="w-full bg-[#9eb552] hover:bg-[#8da348] text-white">
              {saving ? "Anlegen..." : "Werkzeug anlegen"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
