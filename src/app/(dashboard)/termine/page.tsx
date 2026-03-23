"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/select";
import {
  CalendarDays, Plus, Clock, MapPin, Users, Phone, Mail, ChevronLeft, ChevronRight,
  Trash2, Edit2, Copy, ExternalLink, Check, X, Link2, Search, Eye,
  AlertTriangle, FolderKanban,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translations";

interface Appointment {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  location: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
  notes: string | null;
  customerId: string | null;
  customer: { id: string; firstName: string; lastName: string; company: string | null; phone?: string; email?: string } | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  assignedToId: string | null;
  assignedTo: { id: string; firstName: string; lastName: string } | null;
  projectId: string | null;
  project: { id: string; name: string; projectNumber: string | null } | null;
  bookingRequestId: string | null;
  reminder: boolean;
  reminderMinutes: number;
  color: string | null;
  createdById: string | null;
}

interface BookingLink {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  isActive: boolean;
  types: string | null;
  availableDays: string | null;
  startHour: number;
  endHour: number;
  slotDuration: number;
  bufferTime: number;
  maxDaysAhead: number;
  assignedToId: string | null;
  _count: { requests: number };
}

interface AppointmentRequest {
  id: string;
  bookingLinkId: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  message: string | null;
  type: string;
  preferredDate: string;
  preferredTime: string | null;
  alternativeDate: string | null;
  status: string;
  appointmentId: string | null;
  createdAt: string;
}

interface Employee { id: string; firstName: string; lastName: string }
interface Customer { id: string; firstName: string; lastName: string; company: string | null }
interface Project { id: string; name: string; projectNumber: string | null }

const TYPES: { value: string; tKey: TranslationKey }[] = [
  { value: "BERATUNG", tKey: "termine.beratung" },
  { value: "BESICHTIGUNG", tKey: "termine.besichtigung" },
  { value: "REPARATUR", tKey: "termine.reparatur" },
  { value: "WARTUNG", tKey: "termine.wartung" },
  { value: "INSTALLATION", tKey: "termine.installation" },
  { value: "NOTDIENST", tKey: "termine.notdienst" },
  { value: "ABNAHME", tKey: "termine.abnahme" },
  { value: "SONSTIGES", tKey: "termine.sonstiges" },
];

const STATUSES: { value: string; tKey: TranslationKey; color: string }[] = [
  { value: "GEPLANT", tKey: "termine.geplant", color: "bg-blue-100 text-blue-800" },
  { value: "BESTAETIGT", tKey: "termine.bestaetigt", color: "bg-green-100 text-green-800" },
  { value: "IN_BEARBEITUNG", tKey: "termine.inBearbeitung", color: "bg-yellow-100 text-yellow-800" },
  { value: "ABGESCHLOSSEN", tKey: "termine.abgeschlossen", color: "bg-gray-100 text-gray-800" },
  { value: "ABGESAGT", tKey: "termine.abgesagt", color: "bg-red-100 text-red-800" },
];

const TYPE_COLORS: Record<string, string> = {
  BERATUNG: "#3b82f6", BESICHTIGUNG: "#8b5cf6", REPARATUR: "#ef4444",
  WARTUNG: "#f59e0b", INSTALLATION: "#10b981", NOTDIENST: "#dc2626",
  ABNAHME: "#06b6d4", SONSTIGES: "#6b7280",
};

const DAY_KEYS: TranslationKey[] = [
  "termine.mo", "termine.di", "termine.mi", "termine.do", "termine.fr", "termine.sa", "termine.so",
];

function toLocal(d: Date) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toLocalTime(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getWeekDates(date: Date): Date[] {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return Array.from({ length: 7 }, (_, i) => { const dd = new Date(monday); dd.setDate(monday.getDate() + i); return dd; });
}

function getMonthDates(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const weeks: Date[][] = [];
  let week: Date[] = [];
  for (let i = 0; i < startOffset; i++) {
    const d = new Date(year, month, 1 - startOffset + i);
    week.push(d);
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    week.push(new Date(year, month, d));
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) {
    while (week.length < 7) {
      const last = week[week.length - 1];
      const next = new Date(last);
      next.setDate(next.getDate() + 1);
      week.push(next);
    }
    weeks.push(week);
  }
  return weeks;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 6);

export default function TerminePage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"kalender" | "liste" | "anfragen" | "buchungslinks">("kalender");
  const [calView, setCalView] = useState<"month" | "week">("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [bookingLinks, setBookingLinks] = useState<BookingLink[]>([]);
  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [searchQ, setSearchQ] = useState("");
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const emptyForm = {
    title: "", description: "", type: "BERATUNG", status: "GEPLANT",
    startDate: toLocal(new Date()), startTime: "09:00",
    endDate: toLocal(new Date()), endTime: "10:00",
    allDay: false, location: "", street: "", zip: "", city: "",
    notes: "", customerId: "", assignedToId: "", projectId: "",
    reminder: true, reminderMinutes: 60, color: "",
    customerName: "", customerEmail: "", customerPhone: "",
  };
  const [form, setForm] = useState(emptyForm);

  const emptyLinkForm = {
    title: "", slug: "", description: "", types: "",
    startHour: 8, endHour: 17, slotDuration: 60, bufferTime: 15,
    maxDaysAhead: 30, assignedToId: "",
    mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false,
  };
  const [linkForm, setLinkForm] = useState(emptyLinkForm);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, bRes, eRes, cRes, pRes] = await Promise.all([
        fetch("/api/termine"), fetch("/api/booking-links"),
        fetch("/api/mitarbeiter"), fetch("/api/kunden"),
        fetch("/api/projekte"),
      ]);
      if (aRes.ok) setAppointments(await aRes.json());
      if (bRes.ok) {
        const links: BookingLink[] = await bRes.json();
        setBookingLinks(links);
        const allReqs: AppointmentRequest[] = [];
        for (const l of links) {
          const rr = await fetch(`/api/booking-links/${l.slug}`);
          if (rr.ok) {
            const full = await rr.json();
            if (full.requests) allReqs.push(...full.requests);
          }
        }
        setRequests(allReqs);
      }
      if (eRes.ok) { const d = await eRes.json(); setEmployees(Array.isArray(d) ? d : d.employees || []); }
      if (cRes.ok) { const d = await cRes.json(); setCustomers(Array.isArray(d) ? d : d.customers || []); }
      if (pRes.ok) { const d = await pRes.json(); setProjects(Array.isArray(d) ? d : d.projects || []); }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const typeLabel = useCallback((val: string) => {
    const found = TYPES.find(x => x.value === val);
    return found ? t(found.tKey) : val;
  }, [t]);

  const statusObj = useCallback((val: string) => {
    return STATUSES.find(x => x.value === val) || STATUSES[0];
  }, []);

  const filteredAppointments = useMemo(() => {
    let items = [...appointments];
    if (filterStatus !== "all") items = items.filter(a => a.status === filterStatus);
    if (filterType !== "all") items = items.filter(a => a.type === filterType);
    if (searchQ) {
      const q = searchQ.toLowerCase();
      items = items.filter(a =>
        a.title.toLowerCase().includes(q) ||
        (a.customer && `${a.customer.firstName} ${a.customer.lastName}`.toLowerCase().includes(q)) ||
        (a.customerName || "").toLowerCase().includes(q) ||
        (a.location || "").toLowerCase().includes(q)
      );
    }
    return items;
  }, [appointments, filterStatus, filterType, searchQ]);

  async function saveAppointment() {
    const startTime = form.allDay
      ? new Date(`${form.startDate}T00:00:00`)
      : new Date(`${form.startDate}T${form.startTime}:00`);
    const endTime = form.allDay
      ? new Date(`${form.endDate}T23:59:59`)
      : new Date(`${form.endDate}T${form.endTime}:00`);

    const body = {
      title: form.title, description: form.description || null,
      type: form.type, status: form.status,
      startTime: startTime.toISOString(), endTime: endTime.toISOString(),
      allDay: form.allDay, location: form.location || null,
      street: form.street || null, zip: form.zip || null, city: form.city || null,
      notes: form.notes || null,
      customerId: form.customerId || null,
      customerName: form.customerName || null,
      customerEmail: form.customerEmail || null,
      customerPhone: form.customerPhone || null,
      assignedToId: form.assignedToId || null,
      projectId: form.projectId || null,
      reminder: form.reminder, reminderMinutes: form.reminderMinutes,
      color: form.color || null,
    };

    const url = editingId ? `/api/termine/${editingId}` : "/api/termine";
    const res = await fetch(url, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setMsg(editingId ? t("termine.terminAktualisiert") : t("termine.terminErstellt"));
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      fetchAll();
      setTimeout(() => setMsg(""), 3000);
    }
  }

  async function deleteAppointment(id: string) {
    if (!confirm(t("termine.terminLoeschenBestaetigen"))) return;
    const res = await fetch(`/api/termine/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMsg(t("termine.terminGeloescht"));
      setDetailId(null);
      fetchAll();
      setTimeout(() => setMsg(""), 3000);
    }
  }

  function openEdit(a: Appointment) {
    const s = new Date(a.startTime);
    const e = new Date(a.endTime);
    setForm({
      title: a.title, description: a.description || "", type: a.type, status: a.status,
      startDate: toLocal(s), startTime: toLocalTime(s),
      endDate: toLocal(e), endTime: toLocalTime(e),
      allDay: a.allDay, location: a.location || "", street: a.street || "",
      zip: a.zip || "", city: a.city || "", notes: a.notes || "",
      customerId: a.customerId || "", assignedToId: a.assignedToId || "",
      projectId: a.projectId || "", reminder: a.reminder, reminderMinutes: a.reminderMinutes,
      color: a.color || "", customerName: a.customerName || "",
      customerEmail: a.customerEmail || "", customerPhone: a.customerPhone || "",
    });
    setEditingId(a.id);
    setShowForm(true);
    setDetailId(null);
  }

  function openNewOnDate(date: Date) {
    setForm({ ...emptyForm, startDate: toLocal(date), endDate: toLocal(date) });
    setEditingId(null);
    setShowForm(true);
  }

  async function saveLinkForm() {
    const days = JSON.stringify({
      mon: linkForm.mon, tue: linkForm.tue, wed: linkForm.wed,
      thu: linkForm.thu, fri: linkForm.fri, sat: linkForm.sat, sun: linkForm.sun,
    });
    const body = {
      title: linkForm.title, slug: linkForm.slug || undefined,
      description: linkForm.description || null, types: linkForm.types || null,
      availableDays: days, startHour: linkForm.startHour, endHour: linkForm.endHour,
      slotDuration: linkForm.slotDuration, bufferTime: linkForm.bufferTime,
      maxDaysAhead: linkForm.maxDaysAhead, assignedToId: linkForm.assignedToId || null,
    };
    const res = await fetch("/api/booking-links", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      setShowLinkForm(false);
      setLinkForm(emptyLinkForm);
      fetchAll();
    }
  }

  function copyLink(slug: string) {
    navigator.clipboard.writeText(`${window.location.origin}/buchen/${slug}`);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  }

  async function deleteLink(slug: string) {
    await fetch(`/api/booking-links/${slug}`, { method: "DELETE" });
    fetchAll();
  }

  async function handleRequest(reqId: string, accept: boolean) {
    const req = requests.find(r => r.id === reqId);
    if (!req) return;
    if (accept) {
      const body = {
        title: `${typeLabel(req.type)} - ${req.customerName}`,
        type: req.type, status: "GEPLANT",
        startTime: new Date(req.preferredDate).toISOString(),
        endTime: new Date(new Date(req.preferredDate).getTime() + 3600000).toISOString(),
        customerName: req.customerName, customerEmail: req.customerEmail,
        customerPhone: req.customerPhone, notes: req.message,
        bookingRequestId: req.id,
      };
      await fetch("/api/termine", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    fetchAll();
  }

  const tabs = useMemo(() => [
    { key: "kalender" as const, label: t("termine.kalender"), icon: CalendarDays },
    { key: "liste" as const, label: t("termine.liste"), icon: Clock },
    { key: "anfragen" as const, label: t("termine.anfragen"), icon: AlertTriangle, count: requests.filter(r => r.status === "NEU").length },
    { key: "buchungslinks" as const, label: t("termine.buchungslinks"), icon: Link2 },
  ], [t, requests]);

  const monthNames = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

  const appointmentsForDay = useCallback((date: Date) => {
    return filteredAppointments.filter(a => {
      const s = new Date(a.startTime);
      return isSameDay(s, date);
    });
  }, [filteredAppointments]);

  const detailAppointment = useMemo(() => appointments.find(a => a.id === detailId), [appointments, detailId]);

  if (loading) return <div className="p-8 text-center opacity-50">{t("common.laden")}</div>;

  return (
    <div className="space-y-6">
      {msg && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded-lg text-sm">{msg}</div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold" style={{ color: "#212f46" }}>{t("termine.titel")}</h1>
        <Button onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }} className="gap-2" style={{ background: "#9eb552" }}>
          <Plus className="h-4 w-4" /> {t("termine.neuerTermin")}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {tabs.map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === tb.key ? "bg-white shadow text-[#212f46]" : "text-gray-600 hover:text-gray-900"}`}>
            <tb.icon className="h-4 w-4" /> {tb.label}
            {tb.count ? <Badge variant="destructive" className="ml-1 text-xs">{tb.count}</Badge> : null}
          </button>
        ))}
      </div>

      {/* ────── KALENDER TAB ────── */}
      {tab === "kalender" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                const d = new Date(currentDate);
                if (calView === "month") d.setMonth(d.getMonth() - 1); else d.setDate(d.getDate() - 7);
                setCurrentDate(d);
              }}><ChevronLeft className="h-4 w-4" /></Button>
              <h2 className="text-lg font-semibold min-w-[200px] text-center">
                {calView === "month"
                  ? `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                  : `KW ${Math.ceil((((currentDate.getTime() - new Date(currentDate.getFullYear(), 0, 1).getTime()) / 86400000) + new Date(currentDate.getFullYear(), 0, 1).getDay() + 1) / 7)}`}
              </h2>
              <Button variant="outline" size="sm" onClick={() => {
                const d = new Date(currentDate);
                if (calView === "month") d.setMonth(d.getMonth() + 1); else d.setDate(d.getDate() + 7);
                setCurrentDate(d);
              }}><ChevronRight className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>{t("termine.heute")}</Button>
            </div>
            <div className="flex gap-1 bg-gray-100 rounded p-0.5">
              <button onClick={() => setCalView("month")} className={`px-3 py-1 rounded text-sm ${calView === "month" ? "bg-white shadow" : ""}`}>
                {t("termine.dieserMonat")}
              </button>
              <button onClick={() => setCalView("week")} className={`px-3 py-1 rounded text-sm ${calView === "week" ? "bg-white shadow" : ""}`}>
                {t("termine.dieseWoche")}
              </button>
            </div>
          </div>

          {calView === "month" && (
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="grid grid-cols-7 border-b">
                {DAY_KEYS.map(dk => (
                  <div key={dk} className="text-center text-xs font-medium text-gray-500 py-2 border-r last:border-r-0">{t(dk)}</div>
                ))}
              </div>
              {getMonthDates(currentDate.getFullYear(), currentDate.getMonth()).map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 border-b last:border-b-0">
                  {week.map((day, di) => {
                    const isToday = isSameDay(day, new Date());
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                    const dayAppts = appointmentsForDay(day);
                    return (
                      <div key={di}
                        className={`min-h-[100px] border-r last:border-r-0 p-1 cursor-pointer hover:bg-gray-50 transition-colors ${!isCurrentMonth ? "bg-gray-50/50" : ""}`}
                        onClick={() => openNewOnDate(day)}>
                        <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-[#9eb552] text-white" : isCurrentMonth ? "text-gray-900" : "text-gray-400"}`}>
                          {day.getDate()}
                        </div>
                        <div className="space-y-0.5">
                          {dayAppts.slice(0, 3).map(a => (
                            <div key={a.id} onClick={(e) => { e.stopPropagation(); setDetailId(a.id); }}
                              className="text-xs px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                              style={{ backgroundColor: (a.color || TYPE_COLORS[a.type] || "#6b7280") + "20", color: a.color || TYPE_COLORS[a.type] || "#6b7280", borderLeft: `3px solid ${a.color || TYPE_COLORS[a.type] || "#6b7280"}` }}>
                              {!a.allDay && <span className="font-medium">{toLocalTime(new Date(a.startTime))} </span>}
                              {a.title}
                            </div>
                          ))}
                          {dayAppts.length > 3 && <div className="text-xs text-gray-500 pl-1">+{dayAppts.length - 3}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {calView === "week" && (
            <div className="bg-white rounded-xl border overflow-auto">
              <div className="grid grid-cols-[60px_repeat(7,1fr)] min-w-[800px]">
                <div className="border-b border-r" />
                {getWeekDates(currentDate).map((day, i) => (
                  <div key={i} className={`text-center py-2 border-b border-r text-sm ${isSameDay(day, new Date()) ? "bg-[#9eb552]/10 font-bold" : ""}`}>
                    <span className="text-gray-500">{t(DAY_KEYS[i])}</span>
                    <br />
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${isSameDay(day, new Date()) ? "bg-[#9eb552] text-white" : ""}`}>
                      {day.getDate()}
                    </span>
                  </div>
                ))}
                {HOURS.map(h => (
                  <div key={h} className="contents">
                    <div className="text-xs text-gray-400 text-right pr-2 py-3 border-r">{String(h).padStart(2, "0")}:00</div>
                    {getWeekDates(currentDate).map((day, di) => {
                      const dayAppts = appointmentsForDay(day).filter(a => {
                        if (a.allDay) return h === 6;
                        const sh = new Date(a.startTime).getHours();
                        return sh === h;
                      });
                      return (
                        <div key={di} className="border-r border-b min-h-[48px] p-0.5 cursor-pointer hover:bg-gray-50"
                          onClick={() => {
                            const d = new Date(day);
                            d.setHours(h, 0, 0, 0);
                            const end = new Date(d);
                            end.setHours(h + 1);
                            setForm({ ...emptyForm, startDate: toLocal(d), startTime: `${String(h).padStart(2, "0")}:00`, endDate: toLocal(d), endTime: `${String(h + 1).padStart(2, "0")}:00` });
                            setEditingId(null);
                            setShowForm(true);
                          }}>
                          {dayAppts.map(a => (
                            <div key={a.id} onClick={(e) => { e.stopPropagation(); setDetailId(a.id); }}
                              className="text-xs px-1 py-0.5 rounded mb-0.5 truncate cursor-pointer"
                              style={{ backgroundColor: (a.color || TYPE_COLORS[a.type] || "#6b7280") + "30", color: a.color || TYPE_COLORS[a.type] || "#6b7280" }}>
                              {a.title}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ────── LISTE TAB ────── */}
      {tab === "liste" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input className="pl-9" placeholder={t("common.suchen")} value={searchQ} onChange={e => setSearchQ(e.target.value)} />
            </div>
            <NativeSelect value={filterStatus} onValueChange={setFilterStatus}>
              <option value="all">{t("termine.alle")} {t("termine.status")}</option>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{t(s.tKey)}</option>)}
            </NativeSelect>
            <NativeSelect value={filterType} onValueChange={setFilterType}>
              <option value="all">{t("termine.alle")} {t("termine.typ")}</option>
              {TYPES.map(ty => <option key={ty.value} value={ty.value}>{t(ty.tKey)}</option>)}
            </NativeSelect>
          </div>

          {filteredAppointments.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-gray-500">{t("termine.keineTermine")}</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {filteredAppointments.map(a => {
                const s = statusObj(a.status);
                return (
                  <Card key={a.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setDetailId(a.id)}>
                    <CardContent className="py-3 flex items-center gap-4">
                      <div className="w-1 h-12 rounded-full" style={{ backgroundColor: a.color || TYPE_COLORS[a.type] || "#6b7280" }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">{a.title}</span>
                          <Badge className={`text-xs ${s.color}`}>{t(s.tKey)}</Badge>
                          <Badge variant="outline" className="text-xs">{typeLabel(a.type)}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(a.startTime).toLocaleDateString("de-DE")}
                            {!a.allDay && ` ${toLocalTime(new Date(a.startTime))} – ${toLocalTime(new Date(a.endTime))}`}
                          </span>
                          {(a.customer || a.customerName) && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {a.customer ? `${a.customer.firstName} ${a.customer.lastName}` : a.customerName}
                            </span>
                          )}
                          {a.location && (
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {a.location}</span>
                          )}
                          {a.assignedTo && (
                            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {a.assignedTo.firstName} {a.assignedTo.lastName}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(a); }}><Edit2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); deleteAppointment(a.id); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ────── ANFRAGEN TAB ────── */}
      {tab === "anfragen" && (
        <div className="space-y-4">
          {requests.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-gray-500">{t("termine.keineTermine")}</CardContent></Card>
          ) : (
            requests.map(r => (
              <Card key={r.id} className={r.status === "NEU" ? "border-[#9eb552]" : ""}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">{r.customerName}</span>
                        <Badge variant={r.status === "NEU" ? "default" : "secondary"}>{r.status}</Badge>
                        <Badge variant="outline">{typeLabel(r.type)}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {t("termine.wunschtermin")}: {new Date(r.preferredDate).toLocaleDateString("de-DE")} {r.preferredTime || ""}</span>
                        {r.alternativeDate && <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {t("termine.alternativtermin")}: {new Date(r.alternativeDate).toLocaleDateString("de-DE")}</span>}
                        {r.customerEmail && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {r.customerEmail}</span>}
                        {r.customerPhone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {r.customerPhone}</span>}
                      </div>
                      {r.message && <p className="text-sm text-gray-500 mt-2 bg-gray-50 p-2 rounded">{r.message}</p>}
                    </div>
                    {r.status === "NEU" && (
                      <div className="flex gap-2">
                        <Button size="sm" className="gap-1" style={{ background: "#9eb552" }} onClick={() => handleRequest(r.id, true)}>
                          <Check className="h-3.5 w-3.5" /> {t("termine.anfrageAnnehmen")}
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 text-red-600 border-red-200" onClick={() => handleRequest(r.id, false)}>
                          <X className="h-3.5 w-3.5" /> {t("termine.anfrageAblehnen")}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ────── BUCHUNGSLINKS TAB ────── */}
      {tab === "buchungslinks" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t("termine.buchungslinkTitel")}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">{t("termine.buchungslinkBeschreibung")}</p>
                </div>
                <Button onClick={() => setShowLinkForm(true)} className="gap-2" style={{ background: "#9eb552" }}>
                  <Plus className="h-4 w-4" /> {t("termine.buchungslink")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {bookingLinks.length === 0 ? (
                <p className="text-center text-gray-500 py-8">{t("termine.keineTermine")}</p>
              ) : (
                <div className="space-y-3">
                  {bookingLinks.map(l => (
                    <div key={l.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-gray-50">
                      <div className={`w-3 h-3 rounded-full ${l.isActive ? "bg-green-500" : "bg-gray-300"}`} />
                      <div className="flex-1">
                        <div className="font-medium">{l.title}</div>
                        <div className="text-sm text-gray-500">/buchen/{l.slug} · {l.slotDuration} min · {l._count.requests} {t("termine.anfragen")}</div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => copyLink(l.slug)} className="gap-1">
                          {copiedSlug === l.slug ? <><Check className="h-4 w-4 text-green-500" /> {t("termine.linkKopiert")}</> : <><Copy className="h-4 w-4" /> {t("termine.linkKopieren")}</>}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => window.open(`/buchen/${l.slug}`, "_blank")}><ExternalLink className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteLink(l.slug)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* LINK FORM */}
          {showLinkForm && (
            <Card>
              <CardHeader><CardTitle>{t("termine.buchungslink")}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">{t("termine.linkName")} *</label>
                    <Input value={linkForm.title} onChange={e => setLinkForm({ ...linkForm, title: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t("termine.linkSlug")}</label>
                    <Input value={linkForm.slug} onChange={e => setLinkForm({ ...linkForm, slug: e.target.value })} placeholder="auto" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">{t("termine.beschreibung")}</label>
                  <Textarea value={linkForm.description} onChange={e => setLinkForm({ ...linkForm, description: e.target.value })} rows={2} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">{t("termine.verfuegbareTage")}</label>
                  <div className="flex gap-2">
                    {(["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const).map((d, i) => (
                      <button key={d} onClick={() => setLinkForm({ ...linkForm, [d]: !linkForm[d] })}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${linkForm[d] ? "bg-[#9eb552] text-white" : "bg-gray-100 text-gray-500"}`}>
                        {t(DAY_KEYS[i])}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium">{t("termine.startUhrzeit")}</label>
                    <Input type="number" min={0} max={23} value={linkForm.startHour} onChange={e => setLinkForm({ ...linkForm, startHour: +e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t("termine.endUhrzeit")}</label>
                    <Input type="number" min={0} max={23} value={linkForm.endHour} onChange={e => setLinkForm({ ...linkForm, endHour: +e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t("termine.terminDauer")}</label>
                    <Input type="number" min={15} value={linkForm.slotDuration} onChange={e => setLinkForm({ ...linkForm, slotDuration: +e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t("termine.pufferzeit")}</label>
                    <Input type="number" min={0} value={linkForm.bufferTime} onChange={e => setLinkForm({ ...linkForm, bufferTime: +e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">{t("termine.maxTageVoraus")}</label>
                    <Input type="number" min={1} value={linkForm.maxDaysAhead} onChange={e => setLinkForm({ ...linkForm, maxDaysAhead: +e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t("termine.mitarbeiter")}</label>
                    <NativeSelect value={linkForm.assignedToId} onValueChange={v => setLinkForm({ ...linkForm, assignedToId: v })}>
                      <option value="">—</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                    </NativeSelect>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={saveLinkForm} style={{ background: "#9eb552" }}>{t("termine.speichern")}</Button>
                  <Button variant="outline" onClick={() => setShowLinkForm(false)}>{t("termine.abbrechen")}</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ────── TERMIN FORM DIALOG ────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-10 overflow-auto" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 mb-10" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editingId ? t("termine.terminBearbeiten") : t("termine.neuerTermin")}</h2>
              <button onClick={() => setShowForm(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-auto">
              <div>
                <label className="text-sm font-medium">{t("termine.titel_label")} *</label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">{t("termine.typ")}</label>
                  <NativeSelect value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                    {TYPES.map(ty => <option key={ty.value} value={ty.value}>{t(ty.tKey)}</option>)}
                  </NativeSelect>
                </div>
                <div>
                  <label className="text-sm font-medium">{t("termine.status")}</label>
                  <NativeSelect value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{t(s.tKey)}</option>)}
                  </NativeSelect>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.allDay} onChange={e => setForm({ ...form, allDay: e.target.checked })} className="rounded" />
                  {t("termine.ganztaegig")}
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">{t("termine.datum")} ({t("termine.startzeit")})</label>
                  <Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value, endDate: form.endDate < e.target.value ? e.target.value : form.endDate })} />
                </div>
                {!form.allDay && (
                  <div>
                    <label className="text-sm font-medium">{t("termine.startzeit")}</label>
                    <Input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium">{t("termine.datum")} ({t("termine.endzeit")})</label>
                  <Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                </div>
                {!form.allDay && (
                  <div>
                    <label className="text-sm font-medium">{t("termine.endzeit")}</label>
                    <Input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">{t("termine.beschreibung")}</label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
              </div>
              <div>
                <label className="text-sm font-medium">{t("termine.ort")}</label>
                <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">{t("termine.strasse")}</label>
                  <Input value={form.street} onChange={e => setForm({ ...form, street: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">{t("termine.plz")}</label>
                  <Input value={form.zip} onChange={e => setForm({ ...form, zip: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">{t("termine.stadt")}</label>
                  <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">{t("termine.kunde")}</label>
                  <NativeSelect value={form.customerId} onValueChange={v => setForm({ ...form, customerId: v })}>
                    <option value="">— {t("termine.kundeAuswaehlen")} —</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName} {c.company ? `(${c.company})` : ""}</option>)}
                  </NativeSelect>
                </div>
                <div>
                  <label className="text-sm font-medium">{t("termine.mitarbeiter")}</label>
                  <NativeSelect value={form.assignedToId} onValueChange={v => setForm({ ...form, assignedToId: v })}>
                    <option value="">—</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                  </NativeSelect>
                </div>
                <div>
                  <label className="text-sm font-medium">{t("termine.projekt")}</label>
                  <NativeSelect value={form.projectId} onValueChange={v => setForm({ ...form, projectId: v })}>
                    <option value="">—</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.projectNumber ? `${p.projectNumber} – ` : ""}{p.name}</option>)}
                  </NativeSelect>
                </div>
              </div>
              {!form.customerId && (
                <div className="grid grid-cols-3 gap-4 bg-gray-50 p-3 rounded-lg">
                  <div>
                    <label className="text-sm font-medium">{t("termine.kundeName")}</label>
                    <Input value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t("termine.kundeEmail")}</label>
                    <Input type="email" value={form.customerEmail} onChange={e => setForm({ ...form, customerEmail: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t("termine.kundeTelefon")}</label>
                    <Input type="tel" value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: e.target.value })} />
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">{t("termine.notizen")}</label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.reminder} onChange={e => setForm({ ...form, reminder: e.target.checked })} className="rounded" />
                  {t("termine.erinnerung")}
                </label>
                {form.reminder && (
                  <div>
                    <Input type="number" min={5} value={form.reminderMinutes} onChange={e => setForm({ ...form, reminderMinutes: +e.target.value })} />
                    <span className="text-xs text-gray-500">{t("termine.erinnerungMinuten")}</span>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium">{t("termine.farbe")}</label>
                  <Input type="color" value={form.color || "#9eb552"} onChange={e => setForm({ ...form, color: e.target.value })} className="h-9" />
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>{t("termine.abbrechen")}</Button>
              <Button onClick={saveAppointment} disabled={!form.title} style={{ background: "#9eb552" }}>{t("termine.speichern")}</Button>
            </div>
          </div>
        </div>
      )}

      {/* ────── DETAIL POPUP ────── */}
      {detailId && detailAppointment && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setDetailId(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t("termine.terminDetails")}</h2>
              <button onClick={() => setDetailId(null)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-8 rounded-full" style={{ backgroundColor: detailAppointment.color || TYPE_COLORS[detailAppointment.type] || "#6b7280" }} />
                <div>
                  <h3 className="text-xl font-bold">{detailAppointment.title}</h3>
                  <div className="flex gap-2 mt-1">
                    <Badge className={statusObj(detailAppointment.status).color}>{t(statusObj(detailAppointment.status).tKey)}</Badge>
                    <Badge variant="outline">{typeLabel(detailAppointment.type)}</Badge>
                  </div>
                </div>
              </div>
              {detailAppointment.description && <p className="text-sm text-gray-600">{detailAppointment.description}</p>}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-gray-400" />
                  <span>{new Date(detailAppointment.startTime).toLocaleDateString("de-DE")} {!detailAppointment.allDay && `${toLocalTime(new Date(detailAppointment.startTime))} – ${toLocalTime(new Date(detailAppointment.endTime))}`}</span>
                </div>
                {(detailAppointment.location || detailAppointment.street) && (
                  <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gray-400" />
                    <span>{[detailAppointment.location, detailAppointment.street, detailAppointment.zip, detailAppointment.city].filter(Boolean).join(", ")}</span>
                  </div>
                )}
                {(detailAppointment.customer || detailAppointment.customerName) && (
                  <div className="flex items-center gap-2"><Users className="h-4 w-4 text-gray-400" />
                    <span>{detailAppointment.customer ? `${detailAppointment.customer.firstName} ${detailAppointment.customer.lastName}` : detailAppointment.customerName}</span>
                  </div>
                )}
                {detailAppointment.assignedTo && (
                  <div className="flex items-center gap-2"><Users className="h-4 w-4 text-gray-400" />
                    <span>{detailAppointment.assignedTo.firstName} {detailAppointment.assignedTo.lastName}</span>
                  </div>
                )}
                {detailAppointment.project && (
                  <div className="flex items-center gap-2"><FolderKanban className="h-4 w-4 text-gray-400" />
                    <span>{detailAppointment.project.name}</span>
                  </div>
                )}
              </div>
              {detailAppointment.notes && (
                <div className="bg-gray-50 p-3 rounded-lg text-sm">{detailAppointment.notes}</div>
              )}
            </div>
            <div className="p-6 border-t flex gap-2 justify-end">
              <Button variant="outline" onClick={() => openEdit(detailAppointment)} className="gap-1"><Edit2 className="h-4 w-4" /> {t("termine.terminBearbeiten")}</Button>
              <Button variant="outline" className="gap-1 text-red-600 border-red-200" onClick={() => deleteAppointment(detailAppointment.id)}>
                <Trash2 className="h-4 w-4" /> {t("termine.terminLoeschen")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
