"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { CalendarDays, Clock, MapPin, Phone, Mail, User, ChevronLeft, ChevronRight, Check } from "lucide-react";

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
}

const TYPE_LABELS: Record<string, string> = {
  BERATUNG: "Beratung", BESICHTIGUNG: "Besichtigung", REPARATUR: "Reparatur",
  WARTUNG: "Wartung", INSTALLATION: "Installation", NOTDIENST: "Notdienst",
  ABNAHME: "Abnahme", SONSTIGES: "Sonstiges",
};

const DAY_NAMES = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const DAY_MAP = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const MONTH_NAMES = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

function getMonthDates(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const weeks: (Date | null)[][] = [];
  let week: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) week.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    week.push(new Date(year, month, d));
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week); }
  return weeks;
}

export default function BookingPage() {
  const { slug } = useParams();
  const [link, setLink] = useState<BookingLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"date" | "time" | "form" | "done">("date");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "", type: "BERATUNG" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/booking-links/${slug}`)
      .then(r => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then(d => { setLink(d); if (!d.isActive) setError("Diese Buchungsseite ist derzeit nicht verfügbar."); })
      .catch(() => setError("Buchungsseite nicht gefunden."))
      .finally(() => setLoading(false));
  }, [slug]);

  const availableDays = useMemo(() => {
    if (!link?.availableDays) return { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false };
    try { return JSON.parse(link.availableDays); } catch { return { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false }; }
  }, [link]);

  const isDayAvailable = useCallback((date: Date) => {
    if (!link) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (date < today) return false;
    const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + link.maxDaysAhead);
    if (date > maxDate) return false;
    const dayKey = DAY_MAP[date.getDay()];
    return !!availableDays[dayKey];
  }, [link, availableDays]);

  const timeSlots = useMemo(() => {
    if (!link || !selectedDate) return [];
    const slots: string[] = [];
    const start = link.startHour * 60;
    const end = link.endHour * 60;
    for (let m = start; m + link.slotDuration <= end; m += link.slotDuration + link.bufferTime) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      slots.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
    }
    return slots;
  }, [link, selectedDate]);

  const types = useMemo(() => {
    if (!link?.types) return Object.keys(TYPE_LABELS);
    try { return JSON.parse(link.types); } catch { return Object.keys(TYPE_LABELS); }
  }, [link]);

  async function submit() {
    if (!selectedDate || !selectedTime || !form.name) return;
    setSubmitting(true);
    const [h, m] = selectedTime.split(":").map(Number);
    const preferred = new Date(selectedDate);
    preferred.setHours(h, m, 0, 0);
    const body = {
      customerName: form.name, customerEmail: form.email || null,
      customerPhone: form.phone || null, message: form.message || null,
      type: form.type, preferredDate: preferred.toISOString(),
      preferredTime: selectedTime,
    };
    const res = await fetch(`/api/booking-links/${slug}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSubmitting(false);
    if (res.ok) setStep("done");
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #212f46, #354360)" }}>
      <div className="animate-pulse text-white text-lg">Laden...</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #212f46, #354360)" }}>
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
        <CalendarDays className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600">{error}</p>
      </div>
    </div>
  );

  if (!link) return null;

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: "linear-gradient(135deg, #212f46, #354360)" }}>
      <div className="max-w-xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-6 text-center" style={{ background: "linear-gradient(135deg, #212f46, #354360)" }}>
            <CalendarDays className="h-10 w-10 mx-auto text-[#9eb552] mb-3" />
            <h1 className="text-xl font-bold text-white">{link.title}</h1>
            {link.description && <p className="text-sm text-gray-300 mt-1">{link.description}</p>}
            <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {link.slotDuration} Min.</span>
            </div>
          </div>

          {/* Steps */}
          <div className="flex border-b">
            {[
              { key: "date", label: "1. Datum" },
              { key: "time", label: "2. Uhrzeit" },
              { key: "form", label: "3. Daten" },
            ].map(s => (
              <div key={s.key}
                className={`flex-1 text-center py-2 text-xs font-medium ${step === s.key ? "text-[#9eb552] border-b-2 border-[#9eb552]" : s.key === "done" ? "text-gray-300" : "text-gray-400"}`}>
                {s.label}
              </div>
            ))}
          </div>

          <div className="p-6">
            {/* STEP: DATE */}
            {step === "date" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => { const d = new Date(currentMonth); d.setMonth(d.getMonth() - 1); setCurrentMonth(d); }}>
                    <ChevronLeft className="h-5 w-5 text-gray-400" />
                  </button>
                  <span className="font-semibold text-sm">{MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
                  <button onClick={() => { const d = new Date(currentMonth); d.setMonth(d.getMonth() + 1); setCurrentMonth(d); }}>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map(d => (
                    <div key={d} className="text-center text-xs text-gray-400 py-1">{d}</div>
                  ))}
                </div>
                {getMonthDates(currentMonth.getFullYear(), currentMonth.getMonth()).map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7 gap-1">
                    {week.map((day, di) => {
                      if (!day) return <div key={di} />;
                      const available = isDayAvailable(day);
                      const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString();
                      const isToday = day.toDateString() === new Date().toDateString();
                      return (
                        <button key={di} disabled={!available}
                          onClick={() => { setSelectedDate(day); setStep("time"); }}
                          className={`h-10 rounded-lg text-sm font-medium transition-all ${isSelected ? "bg-[#9eb552] text-white" : available ? "hover:bg-[#9eb552]/10 text-gray-800" : "text-gray-300 cursor-not-allowed"} ${isToday && !isSelected ? "ring-2 ring-[#9eb552]/30" : ""}`}>
                          {day.getDate()}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {/* STEP: TIME */}
            {step === "time" && selectedDate && (
              <div>
                <button onClick={() => setStep("date")} className="flex items-center gap-1 text-sm text-gray-500 mb-4 hover:text-gray-700">
                  <ChevronLeft className="h-4 w-4" /> Zurück
                </button>
                <p className="text-sm text-gray-600 mb-3">
                  {selectedDate.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map(slot => (
                    <button key={slot} onClick={() => { setSelectedTime(slot); setStep("form"); }}
                      className={`py-3 rounded-lg text-sm font-medium border transition-all ${selectedTime === slot ? "bg-[#9eb552] text-white border-[#9eb552]" : "border-gray-200 hover:border-[#9eb552] hover:text-[#9eb552]"}`}>
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP: FORM */}
            {step === "form" && (
              <div className="space-y-4">
                <button onClick={() => setStep("time")} className="flex items-center gap-1 text-sm text-gray-500 mb-2 hover:text-gray-700">
                  <ChevronLeft className="h-4 w-4" /> Zurück
                </button>
                <div className="bg-gray-50 p-3 rounded-lg text-sm flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-[#9eb552]" />
                  <span>
                    {selectedDate?.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })} um {selectedTime} Uhr
                  </span>
                </div>
                {types.length > 1 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Art des Termins</label>
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-[#9eb552]/30 focus:border-[#9eb552]">
                      {types.map((ty: string) => <option key={ty} value={ty}>{TYPE_LABELS[ty] || ty}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <User className="inline h-3.5 w-3.5 mr-1" /> Name *
                  </label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#9eb552]/30 focus:border-[#9eb552]"
                    placeholder="Max Mustermann" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Mail className="inline h-3.5 w-3.5 mr-1" /> E-Mail
                    </label>
                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#9eb552]/30 focus:border-[#9eb552]"
                      placeholder="email@beispiel.de" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Phone className="inline h-3.5 w-3.5 mr-1" /> Telefon
                    </label>
                    <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#9eb552]/30 focus:border-[#9eb552]"
                      placeholder="+49 123 456789" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nachricht (optional)</label>
                  <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={3}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#9eb552]/30 focus:border-[#9eb552]"
                    placeholder="Beschreiben Sie kurz Ihr Anliegen..." />
                </div>
                <button onClick={submit} disabled={!form.name || submitting}
                  className="w-full py-3 rounded-lg text-white font-medium text-sm transition-colors disabled:opacity-50"
                  style={{ background: "#9eb552" }}>
                  {submitting ? "Wird gesendet..." : "Termin anfragen"}
                </button>
              </div>
            )}

            {/* STEP: DONE */}
            {step === "done" && (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-[#9eb552]/10 flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-[#9eb552]" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Terminanfrage gesendet!</h3>
                <p className="text-sm text-gray-500 mb-1">
                  Vielen Dank, {form.name}. Ihre Anfrage für den
                </p>
                <p className="text-sm font-medium text-gray-800">
                  {selectedDate?.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })} um {selectedTime} Uhr
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  wurde erfolgreich übermittelt. Wir melden uns zeitnah bei Ihnen.
                </p>
              </div>
            )}
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">Powered by Handwerker Software</p>
      </div>
    </div>
  );
}
