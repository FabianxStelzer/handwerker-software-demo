"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  Upload, MapPin, Plus, Trash2, X, ChevronLeft, Eye, FileText, User, Package, Search, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface PlanMaterial {
  id: string;
  name: string;
  menge: number;
  einheit: string;
}

interface MarkerMaterial {
  id: string;
  name: string;
  menge: number;
  einheit: string;
  isExtra: boolean;
}

interface Marker {
  id: string;
  xPercent: number;
  yPercent: number;
  beschreibung: string;
  mitarbeiterId: string | null;
  mitarbeiterName: string | null;
  materialien: MarkerMaterial[];
  createdAt: string;
}

interface EinbauPlan {
  id: string;
  titel: string;
  dateiUrl: string;
  dateiName: string;
  markers: Marker[];
  planMaterials: PlanMaterial[];
  createdAt: string;
}

// ── Searchable material picker ──────────────────────────────
function MaterialPicker({
  planMaterials,
  usageMap,
  onSelect,
  disabled,
}: {
  planMaterials: PlanMaterial[];
  usageMap: Map<string, number>;
  onSelect: (name: string, menge: string, einheit: string) => void;
  disabled: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [menge, setMenge] = useState("1");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = planMaterials.filter((pm) =>
    pm.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div ref={ref} className="relative">
      <label className="text-xs font-medium text-gray-700 mb-1 block">Material aus Liste zuordnen</label>
      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            placeholder="Material suchen…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            className="text-xs pl-7"
          />
        </div>
        <Input
          type="number"
          placeholder="Menge"
          value={menge}
          onChange={(e) => setMenge(e.target.value)}
          className="text-xs w-16"
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((pm) => {
            const used = usageMap.get(pm.name) || 0;
            const fulfilled = pm.menge > 0 && used >= pm.menge;
            return (
              <button
                key={pm.id}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center justify-between transition-colors ${fulfilled ? "bg-green-50" : ""}`}
                disabled={disabled}
                onClick={() => {
                  onSelect(pm.name, menge || "1", pm.einheit);
                  setQuery("");
                  setMenge("1");
                  setOpen(false);
                }}
              >
                <div>
                  <span className="font-medium text-gray-900">{pm.name}</span>
                  {pm.menge > 0 && (
                    <span className="text-gray-400 ml-1.5">({used}/{pm.menge} {pm.einheit})</span>
                  )}
                </div>
                {fulfilled && <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────
export function EinbauTab({ project }: { project: any }) {
  const [plans, setPlans] = useState<EinbauPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [viewPlan, setViewPlan] = useState<EinbauPlan | null>(null);
  const [placingMarker, setPlacingMarker] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<Marker | null>(null);
  const [markerDialogOpen, setMarkerDialogOpen] = useState(false);
  const [newMarkerPos, setNewMarkerPos] = useState<{ x: number; y: number } | null>(null);
  const [markerBeschreibung, setMarkerBeschreibung] = useState("");
  const [saving, setSaving] = useState(false);

  const [newMaterialName, setNewMaterialName] = useState("");
  const [newMaterialMenge, setNewMaterialMenge] = useState("1");
  const [newMaterialEinheit, setNewMaterialEinheit] = useState("Stk");

  const [newPlanMatName, setNewPlanMatName] = useState("");
  const [newPlanMatMenge, setNewPlanMatMenge] = useState("");
  const [newPlanMatEinheit, setNewPlanMatEinheit] = useState("Stk");

  const pdfContainerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projekte/${project.id}/einbau`);
    if (res.ok) setPlans(await res.json());
    setLoading(false);
  }, [project.id]);

  useEffect(() => { load(); }, [load]);

  // Usage map: material name → total quantity used across all markers
  const usageMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!viewPlan) return map;
    for (const marker of viewPlan.markers) {
      for (const mat of marker.materialien) {
        if (!mat.isExtra) {
          map.set(mat.name, (map.get(mat.name) || 0) + mat.menge);
        }
      }
    }
    return map;
  }, [viewPlan]);

  async function refreshPlan(planId: string) {
    const all = await fetch(`/api/projekte/${project.id}/einbau`).then((r) => r.json());
    setPlans(all);
    const updated = all.find((p: EinbauPlan) => p.id === planId);
    if (updated) setViewPlan(updated);
    return updated;
  }

  async function uploadPlan(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("titel", file.name.replace(/\.[^.]+$/, ""));
      const res = await fetch(`/api/projekte/${project.id}/einbau`, { method: "POST", body: fd });
      if (res.ok) { await load(); }
      else {
        const text = await res.text();
        try { setUploadError(JSON.parse(text).error); } catch { setUploadError(text.slice(0, 200) || `Fehler ${res.status}`); }
      }
    } catch (e: any) { setUploadError(e.message || "Netzwerkfehler"); }
    setUploading(false);
  }

  async function deletePlan(planId: string) {
    if (!confirm("Bauplan und alle Markierungen löschen?")) return;
    await fetch(`/api/projekte/${project.id}/einbau`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId }),
    });
    if (viewPlan?.id === planId) { setViewPlan(null); setSelectedMarker(null); }
    await load();
  }

  function handlePlanClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!placingMarker || !pdfContainerRef.current) return;
    const container = pdfContainerRef.current;
    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left + container.scrollLeft;
    const clickY = e.clientY - rect.top + container.scrollTop;
    const x = (clickX / container.scrollWidth) * 100;
    const y = (clickY / container.scrollHeight) * 100;
    setNewMarkerPos({ x, y });
    setMarkerBeschreibung("");
    setMarkerDialogOpen(true);
    setPlacingMarker(false);
  }

  async function createMarker() {
    if (!viewPlan || !newMarkerPos) return;
    setSaving(true);
    await fetch(`/api/projekte/${project.id}/einbau`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "marker", planId: viewPlan.id, xPercent: newMarkerPos.x, yPercent: newMarkerPos.y, beschreibung: markerBeschreibung }),
    });
    const updated = await refreshPlan(viewPlan.id);
    if (updated) {
      setSelectedMarker(updated.markers[updated.markers.length - 1]);
    }
    setMarkerDialogOpen(false);
    setNewMarkerPos(null);
    setSaving(false);
  }

  async function addMaterialToMarker(name: string, menge: string, einheit: string, isExtra: boolean) {
    if (!selectedMarker || !name.trim()) return;
    setSaving(true);
    await fetch(`/api/projekte/${project.id}/einbau`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "material", markerId: selectedMarker.id, name, menge, einheit, isExtra }),
    });
    const updated = await refreshPlan(viewPlan!.id);
    if (updated) {
      const m = updated.markers.find((mk: Marker) => mk.id === selectedMarker.id);
      if (m) setSelectedMarker(m);
    }
    setNewMaterialName("");
    setNewMaterialMenge("1");
    setNewMaterialEinheit("Stk");
    setSaving(false);
  }

  async function deleteMaterial(materialId: string) {
    await fetch(`/api/projekte/${project.id}/einbau`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ materialId }),
    });
    const updated = await refreshPlan(viewPlan!.id);
    if (updated && selectedMarker) {
      setSelectedMarker(updated.markers.find((mk: Marker) => mk.id === selectedMarker.id) || null);
    }
  }

  async function deleteMarker(markerId: string) {
    await fetch(`/api/projekte/${project.id}/einbau`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markerId }),
    });
    setSelectedMarker(null);
    await refreshPlan(viewPlan!.id);
  }

  async function addPlanMaterial() {
    if (!viewPlan || !newPlanMatName.trim()) return;
    setSaving(true);
    await fetch(`/api/projekte/${project.id}/einbau`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "addPlanMaterial", planId: viewPlan.id, name: newPlanMatName, menge: newPlanMatMenge, einheit: newPlanMatEinheit }),
    });
    await refreshPlan(viewPlan.id);
    setNewPlanMatName("");
    setNewPlanMatMenge("");
    setNewPlanMatEinheit("Stk");
    setSaving(false);
  }

  async function removePlanMaterial(materialId: string) {
    await fetch(`/api/projekte/${project.id}/einbau`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "removePlanMaterial", materialId }),
    });
    await refreshPlan(viewPlan!.id);
  }

  if (loading) {
    return <div className="flex justify-center py-10"><div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div>;
  }

  // ── Plan viewer ───────────────────────────────────────────
  if (viewPlan) {
    const allExtraMaterials = viewPlan.markers.flatMap((m) =>
      m.materialien.filter((mat) => mat.isExtra).map((mat) => ({
        ...mat,
        markerNr: viewPlan.markers.indexOf(m) + 1,
      }))
    );

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setViewPlan(null); setSelectedMarker(null); }}>
              <ChevronLeft className="h-4 w-4 mr-1" />Zurück
            </Button>
            <h3 className="text-sm font-bold text-gray-900">{viewPlan.titel}</h3>
          </div>
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

        {placingMarker && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700 flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            Marker-Modus aktiv – klicke auf die gewünschte Stelle im Bauplan. PDF-Bearbeitung ist währenddessen pausiert.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* PDF + Markers */}
          <div className="lg:col-span-8">
            <Card className="overflow-hidden">
              <div
                ref={pdfContainerRef}
                className={`relative overflow-auto ${placingMarker ? "cursor-crosshair" : ""}`}
                style={{ maxHeight: "80vh", background: "#d4d4d4" }}
                onClick={handlePlanClick}
              >
                {viewPlan.dateiUrl.match(/\.(png|jpg|jpeg|webp|gif)$/i) ? (
                  <img
                    src={viewPlan.dateiUrl}
                    alt={viewPlan.titel}
                    className="w-full h-auto block"
                    draggable={false}
                    style={{ pointerEvents: placingMarker ? "none" : "auto" }}
                  />
                ) : (
                  <iframe
                    src={viewPlan.dateiUrl}
                    className="w-full border-0 block"
                    style={{ height: "1200px", pointerEvents: placingMarker ? "none" : "auto" }}
                    title={viewPlan.titel}
                  />
                )}

                {/* Markers */}
                {viewPlan.markers.map((marker, i) => (
                  <button
                    key={marker.id}
                    className={`absolute transition-transform ${selectedMarker?.id === marker.id ? "z-30 scale-125" : "z-20 hover:scale-110"}`}
                    style={{
                      left: `${marker.xPercent}%`,
                      top: `${marker.yPercent}%`,
                      transform: "translate(-50%, -100%)",
                    }}
                    onClick={(e) => { e.stopPropagation(); setSelectedMarker(marker); setPlacingMarker(false); }}
                    title={`#${i + 1}: ${marker.beschreibung}`}
                  >
                    <div className={`flex items-center justify-center h-7 w-7 rounded-full shadow-lg border-2 text-xs font-bold ${
                      selectedMarker?.id === marker.id ? "bg-blue-600 border-white text-white" : "bg-white border-blue-600 text-blue-600"
                    }`}>{i + 1}</div>
                    <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-blue-600 mx-auto -mt-0.5" />
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-3">
            {selectedMarker ? (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-gray-900">Punkt #{viewPlan.markers.indexOf(selectedMarker) + 1}</h4>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => deleteMarker(selectedMarker.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedMarker(null)}><X className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
                    <User className="h-3.5 w-3.5" />
                    <span>{selectedMarker.mitarbeiterName || "Unbekannt"} · {new Date(selectedMarker.createdAt).toLocaleDateString("de-DE")}</span>
                  </div>

                  <div className="mb-4">
                    <label className="text-xs font-medium text-gray-700">Durchgeführte Arbeit</label>
                    <p className="text-sm text-gray-900 mt-1 bg-gray-50 rounded-lg p-2 whitespace-pre-wrap">{selectedMarker.beschreibung || "–"}</p>
                  </div>

                  {/* Materials from plan list */}
                  <div className="mb-3">
                    <label className="text-xs font-medium text-gray-700">Materialien (aus Liste)</label>
                    {selectedMarker.materialien.filter((m) => !m.isExtra).length > 0 ? (
                      <div className="mt-1 space-y-1">
                        {selectedMarker.materialien.filter((m) => !m.isExtra).map((m) => (
                          <div key={m.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                            <div>
                              <p className="text-xs font-medium text-gray-900">{m.name}</p>
                              <p className="text-[10px] text-gray-400">{m.menge} {m.einheit}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => deleteMaterial(m.id)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-xs text-gray-400 mt-1">Keine</p>}

                    {/* Searchable material picker */}
                    {viewPlan.planMaterials.length > 0 && (
                      <div className="mt-2">
                        <MaterialPicker
                          planMaterials={viewPlan.planMaterials}
                          usageMap={usageMap}
                          onSelect={(name, menge, einheit) => addMaterialToMarker(name, menge, einheit, false)}
                          disabled={saving}
                        />
                      </div>
                    )}
                  </div>

                  {/* Extra materials */}
                  <div className="border-t pt-3">
                    <label className="text-xs font-medium text-gray-700">Zusatzmaterial</label>
                    {selectedMarker.materialien.filter((m) => m.isExtra).length > 0 && (
                      <div className="mt-1 space-y-1 mb-2">
                        {selectedMarker.materialien.filter((m) => m.isExtra).map((m) => (
                          <div key={m.id} className="flex items-center justify-between bg-orange-50 rounded-lg p-2">
                            <div>
                              <p className="text-xs font-medium text-gray-900">{m.name}</p>
                              <p className="text-[10px] text-gray-400">{m.menge} {m.einheit}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => deleteMaterial(m.id)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-1.5 mt-2">
                      <Input placeholder="Zusatzmaterial-Name" value={newMaterialName} onChange={(e) => setNewMaterialName(e.target.value)} className="text-xs" />
                      <div className="grid grid-cols-2 gap-1.5">
                        <Input type="number" placeholder="Menge" value={newMaterialMenge} onChange={(e) => setNewMaterialMenge(e.target.value)} className="text-xs" />
                        <Input placeholder="Einheit" value={newMaterialEinheit} onChange={(e) => setNewMaterialEinheit(e.target.value)} className="text-xs" />
                      </div>
                      <Button size="sm" className="w-full gap-1.5 text-xs" onClick={() => addMaterialToMarker(newMaterialName, newMaterialMenge, newMaterialEinheit, true)} disabled={saving || !newMaterialName.trim()}>
                        <Plus className="h-3.5 w-3.5" />Zusatzmaterial hinzufügen
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <MapPin className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">{placingMarker ? "Klicke auf den Bauplan" : "Wähle einen Punkt oder setze einen neuen"}</p>
                </CardContent>
              </Card>
            )}

            {viewPlan.markers.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-xs font-bold text-gray-900 mb-2">Alle Punkte ({viewPlan.markers.length})</h4>
                  <div className="space-y-1 max-h-[250px] overflow-y-auto">
                    {viewPlan.markers.map((m, i) => (
                      <button
                        key={m.id}
                        className={`w-full text-left p-2 rounded-lg text-xs transition-colors ${selectedMarker?.id === m.id ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50"}`}
                        onClick={() => { setSelectedMarker(m); setPlacingMarker(false); }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold shrink-0">{i + 1}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-900 truncate">{m.beschreibung || "–"}</p>
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

        {/* ── Below PDF: Material lists ───────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Plan Material List */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-4 w-4 text-blue-600" />
                <h4 className="text-sm font-bold text-gray-900">Materialliste</h4>
              </div>
              <p className="text-xs text-gray-400 mb-3">Materialien für diesen Plan. Werden als Vorschläge bei Punkten angezeigt.</p>

              {viewPlan.planMaterials.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {viewPlan.planMaterials.map((pm) => {
                    const used = usageMap.get(pm.name) || 0;
                    const fulfilled = pm.menge > 0 && used >= pm.menge;
                    return (
                      <div
                        key={pm.id}
                        className={`flex items-center justify-between rounded-lg p-2.5 transition-colors ${
                          fulfilled ? "bg-green-50 border border-green-200" : "bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {fulfilled && <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />}
                          <div>
                            <p className={`text-xs font-medium ${fulfilled ? "text-green-800" : "text-gray-900"}`}>{pm.name}</p>
                            {pm.menge > 0 && (
                              <p className={`text-[10px] ${fulfilled ? "text-green-600" : "text-gray-400"}`}>
                                {used}/{pm.menge} {pm.einheit} verbaut
                              </p>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => removePlanMaterial(pm.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-2">
                <Input placeholder="Material" value={newPlanMatName} onChange={(e) => setNewPlanMatName(e.target.value)} className="text-xs flex-1" />
                <Input type="number" placeholder="Menge" value={newPlanMatMenge} onChange={(e) => setNewPlanMatMenge(e.target.value)} className="text-xs w-20" />
                <Input placeholder="Einh." value={newPlanMatEinheit} onChange={(e) => setNewPlanMatEinheit(e.target.value)} className="text-xs w-16" />
                <Button size="sm" onClick={addPlanMaterial} disabled={saving || !newPlanMatName.trim()} className="shrink-0">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Extra Materials Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-4 w-4 text-orange-500" />
                <h4 className="text-sm font-bold text-gray-900">Zusatzmaterial</h4>
              </div>
              <p className="text-xs text-gray-400 mb-3">Materialien, die zusätzlich an einzelnen Punkten verbaut wurden.</p>

              {allExtraMaterials.length > 0 ? (
                <div className="space-y-1.5">
                  {allExtraMaterials.map((m) => (
                    <div key={m.id} className="flex items-center justify-between bg-orange-50 rounded-lg p-2.5">
                      <div>
                        <p className="text-xs font-medium text-gray-900">{m.name}</p>
                        <p className="text-[10px] text-gray-400">{m.menge} {m.einheit} · Punkt #{m.markerNr}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-3">Kein Zusatzmaterial</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Marker creation dialog */}
        <Dialog open={markerDialogOpen} onOpenChange={setMarkerDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Neuer Einbau-Punkt</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-sm font-medium text-gray-700">Was wurde gemacht?</label>
                <Textarea value={markerBeschreibung} onChange={(e) => setMarkerBeschreibung(e.target.value)} placeholder="z.B. Fußbodenheizung verlegt, Heizkreisverteiler montiert..." rows={3} className="mt-1" autoFocus />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setMarkerDialogOpen(false); setNewMarkerPos(null); }}>Abbrechen</Button>
                <Button onClick={createMarker} disabled={saving}>{saving ? "Speichern…" : "Punkt erstellen"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── Plan list view ────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Einbau-Dokumentation</h3>
        <Button size="sm" className="gap-1.5" onClick={() => { setUploadError(null); fileRef.current?.click(); }} disabled={uploading}>
          <Upload className="h-3.5 w-3.5" />{uploading ? "Wird hochgeladen…" : "Bauplan hochladen"}
        </Button>
      </div>

      <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPlan(f); e.target.value = ""; }} />

      {uploadError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{uploadError}</div>}
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
            <Button size="sm" className="mt-4 gap-1.5" onClick={() => fileRef.current?.click()}>
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50"><FileText className="h-5 w-5 text-red-500" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{plan.titel}</p>
                    <p className="text-xs text-gray-400">{plan.dateiName}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 shrink-0" onClick={(e) => { e.stopPropagation(); deletePlan(plan.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1"><MapPin className="h-3 w-3" /><span>{plan.markers.length} Punkte</span></div>
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
