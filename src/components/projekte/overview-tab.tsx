"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Save,
  Pencil,
  X,
  MapPin,
  CalendarDays,
  Clock,
  FileText,
  Users,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  project: any;
  onUpdate: () => void;
}

function formatDate(d: string | null) {
  if (!d) return "–";
  return new Date(d).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
}

export function OverviewTab({ project, onUpdate }: Props) {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "ADMIN" || userRole === "BAULEITER";

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: project.name || "",
    description: project.description || "",
    status: project.status,
    siteStreet: project.siteStreet || "",
    siteZip: project.siteZip || "",
    siteCity: project.siteCity || "",
    startDate: project.startDate?.split("T")[0] || "",
    endDate: project.endDate?.split("T")[0] || "",
    plannedHours: project.plannedHours?.toString() || "",
  });
  const [saving, setSaving] = useState(false);

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showAssign, setShowAssign] = useState(false);

  const assignedUsers = (project.timeEntries || []).map((te: any) => te.user);
  const assignedTaskUsers = (project.tasks || [])
    .filter((t: any) => t.assigneeId)
    .map((t: any) => t.assigneeId);
  const uniqueUserIds = new Set([
    ...assignedUsers.map((u: any) => u.id),
    ...assignedTaskUsers,
  ]);

  const loadUsers = useCallback(async () => {
    if (!showAssign) return;
    const res = await fetch("/api/mitarbeiter");
    if (res.ok) setAllUsers(await res.json());
  }, [showAssign]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/projekte/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    onUpdate();
    setSaving(false);
    setEditing(false);
  }

  const customerName = project.customer.type === "GESCHAEFT" && project.customer.company
    ? project.customer.company
    : `${project.customer.firstName} ${project.customer.lastName}`;

  const hasSiteAddress = project.siteStreet || project.siteCity;

  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Projekt bearbeiten</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
              <X className="h-4 w-4" /> Abbrechen
            </Button>
            <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "Speichern..." : "Speichern"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-5 space-y-4">
              <h4 className="text-sm font-semibold text-gray-900">Projektdaten</h4>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Projektname</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <NativeSelect value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="PLANUNG">Planung</option>
                  <option value="AKTIV">Aktiv</option>
                  <option value="PAUSIERT">Pausiert</option>
                  <option value="ABGESCHLOSSEN">Abgeschlossen</option>
                  <option value="STORNIERT">Storniert</option>
                </NativeSelect>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Beschreibung</label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Startdatum</label>
                  <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Enddatum</label>
                  <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Geplante Stunden</label>
                <Input type="number" step="0.5" value={form.plannedHours} onChange={(e) => setForm({ ...form, plannedHours: e.target.value })} placeholder="z.B. 60" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-4">
              <h4 className="text-sm font-semibold text-gray-900">Baustellenadresse</h4>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Straße</label>
                <Input value={form.siteStreet} onChange={(e) => setForm({ ...form, siteStreet: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">PLZ</label>
                  <Input value={form.siteZip} onChange={(e) => setForm({ ...form, siteZip: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ort</label>
                  <Input value={form.siteCity} onChange={(e) => setForm({ ...form, siteCity: e.target.value })} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Ansichtsmodus
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projektdetails */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Projektdetails</h3>
              {isAdmin && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(true)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Bearbeiten
                </Button>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-blue-600">Beschreibung</p>
                <p className="text-sm text-gray-900 mt-0.5">
                  {project.description || <span className="text-gray-400">Keine Beschreibung</span>}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-blue-600">Startdatum</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <CalendarDays className="h-4 w-4 text-gray-400" />
                    <p className="text-sm text-gray-900">{formatDate(project.startDate)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-blue-600">Enddatum</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <CalendarDays className="h-4 w-4 text-gray-400" />
                    <p className="text-sm text-gray-900">{formatDate(project.endDate)}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-blue-600">Geplante Stunden</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <p className="text-sm text-gray-900">
                    {project.plannedHours ? `${project.plannedHours} Std.` : "–"}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs font-medium text-blue-600">Kunde</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">{customerName}</p>
                {project.customer.email && (
                  <p className="text-xs text-gray-500">{project.customer.email}</p>
                )}
                {project.customer.phone && (
                  <p className="text-xs text-gray-500">{project.customer.phone}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Baustellenadresse */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Baustellenadresse</h3>
            {hasSiteAddress ? (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  {project.siteStreet && <p className="text-sm text-gray-900">{project.siteStreet}</p>}
                  <p className="text-sm text-gray-900">
                    {[project.siteZip, project.siteCity].filter(Boolean).join(" ")}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Keine Baustellenadresse hinterlegt</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Zugewiesene Mitarbeiter */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Zugewiesene Mitarbeiter</h3>
            {isAdmin && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowAssign(!showAssign)}>
                <UserPlus className="h-3.5 w-3.5" />
                Zuweisen
              </Button>
            )}
          </div>

          {showAssign && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-2">Mitarbeiter über Aufgaben oder Zeiterfassung zuweisen:</p>
              <p className="text-xs text-gray-400">
                Wenn ein Mitarbeiter eine Aufgabe in diesem Projekt zugewiesen bekommt oder sich für dieses Projekt einstempelt, erscheint er hier automatisch.
              </p>
            </div>
          )}

          {uniqueUserIds.size === 0 ? (
            <p className="text-sm text-gray-400">Keine Mitarbeiter zugewiesen</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {assignedUsers.map((user: any) => (
                <div key={user.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-medium shrink-0">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </div>
                  <span className="text-sm font-medium text-blue-900">
                    {user.firstName} {user.lastName}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
