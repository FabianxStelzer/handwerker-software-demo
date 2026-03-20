"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/select";
import {
  Plus, Trash2, Edit2, Calendar, Users, Car, Building2,
  Flag, ChevronLeft, ChevronRight, Check, X, GripVertical,
  Milestone, AlertTriangle, Clock, CheckCircle2, Eye, EyeOff, Share2,
} from "lucide-react";

interface Phase {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  color: string | null;
  category: string | null;
  assignedTo: string | null;
  vehicleIds: string | null;
  subcontractor: string | null;
  isMilestone: boolean;
  status: string;
  sortOrder: number;
}

interface Employee { id: string; firstName: string; lastName: string; role: string }
interface Vehicle { id: string; licensePlate: string; brand: string; model: string }

interface Props {
  project: any;
  onUpdate?: () => void;
}

const categoryLabels: Record<string, string> = {
  EIGENBETRIEB: "Eigenbetrieb",
  SUBFIRMA: "Subfirma",
  BAUHERR: "Bauherr",
  MEILENSTEIN: "Meilenstein",
};

const categoryColors: Record<string, string> = {
  EIGENBETRIEB: "#3b82f6",
  SUBFIRMA: "#f59e0b",
  BAUHERR: "#8b5cf6",
  MEILENSTEIN: "#ef4444",
};

const statusLabels: Record<string, string> = {
  GEPLANT: "Geplant",
  IN_ARBEIT: "In Arbeit",
  ABGESCHLOSSEN: "Abgeschlossen",
  VERZOEGERT: "Verzögert",
};

const statusIcons: Record<string, typeof Clock> = {
  GEPLANT: Clock,
  IN_ARBEIT: Calendar,
  ABGESCHLOSSEN: CheckCircle2,
  VERZOEGERT: AlertTriangle,
};

const defaultColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

export function PlanungTab({ project }: Props) {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editPhase, setEditPhase] = useState<Phase | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"timeline" | "list">("timeline");
  const [showLegend, setShowLegend] = useState(true);

  const [form, setForm] = useState({
    title: "", description: "", startDate: "", endDate: "",
    color: defaultColors[0], category: "EIGENBETRIEB",
    assignedTo: [] as string[], vehicleIds: [] as string[],
    subcontractor: "", isMilestone: false, status: "GEPLANT",
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/projekte/${project.id}/planung`);
      if (res.ok) {
        const data = await res.json();
        setPhases(data.phases);
        setEmployees(data.employees);
        setVehicles(data.vehicles);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [project.id]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditPhase(null);
    const today = new Date().toISOString().slice(0, 10);
    setForm({
      title: "", description: "", startDate: today, endDate: "",
      color: defaultColors[phases.length % defaultColors.length],
      category: "EIGENBETRIEB", assignedTo: [], vehicleIds: [],
      subcontractor: "", isMilestone: false, status: "GEPLANT",
    });
    setShowDialog(true);
  };

  const openEdit = (phase: Phase) => {
    setEditPhase(phase);
    setForm({
      title: phase.title,
      description: phase.description || "",
      startDate: phase.startDate.slice(0, 10),
      endDate: phase.endDate ? phase.endDate.slice(0, 10) : "",
      color: phase.color || defaultColors[0],
      category: phase.category || "EIGENBETRIEB",
      assignedTo: phase.assignedTo ? phase.assignedTo.split(",") : [],
      vehicleIds: phase.vehicleIds ? phase.vehicleIds.split(",") : [],
      subcontractor: phase.subcontractor || "",
      isMilestone: phase.isMilestone,
      status: phase.status,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.startDate) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: form.title,
        description: form.description,
        startDate: form.startDate,
        endDate: form.endDate || null,
        color: form.color,
        category: form.category,
        assignedTo: form.assignedTo.length > 0 ? form.assignedTo.join(",") : null,
        vehicleIds: form.vehicleIds.length > 0 ? form.vehicleIds.join(",") : null,
        subcontractor: form.subcontractor || null,
        isMilestone: form.isMilestone,
        status: form.status,
      };
      if (editPhase) {
        body.action = "update";
        body.phaseId = editPhase.id;
        body.sortOrder = editPhase.sortOrder;
      }
      await fetch(`/api/projekte/${project.id}/planung`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await load();
      setShowDialog(false);
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (phaseId: string) => {
    if (!confirm("Phase wirklich löschen?")) return;
    await fetch(`/api/projekte/${project.id}/planung`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", phaseId }),
    });
    await load();
  };

  const handleStatusChange = async (phase: Phase, newStatus: string) => {
    await fetch(`/api/projekte/${project.id}/planung`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", phaseId: phase.id, ...phase, startDate: phase.startDate.slice(0, 10), endDate: phase.endDate?.slice(0, 10) || null, status: newStatus }),
    });
    await load();
  };

  const getEmployeeName = (id: string) => {
    const e = employees.find(e => e.id === id);
    return e ? `${e.firstName} ${e.lastName}` : id;
  };
  const getVehicleLabel = (id: string) => {
    const v = vehicles.find(v => v.id === id);
    return v ? `${v.licensePlate}` : id;
  };

  if (loading) return <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9eb552]" /></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode("timeline")} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === "timeline" ? "bg-[#9eb552] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            Zeitstrahl
          </button>
          <button onClick={() => setViewMode("list")} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === "list" ? "bg-[#9eb552] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            Liste
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowLegend(!showLegend)}>
            {showLegend ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
            Legende
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />Phase hinzufügen
          </Button>
        </div>
      </div>

      {/* Legende */}
      {showLegend && (
        <div className="flex flex-wrap items-center gap-4 px-3 py-2 bg-gray-50 rounded-lg text-xs">
          {Object.entries(categoryLabels).map(([key, label]) => (
            <span key={key} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ background: categoryColors[key] }} />
              {label}
            </span>
          ))}
          <span className="border-l pl-3 ml-1 flex items-center gap-1.5 text-gray-400">
            <Flag className="h-3 w-3" /> = Meilenstein
          </span>
        </div>
      )}

      {/* Statistik */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["GEPLANT", "IN_ARBEIT", "ABGESCHLOSSEN", "VERZOEGERT"] as const).map(s => {
          const Icon = statusIcons[s];
          const count = phases.filter(p => p.status === s).length;
          return (
            <div key={s} className="flex items-center gap-2 bg-white rounded-lg p-3 border">
              <Icon className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-900">{count}</span>
              <span className="text-xs text-gray-500">{statusLabels[s]}</span>
            </div>
          );
        })}
      </div>

      {/* Zeitstrahl */}
      {viewMode === "timeline" && phases.length > 0 && <TimelineChart phases={phases} getEmployeeName={getEmployeeName} getVehicleLabel={getVehicleLabel} onEdit={openEdit} onDelete={handleDelete} onStatusChange={handleStatusChange} />}
      {viewMode === "timeline" && phases.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Noch keine Planungsphasen angelegt</p>
            <p className="text-sm text-gray-400 mt-1">Erstellen Sie die erste Phase für den Projektzeitstrahl</p>
            <Button className="mt-4" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Erste Phase anlegen</Button>
          </CardContent>
        </Card>
      )}

      {/* Listenansicht */}
      {viewMode === "list" && (
        <div className="space-y-3">
          {phases.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">Noch keine Planungsphasen</p>
                <Button className="mt-4" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Phase anlegen</Button>
              </CardContent>
            </Card>
          ) : (
            phases.map(phase => {
              const assignedNames = phase.assignedTo ? phase.assignedTo.split(",").map(id => getEmployeeName(id.trim())) : [];
              const vehicleLabels = phase.vehicleIds ? phase.vehicleIds.split(",").map(id => getVehicleLabel(id.trim())) : [];
              const days = phase.endDate ? Math.ceil((new Date(phase.endDate).getTime() - new Date(phase.startDate).getTime()) / 86400000) + 1 : 1;
              return (
                <Card key={phase.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-1 rounded-full self-stretch" style={{ background: phase.color || categoryColors[phase.category || "EIGENBETRIEB"] }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {phase.isMilestone && <Flag className="h-3.5 w-3.5 text-red-500" />}
                          <h4 className="font-semibold text-gray-900">{phase.title}</h4>
                          <Badge className={`text-[10px] ${phase.status === "ABGESCHLOSSEN" ? "bg-green-100 text-green-700" : phase.status === "VERZOEGERT" ? "bg-red-100 text-red-700" : phase.status === "IN_ARBEIT" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                            {statusLabels[phase.status] || phase.status}
                          </Badge>
                          {phase.category && <Badge className="text-[10px] bg-gray-50 text-gray-500">{categoryLabels[phase.category] || phase.category}</Badge>}
                        </div>
                        {phase.description && <p className="text-sm text-gray-500 mt-0.5">{phase.description}</p>}
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDate(phase.startDate)}{phase.endDate && ` – ${fmtDate(phase.endDate)}`}</span>
                          <span>{days} {days === 1 ? "Tag" : "Tage"}</span>
                          {assignedNames.length > 0 && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{assignedNames.join(", ")}</span>}
                          {vehicleLabels.length > 0 && <span className="flex items-center gap-1"><Car className="h-3 w-3" />{vehicleLabels.join(", ")}</span>}
                          {phase.subcontractor && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{phase.subcontractor}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <NativeSelect value={phase.status} onChange={e => handleStatusChange(phase, e.target.value)} className="text-xs h-7 w-28">
                          <option value="GEPLANT">Geplant</option>
                          <option value="IN_ARBEIT">In Arbeit</option>
                          <option value="ABGESCHLOSSEN">Erledigt</option>
                          <option value="VERZOEGERT">Verzögert</option>
                        </NativeSelect>
                        <button onClick={() => openEdit(phase)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDelete(phase.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">{editPhase ? "Phase bearbeiten" : "Neue Phase anlegen"}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Titel *</label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="z.B. Bodenplatte, Rohbau, Dachstuhl..." />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Beschreibung</label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Startdatum *</label>
                  <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Enddatum</label>
                  <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Kategorie</label>
                  <NativeSelect value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    <option value="EIGENBETRIEB">Eigenbetrieb</option>
                    <option value="SUBFIRMA">Subfirma</option>
                    <option value="BAUHERR">Bauherr</option>
                    <option value="MEILENSTEIN">Meilenstein</option>
                  </NativeSelect>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Status</label>
                  <NativeSelect value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="GEPLANT">Geplant</option>
                    <option value="IN_ARBEIT">In Arbeit</option>
                    <option value="ABGESCHLOSSEN">Abgeschlossen</option>
                    <option value="VERZOEGERT">Verzögert</option>
                  </NativeSelect>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Farbe</label>
                <div className="flex gap-2 flex-wrap">
                  {defaultColors.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${form.color === c ? "border-gray-800 scale-110" : "border-transparent"}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Mitarbeiter zuordnen</label>
                <div className="flex flex-wrap gap-1.5 p-2 border rounded-lg min-h-[36px]">
                  {form.assignedTo.map(id => (
                    <span key={id} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs rounded-full px-2 py-0.5">
                      {getEmployeeName(id)}
                      <button onClick={() => setForm(f => ({ ...f, assignedTo: f.assignedTo.filter(x => x !== id) }))}><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                  <NativeSelect value="" onChange={e => { if (e.target.value && !form.assignedTo.includes(e.target.value)) setForm(f => ({ ...f, assignedTo: [...f.assignedTo, e.target.value] })); e.target.value = ""; }}
                    className="border-0 text-xs h-6 w-auto min-w-[120px] p-0">
                    <option value="">+ Hinzufügen</option>
                    {employees.filter(e => !form.assignedTo.includes(e.id)).map(e => (
                      <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                    ))}
                  </NativeSelect>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Fahrzeuge/Maschinen</label>
                <div className="flex flex-wrap gap-1.5 p-2 border rounded-lg min-h-[36px]">
                  {form.vehicleIds.map(id => (
                    <span key={id} className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-xs rounded-full px-2 py-0.5">
                      {getVehicleLabel(id)}
                      <button onClick={() => setForm(f => ({ ...f, vehicleIds: f.vehicleIds.filter(x => x !== id) }))}><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                  <NativeSelect value="" onChange={e => { if (e.target.value && !form.vehicleIds.includes(e.target.value)) setForm(f => ({ ...f, vehicleIds: [...f.vehicleIds, e.target.value] })); e.target.value = ""; }}
                    className="border-0 text-xs h-6 w-auto min-w-[120px] p-0">
                    <option value="">+ Hinzufügen</option>
                    {vehicles.filter(v => !form.vehicleIds.includes(v.id)).map(v => (
                      <option key={v.id} value={v.id}>{v.licensePlate} – {v.brand} {v.model}</option>
                    ))}
                  </NativeSelect>
                </div>
              </div>
              {(form.category === "SUBFIRMA" || form.subcontractor) && (
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Subfirma / Nachunternehmer</label>
                  <Input value={form.subcontractor} onChange={e => setForm(f => ({ ...f, subcontractor: e.target.value }))} placeholder="Name der Subfirma..." />
                </div>
              )}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="milestone" checked={form.isMilestone} onChange={e => setForm(f => ({ ...f, isMilestone: e.target.checked }))} className="rounded" />
                <label htmlFor="milestone" className="text-sm text-gray-700">Meilenstein (wird besonders hervorgehoben)</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Abbrechen</Button>
              <Button disabled={!form.title || !form.startDate || saving} onClick={handleSave}>
                {editPhase ? "Speichern" : "Anlegen"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Zeitstrahl / Gantt Chart ───────────────────────────────── */

function TimelineChart({ phases, getEmployeeName, getVehicleLabel, onEdit, onDelete, onStatusChange }: {
  phases: Phase[];
  getEmployeeName: (id: string) => string;
  getVehicleLabel: (id: string) => string;
  onEdit: (p: Phase) => void;
  onDelete: (id: string) => void;
  onStatusChange: (p: Phase, status: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const { minDate, maxDate, totalDays, monthHeaders } = useMemo(() => {
    let min = Infinity, max = -Infinity;
    phases.forEach(p => {
      const start = new Date(p.startDate).getTime();
      const end = p.endDate ? new Date(p.endDate).getTime() : start;
      if (start < min) min = start;
      if (end > max) max = end;
    });
    const pad = 7 * 86400000;
    min -= pad;
    max += pad;
    const totalDays = Math.ceil((max - min) / 86400000) || 30;

    const months: { label: string; startPct: number; widthPct: number }[] = [];
    const d = new Date(min);
    d.setDate(1);
    while (d.getTime() < max) {
      const mStart = Math.max(d.getTime(), min);
      const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const mEnd = Math.min(nextMonth.getTime(), max);
      const startPct = ((mStart - min) / (max - min)) * 100;
      const widthPct = ((mEnd - mStart) / (max - min)) * 100;
      months.push({
        label: d.toLocaleDateString("de-DE", { month: "short", year: "numeric" }),
        startPct, widthPct,
      });
      d.setMonth(d.getMonth() + 1);
    }

    return { minDate: min, maxDate: max, totalDays, monthHeaders: months };
  }, [phases]);

  const getBarStyle = (phase: Phase) => {
    const start = new Date(phase.startDate).getTime();
    const end = phase.endDate ? new Date(phase.endDate).getTime() : start + 86400000;
    const left = ((start - minDate) / (maxDate - minDate)) * 100;
    const width = Math.max(((end - start) / (maxDate - minDate)) * 100, 0.8);
    return { left: `${left}%`, width: `${width}%` };
  };

  const todayPct = (() => {
    const now = Date.now();
    if (now < minDate || now > maxDate) return null;
    return ((now - minDate) / (maxDate - minDate)) * 100;
  })();

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardContent className="p-0">
        {/* Month headers */}
        <div className="flex border-b bg-gray-50 relative" style={{ height: 32 }}>
          {monthHeaders.map((m, i) => (
            <div key={i} className="absolute top-0 h-full flex items-center border-l border-gray-200 px-2"
              style={{ left: `${m.startPct}%`, width: `${m.widthPct}%` }}>
              <span className="text-[10px] font-medium text-gray-500 truncate">{m.label}</span>
            </div>
          ))}
        </div>

        {/* Rows */}
        <div className="relative">
          {todayPct !== null && (
            <div className="absolute top-0 bottom-0 z-10 pointer-events-none" style={{ left: `${todayPct}%` }}>
              <div className="w-0.5 h-full bg-red-400 opacity-60" />
              <div className="absolute -top-0 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[8px] px-1 rounded-b font-bold">Heute</div>
            </div>
          )}

          {phases.map((phase, idx) => {
            const bar = getBarStyle(phase);
            const color = phase.color || categoryColors[phase.category || "EIGENBETRIEB"];
            const assignedNames = phase.assignedTo ? phase.assignedTo.split(",").map(id => getEmployeeName(id.trim())) : [];
            const vehicleLabels = phase.vehicleIds ? phase.vehicleIds.split(",").map(id => getVehicleLabel(id.trim())) : [];
            const isHovered = hovered === phase.id;

            return (
              <div key={phase.id} className={`relative flex items-center border-b transition-colors ${isHovered ? "bg-gray-50" : ""}`} style={{ height: 52 }}
                onMouseEnter={() => setHovered(phase.id)} onMouseLeave={() => setHovered(null)}>

                {/* Bar */}
                <div className="absolute" style={{ ...bar, top: phase.isMilestone ? 8 : 10, height: phase.isMilestone ? "auto" : 32 }}>
                  {phase.isMilestone ? (
                    <div className="flex flex-col items-center">
                      <div className="w-6 h-6 rotate-45 border-2 border-white shadow-md" style={{ background: color }} />
                      <span className="text-[10px] font-bold text-gray-700 mt-1 whitespace-nowrap">{phase.title}</span>
                    </div>
                  ) : (
                    <div className="h-full rounded-md shadow-sm flex items-center px-2 gap-1 cursor-pointer group relative overflow-hidden"
                      style={{ background: color, minWidth: 80 }} onClick={() => onEdit(phase)}>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-black transition-opacity" />
                      <span className="text-xs font-semibold text-white truncate relative z-10">{phase.title}</span>
                      {phase.subcontractor && <span className="text-[9px] text-white/80 truncate relative z-10">({phase.subcontractor})</span>}
                      {phase.status === "ABGESCHLOSSEN" && <CheckCircle2 className="h-3 w-3 text-white/80 flex-shrink-0 relative z-10" />}
                      {phase.status === "VERZOEGERT" && <AlertTriangle className="h-3 w-3 text-white/80 flex-shrink-0 relative z-10" />}

                      {/* Progress bar based on dates */}
                      {phase.endDate && phase.status === "IN_ARBEIT" && (() => {
                        const start = new Date(phase.startDate).getTime();
                        const end = new Date(phase.endDate).getTime();
                        const now = Date.now();
                        const pct = Math.min(Math.max(((now - start) / (end - start)) * 100, 0), 100);
                        return <div className="absolute bottom-0 left-0 h-1 bg-white/40 rounded-b" style={{ width: `${pct}%` }} />;
                      })()}
                    </div>
                  )}
                </div>

                {/* Tooltip on hover */}
                {isHovered && !phase.isMilestone && (
                  <div className="absolute z-20 bg-white rounded-lg shadow-xl border p-3 min-w-[240px]" style={{ left: bar.left, top: 54 }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <h5 className="text-sm font-bold text-gray-900">{phase.title}</h5>
                      <div className="flex gap-1">
                        <button onClick={() => onEdit(phase)} className="p-1 text-gray-400 hover:text-blue-600"><Edit2 className="h-3 w-3" /></button>
                        <button onClick={() => onDelete(phase.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    </div>
                    {phase.description && <p className="text-xs text-gray-500 mb-1.5">{phase.description}</p>}
                    <div className="space-y-1 text-[11px] text-gray-500">
                      <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDate(phase.startDate)}{phase.endDate && ` – ${fmtDate(phase.endDate)}`}</div>
                      {assignedNames.length > 0 && <div className="flex items-center gap-1"><Users className="h-3 w-3" />{assignedNames.join(", ")}</div>}
                      {vehicleLabels.length > 0 && <div className="flex items-center gap-1"><Car className="h-3 w-3" />{vehicleLabels.join(", ")}</div>}
                      {phase.subcontractor && <div className="flex items-center gap-1"><Building2 className="h-3 w-3" />{phase.subcontractor}</div>}
                      {phase.category && <div className="flex items-center gap-1"><Badge className="text-[9px] px-1 py-0" style={{ background: `${categoryColors[phase.category]}20`, color: categoryColors[phase.category] }}>{categoryLabels[phase.category]}</Badge></div>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Helpers ────────────────────────────────────────────────── */

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}
