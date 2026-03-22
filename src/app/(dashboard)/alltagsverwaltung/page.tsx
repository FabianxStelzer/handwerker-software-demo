"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/select";
import {
  MapPin, Truck, Users, FolderKanban, Package, Clock, Check, X,
  Plus, AlertTriangle, ChevronRight, Search, Eye, UserPlus, Car,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  avatarUrl: string | null;
  isCheckedIn: boolean;
}

interface VehicleAssignment {
  id: string;
  userId: string;
  userName: string;
  isPrimary: boolean;
}

interface Vehicle {
  id: string;
  licensePlate: string;
  brand: string;
  model: string;
  gpsLastLat: number | null;
  gpsLastLng: number | null;
  gpsLastUpdate: string | null;
  assignments: VehicleAssignment[];
}

interface StaffAssignment {
  id: string;
  projectId: string;
  userId: string;
  vehicleId: string | null;
  role: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
}

interface Project {
  id: string;
  name: string;
  projectNumber: string;
  status: string;
  siteStreet: string | null;
  siteZip: string | null;
  siteCity: string | null;
  startDate: string | null;
  endDate: string | null;
  customerName: string;
  taskCount: number;
  materialCount: number;
  staffAssignments: StaffAssignment[];
}

interface PendingMaterial {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  quantityPlanned: number;
  pricePerUnit: number;
  requestedAt: string | null;
  project: { id: string; name: string; projectNumber: string };
  requestedBy: { id: string; firstName: string; lastName: string } | null;
}

interface AlltagsData {
  projects: Project[];
  vehicles: Vehicle[];
  employees: Employee[];
  pendingMaterials: PendingMaterial[];
  staffAssignments: StaffAssignment[];
}

// TODO: Move labels to translation system
const statusLabels: Record<string, string> = {
  PLANUNG: "Planung",
  AKTIV: "Aktiv",
  PAUSIERT: "Pausiert",
  ABGESCHLOSSEN: "Abgeschlossen",
  STORNIERT: "Storniert",
};

const statusColors: Record<string, string> = {
  PLANUNG: "bg-blue-100 text-blue-700",
  AKTIV: "bg-green-100 text-green-700",
  PAUSIERT: "bg-yellow-100 text-yellow-700",
  ABGESCHLOSSEN: "bg-gray-100 text-gray-600",
  STORNIERT: "bg-red-100 text-red-700",
};

const unitLabels: Record<string, string> = {
  STUECK: "Stk", METER: "m", QUADRATMETER: "m²", KUBIKMETER: "m³",
  LITER: "l", KILOGRAMM: "kg", TONNE: "t", PAUSCHAL: "psch", STUNDE: "Std",
};

export default function AlltagsverwaltungPage() {
  const [data, setData] = useState<AlltagsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"karte" | "projekte" | "zuordnung" | "material">("karte");
  const [search, setSearch] = useState("");
  const [assignDialog, setAssignDialog] = useState<string | null>(null);
  const [assignForm, setAssignForm] = useState({ userId: "", vehicleId: "", role: "", startDate: "", endDate: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const { t } = useTranslation();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/alltagsverwaltung");
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const doAction = async (body: Record<string, unknown>) => {
    setSaving(true);
    try {
      await fetch("/api/alltagsverwaltung", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      await load();
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9eb552]" /></div>;
  if (!data) return <div className="p-8 text-center text-gray-500">{t("common.fehlerAufgetreten")}</div>;

  const checkedInCount = data.employees.filter(e => e.isCheckedIn).length;
  const activeProjects = data.projects.filter(p => p.status === "AKTIV").length;
  const vehiclesWithGps = data.vehicles.filter(v => v.gpsLastLat && v.gpsLastLng);
  const pendingCount = data.pendingMaterials.length;

  const filteredProjects = data.projects.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.projectNumber.toLowerCase().includes(search.toLowerCase()) ||
    p.customerName.toLowerCase().includes(search.toLowerCase())
  );

  const getEmployeeName = (id: string) => data.employees.find(e => e.id === id)?.fullName || "–";
  const getVehicleLabel = (id: string) => {
    const v = data.vehicles.find(v => v.id === id);
    return v ? `${v.licensePlate} (${v.brand} ${v.model})` : "–";
  };

  const today = new Date().toISOString().slice(0, 10);
  const todayAssignments = data.staffAssignments.filter(a => {
    if (!a.startDate) return false;
    const start = a.startDate.slice(0, 10);
    const end = a.endDate ? a.endDate.slice(0, 10) : "9999-12-31";
    return start <= today && today <= end;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("alltag.title")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("alltag.subtitle")}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center"><Users className="h-5 w-5 text-green-600" /></div>
            <div><p className="text-2xl font-bold text-gray-900">{checkedInCount}</p><p className="text-xs text-gray-500">{t("alltag.eingestempelt")}</p></div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><FolderKanban className="h-5 w-5 text-blue-600" /></div>
            <div><p className="text-2xl font-bold text-gray-900">{activeProjects}</p><p className="text-xs text-gray-500">{t("alltag.aktiveProjekte")}</p></div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center"><Car className="h-5 w-5 text-purple-600" /></div>
            <div><p className="text-2xl font-bold text-gray-900">{vehiclesWithGps.length}/{data.vehicles.length}</p><p className="text-xs text-gray-500">{t("alltag.fahrzeugeMitGps")}</p></div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center"><Package className="h-5 w-5 text-orange-600" /></div>
            <div><p className="text-2xl font-bold text-gray-900">{pendingCount}</p><p className="text-xs text-gray-500">{t("alltag.materialAnfragen")}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {([
          { key: "karte", label: t("alltag.karteUebersicht"), icon: MapPin },
          { key: "projekte", label: t("alltag.projekte"), icon: FolderKanban },
          { key: "zuordnung", label: t("alltag.zuordnung"), icon: UserPlus },
          { key: "material", label: t("alltag.materialFreigabe"), icon: Package },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <tab.icon className="h-4 w-4" />{tab.label}
            {tab.key === "material" && pendingCount > 0 && (
              <span className="ml-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Karte & Übersicht */}
      {activeTab === "karte" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Karte */}
          <Card className="lg:col-span-2 border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2"><MapPin className="h-4 w-4 text-[#9eb552]" />{t("alltag.fahrzeugProjektKarte")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 rounded-lg overflow-hidden relative" style={{ height: 480 }}>
                <MapView vehicles={vehiclesWithGps} projects={data.projects} employees={data.employees} todayAssignments={todayAssignments} />
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Fahrzeuge</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#9eb552] inline-block" /> Projekte</span>
              </div>
            </CardContent>
          </Card>

          {/* Mitarbeiter-Status */}
          <div className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-green-600" />{t("alltag.mitarbeiterStatus")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[250px] overflow-y-auto">
                {data.employees.map(emp => {
                  const assignment = todayAssignments.find(a => a.userId === emp.id);
                  const project = assignment ? data.projects.find(p => p.id === assignment.projectId) : null;
                  return (
                    <div key={emp.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${emp.isCheckedIn ? "bg-green-500" : "bg-gray-300"}`}>
                        {emp.firstName[0]}{emp.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{emp.fullName}</p>
                        <p className="text-[10px] text-gray-500">
                          {emp.isCheckedIn ? "Eingestempelt" : "Nicht eingestempelt"}
                          {project && <> · <span className="text-[#9eb552]">{project.name}</span></>}
                        </p>
                      </div>
                      {emp.isCheckedIn && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Material-Schnellansicht */}
            {pendingCount > 0 && (
              <Card className="border-0 shadow-sm border-l-4 border-l-orange-400">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-orange-600">
                    <AlertTriangle className="h-4 w-4" />{t("alltag.materialAnfragen")} ({pendingCount})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.pendingMaterials.slice(0, 3).map(m => (
                    <div key={m.id} className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{m.name}</p>
                        <p className="text-[10px] text-gray-500">{m.project.name} · {m.requestedBy ? `${m.requestedBy.firstName} ${m.requestedBy.lastName}` : "–"}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => doAction({ action: "approve-material", materialId: m.id })} disabled={saving}
                          className="p-1 rounded bg-green-500 text-white hover:bg-green-600"><Check className="h-3.5 w-3.5" /></button>
                        <button onClick={() => doAction({ action: "reject-material", materialId: m.id })} disabled={saving}
                          className="p-1 rounded bg-red-500 text-white hover:bg-red-600"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  ))}
                  {pendingCount > 3 && (
                    <button onClick={() => setActiveTab("material")} className="text-xs text-[#9eb552] hover:underline flex items-center gap-1">
                      Alle {pendingCount} anzeigen <ChevronRight className="h-3 w-3" />
                    </button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Fahrzeuge */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2"><Truck className="h-4 w-4 text-purple-600" />{t("alltag.fahrzeugeImEinsatz")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[200px] overflow-y-auto">
                {data.vehicles.map(v => (
                  <div key={v.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center"><Car className="h-4 w-4 text-purple-600" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{v.licensePlate}</p>
                      <p className="text-[10px] text-gray-500">{v.brand} {v.model}{v.assignments.length > 0 && ` · ${v.assignments.map(a => a.userName).join(", ")}`}</p>
                    </div>
                    {v.gpsLastLat ? <span className="w-2 h-2 rounded-full bg-blue-500" title="GPS aktiv" /> : <span className="w-2 h-2 rounded-full bg-gray-300" title="Kein GPS" />}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab: Projekte */}
      {activeTab === "projekte" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder={t("alltag.projektSuchen")} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
          <div className="grid gap-4">
            {filteredProjects.map(p => {
              const staff = p.staffAssignments || [];
              const activeStaff = staff.filter(s => {
                if (!s.startDate) return true;
                const start = s.startDate.slice(0, 10);
                const end = s.endDate ? s.endDate.slice(0, 10) : "9999-12-31";
                return start <= today && today <= end;
              });
              return (
                <Card key={p.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={statusColors[p.status] || "bg-gray-100 text-gray-600"}>{statusLabels[p.status] || p.status}</Badge>
                          <span className="text-xs text-gray-400">{p.projectNumber}</span>
                        </div>
                        <h3 className="font-semibold text-gray-900">{p.name}</h3>
                        <p className="text-sm text-gray-500">{p.customerName}</p>
                        {(p.siteStreet || p.siteCity) && (
                          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><MapPin className="h-3 w-3" />{[p.siteStreet, p.siteZip, p.siteCity].filter(Boolean).join(", ")}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setAssignDialog(p.id); setAssignForm({ userId: "", vehicleId: "", role: "", startDate: today, endDate: "", notes: "" }); }}>
                          <UserPlus className="h-3.5 w-3.5 mr-1" />{t("common.zuweisen")}
                        </Button>
                        <a href={`/projekte/${p.id}`}><Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" /></Button></a>
                      </div>
                    </div>
                    {activeStaff.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs font-medium text-gray-500 mb-2">Aktuell zugeordnet:</p>
                        <div className="flex flex-wrap gap-2">
                          {activeStaff.map(s => (
                            <div key={s.id} className="flex items-center gap-1.5 bg-gray-50 rounded-full px-3 py-1 text-xs">
                              <Users className="h-3 w-3 text-gray-400" />
                              <span className="font-medium">{getEmployeeName(s.userId)}</span>
                              {s.vehicleId && <><Car className="h-3 w-3 text-gray-400 ml-1" /><span>{getVehicleLabel(s.vehicleId).split(" (")[0]}</span></>}
                              <button onClick={() => doAction({ action: "remove-staff", assignmentId: s.id })} className="ml-1 text-red-400 hover:text-red-600"><X className="h-3 w-3" /></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                      <span>{p.taskCount} Aufgaben</span>
                      <span>{p.materialCount} Materialien</span>
                      {p.startDate && <span>Start: {new Date(p.startDate).toLocaleDateString("de-DE")}</span>}
                      {p.endDate && <span>Ende: {new Date(p.endDate).toLocaleDateString("de-DE")}</span>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filteredProjects.length === 0 && <p className="text-center text-gray-400 py-8">Keine Projekte gefunden</p>}
          </div>
        </div>
      )}

      {/* Tab: Zuordnung */}
      {activeTab === "zuordnung" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">{t("alltag.heutigeEinsatzplanung")}</CardTitle>
            </CardHeader>
            <CardContent>
              {todayAssignments.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">{t("alltag.keineZuordnungen")}</p>
              ) : (
                <div className="space-y-3">
                  {todayAssignments.map(a => {
                    const project = data.projects.find(p => p.id === a.projectId);
                    return (
                      <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{getEmployeeName(a.userId)}</p>
                          <p className="text-xs text-gray-500">{project?.name || "–"} {a.vehicleId && `· ${getVehicleLabel(a.vehicleId).split(" (")[0]}`}</p>
                          {a.role && <p className="text-[10px] text-gray-400">{a.role}</p>}
                        </div>
                        <button onClick={() => doAction({ action: "remove-staff", assignmentId: a.id })} disabled={saving}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"><X className="h-4 w-4" /></button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">{t("alltag.neueZuordnung")}</CardTitle>
            </CardHeader>
            <CardContent>
              <QuickAssignForm
                projects={data.projects}
                employees={data.employees}
                vehicles={data.vehicles}
                onAssign={async (form) => {
                  await doAction({ action: "assign-staff", ...form });
                }}
                saving={saving}
              />
            </CardContent>
          </Card>

          {/* Wochenübersicht */}
          <Card className="lg:col-span-2 border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">{t("alltag.wochenuebersicht")}</CardTitle>
            </CardHeader>
            <CardContent>
              <WeekView assignments={data.staffAssignments} projects={data.projects} employees={data.employees} getVehicleLabel={getVehicleLabel} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Material-Freigabe */}
      {activeTab === "material" && (
        <div className="space-y-4">
          {data.pendingMaterials.length === 0 ? (
            <Card className="border-0 shadow-sm"><CardContent className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">{t("alltag.keineOffenen")}</p>
              <p className="text-sm text-gray-400 mt-1">{t("alltag.alleBearbeitet")}</p>
            </CardContent></Card>
          ) : (
            data.pendingMaterials.map(m => (
              <Card key={m.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-orange-100 text-orange-700">{t("common.ausstehend")}</Badge>
                        <span className="text-xs text-gray-400">{m.project.projectNumber}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900">{m.name}</h3>
                      {m.description && <p className="text-sm text-gray-500 mt-1">{m.description}</p>}
                      <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                        <span>Projekt: {m.project.name}</span>
                        <span>{t("alltag.menge")} {m.quantityPlanned} {unitLabels[m.unit] || m.unit}</span>
                        {m.pricePerUnit > 0 && <span>{t("alltag.preisLabel")} {m.pricePerUnit.toFixed(2)} €/{unitLabels[m.unit] || m.unit}</span>}
                        {m.requestedBy && <span>{t("alltag.angeforderVon")} {m.requestedBy.firstName} {m.requestedBy.lastName}</span>}
                        {m.requestedAt && <span>{new Date(m.requestedAt).toLocaleDateString("de-DE")}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button onClick={() => doAction({ action: "approve-material", materialId: m.id })} disabled={saving} size="sm" className="bg-green-600 hover:bg-green-700">
                        <Check className="h-4 w-4 mr-1" />{t("common.freigeben")}
                      </Button>
                      <Button onClick={() => doAction({ action: "reject-material", materialId: m.id })} disabled={saving} variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50">
                        <X className="h-4 w-4 mr-1" />{t("common.ablehnen")}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Assign Dialog */}
      {assignDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">{t("alltag.mitarbeiterZuordnen")}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">{t("common.mitarbeiter")} *</label>
                <NativeSelect value={assignForm.userId} onChange={e => setAssignForm(f => ({ ...f, userId: e.target.value }))}>
                  <option value="">Mitarbeiter wählen...</option>
                  {data.employees.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
                </NativeSelect>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Fahrzeug</label>
                <NativeSelect value={assignForm.vehicleId} onChange={e => setAssignForm(f => ({ ...f, vehicleId: e.target.value }))}>
                  <option value="">{t("alltag.keinFahrzeug")}</option>
                  {data.vehicles.map(v => <option key={v.id} value={v.id}>{v.licensePlate} – {v.brand} {v.model}</option>)}
                </NativeSelect>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">{t("alltag.rolleFunktion")}</label>
                <Input value={assignForm.role} onChange={e => setAssignForm(f => ({ ...f, role: e.target.value }))} placeholder="z.B. Bauleiter, Monteur..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">{t("common.von")}</label>
                  <Input type="date" value={assignForm.startDate} onChange={e => setAssignForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">{t("common.bis")}</label>
                  <Input type="date" value={assignForm.endDate} onChange={e => setAssignForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">{t("common.notizen")}</label>
                <Textarea value={assignForm.notes} onChange={e => setAssignForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setAssignDialog(null)}>{t("common.abbrechen")}</Button>
              <Button disabled={!assignForm.userId || saving} onClick={async () => {
                await doAction({ action: "assign-staff", projectId: assignDialog, ...assignForm });
                setAssignDialog(null);
              }}>
                <UserPlus className="h-4 w-4 mr-1" />{t("common.zuweisen")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Map View ──────────────────────────────────────────────── */

function MapView({ vehicles, projects, employees, todayAssignments }: {
  vehicles: Vehicle[];
  projects: Project[];
  employees: Employee[];
  todayAssignments: StaffAssignment[];
}) {
  const allPoints: { lat: number; lng: number; type: "vehicle" | "project"; label: string; details: string }[] = [];

  vehicles.forEach(v => {
    if (v.gpsLastLat && v.gpsLastLng) {
      const drivers = v.assignments.map(a => a.userName).join(", ");
      allPoints.push({
        lat: v.gpsLastLat, lng: v.gpsLastLng,
        type: "vehicle",
        label: v.licensePlate,
        details: `${v.brand} ${v.model}${drivers ? ` · ${drivers}` : ""}`,
      });
    }
  });

  const projectsWithAddress = projects.filter(p => p.siteCity);
  const fakeLocations: [number, number][] = [
    [51.165, 10.452], [52.520, 13.405], [48.137, 11.576], [50.938, 6.957],
    [53.551, 9.994], [48.775, 9.183], [51.339, 12.374], [50.111, 8.682],
    [49.453, 11.077], [51.434, 6.762], [47.999, 7.842], [49.009, 8.404],
  ];
  projectsWithAddress.forEach((p, i) => {
    const [lat, lng] = fakeLocations[i % fakeLocations.length];
    const staff = todayAssignments.filter(a => a.projectId === p.id);
    const staffNames = staff.map(s => employees.find(e => e.id === s.userId)?.fullName || "–").join(", ");
    allPoints.push({
      lat: lat + (Math.random() - 0.5) * 0.5, lng: lng + (Math.random() - 0.5) * 0.5,
      type: "project",
      label: p.name,
      details: `${p.customerName}${staffNames ? ` · ${staffNames}` : ""}`,
    });
  });

  if (allPoints.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <MapPin className="h-12 w-12 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">Keine GPS-Daten oder Projektstandorte vorhanden</p>
          <p className="text-xs text-gray-300 mt-1">Fahrzeuge mit GPS-Tracker werden hier angezeigt</p>
        </div>
      </div>
    );
  }

  const minLat = Math.min(...allPoints.map(p => p.lat));
  const maxLat = Math.max(...allPoints.map(p => p.lat));
  const minLng = Math.min(...allPoints.map(p => p.lng));
  const maxLng = Math.max(...allPoints.map(p => p.lng));
  const padLat = Math.max((maxLat - minLat) * 0.15, 0.1);
  const padLng = Math.max((maxLng - minLng) * 0.15, 0.1);

  const toX = (lng: number) => ((lng - (minLng - padLng)) / ((maxLng + padLng) - (minLng - padLng))) * 100;
  const toY = (lat: number) => (1 - (lat - (minLat - padLat)) / ((maxLat + padLat) - (minLat - padLat))) * 100;

  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="w-full h-full relative bg-gradient-to-br from-[#e8f0e3] to-[#d4e4c8]">
      {/* Grid lines */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.15 }}>
        {[0, 20, 40, 60, 80, 100].map(v => (
          <line key={`h${v}`} x1="0%" y1={`${v}%`} x2="100%" y2={`${v}%`} stroke="#888" strokeWidth={0.5} />
        ))}
        {[0, 20, 40, 60, 80, 100].map(v => (
          <line key={`v${v}`} x1={`${v}%`} y1="0%" x2={`${v}%`} y2="100%" stroke="#888" strokeWidth={0.5} />
        ))}
      </svg>
      {allPoints.map((point, i) => (
        <div key={i}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10"
          style={{ left: `${toX(point.lng)}%`, top: `${toY(point.lat)}%` }}
          onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-white ${point.type === "vehicle" ? "bg-blue-500" : "bg-[#9eb552]"}`}>
            {point.type === "vehicle" ? <Car className="h-3 w-3 text-white" /> : <FolderKanban className="h-3 w-3 text-white" />}
          </div>
          {point.type === "vehicle" && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border border-white animate-pulse" />}
          {hovered === i && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white rounded-lg shadow-xl p-2.5 min-w-[200px] z-20 border">
              <p className="text-xs font-bold text-gray-900">{point.label}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{point.details}</p>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-white border-r border-b rotate-45" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Quick Assign Form ─────────────────────────────────────── */

function QuickAssignForm({ projects, employees, vehicles, onAssign, saving }: {
  projects: Project[];
  employees: Employee[];
  vehicles: Vehicle[];
  onAssign: (form: Record<string, string>) => Promise<void>;
  saving: boolean;
}) {
  const [form, setForm] = useState({ projectId: "", userId: "", vehicleId: "", role: "", startDate: new Date().toISOString().slice(0, 10), endDate: "", notes: "" });
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Projekt *</label>
        <NativeSelect value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}>
          <option value="">Projekt wählen...</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.projectNumber} – {p.name}</option>)}
        </NativeSelect>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">{t("common.mitarbeiter")} *</label>
        <NativeSelect value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))}>
          <option value="">Mitarbeiter wählen...</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
        </NativeSelect>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Fahrzeug</label>
        <NativeSelect value={form.vehicleId} onChange={e => setForm(f => ({ ...f, vehicleId: e.target.value }))}>
          <option value="">{t("alltag.keinFahrzeug")}</option>
          {vehicles.map(v => <option key={v.id} value={v.id}>{v.licensePlate} – {v.brand} {v.model}</option>)}
        </NativeSelect>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Rolle</label>
        <Input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="z.B. Vorarbeiter, Monteur..." />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">{t("common.von")}</label>
          <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">{t("common.bis")}</label>
          <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">{t("common.notizen")}</label>
        <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
      </div>
      <Button className="w-full" disabled={!form.projectId || !form.userId || saving} onClick={async () => {
        await onAssign(form);
        setForm(f => ({ ...f, userId: "", vehicleId: "", role: "", notes: "" }));
      }}>
        <Plus className="h-4 w-4 mr-1" />{t("alltag.neueZuordnung")}
      </Button>
    </div>
  );
}

/* ─── Week View ─────────────────────────────────────────────── */

function WeekView({ assignments, projects, employees, getVehicleLabel }: {
  assignments: StaffAssignment[];
  projects: Project[];
  employees: Employee[];
  getVehicleLabel: (id: string) => string;
}) {
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  const dayNames = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const todayStr = new Date().toISOString().slice(0, 10);

  const uniqueEmployeeIds = [...new Set(assignments.map(a => a.userId))];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="text-left p-2 font-medium text-gray-500 w-36">Mitarbeiter</th>
            {days.map((d, i) => {
              const ds = d.toISOString().slice(0, 10);
              return (
                <th key={i} className={`p-2 text-center font-medium min-w-[100px] ${ds === todayStr ? "bg-[#9eb552]/10 text-[#9eb552]" : "text-gray-500"}`}>
                  <div>{dayNames[i]}</div>
                  <div className="text-[10px] font-normal">{d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {uniqueEmployeeIds.map(empId => {
            const emp = employees.find(e => e.id === empId);
            return (
              <tr key={empId} className="border-t">
                <td className="p-2 font-medium text-gray-900">{emp?.fullName || "–"}</td>
                {days.map((d, i) => {
                  const ds = d.toISOString().slice(0, 10);
                  const dayAssignments = assignments.filter(a => {
                    if (a.userId !== empId) return false;
                    if (!a.startDate) return false;
                    const start = a.startDate.slice(0, 10);
                    const end = a.endDate ? a.endDate.slice(0, 10) : "9999-12-31";
                    return start <= ds && ds <= end;
                  });
                  return (
                    <td key={i} className={`p-1 text-center ${ds === todayStr ? "bg-[#9eb552]/5" : ""}`}>
                      {dayAssignments.map(a => {
                        const proj = projects.find(p => p.id === a.projectId);
                        return (
                          <div key={a.id} className="bg-blue-50 text-blue-700 rounded px-1 py-0.5 mb-0.5 truncate" title={proj?.name}>
                            {proj?.name?.slice(0, 15) || "–"}
                          </div>
                        );
                      })}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          {uniqueEmployeeIds.length === 0 && (
            <tr><td colSpan={8} className="text-center py-4 text-gray-400">Keine Zuordnungen vorhanden</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
