"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
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
} from "lucide-react";

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

export default function MeineAufgabenPage() {
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([]);
  const [schlosserAufgaben, setSchlosserAufgaben] = useState<SchlosserAufgabe[]>([]);
  const [assignedProjects, setAssignedProjects] = useState<AssignedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"alle" | "projekte" | "aufgaben" | "schlosser">("alle");

  const loadData = useCallback(async () => {
    const res = await fetch("/api/meine-aufgaben");
    if (res.ok) {
      const data = await res.json();
      setProjectTasks(data.projectTasks || []);
      setSchlosserAufgaben(data.schlosserAufgaben || []);
      setAssignedProjects(data.assignedProjects || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const totalOpenTasks = projectTasks.length + schlosserAufgaben.length;
  const highPriorityCount =
    projectTasks.filter((t) => t.priority === "HOCH").length +
    schlosserAufgaben.filter((a) => a.prioritaet === "HOCH" || a.prioritaet === "DRINGEND").length;
  const overdueCount =
    projectTasks.filter((t) => isOverdue(t.dueDate)).length +
    schlosserAufgaben.filter((a) => isOverdue(a.faelligAm)).length;

  const tabs = [
    { key: "alle" as const, label: "Übersicht" },
    { key: "projekte" as const, label: `Projekte (${assignedProjects.length})` },
    { key: "aufgaben" as const, label: `Projekt-Aufgaben (${projectTasks.length})` },
    ...(schlosserAufgaben.length > 0 ? [{ key: "schlosser" as const, label: `Schlosser (${schlosserAufgaben.length})` }] : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meine Aufgaben</h1>
        <p className="text-sm text-gray-500 mt-1">Zugewiesene Projekte und offene Aufgaben</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <ClipboardList className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400">Offene Aufgaben</p>
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
              <p className="text-xs font-medium text-gray-400">Hohe Priorität</p>
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
              <p className="text-xs font-medium text-gray-400">Überfällig</p>
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
          {activeTab === "alle" && <h2 className="text-lg font-semibold text-gray-900 mb-3">Meine Projekte</h2>}
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
          {activeTab === "alle" && <h2 className="text-lg font-semibold text-gray-900 mb-3">Projekt-Aufgaben</h2>}
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
                            {overdue ? "Überfällig: " : ""}{formatDate(task.dueDate)}
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
                            {overdue ? "Überfällig: " : ""}{formatDate(aufgabe.faelligAm)}
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

      {totalOpenTasks === 0 && assignedProjects.length === 0 && (
        <Card className="p-12 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-400" />
          <h3 className="text-lg font-semibold text-gray-900">Alles erledigt!</h3>
          <p className="text-sm text-gray-500 mt-1">Keine offenen Aufgaben oder zugewiesenen Projekte</p>
        </Card>
      )}
    </div>
  );
}
