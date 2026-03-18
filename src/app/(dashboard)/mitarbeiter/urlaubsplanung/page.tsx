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
  TrendingUp,
  TrendingDown,
  Minus,
  User,
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
  user?: { firstName: string; lastName: string };
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

export default function UrlaubsplanungPage() {
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string })?.id;
  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "ADMIN" || userRole === "BAULEITER";

  const [ownData, setOwnData] = useState<UserInfo | null>(null);
  const [allUsers, setAllUsers] = useState<UserInfo[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ startDate: "", endDate: "", reason: "" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!userId) return;
    const ownRes = await fetch(`/api/mitarbeiter/${userId}`);
    if (ownRes.ok) {
      const data = await ownRes.json();
      setOwnData(data);
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
