"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/select";
import {
  Plus, Trash2, Edit2, Calendar, Users, Check, X, BookOpen,
  GraduationCap, FileText, Clock, Download, Send, AlertTriangle,
  CheckCircle2, XCircle, School, ClipboardList,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────── */

interface Employee { id: string; firstName: string; lastName: string; role: string }
interface SchulTag { id: string; profileId: string; date: string; thema: string | null; notes: string | null }
interface Pruefung { id: string; profileId: string; title: string; date: string; type: string | null; result: string | null; passed: boolean | null; notes: string | null }
interface AzubiProfile {
  id: string; userId: string; ausbildungsberuf: string; ausbildungsBeginn: string | null;
  ausbildungsEnde: string | null; ausbilderId: string | null; ausbilderName: string | null;
  berufsschule: string | null; klassenbezeichnung: string | null; ausbildungsJahr: number;
  notes: string | null;
  user: { id: string; firstName: string; lastName: string; avatarUrl: string | null; role: string; email: string };
  schulTage: SchulTag[]; pruefungen: Pruefung[];
}
interface Report {
  id: string; userId: string; weekNumber: number; year: number; startDate: string; endDate: string;
  betrieblich: string | null; schulisch: string | null; unterweisungen: string | null;
  stunden: number | null; status: string; rejectionReason: string | null;
  approvedAt: string | null; approvedBy: string | null;
  user: { id: string; firstName: string; lastName: string };
}

const statusLabels: Record<string, string> = { ENTWURF: "Entwurf", EINGEREICHT: "Eingereicht", GENEHMIGT: "Genehmigt", ABGELEHNT: "Abgelehnt" };
const statusColors: Record<string, string> = { ENTWURF: "bg-gray-100 text-gray-600", EINGEREICHT: "bg-blue-100 text-blue-700", GENEHMIGT: "bg-green-100 text-green-700", ABGELEHNT: "bg-red-100 text-red-700" };
const pruefungTypes: Record<string, string> = { ZWISCHEN: "Zwischenprüfung", ABSCHLUSS_TEIL1: "Abschluss Teil 1", ABSCHLUSS_TEIL2: "Abschluss Teil 2", GESELLENPRUEFUNG: "Gesellenprüfung", SONSTIGE: "Sonstige" };

function fmtDate(iso: string) { return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }); }
function getWeekNumber(d: Date): number {
  const onejan = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
}
function getWeekDates(week: number, year: number): { start: Date; end: Date } {
  const jan1 = new Date(year, 0, 1);
  const dayOfWeek = jan1.getDay() || 7;
  const start = new Date(year, 0, 1 + (week - 1) * 7 - dayOfWeek + 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
}

/* ─── Main Page ──────────────────────────────────────────────── */

export default function AzubiPage() {
  const [profiles, setProfiles] = useState<AzubiProfile[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"uebersicht" | "berichtsheft">("uebersicht");
  const [selectedAzubi, setSelectedAzubi] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [editProfile, setEditProfile] = useState<AzubiProfile | null>(null);
  const [profileForm, setProfileForm] = useState({ userId: "", ausbildungsberuf: "", ausbildungsBeginn: "", ausbildungsEnde: "", ausbilderId: "", ausbilderName: "", berufsschule: "", klassenbezeichnung: "", ausbildungsJahr: "1", notes: "" });

  const [showSchultagDialog, setShowSchultagDialog] = useState(false);
  const [schultagProfileId, setSchultagProfileId] = useState("");
  const [schultagForm, setSchultagForm] = useState({ date: "", thema: "", notes: "" });

  const [showPruefungDialog, setShowPruefungDialog] = useState(false);
  const [pruefungProfileId, setPruefungProfileId] = useState("");
  const [editPruefung, setEditPruefung] = useState<Pruefung | null>(null);
  const [pruefungForm, setPruefungForm] = useState({ title: "", date: "", type: "ZWISCHEN", result: "", passed: "", notes: "" });

  const [showReportDialog, setShowReportDialog] = useState(false);
  const [editReport, setEditReport] = useState<Report | null>(null);
  const [reportForm, setReportForm] = useState({ userId: "", weekNumber: "", year: "", startDate: "", endDate: "", betrieblich: "", schulisch: "", unterweisungen: "", stunden: "" });

  const [showRejectDialog, setShowRejectDialog] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/azubi");
      if (res.ok) { const d = await res.json(); setProfiles(d.profiles); setReports(d.reports); setEmployees(d.employees); }
    } catch { /* */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const doAction = async (body: Record<string, unknown>) => {
    setSaving(true);
    try {
      await fetch("/api/azubi", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      await load();
    } catch { /* */ } finally { setSaving(false); }
  };

  const currentProfile = selectedAzubi ? profiles.find(p => p.id === selectedAzubi) : profiles[0];
  const azubiReports = currentProfile ? reports.filter(r => r.userId === currentProfile.userId) : [];
  const getEmployeeName = (id: string) => { const e = employees.find(e => e.id === id); return e ? `${e.firstName} ${e.lastName}` : "–"; };

  const openCreateProfile = () => {
    setEditProfile(null);
    setProfileForm({ userId: "", ausbildungsberuf: "", ausbildungsBeginn: "", ausbildungsEnde: "", ausbilderId: "", ausbilderName: "", berufsschule: "", klassenbezeichnung: "", ausbildungsJahr: "1", notes: "" });
    setShowProfileDialog(true);
  };
  const openEditProfile = (p: AzubiProfile) => {
    setEditProfile(p);
    setProfileForm({ userId: p.userId, ausbildungsberuf: p.ausbildungsberuf, ausbildungsBeginn: p.ausbildungsBeginn?.slice(0, 10) || "", ausbildungsEnde: p.ausbildungsEnde?.slice(0, 10) || "", ausbilderId: p.ausbilderId || "", ausbilderName: p.ausbilderName || "", berufsschule: p.berufsschule || "", klassenbezeichnung: p.klassenbezeichnung || "", ausbildungsJahr: String(p.ausbildungsJahr), notes: p.notes || "" });
    setShowProfileDialog(true);
  };

  const openNewReport = () => {
    if (!currentProfile) return;
    const now = new Date();
    const wn = getWeekNumber(now);
    const yr = now.getFullYear();
    const { start, end } = getWeekDates(wn, yr);
    setEditReport(null);
    setReportForm({ userId: currentProfile.userId, weekNumber: String(wn), year: String(yr), startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10), betrieblich: "", schulisch: "", unterweisungen: "", stunden: "" });
    setShowReportDialog(true);
  };
  const openEditReport = (r: Report) => {
    setEditReport(r);
    setReportForm({ userId: r.userId, weekNumber: String(r.weekNumber), year: String(r.year), startDate: r.startDate.slice(0, 10), endDate: r.endDate.slice(0, 10), betrieblich: r.betrieblich || "", schulisch: r.schulisch || "", unterweisungen: r.unterweisungen || "", stunden: r.stunden ? String(r.stunden) : "" });
    setShowReportDialog(true);
  };

  const approvedCount = azubiReports.filter(r => r.status === "GENEHMIGT").length;
  const pendingCount = azubiReports.filter(r => r.status === "EINGEREICHT").length;
  const rejectedCount = azubiReports.filter(r => r.status === "ABGELEHNT").length;

  const handleExportBerichtsheft = () => {
    if (!currentProfile) return;
    const sorted = [...azubiReports].sort((a, b) => a.year - b.year || a.weekNumber - b.weekNumber);
    const lines: string[] = [];
    lines.push(`BERICHTSHEFT – ${currentProfile.user.firstName} ${currentProfile.user.lastName}`);
    lines.push(`Ausbildungsberuf: ${currentProfile.ausbildungsberuf}`);
    lines.push(`Berufsschule: ${currentProfile.berufsschule || "–"}`);
    lines.push(`Ausbilder: ${currentProfile.ausbilderName || getEmployeeName(currentProfile.ausbilderId || "")}`);
    lines.push(`Zeitraum: ${currentProfile.ausbildungsBeginn ? fmtDate(currentProfile.ausbildungsBeginn) : "–"} bis ${currentProfile.ausbildungsEnde ? fmtDate(currentProfile.ausbildungsEnde) : "–"}`);
    lines.push("═".repeat(80));
    lines.push("");
    sorted.forEach(r => {
      lines.push(`KW ${r.weekNumber}/${r.year} (${fmtDate(r.startDate)} – ${fmtDate(r.endDate)})  [${statusLabels[r.status]}]`);
      lines.push("─".repeat(60));
      if (r.betrieblich) { lines.push("Betriebliche Tätigkeiten:"); lines.push(r.betrieblich); lines.push(""); }
      if (r.schulisch) { lines.push("Schulische Inhalte:"); lines.push(r.schulisch); lines.push(""); }
      if (r.unterweisungen) { lines.push("Unterweisungen:"); lines.push(r.unterweisungen); lines.push(""); }
      if (r.stunden) lines.push(`Stunden: ${r.stunden}`);
      if (r.status === "GENEHMIGT" && r.approvedAt) lines.push(`✓ Genehmigt am ${fmtDate(r.approvedAt)}`);
      if (r.status === "ABGELEHNT" && r.rejectionReason) lines.push(`✗ Abgelehnt: ${r.rejectionReason}`);
      lines.push(""); lines.push("");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Berichtsheft_${currentProfile.user.lastName}_${currentProfile.user.firstName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9eb552]" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Azubi-Verwaltung</h1>
          <p className="text-sm text-gray-500 mt-1">Auszubildende, Berufsschule, Prüfungen & Berichtshefte</p>
        </div>
        <Button size="sm" onClick={openCreateProfile}><Plus className="h-4 w-4 mr-1" />Azubi anlegen</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><BookOpen className="h-5 w-5 text-blue-600" /></div>
          <div><p className="text-2xl font-bold text-gray-900">{profiles.length}</p><p className="text-xs text-gray-500">Auszubildende</p></div>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
          <div><p className="text-2xl font-bold text-gray-900">{approvedCount}</p><p className="text-xs text-gray-500">Genehmigte Berichte</p></div>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center"><Clock className="h-5 w-5 text-orange-600" /></div>
          <div><p className="text-2xl font-bold text-gray-900">{pendingCount}</p><p className="text-xs text-gray-500">Eingereicht</p></div>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center"><XCircle className="h-5 w-5 text-red-600" /></div>
          <div><p className="text-2xl font-bold text-gray-900">{rejectedCount}</p><p className="text-xs text-gray-500">Abgelehnt</p></div>
        </CardContent></Card>
      </div>

      {profiles.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {profiles.map(p => (
            <button key={p.id} onClick={() => setSelectedAzubi(p.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${(selectedAzubi || profiles[0]?.id) === p.id ? "bg-[#9eb552] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {p.user.firstName} {p.user.lastName}
            </button>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {([
          { key: "uebersicht" as const, label: "Übersicht & Schule", icon: School },
          { key: "berichtsheft" as const, label: "Berichtsheft", icon: FileText },
        ]).map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <t.icon className="h-4 w-4" />{t.label}
          </button>
        ))}
      </div>

      {/* ── Übersicht & Schule ────────────────────────────── */}
      {activeTab === "uebersicht" && currentProfile && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profil */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Azubi-Profil</CardTitle>
              <button onClick={() => openEditProfile(currentProfile)} className="p-1 text-gray-400 hover:text-blue-600"><Edit2 className="h-4 w-4" /></button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-[#9eb552] flex items-center justify-center text-white font-bold text-lg">{currentProfile.user.firstName[0]}{currentProfile.user.lastName[0]}</div>
                <div>
                  <p className="font-semibold text-gray-900">{currentProfile.user.firstName} {currentProfile.user.lastName}</p>
                  <p className="text-xs text-gray-500">{currentProfile.ausbildungsberuf}</p>
                </div>
              </div>
              <InfoRow label="Ausbildungsjahr" value={`${currentProfile.ausbildungsJahr}. Lehrjahr`} />
              <InfoRow label="Beginn" value={currentProfile.ausbildungsBeginn ? fmtDate(currentProfile.ausbildungsBeginn) : "–"} />
              <InfoRow label="Ende (geplant)" value={currentProfile.ausbildungsEnde ? fmtDate(currentProfile.ausbildungsEnde) : "–"} />
              <InfoRow label="Ausbilder" value={currentProfile.ausbilderName || (currentProfile.ausbilderId ? getEmployeeName(currentProfile.ausbilderId) : "–")} />
              <InfoRow label="Berufsschule" value={currentProfile.berufsschule || "–"} />
              <InfoRow label="Klasse" value={currentProfile.klassenbezeichnung || "–"} />
              {currentProfile.notes && <div className="pt-2 border-t"><p className="text-xs text-gray-400">Notizen</p><p className="text-sm text-gray-600">{currentProfile.notes}</p></div>}
            </CardContent>
          </Card>

          {/* Berufsschule */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2"><School className="h-4 w-4 text-blue-600" />Berufsschule</CardTitle>
              <Button size="sm" variant="outline" onClick={() => { setSchultagProfileId(currentProfile.id); setSchultagForm({ date: new Date().toISOString().slice(0, 10), thema: "", notes: "" }); setShowSchultagDialog(true); }}>
                <Plus className="h-3.5 w-3.5 mr-1" />Tag
              </Button>
            </CardHeader>
            <CardContent>
              {currentProfile.schulTage.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Keine Schultage eingetragen</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {[...currentProfile.schulTage].reverse().map(t => (
                    <div key={t.id} className="flex items-start justify-between p-2 bg-gray-50 rounded-lg group">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{fmtDate(t.date)}</p>
                        {t.thema && <p className="text-xs text-gray-500">{t.thema}</p>}
                        {t.notes && <p className="text-[10px] text-gray-400">{t.notes}</p>}
                      </div>
                      <button onClick={() => doAction({ action: "delete-schultag", schultagId: t.id })} className="p-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              )}
              {currentProfile.schulTage.length > 0 && (
                <p className="text-[10px] text-gray-400 mt-2 text-center">{currentProfile.schulTage.length} Schultage eingetragen</p>
              )}
            </CardContent>
          </Card>

          {/* Prüfungen */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2"><GraduationCap className="h-4 w-4 text-purple-600" />Prüfungen</CardTitle>
              <Button size="sm" variant="outline" onClick={() => { setPruefungProfileId(currentProfile.id); setEditPruefung(null); setPruefungForm({ title: "", date: "", type: "ZWISCHEN", result: "", passed: "", notes: "" }); setShowPruefungDialog(true); }}>
                <Plus className="h-3.5 w-3.5 mr-1" />Prüfung
              </Button>
            </CardHeader>
            <CardContent>
              {currentProfile.pruefungen.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Keine Prüfungen eingetragen</p>
              ) : (
                <div className="space-y-2">
                  {currentProfile.pruefungen.map(p => (
                    <div key={p.id} className="p-3 border rounded-lg group">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-semibold text-gray-900">{p.title}</h4>
                        <div className="flex items-center gap-1">
                          {p.passed === true && <Badge className="bg-green-100 text-green-700 text-[10px]">Bestanden</Badge>}
                          {p.passed === false && <Badge className="bg-red-100 text-red-700 text-[10px]">Nicht bestanden</Badge>}
                          <button onClick={() => { setPruefungProfileId(currentProfile.id); setEditPruefung(p); setPruefungForm({ title: p.title, date: p.date.slice(0, 10), type: p.type || "ZWISCHEN", result: p.result || "", passed: p.passed === null ? "" : p.passed ? "true" : "false", notes: p.notes || "" }); setShowPruefungDialog(true); }} className="p-1 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100"><Edit2 className="h-3 w-3" /></button>
                          <button onClick={() => doAction({ action: "delete-pruefung", pruefungId: p.id })} className="p-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100"><Trash2 className="h-3 w-3" /></button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">{fmtDate(p.date)} · {pruefungTypes[p.type || ""] || p.type || "–"}</p>
                      {p.result && <p className="text-xs text-gray-400 mt-1">Ergebnis: {p.result}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "uebersicht" && !currentProfile && (
        <Card className="border-0 shadow-sm"><CardContent className="p-8 text-center">
          <BookOpen className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Noch keine Auszubildenden angelegt</p>
          <Button className="mt-4" onClick={openCreateProfile}><Plus className="h-4 w-4 mr-1" />Azubi anlegen</Button>
        </CardContent></Card>
      )}

      {/* ── Berichtsheft ──────────────────────────────────── */}
      {activeTab === "berichtsheft" && currentProfile && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Berichtsheft – {currentProfile.user.firstName} {currentProfile.user.lastName}</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportBerichtsheft}><Download className="h-4 w-4 mr-1" />Export</Button>
              <Button size="sm" onClick={openNewReport}><Plus className="h-4 w-4 mr-1" />Neuer Eintrag</Button>
            </div>
          </div>

          {azubiReports.length === 0 ? (
            <Card className="border-0 shadow-sm"><CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">Noch keine Berichtshefte geschrieben</p>
              <Button className="mt-4" onClick={openNewReport}><Plus className="h-4 w-4 mr-1" />Ersten Bericht schreiben</Button>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {azubiReports.map(r => (
                <Card key={r.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900">KW {r.weekNumber}/{r.year}</span>
                          <Badge className={`text-[10px] ${statusColors[r.status]}`}>{statusLabels[r.status]}</Badge>
                        </div>
                        <p className="text-xs text-gray-500">{fmtDate(r.startDate)} – {fmtDate(r.endDate)}{r.stunden ? ` · ${r.stunden} Std.` : ""}</p>
                        {r.betrieblich && <div className="mt-2"><p className="text-[10px] font-medium text-gray-400 uppercase">Betrieblich</p><p className="text-sm text-gray-700 whitespace-pre-line">{r.betrieblich}</p></div>}
                        {r.schulisch && <div className="mt-1"><p className="text-[10px] font-medium text-gray-400 uppercase">Schulisch</p><p className="text-sm text-gray-700 whitespace-pre-line">{r.schulisch}</p></div>}
                        {r.unterweisungen && <div className="mt-1"><p className="text-[10px] font-medium text-gray-400 uppercase">Unterweisungen</p><p className="text-sm text-gray-700 whitespace-pre-line">{r.unterweisungen}</p></div>}
                        {r.status === "ABGELEHNT" && r.rejectionReason && (
                          <div className="mt-2 p-2 bg-red-50 rounded-lg"><p className="text-xs text-red-700"><strong>Begründung:</strong> {r.rejectionReason}</p></div>
                        )}
                        {r.status === "GENEHMIGT" && r.approvedAt && (
                          <p className="text-[10px] text-green-600 mt-2">✓ Genehmigt am {fmtDate(r.approvedAt)}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-3">
                        {(r.status === "ENTWURF" || r.status === "ABGELEHNT") && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => openEditReport(r)}><Edit2 className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="outline" onClick={() => doAction({ action: "submit-report", reportId: r.id })} disabled={saving}><Send className="h-3.5 w-3.5" /></Button>
                          </>
                        )}
                        {r.status === "EINGEREICHT" && (
                          <>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => doAction({ action: "approve-report", reportId: r.id })} disabled={saving}><Check className="h-3.5 w-3.5 mr-1" />Genehmigen</Button>
                            <Button size="sm" variant="outline" className="text-red-600 border-red-300" onClick={() => { setShowRejectDialog(r.id); setRejectReason(""); }}><X className="h-3.5 w-3.5 mr-1" />Ablehnen</Button>
                          </>
                        )}
                        {r.status === "ENTWURF" && (
                          <Button size="sm" variant="ghost" className="text-red-400" onClick={() => doAction({ action: "delete-report", reportId: r.id })}><Trash2 className="h-3.5 w-3.5" /></Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "berichtsheft" && !currentProfile && (
        <Card className="border-0 shadow-sm"><CardContent className="p-8 text-center"><p className="text-gray-400">Bitte zuerst einen Azubi anlegen</p></CardContent></Card>
      )}

      {/* ── Dialogs ───────────────────────────────────────── */}

      {showProfileDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">{editProfile ? "Azubi bearbeiten" : "Neuen Azubi anlegen"}</h3>
            <div className="space-y-3">
              {!editProfile && <div><label className="text-xs font-medium text-gray-600 mb-1 block">Mitarbeiter *</label><NativeSelect value={profileForm.userId} onChange={e => setProfileForm(f => ({ ...f, userId: e.target.value }))}><option value="">Wählen...</option>{employees.filter(e => !profiles.some(p => p.userId === e.id)).map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}</NativeSelect></div>}
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Ausbildungsberuf *</label><Input value={profileForm.ausbildungsberuf} onChange={e => setProfileForm(f => ({ ...f, ausbildungsberuf: e.target.value }))} placeholder="z.B. Anlagenmechaniker SHK" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">Beginn</label><Input type="date" value={profileForm.ausbildungsBeginn} onChange={e => setProfileForm(f => ({ ...f, ausbildungsBeginn: e.target.value }))} /></div>
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">Ende (geplant)</label><Input type="date" value={profileForm.ausbildungsEnde} onChange={e => setProfileForm(f => ({ ...f, ausbildungsEnde: e.target.value }))} /></div>
              </div>
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Ausbildungsjahr</label><NativeSelect value={profileForm.ausbildungsJahr} onChange={e => setProfileForm(f => ({ ...f, ausbildungsJahr: e.target.value }))}><option value="1">1. Lehrjahr</option><option value="2">2. Lehrjahr</option><option value="3">3. Lehrjahr</option><option value="4">4. Lehrjahr</option></NativeSelect></div>
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Zuständiger Ausbilder</label><NativeSelect value={profileForm.ausbilderId} onChange={e => setProfileForm(f => ({ ...f, ausbilderId: e.target.value }))}><option value="">Wählen...</option>{employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}</NativeSelect></div>
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Berufsschule</label><Input value={profileForm.berufsschule} onChange={e => setProfileForm(f => ({ ...f, berufsschule: e.target.value }))} placeholder="Name der Berufsschule" /></div>
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Klasse</label><Input value={profileForm.klassenbezeichnung} onChange={e => setProfileForm(f => ({ ...f, klassenbezeichnung: e.target.value }))} placeholder="z.B. SHK 24a" /></div>
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Notizen</label><Textarea value={profileForm.notes} onChange={e => setProfileForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowProfileDialog(false)}>Abbrechen</Button>
              <Button disabled={(!editProfile && !profileForm.userId) || !profileForm.ausbildungsberuf || saving} onClick={async () => {
                if (editProfile) { await doAction({ action: "update-profile", profileId: editProfile.id, ...profileForm }); }
                else { await doAction({ action: "create-profile", ...profileForm }); }
                setShowProfileDialog(false);
              }}>{editProfile ? "Speichern" : "Anlegen"}</Button>
            </div>
          </div>
        </div>
      )}

      {showSchultagDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Schultag eintragen</h3>
            <div className="space-y-3">
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Datum *</label><Input type="date" value={schultagForm.date} onChange={e => setSchultagForm(f => ({ ...f, date: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Thema</label><Input value={schultagForm.thema} onChange={e => setSchultagForm(f => ({ ...f, thema: e.target.value }))} placeholder="Unterrichtsthema" /></div>
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Notizen</label><Textarea value={schultagForm.notes} onChange={e => setSchultagForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowSchultagDialog(false)}>Abbrechen</Button>
              <Button disabled={!schultagForm.date || saving} onClick={async () => { await doAction({ action: "add-schultag", profileId: schultagProfileId, ...schultagForm }); setShowSchultagDialog(false); }}>Eintragen</Button>
            </div>
          </div>
        </div>
      )}

      {showPruefungDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">{editPruefung ? "Prüfung bearbeiten" : "Prüfung eintragen"}</h3>
            <div className="space-y-3">
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Bezeichnung *</label><Input value={pruefungForm.title} onChange={e => setPruefungForm(f => ({ ...f, title: e.target.value }))} placeholder="z.B. Zwischenprüfung Teil 1" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">Datum *</label><Input type="date" value={pruefungForm.date} onChange={e => setPruefungForm(f => ({ ...f, date: e.target.value }))} /></div>
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">Art</label><NativeSelect value={pruefungForm.type} onChange={e => setPruefungForm(f => ({ ...f, type: e.target.value }))}>{Object.entries(pruefungTypes).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</NativeSelect></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">Ergebnis</label><Input value={pruefungForm.result} onChange={e => setPruefungForm(f => ({ ...f, result: e.target.value }))} placeholder="z.B. 78 Punkte" /></div>
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">Bestanden?</label><NativeSelect value={pruefungForm.passed} onChange={e => setPruefungForm(f => ({ ...f, passed: e.target.value }))}><option value="">Offen</option><option value="true">Bestanden</option><option value="false">Nicht bestanden</option></NativeSelect></div>
              </div>
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Notizen</label><Textarea value={pruefungForm.notes} onChange={e => setPruefungForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowPruefungDialog(false)}>Abbrechen</Button>
              <Button disabled={!pruefungForm.title || !pruefungForm.date || saving} onClick={async () => {
                const data = { ...pruefungForm, passed: pruefungForm.passed === "" ? null : pruefungForm.passed === "true" };
                if (editPruefung) { await doAction({ action: "update-pruefung", pruefungId: editPruefung.id, profileId: pruefungProfileId, ...data }); }
                else { await doAction({ action: "add-pruefung", profileId: pruefungProfileId, ...data }); }
                setShowPruefungDialog(false);
              }}>{editPruefung ? "Speichern" : "Eintragen"}</Button>
            </div>
          </div>
        </div>
      )}

      {showReportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">{editReport ? `KW ${editReport.weekNumber}/${editReport.year} bearbeiten` : "Neuer Berichtsheft-Eintrag"}</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">KW</label><Input type="number" value={reportForm.weekNumber} onChange={e => { const wn = parseInt(e.target.value) || 1; const yr = parseInt(reportForm.year) || new Date().getFullYear(); const { start, end } = getWeekDates(wn, yr); setReportForm(f => ({ ...f, weekNumber: e.target.value, startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) })); }} min={1} max={53} /></div>
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">Jahr</label><Input type="number" value={reportForm.year} onChange={e => setReportForm(f => ({ ...f, year: e.target.value }))} /></div>
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">Stunden</label><Input type="number" value={reportForm.stunden} onChange={e => setReportForm(f => ({ ...f, stunden: e.target.value }))} step="0.5" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">Von</label><Input type="date" value={reportForm.startDate} onChange={e => setReportForm(f => ({ ...f, startDate: e.target.value }))} /></div>
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">Bis</label><Input type="date" value={reportForm.endDate} onChange={e => setReportForm(f => ({ ...f, endDate: e.target.value }))} /></div>
              </div>
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Betriebliche Tätigkeiten</label><Textarea value={reportForm.betrieblich} onChange={e => setReportForm(f => ({ ...f, betrieblich: e.target.value }))} rows={4} placeholder="Was wurde im Betrieb gemacht?" /></div>
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Schulische Inhalte</label><Textarea value={reportForm.schulisch} onChange={e => setReportForm(f => ({ ...f, schulisch: e.target.value }))} rows={3} placeholder="Was wurde in der Berufsschule gelernt?" /></div>
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Unterweisungen</label><Textarea value={reportForm.unterweisungen} onChange={e => setReportForm(f => ({ ...f, unterweisungen: e.target.value }))} rows={2} placeholder="Durchgeführte Unterweisungen..." /></div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowReportDialog(false)}>Abbrechen</Button>
              <Button disabled={!reportForm.weekNumber || !reportForm.year || saving} onClick={async () => {
                await doAction({ action: "save-report", ...reportForm, weekNumber: parseInt(reportForm.weekNumber), year: parseInt(reportForm.year) });
                setShowReportDialog(false);
              }}>Speichern</Button>
            </div>
          </div>
        </div>
      )}

      {showRejectDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold mb-3">Bericht ablehnen</h3>
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} placeholder="Begründung für die Ablehnung..." />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowRejectDialog(null)}>Abbrechen</Button>
              <Button className="bg-red-600 hover:bg-red-700" disabled={saving} onClick={async () => {
                await doAction({ action: "reject-report", reportId: showRejectDialog, reason: rejectReason });
                setShowRejectDialog(null);
              }}>Ablehnen</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm text-gray-900 text-right">{value}</p>
    </div>
  );
}
