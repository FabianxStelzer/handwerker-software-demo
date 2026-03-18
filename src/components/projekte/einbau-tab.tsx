"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Upload, MapPin, Plus, Trash2, X, ChevronLeft, Eye, FileText, Save, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Material {
  id: string;
  name: string;
  menge: number;
  einheit: string;
}

interface Marker {
  id: string;
  xPercent: number;
  yPercent: number;
  beschreibung: string;
  mitarbeiterId: string | null;
  mitarbeiterName: string | null;
  materialien: Material[];
  createdAt: string;
}

interface EinbauPlan {
  id: string;
  titel: string;
  dateiUrl: string;
  dateiName: string;
  markers: Marker[];
  createdAt: string;
}

export function EinbauTab({ project }: { project: any }) {
  const [plans, setPlans] = useState<EinbauPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadTitel, setUploadTitel] = useState("");

  // Plan viewer
  const [viewPlan, setViewPlan] = useState<EinbauPlan | null>(null);
  const [placingMarker, setPlacingMarker] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<Marker | null>(null);
  const [markerDialogOpen, setMarkerDialogOpen] = useState(false);
  const [newMarkerPos, setNewMarkerPos] = useState<{ x: number; y: number } | null>(null);
  const [markerBeschreibung, setMarkerBeschreibung] = useState("");
  const [newMaterialName, setNewMaterialName] = useState("");
  const [newMaterialMenge, setNewMaterialMenge] = useState("1");
  const [newMaterialEinheit, setNewMaterialEinheit] = useState("Stk");
  const [saving, setSaving] = useState(false);
  const planImageRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projekte/${project.id}/einbau`);
    if (res.ok) setPlans(await res.json());
    setLoading(false);
  }, [project.id]);

  useEffect(() => { load(); }, [load]);

  async function uploadPlan(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("titel", uploadTitel || file.name.replace(/\.[^.]+$/, ""));
      const res = await fetch(`/api/projekte/${project.id}/einbau`, { method: "POST", body: fd });
      if (res.ok) {
        await load();
        setUploadTitel("");
      } else {
        const text = await res.text();
        let errorMsg = `Fehler ${res.status}`;
        try {
          const json = JSON.parse(text);
          errorMsg = json.error || errorMsg;
        } catch {
          if (text.length < 200) errorMsg = text || errorMsg;
        }
        setUploadError(errorMsg);
      }
    } catch (e: any) {
      setUploadError(e.message || "Netzwerkfehler beim Upload");
    }
    setUploading(false);
  }

  async function deletePlan(planId: string) {
    if (!confirm("Bauplan und alle Markierungen löschen?")) return;
    await fetch(`/api/projekte/${project.id}/einbau`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId }),
    });
    if (viewPlan?.id === planId) setViewPlan(null);
    await load();
  }

  function handlePlanClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!placingMarker || !planImageRef.current) return;
    const rect = planImageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setNewMarkerPos({ x, y });
    setMarkerBeschreibung("");
    setMarkerDialogOpen(true);
    setPlacingMarker(false);
  }

  async function createMarker() {
    if (!viewPlan || !newMarkerPos) return;
    setSaving(true);
    const res = await fetch(`/api/projekte/${project.id}/einbau`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "marker",
        planId: viewPlan.id,
        xPercent: newMarkerPos.x,
        yPercent: newMarkerPos.y,
        beschreibung: markerBeschreibung,
      }),
    });
    if (res.ok) {
      await load();
      // Refresh viewPlan
      const updatedPlans = await fetch(`/api/projekte/${project.id}/einbau`).then((r) => r.json());
      const updated = updatedPlans.find((p: EinbauPlan) => p.id === viewPlan.id);
      if (updated) {
        setViewPlan(updated);
        const newMarker = updated.markers[updated.markers.length - 1];
        setSelectedMarker(newMarker);
      }
    }
    setMarkerDialogOpen(false);
    setNewMarkerPos(null);
    setSaving(false);
  }

  async function addMaterial() {
    if (!selectedMarker || !newMaterialName.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/projekte/${project.id}/einbau`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "material",
        markerId: selectedMarker.id,
        name: newMaterialName,
        menge: newMaterialMenge,
        einheit: newMaterialEinheit,
      }),
    });
    if (res.ok) {
      setNewMaterialName("");
      setNewMaterialMenge("1");
      setNewMaterialEinheit("Stk");
      const updatedPlans = await fetch(`/api/projekte/${project.id}/einbau`).then((r) => r.json());
      const updated = updatedPlans.find((p: EinbauPlan) => p.id === viewPlan?.id);
      if (updated) {
        setViewPlan(updated);
        setPlans(updatedPlans);
        const updMarker = updated.markers.find((m: Marker) => m.id === selectedMarker.id);
        if (updMarker) setSelectedMarker(updMarker);
      }
    }
    setSaving(false);
  }

  async function deleteMaterial(materialId: string) {
    await fetch(`/api/projekte/${project.id}/einbau`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ materialId }),
    });
    const updatedPlans = await fetch(`/api/projekte/${project.id}/einbau`).then((r) => r.json());
    const updated = updatedPlans.find((p: EinbauPlan) => p.id === viewPlan?.id);
    if (updated) {
      setViewPlan(updated);
      setPlans(updatedPlans);
      const updMarker = updated.markers.find((m: Marker) => m.id === selectedMarker?.id);
      if (updMarker) setSelectedMarker(updMarker);
    }
  }

  async function deleteMarker(markerId: string) {
    await fetch(`/api/projekte/${project.id}/einbau`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markerId }),
    });
    setSelectedMarker(null);
    const updatedPlans = await fetch(`/api/projekte/${project.id}/einbau`).then((r) => r.json());
    const updated = updatedPlans.find((p: EinbauPlan) => p.id === viewPlan?.id);
    if (updated) { setViewPlan(updated); setPlans(updatedPlans); }
  }

  if (loading) {
    return <div className="flex justify-center py-10"><div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div>;
  }

  // Full-screen plan viewer
  if (viewPlan) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setViewPlan(null); setSelectedMarker(null); }}>
              <ChevronLeft className="h-4 w-4 mr-1" />Zurück
            </Button>
            <h3 className="text-sm font-bold text-gray-900">{viewPlan.titel}</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={placingMarker ? "default" : "outline"}
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => { setPlacingMarker(!placingMarker); setSelectedMarker(null); }}
            >
              <MapPin className="h-3.5 w-3.5" />
              {placingMarker ? "Klicke auf den Plan..." : "Punkt setzen"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Plan mit Markern */}
          <div className="lg:col-span-8">
            <Card className="overflow-hidden">
              <div
                ref={planImageRef}
                className={`relative ${placingMarker ? "cursor-crosshair" : "cursor-default"}`}
                onClick={handlePlanClick}
                style={{ minHeight: "600px", background: "#e5e5e5" }}
              >
                {/* PDF als iframe oder Bild */}
                {viewPlan.dateiUrl.match(/\.(png|jpg|jpeg|webp|gif)$/i) ? (
                  <img
                    src={viewPlan.dateiUrl}
                    alt={viewPlan.titel}
                    className="w-full h-auto"
                    style={{ pointerEvents: "none" }}
                  />
                ) : (
                  <iframe
                    src={`${viewPlan.dateiUrl}#toolbar=0&navpanes=0`}
                    className="w-full border-0"
                    style={{ height: "700px", pointerEvents: placingMarker ? "none" : "auto" }}
                    title={viewPlan.titel}
                  />
                )}

                {/* Markers overlay – immer sichtbar über dem PDF */}
                <div className="absolute inset-0" style={{ pointerEvents: placingMarker ? "auto" : "none" }}>
                  {viewPlan.markers.map((marker, i) => (
                    <button
                      key={marker.id}
                      className={`absolute transform -translate-x-1/2 -translate-y-full transition-all ${
                        selectedMarker?.id === marker.id
                          ? "z-20 scale-125"
                          : "z-10 hover:scale-110"
                      }`}
                      style={{ left: `${marker.xPercent}%`, top: `${marker.yPercent}%`, pointerEvents: "auto" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMarker(marker);
                        setPlacingMarker(false);
                      }}
                      title={marker.beschreibung}
                    >
                      <div className={`flex items-center justify-center h-7 w-7 rounded-full shadow-lg border-2 text-xs font-bold ${
                        selectedMarker?.id === marker.id
                          ? "bg-blue-600 border-white text-white"
                          : "bg-white border-blue-600 text-blue-600"
                      }`}>
                        {i + 1}
                      </div>
                      <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-blue-600 mx-auto -mt-0.5" />
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Marker-Details rechts */}
          <div className="lg:col-span-4">
            {selectedMarker ? (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-gray-900">Punkt-Details</h4>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => deleteMarker(selectedMarker.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedMarker(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Mitarbeiter */}
                  <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
                    <User className="h-3.5 w-3.5" />
                    <span>{selectedMarker.mitarbeiterName || "Unbekannt"}</span>
                    <span>· {new Date(selectedMarker.createdAt).toLocaleDateString("de-DE")}</span>
                  </div>

                  {/* Beschreibung */}
                  <div className="mb-4">
                    <label className="text-xs font-medium text-gray-700">Durchgeführte Arbeit</label>
                    <p className="text-sm text-gray-900 mt-1 bg-gray-50 rounded-lg p-2">{selectedMarker.beschreibung || "–"}</p>
                  </div>

                  {/* Materialien */}
                  <div className="mb-3">
                    <label className="text-xs font-medium text-gray-700">Verbaute Materialien</label>
                    {selectedMarker.materialien.length > 0 ? (
                      <div className="mt-1 space-y-1.5">
                        {selectedMarker.materialien.map((m) => (
                          <div key={m.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                            <div>
                              <p className="text-xs font-medium text-gray-900">{m.name}</p>
                              <p className="text-[10px] text-gray-400">{m.menge} {m.einheit}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => deleteMaterial(m.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mt-1">Noch keine Materialien</p>
                    )}
                  </div>

                  {/* Material hinzufügen */}
                  <div className="border-t pt-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">Material hinzufügen</p>
                    <div className="space-y-2">
                      <Input
                        placeholder="Materialname"
                        value={newMaterialName}
                        onChange={(e) => setNewMaterialName(e.target.value)}
                        className="text-xs"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          placeholder="Menge"
                          value={newMaterialMenge}
                          onChange={(e) => setNewMaterialMenge(e.target.value)}
                          className="text-xs"
                        />
                        <Input
                          placeholder="Einheit"
                          value={newMaterialEinheit}
                          onChange={(e) => setNewMaterialEinheit(e.target.value)}
                          className="text-xs"
                        />
                      </div>
                      <Button size="sm" className="w-full gap-1.5 text-xs" onClick={addMaterial} disabled={saving || !newMaterialName.trim()}>
                        <Plus className="h-3.5 w-3.5" />Hinzufügen
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <MapPin className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">
                    {placingMarker
                      ? "Klicke auf den Bauplan um einen Punkt zu setzen"
                      : "Wähle einen Punkt auf dem Plan oder setze einen neuen"}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Alle Marker als Liste */}
            {viewPlan.markers.length > 0 && (
              <Card className="mt-3">
                <CardContent className="p-4">
                  <h4 className="text-xs font-bold text-gray-900 mb-2">Alle Punkte ({viewPlan.markers.length})</h4>
                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                    {viewPlan.markers.map((m, i) => (
                      <button
                        key={m.id}
                        className={`w-full text-left p-2 rounded-lg text-xs transition-colors ${
                          selectedMarker?.id === m.id ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50"
                        }`}
                        onClick={() => { setSelectedMarker(m); setPlacingMarker(false); }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold shrink-0">
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-900 truncate">{m.beschreibung || "Keine Beschreibung"}</p>
                            <p className="text-[10px] text-gray-400">{m.mitarbeiterName} · {m.materialien.length} Mat.</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* New marker dialog */}
        <Dialog open={markerDialogOpen} onOpenChange={setMarkerDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neuer Einbau-Punkt</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-sm font-medium text-gray-700">Was wurde gemacht?</label>
                <Textarea
                  value={markerBeschreibung}
                  onChange={(e) => setMarkerBeschreibung(e.target.value)}
                  placeholder="z.B. Fußbodenheizung verlegt, Heizkreisverteiler montiert..."
                  rows={3}
                  className="mt-1"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setMarkerDialogOpen(false); setNewMarkerPos(null); }}>Abbrechen</Button>
                <Button onClick={createMarker} disabled={saving}>
                  {saving ? "Speichern…" : "Punkt erstellen"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Plan list view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Einbau-Dokumentation</h3>
        <div>
          <Button size="sm" className="gap-1.5" onClick={() => { setUploadError(null); fileRef.current?.click(); }} disabled={uploading}>
            <Upload className="h-3.5 w-3.5" />{uploading ? "Wird hochgeladen…" : "Bauplan hochladen"}
          </Button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadPlan(f);
          e.target.value = "";
        }}
      />

      {uploadError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          Upload fehlgeschlagen: {uploadError}
        </div>
      )}

      {uploading && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span className="text-sm text-blue-700">Bauplan wird hochgeladen…</span>
        </div>
      )}

      {plans.length === 0 && !uploading ? (
        <Card>
          <CardContent className="p-10 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Noch keine Baupläne hochgeladen</p>
            <p className="text-xs text-gray-400 mt-1">Lade einen PDF-Bauplan hoch, um Einbau-Punkte zu dokumentieren</p>
            <Button size="sm" className="mt-4 gap-1.5" onClick={() => { setUploadError(null); fileRef.current?.click(); }}>
              <Upload className="h-3.5 w-3.5" />PDF hochladen
            </Button>
          </CardContent>
        </Card>
      ) : plans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {plans.map((plan) => (
            <Card key={plan.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewPlan(plan)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                    <FileText className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{plan.titel}</p>
                    <p className="text-xs text-gray-400">{plan.dateiName}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 shrink-0" onClick={(e) => { e.stopPropagation(); deletePlan(plan.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{plan.markers.length} Punkte</span>
                  </div>
                  <span>{new Date(plan.createdAt).toLocaleDateString("de-DE")}</span>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-3 gap-1.5 text-xs" onClick={() => setViewPlan(plan)}>
                  <Eye className="h-3.5 w-3.5" />Plan öffnen
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
