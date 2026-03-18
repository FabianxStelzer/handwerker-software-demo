"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Palmtree,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface VacationRequest {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
  status: "AUSSTEHEND" | "GENEHMIGT" | "ABGELEHNT";
  createdAt: string;
  user?: { id: string; firstName: string; lastName: string };
}

interface UserInfo {
  id: string;
  firstName: string;
  lastName: string;
  vacationDays: number;
  vacationRequests: VacationRequest[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  AUSSTEHEND: { label: "Ausstehend", color: "bg-amber-100 text-amber-700", icon: Clock },
  GENEHMIGT: { label: "Genehmigt", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  ABGELEHNT: { label: "Abgelehnt", color: "bg-red-100 text-red-700", icon: XCircle },
};

const EMPLOYEE_COLORS = [
  "bg-blue-200 text-blue-900",
  "bg-green-200 text-green-900",
  "bg-purple-200 text-purple-900",
  "bg-pink-200 text-pink-900",
  "bg-amber-200 text-amber-900",
  "bg-cyan-200 text-cyan-900",
  "bg-rose-200 text-rose-900",
  "bg-teal-200 text-teal-900",
  "bg-indigo-200 text-indigo-900",
  "bg-orange-200 text-orange-900",
];

function calcWorkdays(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  let count = 0;
  const d = new Date(s);
  while (d <= e) {
    const dow = d.getDay();
    if (dow > 0 && dow < 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function pad2(n: number) { return n.toString().padStart(2, "0"); }

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function TeamCalendar({ vacations }: { vacations: VacationRequest[] }) {
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
  });

  const [y, m] = calMonth.split("-").map(Number);
  const firstDay = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const startDow = firstDay.getDay() || 7;

  const monthLabel = firstDay.toLocaleDateString("de-DE", { month: "long", year: "numeric" });

  const userMap = new Map<string, { name: string; colorIdx: number }>();
  let colorIdx = 0;
  vacations.forEach((v) => {
    if (v.user && !userMap.has(v.userId)) {
      userMap.set(v.userId, { name: `${v.user.firstName} ${v.user.lastName}`, colorIdx: colorIdx++ });
    }
  });

  function getVacationsForDay(day: number): { name: string; color: string; status: string }[] {
    const date = new Date(y, m - 1, day);
    const results: { name: string; color: string; status: string }[] = [];
    vacations.forEach((v) => {
      const start = new Date(v.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(v.endDate);
      end.setHours(23, 59, 59, 999);
      if (date >= start && date <= end) {
        const info = userMap.get(v.userId);
        if (info) {
          results.push({
            name: info.name,
            color: v.status === "AUSSTEHEND" ? "bg-amber-100 text-amber-800 border border-amber-300 border-dashed" : EMPLOYEE_COLORS[info.colorIdx % EMPLOYEE_COLORS.length],
            status: v.status,
          });
        }
      }
    });
    return results;
  }

  const today = new Date();
  const cells: (number | null)[] = [];
  for (let i = 1; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Urlaubskalender
          </h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              const d = new Date(y, m - 2, 1);
              setCalMonth(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`);
            }}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center">{monthLabel}</span>
            <Button variant="outline" size="sm" onClick={() => {
              const d = new Date(y, m, 1);
              setCalMonth(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`);
            }}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden border border-gray-200">
          {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => (
            <div key={d} className="bg-gray-50 py-2 text-center text-xs font-semibold text-gray-500">
              {d}
            </div>
          ))}
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} className="bg-white min-h-[72px]" />;
            }
            const dayVacations = getVacationsForDay(day);
            const isToday = isSameDay(new Date(y, m - 1, day), today);
            const dow = new Date(y, m - 1, day).getDay();
            const isWeekend = dow === 0 || dow === 6;

            return (
              <div
                key={day}
                className={`min-h-[72px] p-1 ${isWeekend ? "bg-gray-50" : "bg-white"}`}
              >
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  isToday ? "bg-blue-600 text-white" : isWeekend ? "text-gray-400" : "text-gray-700"
                }`}>
                  {day}
                </span>
                <div className="mt-0.5 space-y-0.5">
                  {dayVacations.slice(0, 3).map((v, vi) => (
                    <div
                      key={vi}
                      className={`rounded px-1 py-0.5 text-[10px] leading-tight font-medium truncate ${v.color}`}
                      title={`${v.name}${v.status === "AUSSTEHEND" ? " (ausstehend)" : ""}`}
                    >
                      {v.name.split(" ")[0]}
                    </div>
                  ))}
                  {dayVacations.length > 3 && (
                    <div className="text-[10px] text-gray-400 px-1">+{dayVacations.length - 3}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {userMap.size > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {Array.from(userMap.entries()).map(([uid, info]) => (
              <span key={uid} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${EMPLOYEE_COLORS[info.colorIdx % EMPLOYEE_COLORS.length]}`}>
                {info.name}
              </span>
            ))}
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300 border-dashed">
              Ausstehend
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function UrlaubsplanungPage() {
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string })?.id;
  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "ADMIN" || userRole === "BAULEITER";

  const [ownData, setOwnData] = useState<UserInfo | null>(null);
  const [allUsers, setAllUsers] = useState<UserInfo[]>([]);
  const [calendarVacations, setCalendarVacations] = useState<VacationRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ startDate: "", endDate: "", reason: "" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!userId) return;
    const [ownRes, calRes] = await Promise.all([
      fetch(`/api/mitarbeiter/${userId}`),
      fetch(`/api/urlaub?year=${new Date().getFullYear()}`),
    ]);
    if (ownRes.ok) {
      const data = await ownRes.json();
      setOwnData(data);
    }
    if (calRes.ok) {
      setCalendarVacations(await calRes.json());
    }
    if (isAdmin) {
      const allRes = await fetch("/api/mitarbeiter");
      if (allRes.ok) {
        const users = await allRes.json();
        const detailed = await Promise.all(
          users.filter((u: UserInfo) => u.id !== userId).map(async (u: UserInfo) => {
            const r = await fetch(`/api/mitarbeiter/${u.id}`);
            return r.ok ? r.json() : u;
          })
        );
        setAllUsers(detailed);
      }
    }
    setLoading(false);
  }, [userId, isAdmin]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !form.startDate || !form.endDate) return;
    setSubmitting(true);

    const days = calcWorkdays(form.startDate, form.endDate);
    await fetch(`/api/mitarbeiter/${userId}/urlaub`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, days }),
    });

    setForm({ startDate: "", endDate: "", reason: "" });
    setShowForm(false);
    setSubmitting(false);
    loadData();
  }

  async function handleStatusChange(requestId: string, status: string, reqUserId: string) {
    await fetch(`/api/mitarbeiter/${reqUserId}/urlaub`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: requestId, status }),
    });
    loadData();
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  const approvedDays = (ownData?.vacationRequests || [])
    .filter((r) => r.status === "GENEHMIGT" && new Date(r.startDate).getFullYear() === new Date().getFullYear())
    .reduce((sum, r) => sum + r.days, 0);
  const pendingDays = (ownData?.vacationRequests || [])
    .filter((r) => r.status === "AUSSTEHEND")
    .reduce((sum, r) => sum + r.days, 0);
  const totalDays = ownData?.vacationDays ?? 30;
  const remaining = totalDays - approvedDays;

  const allPendingRequests = isAdmin
    ? allUsers.flatMap((u) =>
        (u.vacationRequests || [])
          .filter((r) => r.status === "AUSSTEHEND")
          .map((r) => ({ ...r, user: { firstName: u.firstName, lastName: u.lastName }, userId: u.id }))
      )
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Urlaubsplanung</h1>
          <p className="text-sm text-gray-500 mt-1">Urlaub beantragen und verwalten</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="h-4 w-4" />
          Urlaub beantragen
        </Button>
      </div>

      {showForm && (
        <Card className="border-blue-200">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Neuer Urlaubsantrag</h3>
            <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Von</label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Bis</label>
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    required
                    min={form.startDate || undefined}
                    className="mt-1"
                  />
                </div>
              </div>
              {form.startDate && form.endDate && (
                <p className="text-sm text-blue-600">
                  = {calcWorkdays(form.startDate, form.endDate)} Arbeitstage
                </p>
              )}
              <div>
                <label className="text-xs font-medium text-gray-600">Grund (optional)</label>
                <Textarea
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  rows={2}
                  className="mt-1"
                  placeholder="z.B. Familienurlaub"
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
                  Abbrechen
                </Button>
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? "Senden..." : "Antrag einreichen"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-gray-400">Urlaubstage gesamt</p>
          <p className="text-2xl font-bold text-gray-900">{totalDays}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-gray-400">Genommen</p>
          <p className="text-2xl font-bold text-blue-600">{approvedDays}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-gray-400">Resturlaub</p>
          <div className="flex items-center gap-2">
            <Palmtree className={`h-5 w-5 ${remaining > 5 ? "text-green-600" : "text-amber-600"}`} />
            <p className={`text-2xl font-bold ${remaining > 5 ? "text-green-600" : "text-amber-600"}`}>
              {remaining}
            </p>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-gray-400">Ausstehend</p>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            <p className="text-2xl font-bold text-amber-600">{pendingDays}</p>
          </div>
          <p className="text-xs text-gray-500">Tage beantragt</p>
        </Card>
      </div>

      <TeamCalendar vacations={calendarVacations} />

      {isAdmin && allPendingRequests.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Offene Urlaubsanträge ({allPendingRequests.length})
            </h3>
            <div className="space-y-3">
              {allPendingRequests.map((req) => (
                <div key={req.id} className="flex items-center gap-4 bg-white rounded-lg border border-amber-200 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700 shrink-0">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {req.user?.firstName} {req.user?.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(req.startDate)} – {formatDate(req.endDate)} · {req.days} Tage
                      {req.reason && <> · {req.reason}</>}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 gap-1"
                      onClick={() => handleStatusChange(req.id, "GENEHMIGT", req.userId)}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Genehmigen
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1"
                      onClick={() => handleStatusChange(req.id, "ABGELEHNT", req.userId)}
                    >
                      <XCircle className="h-4 w-4" />
                      Ablehnen
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Meine Urlaubsanträge</h2>
        {(ownData?.vacationRequests || []).length === 0 ? (
          <Card className="p-8 text-center text-gray-400">
            <CalendarDays className="h-12 w-12 mx-auto mb-3" />
            <p>Noch keine Urlaubsanträge</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {(ownData?.vacationRequests || []).map((req) => {
              const conf = STATUS_CONFIG[req.status] || STATUS_CONFIG.AUSSTEHEND;
              const StatusIcon = conf.icon;
              return (
                <Card key={req.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${conf.color}`}>
                        <StatusIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(req.startDate)} – {formatDate(req.endDate)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {req.days} Tage{req.reason && ` · ${req.reason}`}
                        </p>
                      </div>
                    </div>
                    <Badge className={conf.color}>{conf.label}</Badge>
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
