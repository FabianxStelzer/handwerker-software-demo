"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Package,
  CheckCircle2,
  Clock,
  Search,
  Mic,
  MicOff,
  Trash2,
  Receipt,
  AlertTriangle,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";

interface Props {
  project: any;
  onUpdate: () => void;
}

const unitLabels: Record<string, string> = {
  STUECK: "Stk", METER: "m", QUADRATMETER: "m²", KUBIKMETER: "m³",
  KILOGRAMM: "kg", LITER: "l", PALETTE: "Pal.", PAUSCHAL: "psch.", STUNDE: "Std",
};

interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  unit: string;
  pricePerUnit: number;
  category: string | null;
  format: string | null;
}

export function MaterialTab({ project, onUpdate }: Props) {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [dialogMode, setDialogMode] = useState<"planned" | "additional" | null>(null);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [selectedCatalog, setSelectedCatalog] = useState<CatalogItem | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", unit: "STUECK", pricePerUnit: "", quantity: "", notes: "" });
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    fetch("/api/katalog/materialien").then((r) => r.json()).then(setCatalog);
  }, []);

  const materials = project.materials || [];
  const baseMaterials = materials.filter((m: any) => !m.isAdditional);
  const additionalMaterials = materials.filter((m: any) => m.isAdditional);

  const totalPlanned = baseMaterials.reduce((s: number, m: any) => s + m.quantityPlanned * m.pricePerUnit, 0);
  const totalAdditional = additionalMaterials.reduce((s: number, m: any) => s + m.quantityPlanned * m.pricePerUnit, 0);
  const totalAll = totalPlanned + totalAdditional;

  function resetForm() {
    setForm({ name: "", description: "", unit: "STUECK", pricePerUnit: "", quantity: "", notes: "" });
    setSelectedCatalog(null);
    setCatalogSearch("");
    setManualMode(false);
  }

  function startListening() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Spracherkennung wird in diesem Browser nicht unterstützt. Bitte Chrome verwenden.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "de-DE";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setForm((prev) => ({ ...prev, name: prev.name ? `${prev.name} ${text}` : text }));
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  async function handleSubmit() {
    const isAdditional = dialogMode === "additional";
    const data: any = {
      isAdditional,
      quantityPlanned: parseFloat(form.quantity) || 1,
    };

    if (selectedCatalog) {
      data.catalogMaterialId = selectedCatalog.id;
      data.name = selectedCatalog.name;
      data.description = selectedCatalog.description;
      data.imageUrl = selectedCatalog.imageUrl;
      data.unit = selectedCatalog.unit;
      data.pricePerUnit = selectedCatalog.pricePerUnit;
    } else {
      data.name = form.name;
      data.description = form.description;
      data.unit = form.unit;
      data.pricePerUnit = parseFloat(form.pricePerUnit) || 0;
    }
    data.notes = form.notes;

    await fetch(`/api/projekte/${project.id}/materialien`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    setDialogMode(null);
    resetForm();
    onUpdate();
  }

  async function toggleInstalled(id: string, isInstalled: boolean) {
    await fetch(`/api/projekte/${project.id}/materialien`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isInstalled }),
    });
    onUpdate();
  }

  async function deleteMaterial(id: string) {
    if (!confirm("Material wirklich entfernen?")) return;
    await fetch(`/api/projekte/${project.id}/materialien`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    onUpdate();
  }

  async function updateQuantityUsed(id: string, quantityUsed: number) {
    await fetch(`/api/projekte/${project.id}/materialien`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, quantityUsed }),
    });
    onUpdate();
  }

  const filteredCatalog = catalogSearch.length >= 1
    ? catalog.filter((c) =>
        c.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        (c.description?.toLowerCase().includes(catalogSearch.toLowerCase())) ||
        (c.category?.toLowerCase().includes(catalogSearch.toLowerCase()))
      )
    : catalog;

  function MaterialDialog() {
    return (
      <Dialog open={dialogMode !== null} onOpenChange={(open) => { if (!open) { setDialogMode(null); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "additional" ? "Zusätzliches Material anfordern" : "Grundmaterial hinzufügen"}
            </DialogTitle>
          </DialogHeader>

          {!selectedCatalog && !manualMode ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Material im Katalog suchen..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>

              {dialogMode === "additional" && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={listening ? "destructive" : "outline"}
                    size="sm"
                    className="gap-1.5"
                    onClick={listening ? stopListening : startListening}
                  >
                    {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    {listening ? "Stoppen" : "Spracheingabe"}
                  </Button>
                  {listening && (
                    <span className="text-sm text-red-500 flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                      Hört zu...
                    </span>
                  )}
                </div>
              )}

              {form.name && (
                <Card className="border-blue-200 bg-blue-50/50 p-3">
                  <p className="text-sm text-blue-800">Erkannt: <strong>{form.name}</strong></p>
                </Card>
              )}

              <div className="max-h-60 overflow-y-auto space-y-1">
                {filteredCatalog.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCatalog(c)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-colors text-left"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 shrink-0 overflow-hidden">
                      {c.imageUrl ? (
                        <img src={c.imageUrl} alt={c.name} className="h-10 w-10 object-cover rounded-lg" />
                      ) : (
                        <Package className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {c.description || c.format || c.category || "Kein Beschreibung"}
                        {" · "}{formatCurrency(c.pricePerUnit)}/{unitLabels[c.unit] || c.unit}
                      </p>
                    </div>
                  </button>
                ))}
                {filteredCatalog.length === 0 && catalogSearch && (
                  <p className="text-sm text-gray-400 text-center py-4">Kein Treffer im Katalog</p>
                )}
              </div>

              <Button variant="outline" className="w-full gap-1.5" onClick={() => setManualMode(true)}>
                <Plus className="h-4 w-4" />
                Manuell hinzufügen (nicht im Katalog)
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedCatalog && (
                <Card className="bg-gray-50 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white border shrink-0 overflow-hidden">
                      {selectedCatalog.imageUrl ? (
                        <img src={selectedCatalog.imageUrl} alt="" className="h-12 w-12 object-cover rounded-lg" />
                      ) : (
                        <Package className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900">{selectedCatalog.name}</p>
                      {selectedCatalog.description && (
                        <p className="text-xs text-gray-500">{selectedCatalog.description}</p>
                      )}
                      <p className="text-xs text-gray-400">
                        {formatCurrency(selectedCatalog.pricePerUnit)}/{unitLabels[selectedCatalog.unit] || selectedCatalog.unit}
                        {selectedCatalog.format && ` · ${selectedCatalog.format}`}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedCatalog(null); setManualMode(false); }}>
                      Ändern
                    </Button>
                  </div>
                </Card>
              )}

              {manualMode && !selectedCatalog && (
                <>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Bezeichnung *</label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Materialname"
                        autoFocus
                      />
                    </div>
                    {dialogMode === "additional" && (
                      <Button
                        type="button"
                        variant={listening ? "destructive" : "outline"}
                        size="sm"
                        className="mt-5"
                        onClick={listening ? stopListening : startListening}
                      >
                        {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Beschreibung (Größe, etc.)</label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={2}
                      placeholder="z.B. 100x50mm, rostfrei, 2mm stark"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Einheit</label>
                      <NativeSelect value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                        {Object.entries(unitLabels).map(([k, v]) => <option key={k} value={k}>{v} ({k})</option>)}
                      </NativeSelect>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Preis/Einheit</label>
                      <Input
                        value={form.pricePerUnit}
                        onChange={(e) => setForm({ ...form, pricePerUnit: e.target.value })}
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Stückzahl / Menge *</label>
                <Input
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  type="number"
                  step="0.01"
                  placeholder="1"
                  autoFocus={!!selectedCatalog}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Anmerkung (optional)</label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="z.B. dringend benötigt"
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { resetForm(); setDialogMode(null); }}>
                  Abbrechen
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={!selectedCatalog && !form.name.trim()}
                >
                  {dialogMode === "additional" ? "Material anfordern" : "Hinzufügen"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  function MaterialRow({ m, showInstallToggle }: { m: any; showInstallToggle?: boolean }) {
    const [editUsed, setEditUsed] = useState(false);
    const [usedVal, setUsedVal] = useState(m.quantityUsed.toString());

    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 group">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 shrink-0 overflow-hidden">
          {m.imageUrl || m.catalogMaterial?.imageUrl ? (
            <img src={m.imageUrl || m.catalogMaterial?.imageUrl} alt="" className="h-10 w-10 object-cover rounded-lg" />
          ) : (
            <Package className="h-5 w-5 text-gray-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
            {m.catalogMaterial && <Badge variant="outline" className="text-[10px]">Katalog</Badge>}
            {m.isInstalled && <Badge className="bg-green-100 text-green-700 text-[10px]">Verbaut</Badge>}
          </div>
          {(m.description || m.catalogMaterial?.description) && (
            <p className="text-xs text-gray-500 truncate">{m.description || m.catalogMaterial?.description}</p>
          )}
          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
            <span>{m.quantityPlanned} {unitLabels[m.unit] || m.unit}</span>
            <span>{formatCurrency(m.pricePerUnit)}/{unitLabels[m.unit] || m.unit}</span>
            <span className="font-medium text-gray-600">{formatCurrency(m.quantityPlanned * m.pricePerUnit)}</span>
          </div>
          {m.isAdditional && m.requestedBy && (
            <p className="text-xs text-blue-500 mt-0.5">
              Angefordert von {m.requestedBy.firstName} {m.requestedBy.lastName}
              {m.requestedAt && ` · ${new Date(m.requestedAt).toLocaleDateString("de-DE")}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!editUsed ? (
            <button
              onClick={() => setEditUsed(true)}
              className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50"
              title="Verbrauch eintragen"
            >
              Verbr.: {m.quantityUsed}
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <Input
                value={usedVal}
                onChange={(e) => setUsedVal(e.target.value)}
                type="number"
                step="0.01"
                className="w-20 h-7 text-xs"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    updateQuantityUsed(m.id, parseFloat(usedVal) || 0);
                    setEditUsed(false);
                  }
                  if (e.key === "Escape") setEditUsed(false);
                }}
              />
              <Button size="sm" variant="ghost" className="h-7 px-1" onClick={() => {
                updateQuantityUsed(m.id, parseFloat(usedVal) || 0);
                setEditUsed(false);
              }}>
                <CheckCircle2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          {showInstallToggle && (
            <button
              onClick={() => toggleInstalled(m.id, !m.isInstalled)}
              className={`p-1.5 rounded ${m.isInstalled ? "text-green-600 bg-green-50" : "text-gray-400 hover:text-green-600 hover:bg-green-50"}`}
              title={m.isInstalled ? "Als nicht verbaut markieren" : "Als verbaut bestätigen"}
            >
              <CheckCircle2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => deleteMaterial(m.id)}
            className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Löschen"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MaterialDialog />

      {/* Zusammenfassung */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-gray-400">Grundmaterial</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(totalPlanned)}</p>
          <p className="text-xs text-gray-500">{baseMaterials.length} Positionen</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-gray-400">Zusätzliches Material</p>
          <p className="text-xl font-bold text-amber-600">{formatCurrency(totalAdditional)}</p>
          <p className="text-xs text-gray-500">
            {additionalMaterials.length} Positionen
            {additionalMaterials.filter((m: any) => !m.isInstalled).length > 0 && (
              <> · {additionalMaterials.filter((m: any) => !m.isInstalled).length} offen</>
            )}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-gray-400">Gesamtkosten Material</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(totalAll)}</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2 gap-1.5 text-xs"
            onClick={() => alert("Rechnung aus Materialien wird in der Buchhaltung erstellt.\n\nGehe zu Buchhaltung → Belege → Neue Rechnung und wähle dieses Projekt.")}
          >
            <Receipt className="h-3.5 w-3.5" />
            Rechnung erstellen
          </Button>
        </Card>
      </div>

      {/* Grundmaterial */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Grundmaterial</h3>
            <p className="text-xs text-gray-500">Material, das vor Baubeginn eingeplant wird</p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setDialogMode("planned")}>
            <Plus className="h-4 w-4" />
            Material hinzufügen
          </Button>
        </div>
        {baseMaterials.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-400">
              <Package className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Noch kein Grundmaterial eingeplant</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {baseMaterials.map((m: any) => <MaterialRow key={m.id} m={m} />)}
          </div>
        )}
      </div>

      {/* Zusätzliches Material */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              Zusätzliches Material
              {additionalMaterials.filter((m: any) => !m.isInstalled).length > 0 && (
                <Badge className="bg-amber-100 text-amber-700">
                  {additionalMaterials.filter((m: any) => !m.isInstalled).length} offen
                </Badge>
              )}
            </h3>
            <p className="text-xs text-gray-500">Material, das auf der Baustelle nachträglich benötigt wird</p>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDialogMode("additional")}>
            <Plus className="h-4 w-4" />
            Material anfordern
          </Button>
        </div>
        {additionalMaterials.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-400">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Kein zusätzliches Material angefordert</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {additionalMaterials.map((m: any) => <MaterialRow key={m.id} m={m} showInstallToggle />)}
          </div>
        )}
      </div>
    </div>
  );
}
