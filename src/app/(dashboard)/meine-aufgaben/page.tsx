"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { NativeSelect } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSession } from "next-auth/react";
import {
  ClipboardList,
  FolderKanban,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronRight,
  Wrench,
  CalendarDays,
  ArrowUpRight,
  StickyNote,
  Plus,
  Pin,
  PinOff,
  Trash2,
  Pencil,
  X,
  Users,
  UserPlus,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface ProjectTask {
  id: string;
  title: string;
  description: string | null;
  priority: "HOCH" | "MITTEL" | "NIEDRIG";
  status: "OFFEN" | "IN_BEARBEITUNG" | "ERLEDIGT";
  dueDate: string | null;
  project: { id: string; projectNumber: string; name: string; status: string };
}

interface SchlosserAufgabe {
  id: string;
  titel: string;
  beschreibung: string | null;
  prioritaet: "NIEDRIG" | "NORMAL" | "HOCH" | "DRINGEND";
  status: "OFFEN" | "IN_ARBEIT" | "WARTE_AUF_MATERIAL" | "ERLEDIGT" | "ABGENOMMEN";
  faelligAm: string | null;
  objekt: { id: string; name: string };
}

interface AssignedProject {
  id: string;
  projectNumber: string;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  customer: { company: string | null; firstName: string; lastName: string };
  _count: { tasks: number };
}

interface UserNote {
  id: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  updatedAt: string;
}

const NOTE_COLORS = [
  { value: "#FEF3C7", label: "Gelb", bg: "bg-amber-50", border: "border-amber-200" },
  { value: "#DBEAFE", label: "Blau", bg: "bg-blue-50", border: "border-blue-200" },
  { value: "#D1FAE5", label: "Grün", bg: "bg-green-50", border: "border-green-200" },
  { value: "#FCE7F3", label: "Rosa", bg: "bg-pink-50", border: "border-pink-200" },
  { value: "#EDE9FE", label: "Lila", bg: "bg-purple-50", border: "border-purple-200" },
  { value: "#F3F4F6", label: "Grau", bg: "bg-gray-50", border: "border-gray-200" },
];

function getNoteStyle(color: string) {
  return NOTE_COLORS.find((c) => c.value === color) || NOTE_COLORS[0];
}

// TODO: Move labels to translation system
const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  DRINGEND: { label: "Dringend", color: "bg-red-100 text-red-700" },
  HOCH: { label: "Hoch", color: "bg-orange-100 text-orange-700" },
  MITTEL: { label: "Mittel", color: "bg-blue-100 text-blue-700" },
  NORMAL: { label: "Normal", color: "bg-blue-100 text-blue-700" },
  NIEDRIG: { label: "Niedrig", color: "bg-gray-100 text-gray-600" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  OFFEN: { label: "Offen", color: "bg-amber-100 text-amber-700", icon: Clock },
  IN_BEARBEITUNG: { label: "In Bearbeitung", color: "bg-blue-100 text-blue-700", icon: ArrowUpRight },
  IN_ARBEIT: { label: "In Arbeit", color: "bg-blue-100 text-blue-700", icon: ArrowUpRight },
  WARTE_AUF_MATERIAL: { label: "Warte auf Material", color: "bg-purple-100 text-purple-700", icon: Clock },
  ERLEDIGT: { label: "Erledigt", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  ABGENOMMEN: { label: "Abgenommen", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
};

const PROJECT_STATUS: Record<string, { label: string; color: string }> = {
  PLANUNG: { label: "Planung", color: "bg-gray-100 text-gray-700" },
  AKTIV: { label: "Aktiv", color: "bg-green-100 text-green-700" },
  PAUSIERT: { label: "Pausiert", color: "bg-amber-100 text-amber-700" },
  ABGESCHLOSSEN: { label: "Abgeschlossen", color: "bg-blue-100 text-blue-700" },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function isDueSoon(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const diff = new Date(dueDate).getTime() - Date.now();
  return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000;
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate).getTime() < Date.now();
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
}

interface AdminTask extends ProjectTask {
  assigneeId: string | null;
  assignee?: { firstName: string; lastName: string } | null;
}

export default function MeineAufgabenPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "ADMIN" || userRole === "BAULEITER";
  const { t } = useTranslation();

  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([]);
  const [schlosserAufgaben, setSchlosserAufgaben] = useState<SchlosserAufgabe[]>([]);
  const [assignedProjects, setAssignedProjects] = useState<AssignedProject[]>([]);
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"alle" | "projekte" | "aufgaben" | "schlosser" | "notizen" | "admin">("alle");
  const [editingNote, setEditingNote] = useState<UserNote | null>(null);
  const [noteForm, setNoteForm] = useState({ title: "", content: "", color: "#FEF3C7" });
  const [showNoteForm, setShowNoteForm] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  // Admin states
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allProjects, setAllProjects] = useState<{ id: string; projectNumber: string; name: string }[]>([]);
  const [adminTasks, setAdminTasks] = useState<AdminTask[]>([]);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", priority: "MITTEL", projectId: "", assigneeId: "", dueDate: "" });
  const [adminFilter, setAdminFilter] = useState({ assigneeId: "", status: "" });

  const loadData = useCallback(async () => {
    const fetches: Promise<Response>[] = [
      fetch("/api/meine-aufgaben"),
      fetch("/api/meine-notizen"),
    ];
    if (isAdmin) {
      fetches.push(fetch("/api/mitarbeiter"));
      fetches.push(fetch("/api/projekte"));
      fetches.push(fetch("/api/aufgaben?status=all"));
    }
    const results = await Promise.all(fetches);
    if (results[0].ok) {
      const data = await results[0].json();
      setProjectTasks(data.projectTasks || []);
      setSchlosserAufgaben(data.schlosserAufgaben || []);
      setAssignedProjects(data.assignedProjects || []);
    }
    if (results[1].ok) setNotes(await results[1].json());
    if (isAdmin) {
      if (results[2]?.ok) setEmployees(await results[2].json());
      if (results[3]?.ok) {
        const p = await results[3].json();
        setAllProjects(Array.isArray(p) ? p : []);
      }
      if (results[4]?.ok) setAdminTasks(await results[4].json());
    }
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => { loadData(); }, [loadData]);

  async function createNote() {
    if (!noteForm.title.trim()) return;
    const res = await fetch("/api/meine-notizen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(noteForm),
    });
    if (res.ok) {
      setNoteForm({ title: "", content: "", color: "#FEF3C7" });
      setShowNoteForm(false);
      loadData();
    }
  }

  async function updateNote(note: UserNote, updates: Partial<UserNote>) {
    await fetch("/api/meine-notizen", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: note.id, ...updates }),
    });
    loadData();
  }

  function autoSaveNote(note: UserNote, field: "title" | "content", value: string) {
    setEditingNote({ ...note, [field]: value });
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      fetch("/api/meine-notizen", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: note.id, [field]: value }),
      }).then(() => loadData());
    }, 800);
  }

  async function deleteNote(id: string) {
    if (!confirm(t("aufgaben.notizLoeschen"))) return;
    await fetch("/api/meine-notizen", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (editingNote?.id === id) setEditingNote(null);
    loadData();
  }

  async function createTask() {
    if (!taskForm.title.trim() || !taskForm.projectId) return;
    await fetch(`/api/projekte/${taskForm.projectId}/aufgaben`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: taskForm.title,
        description: taskForm.description || null,
        priority: taskForm.priority,
        assigneeId: taskForm.assigneeId || null,
        dueDate: taskForm.dueDate || null,
      }),
    });
    setCreateTaskOpen(false);
    setTaskForm({ title: "", description: "", priority: "MITTEL", projectId: "", assigneeId: "", dueDate: "" });
    loadData();
  }

  async function updateTaskStatus(task: AdminTask, status: string) {
    await fetch(`/api/projekte/${task.project.id}/aufgaben`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, status }),
    });
    loadData();
  }

  async function updateTaskAssignee(task: AdminTask, assigneeId: string) {
    await fetch(`/api/projekte/${task.project.id}/aufgaben`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, assigneeId: assigneeId || null }),
    });
    loadData();
  }

  async function deleteTask(task: AdminTask) {
    if (!confirm(t("aufgaben.aufgabeLoeschen"))) return;
    await fetch(`/api/projekte/${task.project.id}/aufgaben`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id }),
    });
    loadData();
  }

  const filteredAdminTasks = adminTasks.filter((task) => {
    if (adminFilter.assigneeId && task.assigneeId !== adminFilter.assigneeId) return false;
    if (adminFilter.status && task.status !== adminFilter.status) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const totalOpenTasks = projectTasks.length + schlosserAufgaben.length;
  const highPriorityCount =
    projectTasks.filter((task) => task.priority === "HOCH").length +
    schlosserAufgaben.filter((a) => a.prioritaet === "HOCH" || a.prioritaet === "DRINGEND").length;
  const overdueCount =
    projectTasks.filter((task) => isOverdue(task.dueDate)).length +
    schlosserAufgaben.filter((a) => isOverdue(a.faelligAm)).length;

  const tabs = [
    { key: "alle" as const, label: t("nav.uebersicht") },
    { key: "projekte" as const, label: `${t("aufgaben.meineProjekte")} (${assignedProjects.length})` },
    { key: "aufgaben" as const, label: `${t("aufgaben.projektAufgaben")} (${projectTasks.length})` },
    ...(schlosserAufgaben.length > 0 ? [{ key: "schlosser" as const, label: `${t("aufgaben.schlosser")} (${schlosserAufgaben.length})` }] : []),
    { key: "notizen" as const, label: `${t("aufgaben.notizen")} (${notes.length})` },
    ...(isAdmin ? [{ key: "admin" as const, label: `${t("aufgaben.alleAufgaben")} (${adminTasks.length})` }] : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("aufgaben.title")}</h1>
        <p className="text-sm text-gray-500 mt-1">{t("aufgaben.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <ClipboardList className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400">{t("aufgaben.offeneAufgaben")}</p>
              <p className="text-2xl font-bold text-gray-900">{totalOpenTasks}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400">{t("aufgaben.hohePrioritaet")}</p>
              <p className="text-2xl font-bold text-orange-600">{highPriorityCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${overdueCount > 0 ? "bg-red-100" : "bg-green-100"}`}>
              <CalendarDays className={`h-5 w-5 ${overdueCount > 0 ? "text-red-600" : "text-green-600"}`} />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400">{t("aufgaben.ueberfaellig")}</p>
              <p className={`text-2xl font-bold ${overdueCount > 0 ? "text-red-600" : "text-green-600"}`}>{overdueCount}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {(activeTab === "alle" || activeTab === "projekte") && assignedProjects.length > 0 && (
        <div>
          {activeTab === "alle" && <h2 className="text-lg font-semibold text-gray-900 mb-3">{t("aufgaben.meineProjekte")}</h2>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {assignedProjects.map((p) => {
              const pStatus = PROJECT_STATUS[p.status] || PROJECT_STATUS.AKTIV;
              const customerName = p.customer.company || `${p.customer.firstName} ${p.customer.lastName}`;
              return (
                <Link key={p.id} href={`/projekte/${p.id}`}>
                  <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 shrink-0">
                          <FolderKanban className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600">
                            {p.name}
                          </p>
                          <p className="text-xs text-gray-500">{p.projectNumber} · {customerName}</p>
                          {p._count.tasks > 0 && (
                            <p className="text-xs text-blue-600 mt-1">
                              {p._count.tasks} offene Aufgabe{p._count.tasks !== 1 && "n"}
                            </p>
                          )}
                          {p.startDate && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {formatDate(p.startDate)}{p.endDate && ` – ${formatDate(p.endDate)}`}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={pStatus.color}>{pStatus.label}</Badge>
                        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {(activeTab === "alle" || activeTab === "aufgaben") && projectTasks.length > 0 && (
        <div>
          {activeTab === "alle" && <h2 className="text-lg font-semibold text-gray-900 mb-3">{t("aufgaben.projektAufgaben")}</h2>}
          <div className="space-y-2">
            {projectTasks.map((task) => {
              const pri = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MITTEL;
              const sta = STATUS_CONFIG[task.status] || STATUS_CONFIG.OFFEN;
              const StatusIcon = sta.icon;
              const overdue = isOverdue(task.dueDate);
              const dueSoon = isDueSoon(task.dueDate);

              return (
                <Link key={task.id} href={`/projekte/${task.project.id}`}>
                  <Card className={`p-4 hover:shadow-md transition-shadow cursor-pointer group ${overdue ? "border-red-200 bg-red-50/30" : ""}`}>
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${sta.color}`}>
                        <StatusIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 truncate">
                          {task.title}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {task.project.projectNumber} · {task.project.name}
                          {task.description && ` · ${task.description}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {task.dueDate && (
                          <span className={`text-xs font-medium ${overdue ? "text-red-600" : dueSoon ? "text-amber-600" : "text-gray-500"}`}>
                            {overdue ? `${t("aufgaben.ueberfaellig")}: ` : ""}{formatDate(task.dueDate)}
                          </span>
                        )}
                        <Badge className={pri.color}>{pri.label}</Badge>
                        <Badge className={sta.color}>{sta.label}</Badge>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {(activeTab === "alle" || activeTab === "schlosser") && schlosserAufgaben.length > 0 && (
        <div>
          {activeTab === "alle" && <h2 className="text-lg font-semibold text-gray-900 mb-3">Schlosser-Aufgaben</h2>}
          <div className="space-y-2">
            {schlosserAufgaben.map((aufgabe) => {
              const pri = PRIORITY_CONFIG[aufgabe.prioritaet] || PRIORITY_CONFIG.NORMAL;
              const sta = STATUS_CONFIG[aufgabe.status] || STATUS_CONFIG.OFFEN;
              const StatusIcon = sta.icon;
              const overdue = isOverdue(aufgabe.faelligAm);
              const dueSoon = isDueSoon(aufgabe.faelligAm);

              return (
                <Link key={aufgabe.id} href={`/branchenspezifisch/schlosser/aufgaben/${aufgabe.id}`}>
                  <Card className={`p-4 hover:shadow-md transition-shadow cursor-pointer group ${overdue ? "border-red-200 bg-red-50/30" : ""}`}>
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${sta.color}`}>
                        <Wrench className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 truncate">
                          {aufgabe.titel}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {aufgabe.objekt.name}
                          {aufgabe.beschreibung && ` · ${aufgabe.beschreibung}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {aufgabe.faelligAm && (
                          <span className={`text-xs font-medium ${overdue ? "text-red-600" : dueSoon ? "text-amber-600" : "text-gray-500"}`}>
                            {overdue ? `${t("aufgaben.ueberfaellig")}: ` : ""}{formatDate(aufgabe.faelligAm)}
                          </span>
                        )}
                        <Badge className={pri.color}>{pri.label}</Badge>
                        <Badge className={sta.color}>{sta.label}</Badge>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {(activeTab === "alle" || activeTab === "notizen") && (
        <div>
          <div className="flex items-center justify-between mb-3">
            {activeTab === "alle" && <h2 className="text-lg font-semibold text-gray-900">{t("aufgaben.notizen")}</h2>}
            {activeTab === "notizen" && <div />}
            <Button size="sm" className="gap-1.5" onClick={() => { setShowNoteForm(true); setEditingNote(null); }}>
              <Plus className="h-4 w-4" />
              Neue Notiz
            </Button>
          </div>

          {showNoteForm && (
            <Card className="mb-4 border-blue-200 p-4">
              <div className="space-y-3">
                <Input
                  placeholder={t("common.titel")}
                  value={noteForm.title}
                  onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                  autoFocus
                />
                <Textarea
                  placeholder="Notiz schreiben..."
                  value={noteForm.content}
                  onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                  rows={4}
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Farbe:</span>
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setNoteForm({ ...noteForm, color: c.value })}
                      className={`h-6 w-6 rounded-full border-2 ${c.bg} ${noteForm.color === c.value ? "border-gray-800 ring-2 ring-gray-300" : "border-gray-300"}`}
                      title={c.label}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowNoteForm(false)}>{t("common.abbrechen")}</Button>
                  <Button size="sm" onClick={createNote} disabled={!noteForm.title.trim()}>{t("common.speichern")}</Button>
                </div>
              </div>
            </Card>
          )}

          {editingNote && (
            <Card className="mb-4 border-blue-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500">Notiz bearbeiten</span>
                <button onClick={() => setEditingNote(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
                <Input
                  value={editingNote.title}
                  onChange={(e) => autoSaveNote(editingNote, "title", e.target.value)}
                  className="font-medium"
                />
                <Textarea
                  value={editingNote.content}
                  onChange={(e) => autoSaveNote(editingNote, "content", e.target.value)}
                  rows={6}
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Farbe:</span>
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => { updateNote(editingNote, { color: c.value }); setEditingNote({ ...editingNote, color: c.value }); }}
                      className={`h-6 w-6 rounded-full border-2 ${c.bg} ${editingNote.color === c.value ? "border-gray-800 ring-2 ring-gray-300" : "border-gray-300"}`}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
            </Card>
          )}

          {notes.length === 0 && !showNoteForm ? (
            <Card className="p-8 text-center text-gray-400">
              <StickyNote className="h-10 w-10 mx-auto mb-2" />
              <p className="text-sm">Noch keine Notizen</p>
              <p className="text-xs mt-1">Erstelle deine erste Notiz</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {notes.map((note) => {
                const style = getNoteStyle(note.color);
                return (
                  <Card
                    key={note.id}
                    className={`p-4 ${style.border} cursor-pointer hover:shadow-md transition-shadow relative group`}
                    style={{ backgroundColor: note.color + "33" }}
                  >
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); updateNote(note, { pinned: !note.pinned }); }}
                        className="p-1 rounded hover:bg-black/10"
                        title={note.pinned ? "Lösen" : "Anpinnen"}
                      >
                        {note.pinned ? <PinOff className="h-3.5 w-3.5 text-gray-600" /> : <Pin className="h-3.5 w-3.5 text-gray-600" />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingNote(note); setShowNoteForm(false); }}
                        className="p-1 rounded hover:bg-black/10"
                        title="Bearbeiten"
                      >
                        <Pencil className="h-3.5 w-3.5 text-gray-600" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                        className="p-1 rounded hover:bg-red-100"
                        title="Löschen"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </button>
                    </div>
                    <div onClick={() => { setEditingNote(note); setShowNoteForm(false); }}>
                      <div className="flex items-center gap-2 mb-1.5">
                        {note.pinned && <Pin className="h-3 w-3 text-gray-500" />}
                        <h4 className="text-sm font-semibold text-gray-900 truncate">{note.title}</h4>
                      </div>
                      {note.content && (
                        <p className="text-xs text-gray-600 line-clamp-4 whitespace-pre-wrap">{note.content}</p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-2">
                        {new Date(note.updatedAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Admin: Alle Aufgaben ──────────── */}
      {isAdmin && activeTab === "admin" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <NativeSelect value={adminFilter.assigneeId} onChange={(e) => setAdminFilter({ ...adminFilter, assigneeId: e.target.value })} className="text-xs h-8 w-auto">
                <option value="">{`${t("common.alle")} ${t("common.mitarbeiter")}`}</option>
                {employees.filter((e) => e.isActive).map((e) => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                ))}
              </NativeSelect>
              <NativeSelect value={adminFilter.status} onChange={(e) => setAdminFilter({ ...adminFilter, status: e.target.value })} className="text-xs h-8 w-auto">
                <option value="">Alle Status</option>
                <option value="OFFEN">Offen</option>
                <option value="IN_BEARBEITUNG">In Bearbeitung</option>
                <option value="ERLEDIGT">Erledigt</option>
              </NativeSelect>
            </div>
            <Button size="sm" className="gap-1.5" onClick={() => setCreateTaskOpen(true)}>
              <Plus className="h-4 w-4" />Aufgabe erstellen
            </Button>
          </div>

          {filteredAdminTasks.length === 0 ? (
            <Card className="p-8 text-center text-gray-400">
              <ClipboardList className="h-10 w-10 mx-auto mb-2" />
              <p className="text-sm">Keine Aufgaben gefunden</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredAdminTasks.map((task) => {
                const pri = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MITTEL;
                const sta = STATUS_CONFIG[task.status] || STATUS_CONFIG.OFFEN;
                const StatusIcon = sta.icon;
                const overdue = isOverdue(task.dueDate);

                return (
                  <Card key={task.id} className={`p-4 ${overdue && task.status !== "ERLEDIGT" ? "border-red-200 bg-red-50/30" : ""}`}>
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${sta.color}`}>
                        <StatusIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {task.project.projectNumber} · {task.project.name}
                          {task.description && ` · ${task.description}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {task.dueDate && (
                          <span className={`text-xs font-medium ${overdue && task.status !== "ERLEDIGT" ? "text-red-600" : "text-gray-500"}`}>
                            {formatDate(task.dueDate)}
                          </span>
                        )}
                        <Badge className={pri.color}>{pri.label}</Badge>
                        <NativeSelect value={task.status} onChange={(e) => updateTaskStatus(task, e.target.value)} className="text-[10px] h-7 w-auto">
                          <option value="OFFEN">Offen</option>
                          <option value="IN_BEARBEITUNG">In Bearbeitung</option>
                          <option value="ERLEDIGT">Erledigt</option>
                        </NativeSelect>
                        <NativeSelect value={task.assigneeId || ""} onChange={(e) => updateTaskAssignee(task, e.target.value)} className="text-[10px] h-7 w-auto">
                          <option value="">Nicht zugewiesen</option>
                          {employees.filter((e) => e.isActive).map((e) => (
                            <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                          ))}
                        </NativeSelect>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteTask(task)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {totalOpenTasks === 0 && assignedProjects.length === 0 && activeTab !== "admin" && activeTab !== "notizen" && (
        <Card className="p-12 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-400" />
          <h3 className="text-lg font-semibold text-gray-900">Alles erledigt!</h3>
          <p className="text-sm text-gray-500 mt-1">Keine offenen Aufgaben oder zugewiesenen Projekte</p>
        </Card>
      )}

      {/* ── Dialog: Aufgabe erstellen ──────────── */}
      <Dialog open={createTaskOpen} onOpenChange={setCreateTaskOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Neue Aufgabe erstellen</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-gray-700">{t("common.titel")} *</label>
              <Input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} className="mt-1" placeholder="Aufgabe beschreiben..." />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t("common.beschreibung")}</label>
              <Textarea value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} className="mt-1" rows={2} placeholder="Details (optional)" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t("common.projekt")} *</label>
              <NativeSelect value={taskForm.projectId} onChange={(e) => setTaskForm({ ...taskForm, projectId: e.target.value })} className="mt-1">
                <option value="">Projekt wählen...</option>
                {allProjects.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.projectNumber} – {p.name}</option>
                ))}
              </NativeSelect>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Zuweisen an</label>
              <NativeSelect value={taskForm.assigneeId} onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })} className="mt-1">
                <option value="">Nicht zugewiesen</option>
                {employees.filter((e) => e.isActive).map((e) => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">{t("common.prioritaet")}</label>
                <NativeSelect value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })} className="mt-1">
                  <option value="NIEDRIG">Niedrig</option>
                  <option value="MITTEL">Mittel</option>
                  <option value="HOCH">Hoch</option>
                </NativeSelect>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{t("common.faelligAm")}</label>
                <Input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateTaskOpen(false)}>{t("common.abbrechen")}</Button>
              <Button onClick={createTask} disabled={!taskForm.title.trim() || !taskForm.projectId}>Aufgabe erstellen</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
