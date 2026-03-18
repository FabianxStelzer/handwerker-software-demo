"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Car, Plus, Trash2, UserPlus, UserMinus, MapPin, Shield, Upload,
  CheckCircle2, AlertTriangle, Clock, Eye, ChevronLeft, Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Vehicle {
  id: string;
  licensePlate: string;
  brand: string;
  model: string;
  year: number | null;
  color: string | null;
  vin: string | null;
  nextInspection: string | null;
  nextTuv: string | null;
  mileage: number | null;
  notes: string | null;
  gpsDeviceId: string | null;
  gpsLastLat: number | null;
  gpsLastLng: number | null;
  gpsLastUpdate: string | null;
  isActive: boolean;
  assignments: { id: string; userId: string; isPrimary: boolean; user: { id: string; firstName: string; lastName: string } }[];
}

interface LicenseUpload {
  id: string;
  userId: string;
  imageUrl: string;
  uploadedAt: string;
  expiresAt: string;
  verified: boolean;
  verifiedBy: string | null;
  user?: { id: string; firstName: string; lastName: string };
}

export default function FahrzeugePage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isAdmin = role === "ADMIN" || role === "BAULEITER";

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [licenses, setLicenses] = useState<LicenseUpload[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [viewLicense, setViewLicense] = useState<LicenseUpload | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    licensePlate: "", brand: "", model: "", year: "", color: "",
    vin: "", nextInspection: "", nextTuv: "", mileage: "", notes: "", gpsDeviceId: "",
  });

  async function load() {
    const [vRes, lRes, uRes] = await Promise.all([
      fetch("/api/fahrzeuge"),
      fetch("/api/fuehrerschein"),
      fetch("/api/mitarbeiter"),
    ]);
    if (vRes.ok) setVehicles(await vRes.json());
    if (lRes.ok) setLicenses(await lRes.json());
    if (uRes.ok) {
      const d = await uRes.json();
      setAllUsers(Array.isArray(d) ? d : d.users || []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/fahrzeuge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setDialogOpen(false);
    setForm({ licensePlate: "", brand: "", model: "", year: "", color: "", vin: "", nextInspection: "", nextTuv: "", mileage: "", notes: "", gpsDeviceId: "" });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Fahrzeug wirklich löschen?")) return;
    await fetch("/api/fahrzeuge", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  async function handleAssign(vehicleId: string, userId: string) {
    await fetch("/api/fahrzeuge", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: vehicleId, action: "assign", userId }),
    });
    load();
  }

  async function handleUnassign(assignmentId: string) {
    await fetch("/api/fahrzeuge", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "x", action: "unassign", assignmentId }),
    });
    load();
  }

  async function handleUploadLicense(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    await fetch("/api/fuehrerschein", { method: "POST", body: fd });
    setUploading(false);
    load();
  }

  async function handleVerify(id: string) {
    await fetch("/api/fuehrerschein", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "verify" }),
    });
    load();
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  const assignedUserIds = new Set(vehicles.flatMap((v) => v.assignments.map((a) => a.userId)));
  const usersNeedingLicense = allUsers.filter((u: any) => assignedUserIds.has(u.id));

  function getLicenseStatus(userId: string): { status: "ok" | "expiring" | "expired" | "missing"; upload?: LicenseUpload } {
    const userUploads = licenses.filter((l) => l.userId === userId);
    if (userUploads.length === 0) return { status: "missing" };
    const latest = userUploads[0];
    const expires = new Date(latest.expiresAt);
    const now = new Date();
    const daysLeft = Math.floor((expires.getTime() - now.getTime()) / 86400000);
    if (daysLeft < 0) return { status: "expired", upload: latest };
    if (daysLeft < 30) return { status: "expiring", upload: latest };
    return { status: "ok", upload: latest };
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fahrzeuge</h1>
          <p className="text-sm text-gray-500 mt-1">Firmenwagen, Führerscheinkontrolle und GPS-Tracking</p>
        </div>
      </div>

      <Tabs defaultValue="fahrzeuge">
        <TabsList>
          <TabsTrigger value="fahrzeuge" className="gap-1.5"><Car className="h-4 w-4" />Fahrzeuge ({vehicles.length})</TabsTrigger>
          <TabsTrigger value="fuehrerschein" className="gap-1.5"><Shield className="h-4 w-4" />Führerscheinkontrolle</TabsTrigger>
          <TabsTrigger value="gps" className="gap-1.5"><MapPin className="h-4 w-4" />GPS-Tracking</TabsTrigger>
        </TabsList>

        {/* ── Fahrzeuge ─────────────────────────────── */}
        <TabsContent value="fahrzeuge">
          {isAdmin && (
            <div className="flex justify-end mb-4">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4" />Fahrzeug hinzufügen</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Neues Fahrzeug</DialogTitle></DialogHeader>
                  <form onSubmit={handleCreate} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600">Kennzeichen *</label>
                        <Input value={form.licensePlate} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} required placeholder="AB-CD 1234" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Marke *</label>
                        <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} required placeholder="VW" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Modell *</label>
                        <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required placeholder="Transporter" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Baujahr</label>
                        <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="2023" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Farbe</label>
                        <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="Weiß" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Kilometerstand</label>
                        <Input type="number" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Nächste HU/TÜV</label>
                        <Input type="date" value={form.nextTuv} onChange={(e) => setForm({ ...form, nextTuv: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Nächste Inspektion</label>
                        <Input type="date" value={form.nextInspection} onChange={(e) => setForm({ ...form, nextInspection: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">FIN/VIN</label>
                      <Input value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">GPS-Geräte-ID</label>
                      <Input value={form.gpsDeviceId} onChange={(e) => setForm({ ...form, gpsDeviceId: e.target.value })} placeholder="Optional" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Notizen</label>
                      <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
                    </div>
                    <Button type="submit" className="w-full">Fahrzeug anlegen</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {vehicles.length === 0 ? (
            <Card><CardContent className="p-10 text-center">
              <Car className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Noch keine Fahrzeuge angelegt</p>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vehicles.map((v) => (
                <Card key={v.id}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#212f46" }}>
                          <Car className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{v.brand} {v.model}</p>
                          <p className="text-sm text-gray-500">{v.licensePlate}{v.year ? ` · ${v.year}` : ""}{v.color ? ` · ${v.color}` : ""}</p>
                        </div>
                      </div>
                      {isAdmin && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(v.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-3">
                      {v.mileage && <span>{v.mileage.toLocaleString()} km</span>}
                      {v.nextTuv && <span>TÜV: {new Date(v.nextTuv).toLocaleDateString("de-DE")}</span>}
                      {v.nextInspection && <span>Inspektion: {new Date(v.nextInspection).toLocaleDateString("de-DE")}</span>}
                      {v.gpsDeviceId && <Badge variant="outline" className="text-xs gap-1"><MapPin className="h-3 w-3" />GPS</Badge>}
                    </div>

                    <div className="border-t pt-3">
                      <p className="text-xs font-medium text-gray-600 mb-2">Zugewiesene Mitarbeiter</p>
                      {v.assignments.length === 0 && <p className="text-xs text-gray-400">Keine Zuweisung</p>}
                      <div className="space-y-1">
                        {v.assignments.map((a) => (
                          <div key={a.id} className="flex items-center justify-between text-sm">
                            <span>{a.user.firstName} {a.user.lastName}</span>
                            {isAdmin && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleUnassign(a.id)}>
                                <UserMinus className="h-3.5 w-3.5 text-red-400" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                      {isAdmin && (
                        <NativeSelect
                          className="mt-2 text-sm"
                          onChange={(e) => { if (e.target.value) { handleAssign(v.id, e.target.value); e.target.value = ""; } }}
                        >
                          <option value="">Mitarbeiter zuweisen...</option>
                          {allUsers.filter((u: any) => !v.assignments.some((a) => a.userId === u.id)).map((u: any) => (
                            <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                          ))}
                        </NativeSelect>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Führerscheinkontrolle ─────────────────── */}
        <TabsContent value="fuehrerschein">
          <div className="space-y-4">
            {!isAdmin && (
              <Card>
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Führerschein hochladen</h3>
                  <p className="text-xs text-gray-500 mb-3">Lade ein aktuelles Foto deines Führerscheins hoch. Dies wird alle 6 Monate benötigt.</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => { if (e.target.files?.[0]) handleUploadLicense(e.target.files[0]); }}
                  />
                  <Button size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    <Camera className="h-4 w-4" />{uploading ? "Wird hochgeladen..." : "Foto aufnehmen / hochladen"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {isAdmin && usersNeedingLicense.length > 0 && (
              <Card>
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Führerschein-Status aller Fahrer</h3>
                  <div className="space-y-2">
                    {usersNeedingLicense.map((u: any) => {
                      const ls = getLicenseStatus(u.id);
                      return (
                        <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: "#354360" }}>
                              {u.firstName[0]}{u.lastName[0]}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{u.firstName} {u.lastName}</p>
                              {ls.upload && (
                                <p className="text-xs text-gray-400">
                                  Hochgeladen: {new Date(ls.upload.uploadedAt).toLocaleDateString("de-DE")}
                                  {ls.upload.verified && " · Verifiziert"}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {ls.status === "ok" && <Badge className="bg-green-100 text-green-700 gap-1"><CheckCircle2 className="h-3 w-3" />Aktuell</Badge>}
                            {ls.status === "expiring" && <Badge className="bg-amber-100 text-amber-700 gap-1"><Clock className="h-3 w-3" />Läuft bald ab</Badge>}
                            {ls.status === "expired" && <Badge className="bg-red-100 text-red-700 gap-1"><AlertTriangle className="h-3 w-3" />Abgelaufen</Badge>}
                            {ls.status === "missing" && <Badge className="bg-red-100 text-red-700 gap-1"><AlertTriangle className="h-3 w-3" />Fehlt</Badge>}
                            {ls.upload && (
                              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setViewLicense(ls.upload!)}>
                                <Eye className="h-3 w-3" />Ansehen
                              </Button>
                            )}
                            {ls.upload && !ls.upload.verified && (
                              <Button size="sm" className="gap-1 text-xs" onClick={() => handleVerify(ls.upload!.id)}>
                                <CheckCircle2 className="h-3 w-3" />Bestätigen
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {viewLicense && (
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <Button variant="ghost" size="sm" onClick={() => setViewLicense(null)}>
                      <ChevronLeft className="h-4 w-4 mr-1" />Zurück
                    </Button>
                    <h3 className="text-sm font-semibold">Führerschein-Bild</h3>
                  </div>
                  <img src={viewLicense.imageUrl} alt="Führerschein" className="max-w-md rounded-lg border" />
                  <p className="text-xs text-gray-400 mt-2">
                    Hochgeladen: {new Date(viewLicense.uploadedAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    {" · "}Gültig bis: {new Date(viewLicense.expiresAt).toLocaleDateString("de-DE")}
                  </p>
                </CardContent>
              </Card>
            )}

            {licenses.length > 0 && (
              <Card>
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Alle Uploads</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs text-gray-500">
                          {isAdmin && <th className="px-3 py-2">Mitarbeiter</th>}
                          <th className="px-3 py-2">Hochgeladen</th>
                          <th className="px-3 py-2">Gültig bis</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {licenses.map((l) => (
                          <tr key={l.id} className="border-b border-gray-50">
                            {isAdmin && <td className="px-3 py-2">{l.user ? `${l.user.firstName} ${l.user.lastName}` : "–"}</td>}
                            <td className="px-3 py-2">{new Date(l.uploadedAt).toLocaleDateString("de-DE")}</td>
                            <td className="px-3 py-2">{new Date(l.expiresAt).toLocaleDateString("de-DE")}</td>
                            <td className="px-3 py-2">
                              {l.verified
                                ? <Badge className="bg-green-100 text-green-700 text-xs">Verifiziert</Badge>
                                : <Badge className="bg-amber-100 text-amber-700 text-xs">Offen</Badge>
                              }
                            </td>
                            <td className="px-3 py-2">
                              <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setViewLicense(l)}>
                                <Eye className="h-3 w-3" />Ansehen
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── GPS-Tracking ──────────────────────────── */}
        <TabsContent value="gps">
          <div className="space-y-4">
            {vehicles.filter((v) => v.gpsDeviceId).length === 0 ? (
              <Card>
                <CardContent className="p-10 text-center">
                  <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Noch keine Fahrzeuge mit GPS-Tracker verbunden</p>
                  <p className="text-xs text-gray-400 mt-1">GPS-Geräte-ID beim Fahrzeug eintragen, um Tracking zu aktivieren.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {vehicles.filter((v) => v.gpsDeviceId).map((v) => (
                    <Card key={v.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#212f46" }}>
                            <Car className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{v.brand} {v.model}</p>
                            <p className="text-xs text-gray-500">{v.licensePlate}</p>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
                          <p><strong>GPS-ID:</strong> {v.gpsDeviceId}</p>
                          {v.gpsLastLat && v.gpsLastLng ? (
                            <>
                              <p><strong>Position:</strong> {v.gpsLastLat.toFixed(5)}, {v.gpsLastLng.toFixed(5)}</p>
                              <p><strong>Letztes Update:</strong> {v.gpsLastUpdate ? new Date(v.gpsLastUpdate).toLocaleString("de-DE") : "–"}</p>
                              <a
                                href={`https://www.google.com/maps?q=${v.gpsLastLat},${v.gpsLastLng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-blue-600 hover:underline mt-1"
                              >
                                <MapPin className="h-3 w-3" />Auf Karte anzeigen
                              </a>
                            </>
                          ) : (
                            <p className="text-gray-400">Noch keine Position empfangen</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Card>
                  <CardContent className="p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">GPS-Integration</h3>
                    <p className="text-xs text-gray-500">Die GPS-Positionen werden über die API aktualisiert. Externe GPS-Tracker können Positionen per PUT an <code className="bg-gray-100 px-1 rounded">/api/fahrzeuge</code> mit <code className="bg-gray-100 px-1 rounded">{"{ action: 'gps', id, lat, lng }"}</code> senden.</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
