"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/select";
import {
  Plus, Trash2, Edit2, Calendar, Users, Car, Building2,
  Flag, X, AlertTriangle, Clock, CheckCircle2,
  BarChart3, ArrowDownUp, Grip,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────── */

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
interface Props { project: any; onUpdate?: () => void }

/* ─── Constants ──────────────────────────────────────────────── */

const categoryLabels: Record<string, string> = {
  EIGENBETRIEB: "Eigenbetrieb", SUBFIRMA: "Subfirma", BAUHERR: "Bauherr", MEILENSTEIN: "Meilenstein",
};
const categoryColors: Record<string, string> = {
  EIGENBETRIEB: "#3b82f6", SUBFIRMA: "#f59e0b", BAUHERR: "#8b5cf6", MEILENSTEIN: "#ef4444",
};
const statusLabels: Record<string, string> = {
  GEPLANT: "Geplant", IN_ARBEIT: "In Arbeit", ABGESCHLOSSEN: "Abgeschlossen", VERZOEGERT: "Verzögert",
};
const statusBadge: Record<string, string> = {
  GEPLANT: "bg-gray-100 text-gray-600",
  IN_ARBEIT: "bg-blue-100 text-blue-700",
  ABGESCHLOSSEN: "bg-green-100 text-green-700",
  VERZOEGERT: "bg-red-100 text-red-700",
};
const defaultColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
}

/* ─── Main Component ─────────────────────────────────────────── */

export function PlanungTab({ project }: Props) {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editPhase, setEditPhase] = useState<Phase | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"horizontal" | "vertikal" | "gantt">("horizontal");

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
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [project.id]);

  useEffect(() => { load(); }, [load]);

  const getEmployeeName = useCallback((id: string) => {
    const e = employees.find(e => e.id === id);
    return e ? `${e.firstName} ${e.lastName}` : id;
  }, [employees]);

  const getVehicleLabel = useCallback((id: string) => {
    const v = vehicles.find(v => v.id === id);
    return v ? v.licensePlate : id;
  }, [vehicles]);

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
      title: phase.title, description: phase.description || "",
      startDate: phase.startDate.slice(0, 10),
      endDate: phase.endDate ? phase.endDate.slice(0, 10) : "",
      color: phase.color || defaultColors[0],
      category: phase.category || "EIGENBETRIEB",
      assignedTo: phase.assignedTo ? phase.assignedTo.split(",") : [],
      vehicleIds: phase.vehicleIds ? phase.vehicleIds.split(",") : [],
      subcontractor: phase.subcontractor || "",
      isMilestone: phase.isMilestone, status: phase.status,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.startDate) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: form.title, description: form.description,
        startDate: form.startDate, endDate: form.endDate || null,
        color: form.color, category: form.category,
        assignedTo: form.assignedTo.length > 0 ? form.assignedTo.join(",") : null,
        vehicleIds: form.vehicleIds.length > 0 ? form.vehicleIds.join(",") : null,
        subcontractor: form.subcontractor || null,
        isMilestone: form.isMilestone, status: form.status,
      };
      if (editPhase) { body.action = "update"; body.phaseId = editPhase.id; body.sortOrder = editPhase.sortOrder; }
      await fetch(`/api/projekte/${project.id}/planung`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      await load();
      setShowDialog(false);
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const handleDelete = async (phaseId: string) => {
    if (!confirm("Phase wirklich löschen?")) return;
    await fetch(`/api/projekte/${project.id}/planung`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", phaseId }),
    });
    await load();
  };

  const handleStatusChange = async (phase: Phase, newStatus: string) => {
    await fetch(`/api/projekte/${project.id}/planung`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", phaseId: phase.id, ...phase, startDate: phase.startDate.slice(0, 10), endDate: phase.endDate?.slice(0, 10) || null, status: newStatus }),
    });
    await load();
  };

  if (loading) return <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9eb552]" /></div>;

  const empty = phases.length === 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {([
            { key: "horizontal" as const, label: "Zeitstrahl" },
            { key: "vertikal" as const, label: "Vertikal" },
            { key: "gantt" as const, label: "Gantt" },
          ]).map(t => (
            <button key={t.key} onClick={() => setViewMode(t.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-3 text-xs text-gray-400 mr-2">
            {Object.entries(categoryLabels).map(([key, label]) => (
              <span key={key} className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: categoryColors[key] }} />{label}</span>
            ))}
          </div>
          <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Phase hinzufügen</Button>
        </div>
      </div>

      {/* Views */}
      {empty ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <Calendar className="h-14 w-14 mx-auto text-gray-200 mb-4" />
            <p className="text-lg font-medium text-gray-500">Noch keine Planungsphasen angelegt</p>
            <p className="text-sm text-gray-400 mt-1">Erstellen Sie Phasen, Meilensteine und Aufgaben für den Projektzeitstrahl</p>
            <Button className="mt-5" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Erste Phase anlegen</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === "horizontal" && (
            <HorizontalTimeline phases={phases} getEmployeeName={getEmployeeName} getVehicleLabel={getVehicleLabel} onEdit={openEdit} onDelete={handleDelete} onStatusChange={handleStatusChange} />
          )}
          {viewMode === "vertikal" && (
            <VerticalTimeline phases={phases} getEmployeeName={getEmployeeName} getVehicleLabel={getVehicleLabel} onEdit={openEdit} onDelete={handleDelete} onStatusChange={handleStatusChange} />
          )}
          {viewMode === "gantt" && (
            <GanttChart phases={phases} getEmployeeName={getEmployeeName} getVehicleLabel={getVehicleLabel} onEdit={openEdit} onDelete={handleDelete} onStatusChange={handleStatusChange} />
          )}
        </>
      )}

      {/* Dialog */}
      {showDialog && (
        <PhaseDialog
          editPhase={editPhase} form={form} setForm={setForm} saving={saving}
          employees={employees} vehicles={vehicles}
          getEmployeeName={getEmployeeName} getVehicleLabel={getVehicleLabel}
          onSave={handleSave} onClose={() => setShowDialog(false)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   VIEW 1: HORIZONTAL TIMELINE (Bild 1)
   ═══════════════════════════════════════════════════════════════ */

function HorizontalTimeline({ phases, getEmployeeName, getVehicleLabel, onEdit, onDelete, onStatusChange }: ViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sorted = useMemo(() => [...phases].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()), [phases]);

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6 overflow-x-auto" ref={containerRef}>
        <div className="relative" style={{ minWidth: Math.max(sorted.length * 220, 600), minHeight: 340 }}>
          {/* Central line */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-gray-700 rounded-full" />

          {/* Today marker */}
          {(() => {
            const first = new Date(sorted[0].startDate).getTime();
            const last = Math.max(...sorted.map(p => new Date(p.endDate || p.startDate).getTime()));
            const range = last - first || 1;
            const nowPct = ((Date.now() - first) / range) * 100;
            if (nowPct >= -5 && nowPct <= 105) {
              return (
                <div className="absolute top-0 bottom-0 z-10" style={{ left: `${Math.max(0, Math.min(100, nowPct))}%` }}>
                  <div className="w-0.5 h-full bg-[#00bcd4] opacity-70" />
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#00bcd4] border-2 border-white shadow-lg" />
                </div>
              );
            }
            return null;
          })()}

          {sorted.map((phase, idx) => {
            const isTop = idx % 2 === 0;
            const leftPct = (idx / Math.max(sorted.length - 1, 1)) * 100;
            const color = phase.color || categoryColors[phase.category || "EIGENBETRIEB"];
            const assignedNames = phase.assignedTo ? phase.assignedTo.split(",").map(id => getEmployeeName(id.trim())) : [];

            return (
              <div key={phase.id} className="absolute" style={{ left: `${leftPct}%`, top: isTop ? 0 : "50%", width: 200, transform: "translateX(-50%)" }}>
                {/* Connector line */}
                <div className={`absolute left-1/2 -translate-x-1/2 w-px bg-gray-400 ${isTop ? "bottom-0" : "top-0"}`} style={{ height: isTop ? 40 : 40 }} />

                {/* Node on the timeline */}
                <div className="absolute left-1/2 -translate-x-1/2" style={isTop ? { bottom: -20 } : { top: -20 }}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-3 border-white cursor-pointer group transition-transform hover:scale-110 ${phase.isMilestone ? "ring-2 ring-red-400 ring-offset-2" : ""}`}
                    style={{ background: color }} onClick={() => onEdit(phase)}>
                    {phase.isMilestone ? <Flag className="h-4 w-4 text-white" /> :
                      phase.category === "SUBFIRMA" ? <Building2 className="h-4 w-4 text-white" /> :
                      phase.category === "BAUHERR" ? <Users className="h-4 w-4 text-white" /> :
                      phase.status === "ABGESCHLOSSEN" ? <CheckCircle2 className="h-4 w-4 text-white" /> :
                      <Calendar className="h-4 w-4 text-white" />}
                  </div>
                </div>

                {/* Content card */}
                <div className={`${isTop ? "pb-16" : "pt-16"}`}>
                  <div className="bg-white rounded-lg border shadow-sm p-3 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => onEdit(phase)}>
                    <div className="text-center mb-2">
                      <span className="text-lg font-bold text-gray-800">{fmtShort(phase.startDate)}</span>
                      {phase.endDate && <span className="text-xs text-gray-400 ml-1">– {fmtShort(phase.endDate)}</span>}
                    </div>
                    <h4 className="font-semibold text-sm text-gray-900 text-center">{phase.title}</h4>
                    {phase.description && <p className="text-[11px] text-gray-500 text-center mt-1 line-clamp-2">{phase.description}</p>}
                    <div className="flex flex-wrap justify-center gap-1 mt-2">
                      <Badge className={`text-[9px] ${statusBadge[phase.status]}`}>{statusLabels[phase.status]}</Badge>
                      {phase.subcontractor && <Badge className="text-[9px] bg-amber-50 text-amber-700">{phase.subcontractor}</Badge>}
                    </div>
                    {assignedNames.length > 0 && <p className="text-[10px] text-gray-400 text-center mt-1.5">{assignedNames.join(", ")}</p>}
                    <div className="hidden group-hover:flex justify-center gap-1 mt-2">
                      <button onClick={e => { e.stopPropagation(); onDelete(phase.id); }} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   VIEW 2: VERTICAL TIMELINE (Bild 2)
   ═══════════════════════════════════════════════════════════════ */

function VerticalTimeline({ phases, getEmployeeName, getVehicleLabel, onEdit, onDelete, onStatusChange }: ViewProps) {
  const sorted = useMemo(() => [...phases].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()), [phases]);

  return (
    <div className="relative pl-4 md:pl-0">
      {/* Central vertical line */}
      <div className="absolute left-6 md:left-[120px] top-0 bottom-0 w-0.5 bg-gray-200" />

      <div className="space-y-0">
        {sorted.map((phase, idx) => {
          const color = phase.color || categoryColors[phase.category || "EIGENBETRIEB"];
          const assignedNames = phase.assignedTo ? phase.assignedTo.split(",").map(id => getEmployeeName(id.trim())) : [];
          const vehicleLabels = phase.vehicleIds ? phase.vehicleIds.split(",").map(id => getVehicleLabel(id.trim())) : [];
          const days = phase.endDate ? Math.ceil((new Date(phase.endDate).getTime() - new Date(phase.startDate).getTime()) / 86400000) + 1 : 1;

          return (
            <div key={phase.id} className="relative flex items-start gap-4 md:gap-6 group" style={{ minHeight: 100 }}>
              {/* Date badge (left side) */}
              <div className="hidden md:flex flex-col items-end w-[100px] flex-shrink-0 pt-3">
                <div className="rounded-lg px-3 py-1.5 text-white font-bold text-sm shadow-md" style={{ background: color }}>
                  {fmtShort(phase.startDate)}
                </div>
                {phase.endDate && (
                  <span className="text-[10px] text-gray-400 mt-1">bis {fmtShort(phase.endDate)}</span>
                )}
              </div>

              {/* Node dot */}
              <div className="relative flex-shrink-0 pt-3">
                <div className={`w-4 h-4 rounded-full border-[3px] border-white shadow z-10 relative ${phase.isMilestone ? "ring-2 ring-red-300 ring-offset-1" : ""}`}
                  style={{ background: color }} />
                {/* Horizontal connector */}
                <div className="absolute top-[19px] left-4 w-6 h-px bg-gray-300" />
              </div>

              {/* Content */}
              <div className="flex-1 pb-8">
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => onEdit(phase)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {phase.isMilestone && <Flag className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
                          <h4 className="font-bold text-gray-900">{phase.title}</h4>
                          <Badge className={`text-[10px] ${statusBadge[phase.status]}`}>{statusLabels[phase.status]}</Badge>
                          {phase.category && <Badge className="text-[10px] bg-gray-50 text-gray-500">{categoryLabels[phase.category]}</Badge>}
                        </div>
                        {phase.description && <p className="text-sm text-gray-500 mt-1">{phase.description}</p>}

                        {/* Horizontal line like in the screenshot */}
                        <div className="flex items-center gap-2 mt-3">
                          <div className="flex-1 h-px bg-gray-200 relative">
                            {phase.status === "IN_ARBEIT" && phase.endDate && (() => {
                              const start = new Date(phase.startDate).getTime();
                              const end = new Date(phase.endDate).getTime();
                              const pct = Math.min(Math.max(((Date.now() - start) / (end - start)) * 100, 0), 100);
                              return <div className="absolute top-0 left-0 h-full rounded" style={{ width: `${pct}%`, background: color, height: 3, top: -1 }} />;
                            })()}
                          </div>
                          <div className="w-2 h-2 rounded-full bg-gray-300" />
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
                          <span className="md:hidden flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDate(phase.startDate)}{phase.endDate && ` – ${fmtDate(phase.endDate)}`}</span>
                          <span>{days} {days === 1 ? "Tag" : "Tage"}</span>
                          {assignedNames.length > 0 && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{assignedNames.join(", ")}</span>}
                          {vehicleLabels.length > 0 && <span className="flex items-center gap-1"><Car className="h-3 w-3" />{vehicleLabels.join(", ")}</span>}
                          {phase.subcontractor && <span className="flex items-center gap-1"><Building2 className="h-3 w-3 text-amber-500" />{phase.subcontractor}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <NativeSelect value={phase.status} onChange={e => { e.stopPropagation(); onStatusChange(phase, e.target.value); }} className="text-[10px] h-6 w-24">
                          <option value="GEPLANT">Geplant</option>
                          <option value="IN_ARBEIT">In Arbeit</option>
                          <option value="ABGESCHLOSSEN">Erledigt</option>
                          <option value="VERZOEGERT">Verzögert</option>
                        </NativeSelect>
                        <button onClick={e => { e.stopPropagation(); onDelete(phase.id); }} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          );
        })}

        {/* End dot */}
        <div className="relative flex items-center gap-4 md:gap-6">
          <div className="hidden md:block w-[100px]" />
          <div className="w-4 h-4 rounded-full bg-gray-300 border-[3px] border-white shadow" />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   VIEW 3: GANTT CHART (Bild 3 – OpenProject-Style)
   ═══════════════════════════════════════════════════════════════ */

function GanttChart({ phases, getEmployeeName, getVehicleLabel, onEdit, onDelete, onStatusChange }: ViewProps) {
  const sorted = useMemo(() => [...phases].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()), [phases]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { minDate, maxDate, dayHeaders, weekHeaders } = useMemo(() => {
    let min = Infinity, max = -Infinity;
    sorted.forEach(p => {
      const s = new Date(p.startDate).getTime();
      const e = p.endDate ? new Date(p.endDate).getTime() : s + 86400000;
      if (s < min) min = s;
      if (e > max) max = e;
    });
    const pad = 5 * 86400000;
    min -= pad; max += pad;
    const totalMs = max - min;

    const days: { date: Date; pct: number; isWeekend: boolean }[] = [];
    const d = new Date(min);
    d.setHours(0, 0, 0, 0);
    while (d.getTime() <= max) {
      days.push({
        date: new Date(d),
        pct: ((d.getTime() - min) / totalMs) * 100,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
      });
      d.setDate(d.getDate() + 1);
    }

    const weeks: { label: string; startPct: number; widthPct: number }[] = [];
    const wd = new Date(min);
    wd.setDate(wd.getDate() - wd.getDay() + 1);
    while (wd.getTime() < max) {
      const wStart = Math.max(wd.getTime(), min);
      const wEnd = Math.min(wd.getTime() + 7 * 86400000, max);
      weeks.push({
        label: wd.toLocaleDateString("de-DE", { day: "2-digit", month: "short" }),
        startPct: ((wStart - min) / totalMs) * 100,
        widthPct: ((wEnd - wStart) / totalMs) * 100,
      });
      wd.setDate(wd.getDate() + 7);
    }

    return { minDate: min, maxDate: max, dayHeaders: days, weekHeaders: weeks };
  }, [sorted]);

  const totalDays = Math.ceil((maxDate - minDate) / 86400000);
  const dayWidth = Math.max(28, 1200 / totalDays);
  const chartWidth = totalDays * dayWidth;
  const ROW_H = 40;

  const getBarStyle = (phase: Phase) => {
    const start = new Date(phase.startDate).getTime();
    const end = phase.endDate ? new Date(phase.endDate).getTime() : start + 86400000;
    const left = ((start - minDate) / (maxDate - minDate)) * chartWidth;
    const width = Math.max(((end - start) / (maxDate - minDate)) * chartWidth, 24);
    return { left, width };
  };

  const todayLeft = (() => {
    const now = Date.now();
    if (now < minDate || now > maxDate) return null;
    return ((now - minDate) / (maxDate - minDate)) * chartWidth;
  })();

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <div className="flex">
          {/* Left table */}
          <div className="flex-shrink-0 border-r bg-white z-10" style={{ width: 380 }}>
            {/* Table header */}
            <div className="flex items-center border-b bg-gray-50 text-[11px] font-medium text-gray-500 uppercase tracking-wider" style={{ height: 56 }}>
              <div className="w-10 px-2 text-center">#</div>
              <div className="flex-1 px-2">Bezeichnung</div>
              <div className="w-20 px-2 text-center">Typ</div>
              <div className="w-20 px-2 text-center">Status</div>
            </div>

            {/* Table rows */}
            {sorted.map((phase, idx) => {
              const color = phase.color || categoryColors[phase.category || "EIGENBETRIEB"];
              return (
                <div key={phase.id} className="flex items-center border-b hover:bg-gray-50 transition-colors cursor-pointer group" style={{ height: ROW_H }} onClick={() => onEdit(phase)}>
                  <div className="w-10 px-2 text-center text-[11px] text-gray-400">{idx + 1}</div>
                  <div className="flex-1 px-2 flex items-center gap-2 min-w-0">
                    <div className="w-1 h-5 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="text-sm font-medium text-gray-900 truncate">{phase.title}</span>
                    {phase.isMilestone && <Flag className="h-3 w-3 text-red-500 flex-shrink-0" />}
                  </div>
                  <div className="w-20 px-2 text-center">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: `${categoryColors[phase.category || "EIGENBETRIEB"]}15`, color: categoryColors[phase.category || "EIGENBETRIEB"] }}>
                      {phase.isMilestone ? "MS" : categoryLabels[phase.category || "EIGENBETRIEB"]?.slice(0, 5) || "Phase"}
                    </span>
                  </div>
                  <div className="w-20 px-2 text-center">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${statusBadge[phase.status]}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${phase.status === "ABGESCHLOSSEN" ? "bg-green-500" : phase.status === "IN_ARBEIT" ? "bg-blue-500" : phase.status === "VERZOEGERT" ? "bg-red-500" : "bg-gray-400"}`} />
                      {statusLabels[phase.status]?.slice(0, 8)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Gantt area */}
          <div className="flex-1 overflow-x-auto" ref={scrollRef}>
            <div style={{ width: chartWidth, minWidth: "100%" }}>
              {/* Time header */}
              <div className="border-b bg-gray-50 relative" style={{ height: 56 }}>
                {/* Week labels */}
                <div className="relative" style={{ height: 28 }}>
                  {weekHeaders.map((w, i) => (
                    <div key={i} className="absolute top-0 h-full flex items-center border-l border-gray-200 px-2"
                      style={{ left: `${w.startPct}%`, width: `${w.widthPct}%` }}>
                      <span className="text-[10px] font-medium text-gray-500 whitespace-nowrap">{w.label}</span>
                    </div>
                  ))}
                </div>
                {/* Day ticks */}
                <div className="relative" style={{ height: 28 }}>
                  {dayHeaders.filter((_, i) => i % Math.max(1, Math.floor(totalDays / 40)) === 0).map((d, i) => (
                    <div key={i} className="absolute top-0 h-full flex items-end justify-center border-l border-gray-100 pb-1"
                      style={{ left: `${d.pct}%`, width: `${100 / totalDays}%` }}>
                      <span className="text-[8px] text-gray-400">{d.date.getDate()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bars */}
              <div className="relative">
                {/* Weekend stripes */}
                {dayHeaders.filter(d => d.isWeekend).map((d, i) => (
                  <div key={i} className="absolute top-0 bg-gray-50/60" style={{ left: `${d.pct}%`, width: `${100 / totalDays}%`, height: sorted.length * ROW_H }} />
                ))}

                {/* Today line */}
                {todayLeft !== null && (
                  <div className="absolute top-0 z-10 pointer-events-none" style={{ left: todayLeft, height: sorted.length * ROW_H }}>
                    <div className="w-px h-full" style={{ background: "rgba(239,68,68,0.5)", borderLeft: "1px dashed rgba(239,68,68,0.4)" }} />
                  </div>
                )}

                {sorted.map((phase, idx) => {
                  const bar = getBarStyle(phase);
                  const color = phase.color || categoryColors[phase.category || "EIGENBETRIEB"];
                  const assignedNames = phase.assignedTo ? phase.assignedTo.split(",").map(id => getEmployeeName(id.trim())) : [];
                  const labelText = `${phase.title}${phase.subcontractor ? ` (${phase.subcontractor})` : ""}${assignedNames.length > 0 ? ` · ${assignedNames.join(", ")}` : ""}`;

                  return (
                    <div key={phase.id} className="relative border-b border-gray-100" style={{ height: ROW_H }}>
                      {phase.isMilestone ? (
                        <div className="absolute flex items-center gap-1" style={{ left: bar.left - 8, top: (ROW_H - 16) / 2 }}>
                          <div className="w-4 h-4 rotate-45 shadow-sm" style={{ background: color }} />
                          <span className="text-[10px] font-bold text-gray-700 whitespace-nowrap ml-1">{phase.title}</span>
                        </div>
                      ) : (
                        <div className="absolute flex items-center" style={{ left: bar.left, top: (ROW_H - 22) / 2 }}>
                          <div className="h-[22px] rounded-[3px] flex items-center px-2 shadow-sm cursor-pointer hover:brightness-110 transition-all relative overflow-hidden"
                            style={{ width: bar.width, background: color, minWidth: 24 }} onClick={() => onEdit(phase)}>
                            {bar.width > 60 && <span className="text-[10px] font-semibold text-white truncate relative z-10">{phase.title}</span>}

                            {phase.status === "IN_ARBEIT" && phase.endDate && (() => {
                              const s = new Date(phase.startDate).getTime();
                              const e = new Date(phase.endDate).getTime();
                              const pct = Math.min(Math.max(((Date.now() - s) / (e - s)) * 100, 0), 100);
                              return <div className="absolute bottom-0 left-0 h-[3px] bg-white/30" style={{ width: `${pct}%` }} />;
                            })()}
                            {phase.status === "ABGESCHLOSSEN" && <div className="absolute inset-0 bg-white/10" />}
                          </div>
                          {bar.width <= 60 && <span className="text-[10px] font-medium text-gray-700 ml-1.5 whitespace-nowrap">{labelText}</span>}
                          {bar.width > 60 && assignedNames.length > 0 && <span className="text-[10px] text-gray-500 ml-2 whitespace-nowrap">{assignedNames.join(", ")}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SHARED: Phase Dialog
   ═══════════════════════════════════════════════════════════════ */

interface ViewProps {
  phases: Phase[];
  getEmployeeName: (id: string) => string;
  getVehicleLabel: (id: string) => string;
  onEdit: (p: Phase) => void;
  onDelete: (id: string) => void;
  onStatusChange: (p: Phase, status: string) => void;
}

function PhaseDialog({ editPhase, form, setForm, saving, employees, vehicles, getEmployeeName, getVehicleLabel, onSave, onClose }: {
  editPhase: Phase | null;
  form: { title: string; description: string; startDate: string; endDate: string; color: string; category: string; assignedTo: string[]; vehicleIds: string[]; subcontractor: string; isMilestone: boolean; status: string };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
  saving: boolean;
  employees: Employee[];
  vehicles: Vehicle[];
  getEmployeeName: (id: string) => string;
  getVehicleLabel: (id: string) => string;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
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
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button disabled={!form.title || !form.startDate || saving} onClick={onSave}>
            {editPhase ? "Speichern" : "Anlegen"}
          </Button>
        </div>
      </div>
    </div>
  );
}
