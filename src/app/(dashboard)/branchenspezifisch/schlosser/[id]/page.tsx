"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Building2,
  Plus,
  Upload,
  FileImage,
  DoorOpen,
  History,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Wrench,
  Pencil,
  Save,
  X,
  Trash2,
  ChevronRight,
  Eye,
  Camera,
  ImageIcon,
} from "lucide-react";

interface Mangel {
  id: string;
  behoben: boolean;
  beschreibung: string;
  schwere: string;
}

interface Pruefung {
  datum: string;
  ergebnis: string;
  pruefer: string | null;
  notizen: string | null;
  maengel: Mangel[];
}

interface Element {
  id: string;
  typ: string;
  bezeichnung: string;
  standort: string | null;
  hersteller: string | null;
  baujahr: number | null;
  seriennummer: string | null;
  notizen: string | null;
  pruefungen: Pruefung[];
}

interface Bild {
  id: string;
  fileName: string;
  fileUrl: string;
  beschreibung: string | null;
  createdAt: string;
}

interface Plan {
  id: string;
  fileName: string;
  fileUrl: string;
  titel: string | null;
  beschreibung: string | null;
  createdAt: string;
}

interface Objekt {
  id: string;
  name: string;
  street: string | null;
  zip: string | null;
  city: string | null;
  description: string | null;
  status: string;
  planFileName: string | null;
  planUrl: string | null;
  customer: { id: string; firstName: string; lastName: string; company: string | null; type: string };
  elemente: Element[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  OK: { label: "Alles OK", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  WARTUNG_FAELLIG: { label: "Wartung fällig", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  REPARATUR_NOETIG: { label: "Reparatur nötig", color: "bg-orange-100 text-orange-800", icon: Wrench },
  NACHPRUEFUNG_OFFEN: { label: "Nachprüfung offen", color: "bg-blue-100 text-blue-800", icon: History },
  PRUEFUNG_UEBERFAELLIG: { label: "Prüfung überfällig", color: "bg-red-100 text-red-800", icon: AlertTriangle },
};

const ELEMENT_TYPEN = [
  { value: "TUER", label: "Tür" },
  { value: "FENSTER", label: "Fenster" },
  { value: "TOR", label: "Tor" },
  { value: "GELAENDER", label: "Geländer" },
  { value: "ZAUN", label: "Zaun" },
  { value: "SCHLOSS", label: "Schloss" },
  { value: "FLUCHTWEG", label: "Fluchtweg" },
  { value: "BRANDSCHUTZTUER", label: "Brandschutztür" },
  { value: "SONSTIGES", label: "Sonstiges" },
];

const TYP_LABELS: Record<string, string> = Object.fromEntries(ELEMENT_TYPEN.map((t) => [t.value, t.label]));

function PlanUploadForm({
  onUpload,
  uploading,
}: {
  onUpload: (file: File, titel?: string, beschreibung?: string) => Promise<void>;
  uploading: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [titel, setTitel] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSpeichern() {
    if (!selectedFile) return;
    await onUpload(selectedFile, titel || undefined, beschreibung || undefined);
    setShowForm(false);
    setTitel("");
    setBeschreibung("");
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleAbbrechen() {
    setShowForm(false);
    setTitel("");
    setBeschreibung("");
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div>
      {showForm ? (
        <div className="flex flex-col gap-3 p-4 rounded-lg border bg-gray-50 max-w-sm">
          <Input placeholder="Titel (z.B. EG Grundriss)" value={titel} onChange={(e) => setTitel(e.target.value)} />
          <Input placeholder="Beschreibung" value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} />
          <div>
            <label className="cursor-pointer">
              <span className="inline-flex items-center justify-center rounded-md border border-input bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50">
                {selectedFile ? selectedFile.name : "Datei wählen"}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={handleAbbrechen}>
              Abbrechen
            </Button>
            <Button type="button" size="sm" onClick={handleSpeichern} disabled={!selectedFile || uploading}>
              {uploading ? "Hochladen..." : "Speichern"}
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Plan hochladen
        </Button>
      )}
    </div>
  );
}

export default function ObjektDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [objekt, setObjekt] = useState<Objekt | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingDetails, setEditingDetails] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Objekt>>({});
  const [elementDialog, setElementDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [objektBilder, setObjektBilder] = useState<Bild[]>([]);
  const [objektPlaene, setObjektPlaene] = useState<Plan[]>([]);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [elementBilder, setElementBilder] = useState<Record<string, Bild[]>>({});
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [newElementFiles, setNewElementFiles] = useState<File[]>([]);
  const [editingElement, setEditingElement] = useState<Element | null>(null);
  const [editElementForm, setEditElementForm] = useState<Record<string, string>>({});

  const loadBilder = useCallback(async () => {
    const res = await fetch(`/api/schlosser/objekte/${id}/bilder`);
    if (res.ok) setObjektBilder(await res.json());
  }, [id]);

  const loadPlaene = useCallback(async () => {
    const res = await fetch(`/api/schlosser/objekte/${id}/plaene?_=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (res.ok) {
      const data = await res.json();
      setObjektPlaene(Array.isArray(data) ? data : []);
    }
  }, [id]);

  const loadElementBilder = useCallback(async (elementId: string) => {
    const res = await fetch(`/api/schlosser/elemente/${elementId}/bilder`);
    if (res.ok) {
      const bilder = await res.json();
      setElementBilder((prev) => ({ ...prev, [elementId]: bilder }));
    }
  }, []);

  async function handleObjektBildUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", "objekte");
      const res = await fetch("/api/schlosser/upload", { method: "POST", body: fd });
      if (res.ok) {
        const { url, fileName } = await res.json();
        await fetch(`/api/schlosser/objekte/${id}/bilder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileUrl: url, fileName }),
        });
      }
    }
    loadBilder();
    e.target.value = "";
  }

  async function handleElementBildUpload(elementId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", "elemente");
      const res = await fetch("/api/schlosser/upload", { method: "POST", body: fd });
      if (res.ok) {
        const { url, fileName } = await res.json();
        await fetch(`/api/schlosser/elemente/${elementId}/bilder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileUrl: url, fileName }),
        });
      }
    }
    loadElementBilder(elementId);
    e.target.value = "";
  }

  async function handleDeleteObjektBild(bildId: string) {
    await fetch(`/api/schlosser/objekte/${id}/bilder`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bildId }),
    });
    loadBilder();
  }

  async function handleDeleteElementBild(elementId: string, bildId: string) {
    await fetch(`/api/schlosser/elemente/${elementId}/bilder`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bildId }),
    });
    loadElementBilder(elementId);
  }

  const load = useCallback(async () => {
    const res = await fetch(`/api/schlosser/objekte/${id}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setObjekt(data);
      setEditForm(data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
    loadBilder();
    loadPlaene();
  }, [load, loadBilder, loadPlaene]);

  useEffect(() => {
    if (objekt?.elemente?.length) {
      objekt.elemente.forEach((el) => loadElementBilder(el.id));
    }
  }, [objekt?.id, objekt?.elemente?.length, loadElementBilder]);

  async function handleSaveObjektdaten() {
    await fetch(`/api/schlosser/objekte/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setEditingDetails(false);
    load();
  }

  const handlePlanUpload = useCallback(async (file: File, titel?: string, beschreibung?: string) => {
    if (!id) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", "plaene");

      const res = await fetch("/api/schlosser/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload fehlgeschlagen");

      const data = await res.json();
      const { url, fileName } = data;
      if (!url || !fileName) throw new Error("Ungültige Antwort vom Server");

      const planRes = await fetch(`/api/schlosser/objekte/${id}/plaene`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileUrl: url,
          fileName,
          titel: titel || null,
          beschreibung: beschreibung || null,
        }),
      });

      const planData = await planRes.json();
      if (!planRes.ok) {
        throw new Error(planData?.error || `Plan konnte nicht gespeichert werden (${planRes.status})`);
      }

      const newPlan: Plan = planData;
      setObjektPlaene((prev) => [newPlan, ...prev]);
    } catch (err) {
      console.error("Plan-Upload Fehler:", err);
      alert(err instanceof Error ? err.message : "Fehler beim Hochladen");
    } finally {
      setUploading(false);
    }
  }, [id]);

  async function handlePlanUpdate(planId: string, titel: string | null, beschreibung: string | null) {
    await fetch(`/api/schlosser/objekte/${id}/plaene`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: planId, titel, beschreibung }),
    });
    setEditingPlan(null);
    loadPlaene();
  }

  async function handlePlanDelete(planId: string) {
    await fetch(`/api/schlosser/objekte/${id}/plaene`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId }),
    });
    loadPlaene();
  }

  async function handleCreateElement(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/schlosser/objekte/${id}/elemente`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    if (res.ok && newElementFiles.length > 0) {
      const newElement = await res.json();
      for (const file of newElementFiles) {
        const uploadFd = new FormData();
        uploadFd.append("file", file);
        uploadFd.append("type", "elemente");
        const uploadRes = await fetch("/api/schlosser/upload", { method: "POST", body: uploadFd });
        if (uploadRes.ok) {
          const { url, fileName } = await uploadRes.json();
          await fetch(`/api/schlosser/elemente/${newElement.id}/bilder`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileUrl: url, fileName }),
          });
        }
      }
    }
    setNewElementFiles([]);
    setElementDialog(false);
    load();
  }

  async function handleUpdateElement(elementId: string) {
    await fetch(`/api/schlosser/elemente/${elementId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editElementForm),
    });
    setEditingElement(null);
    setEditElementForm({});
    load();
  }

  async function handleDeleteElement(elementId: string) {
    if (!confirm("Element wirklich löschen? Alle Prüfungen und Fotos werden ebenfalls gelöscht.")) return;
    await fetch(`/api/schlosser/elemente/${elementId}`, { method: "DELETE" });
    load();
  }

  function getElementStatus(el: Element) {
    if (el.pruefungen.length === 0) return { label: "Nicht geprüft", color: "bg-gray-100 text-gray-600" };
    const last = el.pruefungen[0];
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (new Date(last.datum) < oneYearAgo) return { label: "Prüfung überfällig", color: "bg-red-100 text-red-700" };
    if (last.ergebnis === "BESTANDEN") return { label: "Bestanden", color: "bg-green-100 text-green-700" };
    if (last.ergebnis === "MAENGEL") {
      const alleMangelBehoben = last.maengel.length > 0 && last.maengel.every((m) => m.behoben);
      if (alleMangelBehoben) return { label: "Erledigt", color: "bg-green-100 text-green-700" };
      return { label: "Mängel", color: "bg-yellow-100 text-yellow-700" };
    }
    return { label: "Nicht bestanden", color: "bg-red-100 text-red-700" };
  }

  if (loading || !objekt) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const statusConf = STATUS_CONFIG[objekt.status] || STATUS_CONFIG.OK;
  const customerName = objekt.customer.type === "GESCHAEFT" && objekt.customer.company
    ? objekt.customer.company
    : `${objekt.customer.firstName} ${objekt.customer.lastName}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/branchenspezifisch/schlosser">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zurück
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{objekt.name}</h1>
              <Badge className={statusConf.color}>{statusConf.label}</Badge>
            </div>
            <p className="text-sm text-gray-500">
              {customerName}
              {objekt.street && ` · ${objekt.street}, ${objekt.zip} ${objekt.city}`}
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="elemente">
        <TabsList>
          <TabsTrigger value="elemente">
            <DoorOpen className="mr-2 h-4 w-4" />
            Elemente ({objekt.elemente.length})
          </TabsTrigger>
          <TabsTrigger value="details">
            <Building2 className="mr-2 h-4 w-4" />
            Objektdaten
          </TabsTrigger>
          <TabsTrigger value="bilder">
            <Camera className="mr-2 h-4 w-4" />
            Fotos ({objektBilder.length})
          </TabsTrigger>
          <TabsTrigger value="plan">
            <FileImage className="mr-2 h-4 w-4" />
            Gebäudepläne ({objektPlaene.length})
          </TabsTrigger>
          <TabsTrigger value="elemente-edit">
            <Pencil className="mr-2 h-4 w-4" />
            Elemente bearbeiten
          </TabsTrigger>
        </TabsList>

        {/* Elemente */}
        <TabsContent value="elemente">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Elemente</h3>
              <Button size="sm" onClick={() => setElementDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Element hinzufügen
              </Button>
            </div>

            {objekt.elemente.length === 0 ? (
              <Card className="flex flex-col items-center p-12 text-gray-400">
                <DoorOpen className="h-12 w-12" />
                <p className="mt-3 text-sm">Noch keine Elemente – füge Türen, Fenster, Tore etc. hinzu</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {objekt.elemente.map((el) => {
                  const elStatus = getElementStatus(el);
                  const lastPruefung = el.pruefungen[0];
                  const offeneMaengel = el.pruefungen
                    .flatMap((p) => p.maengel)
                    .filter((m) => !m.behoben).length;
                  const elBilder = elementBilder[el.id] || [];

                  return (
                    <Card key={el.id} className="flex items-center gap-4 p-4">
                      {elBilder.length > 0 ? (
                        <button onClick={() => setLightbox(elBilder[0].fileUrl)} className="shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={elBilder[0].fileUrl} alt={el.bezeichnung} className="h-10 w-10 rounded-lg object-cover border" />
                        </button>
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                          <DoorOpen className="h-5 w-5" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">{el.bezeichnung}</h4>
                          <Badge variant="outline" className="text-xs">{TYP_LABELS[el.typ] || el.typ}</Badge>
                          <Badge className={`text-xs ${elStatus.color}`}>{elStatus.label}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-1">
                          {el.standort && <span>Standort: {el.standort}</span>}
                          {el.hersteller && <span>Hersteller: {el.hersteller}</span>}
                          {lastPruefung && <span>Letzte Prüfung: {new Date(lastPruefung.datum).toLocaleDateString("de-DE")}</span>}
                          {offeneMaengel > 0 && <span className="text-red-500 font-medium">{offeneMaengel} offene Mängel</span>}
                          {el.pruefungen.length === 0 && <span className="text-amber-500">Noch nie geprüft</span>}
                        </div>
                      </div>

                      <Link href={`/branchenspezifisch/schlosser/${id}/pruefung/${el.id}`}>
                        <Button size="sm" variant="outline">
                          <History className="mr-2 h-4 w-4" />
                          Prüfung
                        </Button>
                      </Link>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Objektdaten */}
        <TabsContent value="details">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Objektdaten</h3>
              {!editingDetails ? (
                <Button variant="outline" size="sm" onClick={() => setEditingDetails(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Bearbeiten
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditingDetails(false); setEditForm(objekt || {}); }}>
                    <X className="mr-2 h-4 w-4" />
                    Abbrechen
                  </Button>
                  <Button size="sm" onClick={handleSaveObjektdaten}>
                    <Save className="mr-2 h-4 w-4" />
                    Speichern
                  </Button>
                </div>
              )}
            </div>

            {editingDetails ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Objektname</label>
                  <Input
                    value={editForm.name || ""}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400">Kunde</p>
                  <Link href={`/kunden/${objekt.customer.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                    {customerName}
                  </Link>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-gray-700">Straße</label>
                    <Input
                      value={editForm.street || ""}
                      onChange={(e) => setEditForm({ ...editForm, street: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">PLZ</label>
                    <Input
                      value={editForm.zip || ""}
                      onChange={(e) => setEditForm({ ...editForm, zip: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Stadt</label>
                  <Input
                    value={editForm.city || ""}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Beschreibung</label>
                  <Textarea
                    value={editForm.description || ""}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="mt-1"
                    rows={4}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-gray-400">Objektname</p>
                    <p className="text-sm font-medium text-gray-900">{objekt.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400">Kunde</p>
                    <Link href={`/kunden/${objekt.customer.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                      {customerName}
                    </Link>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400">Adresse</p>
                    <p className="text-sm text-gray-900">
                      {objekt.street ? `${objekt.street}, ${objekt.zip} ${objekt.city}` : "Keine Adresse"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400">Status</p>
                    <Badge className={statusConf.color}>{statusConf.label}</Badge>
                  </div>
                </div>
                {objekt.description && (
                  <div>
                    <p className="text-xs font-medium text-gray-400">Beschreibung</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{objekt.description}</p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Gebäudefotos */}
        <TabsContent value="bilder">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Gebäudefotos</h3>
              <label className="cursor-pointer">
                <Button size="sm" asChild>
                  <span>
                    <Camera className="mr-2 h-4 w-4" />
                    Fotos hochladen
                  </span>
                </Button>
                <input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={handleObjektBildUpload} />
              </label>
            </div>

            {objektBilder.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12 text-gray-400">
                <ImageIcon className="h-12 w-12" />
                <p className="mt-3 text-sm">Noch keine Fotos – lade Bilder des Gebäudes hoch</p>
                <label className="mt-4 cursor-pointer">
                  <Button size="sm" variant="outline" asChild>
                    <span>
                      <Upload className="mr-2 h-4 w-4" />
                      Fotos auswählen
                    </span>
                  </Button>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleObjektBildUpload} />
                </label>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {objektBilder.map((bild) => (
                  <div key={bild.id} className="group relative overflow-hidden rounded-lg border">
                    <button onClick={() => setLightbox(bild.fileUrl)} className="block w-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={bild.fileUrl} alt={bild.fileName} className="aspect-square w-full object-cover transition-transform group-hover:scale-105" />
                    </button>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <p className="text-xs text-white truncate">{bild.fileName}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteObjektBild(bild.id)}
                      className="absolute top-2 right-2 rounded-full bg-red-500 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Gebäudepläne */}
        <TabsContent value="plan">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Gebäudepläne</h3>
              <PlanUploadForm onUpload={handlePlanUpload} uploading={uploading} />
            </div>

            {objektPlaene.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12 text-gray-400">
                <FileImage className="h-12 w-12" />
                <p className="mt-3 text-sm">Noch keine Gebäudepläne hochgeladen</p>
                <p className="mt-1 text-xs">Lade Pläne mit Titel und Beschreibung hoch</p>
              </div>
            ) : (
              <div className="space-y-4">
                {objektPlaene.map((plan) => (
                  <div key={plan.id} className="rounded-lg border overflow-hidden">
                    <div className="flex gap-4 p-4 bg-gray-50">
                      <div className="shrink-0 w-32 h-24 rounded border bg-white overflow-hidden flex items-center justify-center">
                        {plan.fileUrl.match(/\.(pdf)$/i) ? (
                          <FileImage className="h-8 w-8 text-gray-400" />
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={plan.fileUrl} alt={plan.titel || plan.fileName} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {editingPlan?.id === plan.id ? (
                          <div className="space-y-2">
                            <Input
                              defaultValue={plan.titel || ""}
                              placeholder="Titel"
                              className="bg-white"
                              id={`plan-titel-${plan.id}`}
                            />
                            <Input
                              defaultValue={plan.beschreibung || ""}
                              placeholder="Beschreibung"
                              className="bg-white"
                              id={`plan-desc-${plan.id}`}
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => {
                                const titel = (document.getElementById(`plan-titel-${plan.id}`) as HTMLInputElement)?.value || null;
                                const beschreibung = (document.getElementById(`plan-desc-${plan.id}`) as HTMLInputElement)?.value || null;
                                handlePlanUpdate(plan.id, titel || null, beschreibung || null);
                              }}>
                                <Save className="mr-1 h-4 w-4" />
                                Speichern
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingPlan(null)}>Abbrechen</Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="font-medium text-gray-900">{plan.titel || plan.fileName}</p>
                            {plan.beschreibung && <p className="text-sm text-gray-500 mt-0.5">{plan.beschreibung}</p>}
                            <div className="flex gap-2 mt-2">
                              <Button size="sm" variant="ghost" onClick={() => setEditingPlan(plan)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <a href={plan.fileUrl} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" variant="outline">
                                  <Eye className="mr-2 h-4 w-4" />
                                  Öffnen
                                </Button>
                              </a>
                              <Button size="sm" variant="ghost" className="text-red-500" onClick={() => confirm("Plan löschen?") && handlePlanDelete(plan.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
        {/* Elemente bearbeiten */}
        <TabsContent value="elemente-edit">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Elemente bearbeiten</h3>
              <Button size="sm" onClick={() => setElementDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Element hinzufügen
              </Button>
            </div>

            {objekt.elemente.length === 0 ? (
              <Card className="flex flex-col items-center p-12 text-gray-400">
                <DoorOpen className="h-12 w-12" />
                <p className="mt-3 text-sm">Noch keine Elemente vorhanden</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {objekt.elemente.map((el) => {
                  const isEditOpen = editingElement?.id === el.id;
                  const elBilder = elementBilder[el.id] || [];

                  return (
                    <Card key={el.id} className="overflow-hidden">
                      {/* Header */}
                      <div className="flex items-center gap-3 p-4">
                        {elBilder.length > 0 ? (
                          <button onClick={() => setLightbox(elBilder[0].fileUrl)} className="shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={elBilder[0].fileUrl} alt="" className="h-10 w-10 rounded-lg object-cover border" />
                          </button>
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                            <DoorOpen className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900">{el.bezeichnung}</h4>
                            <Badge variant="outline" className="text-xs">{TYP_LABELS[el.typ] || el.typ}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-0.5">
                            {el.standort && <span>Standort: {el.standort}</span>}
                            {el.hersteller && <span>Hersteller: {el.hersteller}</span>}
                            {el.baujahr && <span>Baujahr: {el.baujahr}</span>}
                            {el.seriennummer && <span>SN: {el.seriennummer}</span>}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant={isEditOpen ? "default" : "ghost"}
                            onClick={() => {
                              if (isEditOpen) {
                                setEditingElement(null);
                              } else {
                                setEditingElement(el);
                                loadElementBilder(el.id);
                                setEditElementForm({
                                  typ: el.typ,
                                  bezeichnung: el.bezeichnung,
                                  standort: el.standort || "",
                                  hersteller: el.hersteller || "",
                                  baujahr: el.baujahr?.toString() || "",
                                  seriennummer: el.seriennummer || "",
                                  notizen: el.notizen || "",
                                });
                              }
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteElement(el.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Bearbeiten-Bereich */}
                      {isEditOpen && (
                        <div className="border-t bg-blue-50/50 p-4">
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-medium text-gray-600">Typ</label>
                                <Select value={editElementForm.typ} onValueChange={(v) => setEditElementForm({ ...editElementForm, typ: v })}>
                                  <SelectTrigger className="mt-1 bg-white"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {ELEMENT_TYPEN.map((t) => (
                                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600">Bezeichnung</label>
                                <Input
                                  value={editElementForm.bezeichnung || ""}
                                  onChange={(e) => setEditElementForm({ ...editElementForm, bezeichnung: e.target.value })}
                                  className="mt-1 bg-white"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-medium text-gray-600">Standort</label>
                                <Input
                                  value={editElementForm.standort || ""}
                                  onChange={(e) => setEditElementForm({ ...editElementForm, standort: e.target.value })}
                                  className="mt-1 bg-white"
                                  placeholder="z.B. EG, Eingang Süd"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600">Hersteller</label>
                                <Input
                                  value={editElementForm.hersteller || ""}
                                  onChange={(e) => setEditElementForm({ ...editElementForm, hersteller: e.target.value })}
                                  className="mt-1 bg-white"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-medium text-gray-600">Baujahr</label>
                                <Input
                                  type="number"
                                  value={editElementForm.baujahr || ""}
                                  onChange={(e) => setEditElementForm({ ...editElementForm, baujahr: e.target.value })}
                                  className="mt-1 bg-white"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600">Seriennummer</label>
                                <Input
                                  value={editElementForm.seriennummer || ""}
                                  onChange={(e) => setEditElementForm({ ...editElementForm, seriennummer: e.target.value })}
                                  className="mt-1 bg-white"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600">Notizen</label>
                              <Textarea
                                value={editElementForm.notizen || ""}
                                onChange={(e) => setEditElementForm({ ...editElementForm, notizen: e.target.value })}
                                rows={2}
                                className="mt-1 bg-white"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600">Bild</label>
                              <div className="mt-1 flex items-center gap-2">
                                {elBilder.length > 0 && (
                                  <div className="flex gap-1 flex-wrap">
                                    {elBilder.map((bild) => (
                                      <div key={bild.id} className="relative group">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={bild.fileUrl} alt="" className="h-12 w-12 rounded object-cover border" />
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteElementBild(el.id, bild.id)}
                                          className="absolute -top-1 -right-1 rounded-full bg-red-500 p-0.5 text-white opacity-0 group-hover:opacity-100"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <label className="cursor-pointer">
                                  <span className="inline-flex items-center justify-center rounded-md border border-input bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50">
                                    <Upload className="mr-1 h-4 w-4" />
                                    Bild hochladen
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => { handleElementBildUpload(el.id, e); }}
                                  />
                                </label>
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                              <Button size="sm" variant="outline" onClick={() => setEditingElement(null)}>Abbrechen</Button>
                              <Button size="sm" onClick={() => handleUpdateElement(el.id)}>
                                <Save className="mr-1 h-4 w-4" />
                                Speichern
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white hover:text-gray-300" onClick={() => setLightbox(null)}>
            <X className="h-8 w-8" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Vergrößert" className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* Element-hinzufügen-Dialog */}
      {elementDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Element hinzufügen</h2>
              <button onClick={() => setElementDialog(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateElement} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Typ *</label>
                <Select name="typ" defaultValue="TUER">
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ELEMENT_TYPEN.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Bezeichnung *</label>
                <Input name="bezeichnung" required placeholder="z.B. Eingangstür EG links" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Standort</label>
                <Input name="standort" placeholder="z.B. Erdgeschoss, Eingang Süd" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Hersteller</label>
                  <Input name="hersteller" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Baujahr</label>
                  <Input name="baujahr" type="number" className="mt-1" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Seriennummer</label>
                <Input name="seriennummer" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Notizen</label>
                <Textarea name="notizen" rows={2} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Fotos</label>
                <div className="mt-1">
                  {newElementFiles.length > 0 && (
                    <div className="flex gap-2 flex-wrap mb-2">
                      {newElementFiles.map((file, i) => (
                        <div key={i} className="relative group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={URL.createObjectURL(file)} alt="" className="h-16 w-16 rounded-lg object-cover border" />
                          <button
                            type="button"
                            onClick={() => setNewElementFiles((prev) => prev.filter((_, j) => j !== i))}
                            className="absolute -top-1 -right-1 rounded-full bg-red-500 p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <Button type="button" size="sm" variant="outline" asChild>
                      <span><Camera className="mr-1 h-4 w-4" />Fotos hinzufügen</span>
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) setNewElementFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => { setElementDialog(false); setNewElementFiles([]); }}>
                  Abbrechen
                </Button>
                <Button type="submit">Hinzufügen</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
