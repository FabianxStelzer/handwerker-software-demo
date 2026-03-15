"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Save, Plus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";

const statusLabels: Record<string, { label: string; variant: "default" | "success" | "warning" | "destructive" }> = {
  AUSSTEHEND: { label: "Ausstehend", variant: "warning" },
  GENEHMIGT: { label: "Genehmigt", variant: "success" },
  ABGELEHNT: { label: "Abgelehnt", variant: "destructive" },
};

export default function MitarbeiterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [vacDialogOpen, setVacDialogOpen] = useState(false);

  const isAdmin = (session?.user as any)?.role === "ADMIN";

  const load = () => {
    fetch(`/api/mitarbeiter/${id}`).then((r) => r.json()).then((data) => {
      setUser(data);
      setForm({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || "",
        position: data.position || "",
        role: data.role,
        isActive: data.isActive,
        hireDate: data.hireDate?.split("T")[0] || "",
        salary: data.salary || "",
        vacationDays: data.vacationDays || 30,
      });
    });
  };

  useEffect(() => { load(); }, [id]);

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/mitarbeiter/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    load();
    setSaving(false);
  }

  async function handleVacationRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const start = new Date(fd.get("startDate") as string);
    const end = new Date(fd.get("endDate") as string);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    await fetch(`/api/mitarbeiter/${id}/urlaub`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate: fd.get("startDate"), endDate: fd.get("endDate"), days, reason: fd.get("reason") }),
    });
    setVacDialogOpen(false);
    load();
  }

  async function handleVacationDecision(requestId: string, status: string) {
    await fetch(`/api/mitarbeiter/${id}/urlaub`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: requestId, status }),
    });
    load();
  }

  if (!user) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  const usedDays = (user.vacationRequests || [])
    .filter((v: any) => v.status === "GENEHMIGT" && new Date(v.startDate).getFullYear() === new Date().getFullYear())
    .reduce((sum: number, v: any) => sum + v.days, 0);
  const vacationPercent = Math.min(100, (usedDays / user.vacationDays) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/mitarbeiter")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{user.firstName} {user.lastName}</h1>
            <p className="text-sm text-gray-500">{user.position || "Mitarbeiter"} · {user.email}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4" />{saving ? "Speichern..." : "Speichern"}
        </Button>
      </div>

      <Tabs defaultValue="profil">
        <TabsList>
          <TabsTrigger value="profil">Profil</TabsTrigger>
          <TabsTrigger value="urlaub">Urlaub</TabsTrigger>
          {isAdmin && <TabsTrigger value="hr">HR-Daten</TabsTrigger>}
          <TabsTrigger value="dokumente">Dokumente</TabsTrigger>
        </TabsList>

        <TabsContent value="profil">
          <Card>
            <CardHeader><CardTitle>Profildaten</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vorname</label>
                  <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
                  <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
                </div>
              </div>
              {isAdmin && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rolle</label>
                    <NativeSelect value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                      <option value="ADMIN">Administrator</option>
                      <option value="BAULEITER">Bauleiter</option>
                      <option value="MITARBEITER">Mitarbeiter</option>
                    </NativeSelect>
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant={form.isActive ? "destructive" : "default"}
                      onClick={() => setForm({ ...form, isActive: !form.isActive })}
                    >
                      {form.isActive ? "Deaktivieren" : "Aktivieren"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="urlaub">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Urlaubsverwaltung</h3>
                <p className="text-sm text-gray-500">{usedDays} von {user.vacationDays} Tagen verbraucht</p>
              </div>
              <Dialog open={vacDialogOpen} onOpenChange={setVacDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4" />Urlaub beantragen</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Urlaubsantrag</DialogTitle></DialogHeader>
                  <form onSubmit={handleVacationRequest} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Von</label>
                        <Input name="startDate" type="date" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bis</label>
                        <Input name="endDate" type="date" required />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Grund (optional)</label>
                      <Input name="reason" />
                    </div>
                    <Button type="submit" className="w-full">Antrag stellen</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4 mb-2">
                  <span className="text-sm text-gray-500">{usedDays}/{user.vacationDays} Tage</span>
                  <span className="text-sm font-medium">{Math.round(vacationPercent)}%</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${vacationPercent > 90 ? "bg-red-500" : vacationPercent > 70 ? "bg-yellow-500" : "bg-green-500"}`}
                    style={{ width: `${vacationPercent}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              {(user.vacationRequests || []).map((vr: any) => {
                const sc = statusLabels[vr.status];
                return (
                  <Card key={vr.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{formatDate(vr.startDate)} – {formatDate(vr.endDate)}</p>
                        <p className="text-xs text-gray-500">{vr.days} Tage{vr.reason ? ` · ${vr.reason}` : ""}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={sc?.variant || "warning"}>{sc?.label || vr.status}</Badge>
                        {isAdmin && vr.status === "AUSSTEHEND" && (
                          <>
                            <Button size="icon" variant="ghost" onClick={() => handleVacationDecision(vr.id, "GENEHMIGT")} className="h-8 w-8">
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleVacationDecision(vr.id, "ABGELEHNT")} className="h-8 w-8">
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="hr">
            <Card>
              <CardHeader><CardTitle>Personaldaten (nur für Administratoren)</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Einstellungsdatum</label>
                    <Input type="date" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gehalt (€/Monat)</label>
                    <Input type="number" step="0.01" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Urlaubstage/Jahr</label>
                  <Input type="number" value={form.vacationDays} onChange={(e) => setForm({ ...form, vacationDays: e.target.value })} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="dokumente">
          <Card>
            <CardHeader><CardTitle>Dokumente & Lohnzettel</CardTitle></CardHeader>
            <CardContent>
              {(user.payslips || []).length === 0 && (user.documents || []).length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Keine Dokumente vorhanden</p>
              ) : (
                <div className="space-y-2">
                  {(user.payslips || []).map((p: any) => (
                    <a key={p.id} href={p.fileUrl} target="_blank" className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50">
                      <span className="text-sm font-medium">Lohnzettel {p.month}/{p.year}</span>
                      <span className="text-xs text-gray-400">{p.fileName}</span>
                    </a>
                  ))}
                  {(user.documents || []).map((d: any) => (
                    <a key={d.id} href={d.fileUrl} target="_blank" className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50">
                      <span className="text-sm font-medium">{d.name}</span>
                      <span className="text-xs text-gray-400">{d.fileType}</span>
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
