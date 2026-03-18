"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/select";
import {
  Clock,
  LogIn,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Coffee,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

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
  user: { id: string; firstName: string; lastName: string };
}

interface CompanyConfig {
  lunchBreakMinutes: number;
  workHoursPerDay: number;
}

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function nowTimeStr() {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function calcHours(start: string, end: string, breakMin: number): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm) - breakMin;
  return Math.max(0, mins / 60);
}

function formatHours(h: number): string {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${hrs}h ${pad2(mins)}min`;
}

export default function ZeiterfassungPage() {
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string })?.id;
  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "ADMIN" || userRole === "BAULEITER";

  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [elapsed, setElapsed] = useState("00:00:00");
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [config, setConfig] = useState<CompanyConfig>({ lunchBreakMinutes: 30, workHoursPerDay: 8 });
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
  });
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    if (!userId) return;
    const [activeRes, monthRes, projRes, configRes] = await Promise.all([
      fetch(`/api/zeiterfassung?userId=${userId}&active=true`),
      fetch(`/api/zeiterfassung?userId=${userId}&month=${month}`),
      fetch("/api/projekte"),
      fetch("/api/settings/company"),
    ]);
    if (activeRes.ok) {
      const active = await activeRes.json();
      setActiveEntry(active.length > 0 ? active[0] : null);
    }
    if (monthRes.ok) setEntries(await monthRes.json());
    if (projRes.ok) {
      const allProjects = await projRes.json();
      setProjects(Array.isArray(allProjects) ? allProjects : []);
    }
    if (configRes.ok) {
      const c = await configRes.json();
      if (c && !c.error) {
        setConfig({
          lunchBreakMinutes: c.lunchBreakMinutes ?? 30,
          workHoursPerDay: c.workHoursPerDay ?? 8,
        });
      }
    }
    setLoading(false);
  }, [userId, month]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (activeEntry) {
      function tick() {
        const [h, m] = activeEntry!.startTime.split(":").map(Number);
        const start = new Date();
        start.setHours(h, m, 0, 0);
        const diff = Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000));
        const hrs = Math.floor(diff / 3600);
        const mins = Math.floor((diff % 3600) / 60);
        const secs = diff % 60;
        setElapsed(`${pad2(hrs)}:${pad2(mins)}:${pad2(secs)}`);
      }
      tick();
      timerRef.current = setInterval(tick, 1000);
    } else {
      setElapsed("00:00:00");
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeEntry]);

  async function handleCheckIn() {
    if (!userId) return;
    const now = new Date();
    const res = await fetch("/api/zeiterfassung", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        date: now.toISOString().split("T")[0],
        startTime: nowTimeStr(),
        projectId: selectedProject || null,
      }),
    });
    if (res.ok) {
      const entry = await res.json();
      setActiveEntry(entry);
      loadData();
    }
  }

  async function handleCheckOut() {
    if (!activeEntry) return;
    const endTime = nowTimeStr();
    const totalMinutes = (() => {
      const [sh, sm] = activeEntry.startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
      return eh * 60 + em - (sh * 60 + sm);
    })();
    const autoBreak = totalMinutes >= 360 ? config.lunchBreakMinutes : 0;

    const res = await fetch("/api/zeiterfassung", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: activeEntry.id,
        endTime,
        breakMin: autoBreak,
      }),
    });
    if (res.ok) {
      setActiveEntry(null);
      loadData();
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  const completedEntries = entries.filter((e) => e.endTime);
  const totalHours = completedEntries.reduce(
    (sum, e) => sum + calcHours(e.startTime, e.endTime!, e.breakMin),
    0
  );

  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  let workdaysInMonth = 0;
  for (let i = 1; i <= daysInMonth; i++) {
    const dow = new Date(y, m - 1, i).getDay();
    if (dow > 0 && dow < 6) workdaysInMonth++;
  }

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Zeiterfassung</h1>
        <p className="text-sm text-gray-500 mt-1">Ein- und Auschecken, Arbeitszeiten verwalten</p>
      </div>

      <Card className={activeEntry ? "border-green-300 bg-green-50/30" : "border-blue-200 bg-blue-50/30"}>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="text-center">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                {activeEntry ? "Arbeitszeit läuft" : "Nicht eingestempelt"}
              </p>
              <p className={`text-4xl font-mono font-bold ${activeEntry ? "text-green-700" : "text-gray-400"}`}>
                {elapsed}
              </p>
              {activeEntry && (
                <p className="text-sm text-gray-500 mt-1">
                  Seit {activeEntry.startTime} Uhr
                  {activeEntry.project && <> · {activeEntry.project.name}</>}
                </p>
              )}
            </div>

            <div className="flex-1 flex flex-col sm:flex-row items-center gap-3">
              {!activeEntry && (
                <NativeSelect
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full sm:w-auto min-w-[200px]"
                >
                  <option value="">Ohne Projekt</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectNumber} – {p.name}
                    </option>
                  ))}
                </NativeSelect>
              )}

              {activeEntry ? (
                <Button onClick={handleCheckOut} size="lg" variant="destructive" className="gap-2">
                  <LogOut className="h-5 w-5" />
                  Auschecken
                </Button>
              ) : (
                <Button onClick={handleCheckIn} size="lg" className="gap-2 bg-green-600 hover:bg-green-700">
                  <LogIn className="h-5 w-5" />
                  Einchecken
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-gray-400">Gearbeitete Stunden</p>
          <p className="text-2xl font-bold text-gray-900">{formatHours(totalHours)}</p>
          <p className="text-xs text-gray-500">von {formatHours(targetHours)} Soll</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-gray-400">Arbeitstage</p>
          <p className="text-2xl font-bold text-gray-900">{sortedDates.length}</p>
          <p className="text-xs text-gray-500">von {workdaysInMonth} Werktagen</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-gray-400">Überstunden</p>
          <div className="flex items-center gap-2">
            {overtime > 0.5 ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : overtime < -0.5 ? (
              <TrendingDown className="h-5 w-5 text-red-600" />
            ) : (
              <Minus className="h-5 w-5 text-gray-400" />
            )}
            <p className={`text-2xl font-bold ${overtime > 0.5 ? "text-green-600" : overtime < -0.5 ? "text-red-600" : "text-gray-900"}`}>
              {overtime >= 0 ? "+" : ""}{formatHours(Math.abs(overtime))}
            </p>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-gray-400">Mittagspause</p>
          <div className="flex items-center gap-2">
            <Coffee className="h-5 w-5 text-amber-600" />
            <p className="text-2xl font-bold text-gray-900">{config.lunchBreakMinutes} min</p>
          </div>
          <p className="text-xs text-gray-500">automatisch ab 6h</p>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Monatsübersicht</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const d = new Date(y, m - 2, 1);
                setMonth(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center">{monthLabel}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const d = new Date(y, m, 1);
                setMonth(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {sortedDates.length === 0 ? (
          <Card className="p-8 text-center text-gray-400">
            <Clock className="h-12 w-12 mx-auto mb-3" />
            <p>Keine Einträge in diesem Monat</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {sortedDates.map((date) => {
              const dayEntries = entriesByDate[date];
              const dayHours = dayEntries.reduce(
                (s, e) => s + calcHours(e.startTime, e.endTime!, e.breakMin),
                0
              );
              const dayDate = new Date(date);
              const dayLabel = dayDate.toLocaleDateString("de-DE", {
                weekday: "short",
                day: "2-digit",
                month: "2-digit",
              });

              return (
                <Card key={date} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-900">{dayLabel}</p>
                    <Badge className={dayHours >= config.workHoursPerDay ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                      {formatHours(dayHours)}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {dayEntries.map((e) => (
                      <div key={e.id} className="flex items-center justify-between text-sm text-gray-600">
                        <span>
                          {e.startTime} – {e.endTime}
                          {e.breakMin > 0 && <span className="text-gray-400 ml-1">({e.breakMin}min Pause)</span>}
                        </span>
                        {e.project && (
                          <span className="text-xs text-blue-600 truncate max-w-[200px]">
                            {e.project.name}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
