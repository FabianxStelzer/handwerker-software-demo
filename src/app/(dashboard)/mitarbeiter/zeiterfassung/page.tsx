"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Clock, LogIn, LogOut, ChevronLeft, ChevronRight, Coffee,
  TrendingUp, TrendingDown, Minus, Users, User, Trash2, Pencil,
  Plus,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface Project {
  id: string;
  projectNumber: string;
  name: string;
}

interface TimeEntry {
  id: string;
  userId: string;
  date: string;
  startTime: string;
  endTime: string | null;
  breakMin: number;
  notes: string | null;
  project: Project | null;
  user: { id: string; firstName: string; lastName: string; avatarUrl?: string | null };
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  avatarUrl?: string | null;
}

interface CompanyConfig {
  lunchBreakMinutes: number;
  workHoursPerDay: number;
}

function pad2(n: number) { return n.toString().padStart(2, "0"); }
function nowTimeStr() { const d = new Date(); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }
function calcHours(start: string, end: string, breakMin: number): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm) - breakMin) / 60);
}
function formatHours(h: number): string {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${hrs}h ${pad2(mins)}min`;
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
}

export default function ZeiterfassungPage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string })?.id;
  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "ADMIN" || userRole === "BAULEITER";

  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [elapsed, setElapsed] = useState("00:00:00");
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeEntries, setActiveEntries] = useState<TimeEntry[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [config, setConfig] = useState<CompanyConfig>({ lunchBreakMinutes: 30, workHoursPerDay: 8 });
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
  });
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Admin states
  const [viewUserId, setViewUserId] = useState<string>("");
  const [allEntries, setAllEntries] = useState<TimeEntry[]>([]);
  const [adminCheckInOpen, setAdminCheckInOpen] = useState(false);
  const [adminCheckInUser, setAdminCheckInUser] = useState("");
  const [adminCheckInProject, setAdminCheckInProject] = useState("");
  const [adminCheckInTime, setAdminCheckInTime] = useState("");
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [editForm, setEditForm] = useState({ startTime: "", endTime: "", breakMin: "", projectId: "", notes: "" });
  const [addEntryOpen, setAddEntryOpen] = useState(false);
  const [addForm, setAddForm] = useState({ userId: "", date: "", startTime: "", endTime: "", breakMin: "0", projectId: "", notes: "" });

  const loadData = useCallback(async () => {
    if (!userId) return;
    const fetches: Promise<Response>[] = [
      fetch(`/api/zeiterfassung?userId=${userId}&active=true`),
      fetch(`/api/zeiterfassung?userId=${userId}&month=${month}`),
      fetch("/api/projekte"),
      fetch("/api/settings/company"),
    ];
    if (isAdmin) {
      fetches.push(fetch("/api/zeiterfassung?active=true"));
      fetches.push(fetch("/api/mitarbeiter"));
    }

    const results = await Promise.all(fetches);
    const [activeRes, monthRes, projRes, configRes] = results;

    if (activeRes.ok) {
      const active = await activeRes.json();
      setActiveEntry(active.length > 0 ? active[0] : null);
    }
    if (monthRes.ok) setEntries(await monthRes.json());
    if (projRes.ok) {
      const p = await projRes.json();
      setProjects(Array.isArray(p) ? p : []);
    }
    if (configRes.ok) {
      const c = await configRes.json();
      if (c && !c.error) setConfig({ lunchBreakMinutes: c.lunchBreakMinutes ?? 30, workHoursPerDay: c.workHoursPerDay ?? 8 });
    }

    if (isAdmin && results[4]) {
      if (results[4].ok) setActiveEntries(await results[4].json());
      if (results[5]?.ok) setEmployees(await results[5].json());
    }

    setLoading(false);
  }, [userId, month, isAdmin]);

  // Load admin user-specific data
  const loadUserEntries = useCallback(async () => {
    if (!viewUserId || !isAdmin) { setAllEntries([]); return; }
    const res = await fetch(`/api/zeiterfassung?userId=${viewUserId}&month=${month}`);
    if (res.ok) setAllEntries(await res.json());
  }, [viewUserId, month, isAdmin]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { loadUserEntries(); }, [loadUserEntries]);

  // Auto-refresh active employees every 30s
  useEffect(() => {
    if (!isAdmin) return;
    const interval = setInterval(async () => {
      const res = await fetch("/api/zeiterfassung?active=true");
      if (res.ok) setActiveEntries(await res.json());
    }, 30000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  // Timer
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (activeEntry) {
      function tick() {
        const [h, m] = activeEntry!.startTime.split(":").map(Number);
        const start = new Date(); start.setHours(h, m, 0, 0);
        const diff = Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000));
        setElapsed(`${pad2(Math.floor(diff / 3600))}:${pad2(Math.floor((diff % 3600) / 60))}:${pad2(diff % 60)}`);
      }
      tick();
      timerRef.current = setInterval(tick, 1000);
    } else { setElapsed("00:00:00"); }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeEntry]);

  async function handleCheckIn() {
    if (!userId) return;
    const res = await fetch("/api/zeiterfassung", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, date: new Date().toISOString().split("T")[0], startTime: nowTimeStr(), projectId: selectedProject || null }),
    });
    if (res.ok) { setActiveEntry(await res.json()); loadData(); }
  }

  async function handleCheckOut() {
    if (!activeEntry) return;
    const endTime = nowTimeStr();
    const [sh, sm] = activeEntry.startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const totalMin = eh * 60 + em - (sh * 60 + sm);
    const autoBreak = totalMin >= 360 ? config.lunchBreakMinutes : 0;
    const res = await fetch("/api/zeiterfassung", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: activeEntry.id, endTime, breakMin: autoBreak }),
    });
    if (res.ok) { setActiveEntry(null); loadData(); }
  }

  // Admin: Check in/out for other employees
  async function adminCheckIn() {
    if (!adminCheckInUser) return;
    const res = await fetch("/api/zeiterfassung", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: adminCheckInUser,
        date: new Date().toISOString().split("T")[0],
        startTime: adminCheckInTime || nowTimeStr(),
        projectId: adminCheckInProject || null,
      }),
    });
    if (res.ok) {
      setAdminCheckInOpen(false);
      setAdminCheckInUser(""); setAdminCheckInProject(""); setAdminCheckInTime("");
      loadData();
    }
  }

  async function adminCheckOut(entry: TimeEntry) {
    const endTime = nowTimeStr();
    const [sh, sm] = entry.startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const totalMin = eh * 60 + em - (sh * 60 + sm);
    const autoBreak = totalMin >= 360 ? config.lunchBreakMinutes : 0;
    await fetch("/api/zeiterfassung", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: entry.id, endTime, breakMin: autoBreak }),
    });
    loadData();
  }

  async function saveEditEntry() {
    if (!editEntry) return;
    await fetch("/api/zeiterfassung", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editEntry.id,
        endTime: editForm.endTime || undefined,
        breakMin: editForm.breakMin ? parseInt(editForm.breakMin) : undefined,
        projectId: editForm.projectId || undefined,
        notes: editForm.notes || undefined,
      }),
    });
    setEditEntry(null);
    loadData(); loadUserEntries();
  }

  async function deleteEntry(id: string) {
    await fetch("/api/zeiterfassung", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadData(); loadUserEntries();
  }

  async function handleAddEntry() {
    if (!addForm.userId || !addForm.date || !addForm.startTime) return;
    await fetch("/api/zeiterfassung", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: addForm.userId,
        date: addForm.date,
        startTime: addForm.startTime,
        endTime: addForm.endTime || null,
        breakMin: parseInt(addForm.breakMin) || 0,
        projectId: addForm.projectId || null,
        notes: addForm.notes || null,
      }),
    });
    setAddEntryOpen(false);
    setAddForm({ userId: "", date: "", startTime: "", endTime: "", breakMin: "0", projectId: "", notes: "" });
    loadData(); loadUserEntries();
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  // Own data
  const completedEntries = entries.filter((e) => e.endTime);
  const totalHours = completedEntries.reduce((s, e) => s + calcHours(e.startTime, e.endTime!, e.breakMin), 0);
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  let workdaysInMonth = 0;
  for (let i = 1; i <= daysInMonth; i++) { const dow = new Date(y, m - 1, i).getDay(); if (dow > 0 && dow < 6) workdaysInMonth++; }
  const targetHours = workdaysInMonth * config.workHoursPerDay;
  const overtime = totalHours - targetHours;
  const monthLabel = new Date(y, m - 1).toLocaleDateString("de-DE", { month: "long", year: "numeric" });

  const entriesByDate = completedEntries.reduce<Record<string, TimeEntry[]>>((acc, e) => {
    const d = new Date(e.date).toISOString().split("T")[0];
    if (!acc[d]) acc[d] = [];
    acc[d].push(e);
    return acc;
  }, {});
  const sortedDates = Object.keys(entriesByDate).sort((a, b) => b.localeCompare(a));

  // Admin: viewed user data
  const viewUser = employees.find((e) => e.id === viewUserId);
  const viewCompleted = allEntries.filter((e) => e.endTime);
  const viewTotalHours = viewCompleted.reduce((s, e) => s + calcHours(e.startTime, e.endTime!, e.breakMin), 0);
  const viewOvertime = viewTotalHours - targetHours;
  const viewByDate = viewCompleted.reduce<Record<string, TimeEntry[]>>((acc, e) => {
    const d = new Date(e.date).toISOString().split("T")[0];
    if (!acc[d]) acc[d] = [];
    acc[d].push(e);
    return acc;
  }, {});
  const viewSortedDates = Object.keys(viewByDate).sort((a, b) => b.localeCompare(a));

  // Employees not currently checked in (for admin check-in)
  const checkedInIds = new Set(activeEntries.map((e) => e.userId));

  const adminCheckInLabel = `${t("common.mitarbeiter")} ${t("zeit.einstempeln").toLowerCase()}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("zeit.title")}</h1>
        <p className="text-sm text-gray-500 mt-1">{t("zeit.subtitle")}</p>
      </div>

      {/* ── Eigenes Stempeln ──────────────── */}
      <Card className={activeEntry ? "border-green-300 bg-green-50/30" : "border-blue-200 bg-blue-50/30"}>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="text-center">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                {activeEntry ? t("zeit.arbeitszeitLaeuft") : t("zeit.nichtEingestempelt")}
              </p>
              <p className={`text-4xl font-mono font-bold ${activeEntry ? "text-green-700" : "text-gray-400"}`}>{elapsed}</p>
              {activeEntry && (
                <p className="text-sm text-gray-500 mt-1">
                  Seit {activeEntry.startTime} {t("common.uhr")}{activeEntry.project && <> · {activeEntry.project.name}</>}
                </p>
              )}
            </div>
            <div className="flex-1 flex flex-col sm:flex-row items-center gap-3">
              {!activeEntry && (
                <NativeSelect value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="w-full sm:w-auto min-w-[200px]">
                  <option value="">Ohne Projekt</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.projectNumber} – {p.name}</option>)}
                </NativeSelect>
              )}
              {activeEntry ? (
                <Button onClick={handleCheckOut} size="lg" variant="destructive" className="gap-2">
                  <LogOut className="h-5 w-5" />{t("zeit.ausstempeln")}
                </Button>
              ) : (
                <Button onClick={handleCheckIn} size="lg" className="gap-2 bg-green-600 hover:bg-green-700">
                  <LogIn className="h-5 w-5" />{t("zeit.einstempeln")}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Admin: Eingestempelte Mitarbeiter ──────── */}
      {isAdmin && (
        <Card className="border-blue-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Eingestempelte Mitarbeiter
                <Badge className="bg-green-100 text-green-700 ml-1">{activeEntries.length} {t("common.aktiv").toLowerCase()}</Badge>
              </h2>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => { setAdminCheckInOpen(true); setAdminCheckInTime(nowTimeStr()); }}>
                  <LogIn className="h-3.5 w-3.5" />{adminCheckInLabel}
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => { setAddEntryOpen(true); setAddForm({ ...addForm, date: new Date().toISOString().split("T")[0] }); }}>
                  <Plus className="h-3.5 w-3.5" />Eintrag nachtragen
                </Button>
              </div>
            </div>

            {activeEntries.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Aktuell kein Mitarbeiter eingestempelt</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeEntries.map((entry) => {
                  const [sh, sm] = entry.startTime.split(":").map(Number);
                  const start = new Date(); start.setHours(sh, sm, 0, 0);
                  const diffMin = Math.max(0, Math.floor((Date.now() - start.getTime()) / 60000));
                  const h = Math.floor(diffMin / 60);
                  const min = diffMin % 60;

                  return (
                    <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-200 text-green-800 text-xs font-bold shrink-0">
                        {entry.user.firstName[0]}{entry.user.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{entry.user.firstName} {entry.user.lastName}</p>
                        <p className="text-xs text-gray-500">
                          Seit {entry.startTime} · {h}h {pad2(min)}min
                          {entry.project && <> · {entry.project.name}</>}
                        </p>
                      </div>
                      <Button size="sm" variant="destructive" className="gap-1 text-xs shrink-0" onClick={() => adminCheckOut(entry)}>
                        <LogOut className="h-3 w-3" />Aus
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Nicht eingestempelte MA */}
            {employees.filter((e) => e.isActive && !checkedInIds.has(e.id)).length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs font-medium text-gray-400 uppercase mb-2">{t("zeit.nichtEingestempelt")}</p>
                <div className="flex flex-wrap gap-2">
                  {employees.filter((e) => e.isActive && !checkedInIds.has(e.id)).map((emp) => (
                    <span key={emp.id} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-100 text-xs text-gray-600">
                      <span className="h-2 w-2 rounded-full bg-gray-400" />
                      {emp.firstName} {emp.lastName}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Eigene Monatsstats ──────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-gray-400">Gearbeitete Stunden</p>
          <p className="text-2xl font-bold text-gray-900">{formatHours(totalHours)}</p>
          <p className="text-xs text-gray-500">{`${formatHours(targetHours)} ${t("zeit.vonSoll")}`}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-gray-400">{t("zeit.werktage")}</p>
          <p className="text-2xl font-bold text-gray-900">{sortedDates.length}</p>
          <p className="text-xs text-gray-500">{`${t("common.von")} ${workdaysInMonth} ${t("zeit.werktage")}`}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-gray-400">{t("zeit.ueberstunden")}</p>
          <div className="flex items-center gap-2">
            {overtime > 0.5 ? <TrendingUp className="h-5 w-5 text-green-600" /> : overtime < -0.5 ? <TrendingDown className="h-5 w-5 text-red-600" /> : <Minus className="h-5 w-5 text-gray-400" />}
            <p className={`text-2xl font-bold ${overtime > 0.5 ? "text-green-600" : overtime < -0.5 ? "text-red-600" : "text-gray-900"}`}>
              {overtime >= 0 ? "+" : ""}{formatHours(Math.abs(overtime))}
            </p>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-gray-400">{t("zeit.pause")}</p>
          <div className="flex items-center gap-2">
            <Coffee className="h-5 w-5 text-amber-600" />
            <p className="text-2xl font-bold text-gray-900">{config.lunchBreakMinutes} min</p>
          </div>
          <p className="text-xs text-gray-500">automatisch ab 6h</p>
        </Card>
      </div>

      {/* ── Monat-Navigation ──────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Monatsübersicht</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { const d = new Date(y, m - 2, 1); setMonth(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`); }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[140px] text-center">{monthLabel}</span>
          <Button variant="outline" size="sm" onClick={() => { const d = new Date(y, m, 1); setMonth(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`); }}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Eigene Einträge */}
      {sortedDates.length === 0 ? (
        <Card className="p-8 text-center text-gray-400"><Clock className="h-12 w-12 mx-auto mb-3" /><p>{t("zeit.keineEintraege")}</p></Card>
      ) : (
        <div className="space-y-3">
          {sortedDates.map((date) => {
            const dayEntries = entriesByDate[date];
            const dayHours = dayEntries.reduce((s, e) => s + calcHours(e.startTime, e.endTime!, e.breakMin), 0);
            return (
              <Card key={date} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-900">{formatDate(date)}</p>
                  <Badge className={dayHours >= config.workHoursPerDay ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                    {formatHours(dayHours)}
                  </Badge>
                </div>
                <div className="space-y-1">
                  {dayEntries.map((e) => (
                    <div key={e.id} className="flex items-center justify-between text-sm text-gray-600">
                      <span>
                        {e.startTime} – {e.endTime}
                        {e.breakMin > 0 && <span className="text-gray-400 ml-1">({e.breakMin}min {t("zeit.pause")})</span>}
                      </span>
                      {e.project && <span className="text-xs text-blue-600 truncate max-w-[200px]">{e.project.name}</span>}
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Admin: Mitarbeiter-Auswahl ──────────────── */}
      {isAdmin && (
        <>
          <div className="border-t pt-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                {`${t("common.mitarbeiter")}-${t("zeit.title")}`}
              </h2>
              <NativeSelect value={viewUserId} onChange={(e) => setViewUserId(e.target.value)} className="w-auto min-w-[220px]">
                <option value="">{t("azubi.mitarbeiterWaehlen")}</option>
                {employees.filter((e) => e.isActive).map((e) => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                ))}
              </NativeSelect>
            </div>

            {viewUserId && viewUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="p-4">
                    <p className="text-xs font-medium text-gray-400">Gearbeitete Stunden</p>
                    <p className="text-2xl font-bold text-gray-900">{formatHours(viewTotalHours)}</p>
                    <p className="text-xs text-gray-500">{`${formatHours(targetHours)} ${t("zeit.vonSoll")}`}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs font-medium text-gray-400">{t("zeit.werktage")}</p>
                    <p className="text-2xl font-bold text-gray-900">{viewSortedDates.length}</p>
                    <p className="text-xs text-gray-500">{`${t("common.von")} ${workdaysInMonth} ${t("zeit.werktage")}`}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs font-medium text-gray-400">{t("zeit.ueberstunden")}</p>
                    <div className="flex items-center gap-2">
                      {viewOvertime > 0.5 ? <TrendingUp className="h-5 w-5 text-green-600" /> : viewOvertime < -0.5 ? <TrendingDown className="h-5 w-5 text-red-600" /> : <Minus className="h-5 w-5 text-gray-400" />}
                      <p className={`text-2xl font-bold ${viewOvertime > 0.5 ? "text-green-600" : viewOvertime < -0.5 ? "text-red-600" : "text-gray-900"}`}>
                        {viewOvertime >= 0 ? "+" : ""}{formatHours(Math.abs(viewOvertime))}
                      </p>
                    </div>
                  </Card>
                </div>

                {viewSortedDates.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Keine Einträge für {viewUser.firstName} in diesem Monat</p>
                ) : (
                  <div className="space-y-3">
                    {viewSortedDates.map((date) => {
                      const dayEntries = viewByDate[date];
                      const dayHours = dayEntries.reduce((s, e) => s + calcHours(e.startTime, e.endTime!, e.breakMin), 0);
                      return (
                        <Card key={date} className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-gray-900">{formatDate(date)}</p>
                            <Badge className={dayHours >= config.workHoursPerDay ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                              {formatHours(dayHours)}
                            </Badge>
                          </div>
                          <div className="space-y-1.5">
                            {dayEntries.map((e) => (
                              <div key={e.id} className="flex items-center justify-between text-sm text-gray-600 group">
                                <span>
                                  {e.startTime} – {e.endTime || "läuft"}
                                  {e.breakMin > 0 && <span className="text-gray-400 ml-1">({e.breakMin}min {t("zeit.pause")})</span>}
                                  {e.notes && <span className="text-gray-400 ml-1">· {e.notes}</span>}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {e.project && <span className="text-xs text-blue-600 truncate max-w-[150px]">{e.project.name}</span>}
                                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                    onClick={() => { setEditEntry(e); setEditForm({ startTime: e.startTime, endTime: e.endTime || "", breakMin: String(e.breakMin), projectId: e.project?.id || "", notes: e.notes || "" }); }}>
                                    <Pencil className="h-3 w-3 text-gray-400" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => {
                                    if (!confirm(t("zeit.eintragLoeschen"))) return;
                                    void deleteEntry(e.id);
                                  }}>
                                    <Trash2 className="h-3 w-3 text-red-400" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Dialog: Admin Einchecken ──────────────── */}
      <Dialog open={adminCheckInOpen} onOpenChange={setAdminCheckInOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{adminCheckInLabel}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-gray-700">{t("common.mitarbeiter")}</label>
              <NativeSelect value={adminCheckInUser} onChange={(e) => setAdminCheckInUser(e.target.value)} className="mt-1">
                <option value="">{t("azubi.mitarbeiterWaehlen")}</option>
                {employees.filter((e) => e.isActive && !checkedInIds.has(e.id)).map((e) => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                ))}
              </NativeSelect>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Uhrzeit</label>
              <Input type="time" value={adminCheckInTime} onChange={(e) => setAdminCheckInTime(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{`${t("common.projekt")} (${t("common.optional")})`}</label>
              <NativeSelect value={adminCheckInProject} onChange={(e) => setAdminCheckInProject(e.target.value)} className="mt-1">
                <option value="">Ohne Projekt</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.projectNumber} – {p.name}</option>)}
              </NativeSelect>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAdminCheckInOpen(false)}>{t("common.abbrechen")}</Button>
              <Button onClick={adminCheckIn} disabled={!adminCheckInUser} className="gap-1.5 bg-green-600 hover:bg-green-700">
                <LogIn className="h-4 w-4" />{t("zeit.einstempeln")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Eintrag nachtragen ──────────────── */}
      <Dialog open={addEntryOpen} onOpenChange={setAddEntryOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Zeiteintrag nachtragen</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-gray-700">{t("common.mitarbeiter")}</label>
              <NativeSelect value={addForm.userId} onChange={(e) => setAddForm({ ...addForm, userId: e.target.value })} className="mt-1">
                <option value="">{t("azubi.mitarbeiterWaehlen")}</option>
                {employees.filter((e) => e.isActive).map((e) => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                ))}
              </NativeSelect>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t("common.datum")}</label>
              <Input type="date" value={addForm.date} onChange={(e) => setAddForm({ ...addForm, date: e.target.value })} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">{t("common.von")}</label>
                <Input type="time" value={addForm.startTime} onChange={(e) => setAddForm({ ...addForm, startTime: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{t("common.bis")}</label>
                <Input type="time" value={addForm.endTime} onChange={(e) => setAddForm({ ...addForm, endTime: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">{`${t("zeit.pause")} (min)`}</label>
                <Input type="number" value={addForm.breakMin} onChange={(e) => setAddForm({ ...addForm, breakMin: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{t("common.projekt")}</label>
                <NativeSelect value={addForm.projectId} onChange={(e) => setAddForm({ ...addForm, projectId: e.target.value })} className="mt-1">
                  <option value="">Ohne Projekt</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.projectNumber} – {p.name}</option>)}
                </NativeSelect>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t("common.notizen")}</label>
              <Input value={addForm.notes} onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })} className="mt-1" placeholder={t("common.optional")} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddEntryOpen(false)}>{t("common.abbrechen")}</Button>
              <Button onClick={handleAddEntry} disabled={!addForm.userId || !addForm.date || !addForm.startTime}>{t("common.speichern")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Eintrag bearbeiten ──────────────── */}
      <Dialog open={!!editEntry} onOpenChange={(open) => { if (!open) setEditEntry(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Eintrag bearbeiten</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">{t("common.von")}</label>
                <Input type="time" value={editForm.startTime} disabled className="mt-1 bg-gray-50" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{t("common.bis")}</label>
                <Input type="time" value={editForm.endTime} onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">{`${t("zeit.pause")} (min)`}</label>
                <Input type="number" value={editForm.breakMin} onChange={(e) => setEditForm({ ...editForm, breakMin: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{t("common.projekt")}</label>
                <NativeSelect value={editForm.projectId} onChange={(e) => setEditForm({ ...editForm, projectId: e.target.value })} className="mt-1">
                  <option value="">Ohne Projekt</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.projectNumber} – {p.name}</option>)}
                </NativeSelect>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t("common.notizen")}</label>
              <Input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} className="mt-1" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditEntry(null)}>{t("common.abbrechen")}</Button>
              <Button onClick={saveEditEntry}>{t("common.speichern")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
