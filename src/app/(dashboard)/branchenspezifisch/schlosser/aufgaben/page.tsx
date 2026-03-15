"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  ClipboardList,
  User,
  Building2,
  Calendar,
  ChevronRight,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wrench,
  Hammer,
  ShieldAlert,
  DoorOpen,
  UserPlus,
  Eye,
  ExternalLink,
  ImageIcon,
} from "lucide-react";

interface Aufgabe {
  id: string;
  titel: string;
  beschreibung: string | null;
  typ: string;
  prioritaet: string;
  status: string;
  faelligAm: string | null;
  erledigtAm: string | null;
  createdAt: string;
  objekt: { id: string; name: string; customer: { firstName: string; lastName: string; company: string | null; type: string } };
  zugewiesen: { id: string; firstName: string; lastName: string } | null;
  ersteller: { id: string; firstName: string; lastName: string };
  _count: { kommentare: number };
}

interface MitarbeiterOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface ObjektOption {
  id: string;
  name: string;
}

interface OffenerMangel {
  id: string;
  beschreibung: string;
  schwere: string;
  fotoUrl: string | null;
  fotoUrls?: { url: string; fileName?: string }[] | null;
  notizen: string | null;
  createdAt: string;
  pruefungDatum: string;
  element: { id: string; bezeichnung: string; typ: string; standort: string | null };
  objekt: { id: string; name: string; street: string | null; city: string | null };
  customer?: { id: string; firstName: string; lastName: string; company: string | null; type: string } | null;
  aufgabe: { id: string; status: string; zugewiesen: { id: string; firstName: string; lastName: string } | null } | null;
}

const PRIO_CONFIG: Record<string, { label: string; color: string }> = {
  NIEDRIG: { label: "Niedrig", color: "bg-gray-100 text-gray-600" },
  NORMAL: { label: "Normal", color: "bg-blue-100 text-blue-700" },
  HOCH: { label: "Hoch", color: "bg-orange-100 text-orange-700" },
  DRINGEND: { label: "Dringend", color: "bg-red-100 text-red-700" },
};

const SCHWERE_CONFIG: Record<string, { label: string; color: string }> = {
  GERING: { label: "Gering", color: "bg-yellow-100 text-yellow-700" },
  MITTEL: { label: "Mittel", color: "bg-orange-100 text-orange-700" },
  HOCH: { label: "Hoch", color: "bg-red-100 text-red-700" },
  KRITISCH: { label: "Kritisch", color: "bg-red-200 text-red-900" },
};

const TYP_ELEMENT_LABELS: Record<string, string> = {
  TUER: "Tür",
  FENSTER: "Fenster",
  TOR: "Tor",
  GELAENDER: "Geländer",
  ZAUN: "Zaun",
  SCHLOSS: "Schloss",
  FLUCHTWEG: "Fluchtweg",
  BRANDSCHUTZTUER: "Brandschutztür",
  SONSTIGES: "Sonstiges",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  OFFEN: { label: "Offen", color: "bg-gray-100 text-gray-700", icon: ClipboardList },
  IN_ARBEIT: { label: "In Arbeit", color: "bg-blue-100 text-blue-700", icon: Wrench },
  WARTE_AUF_MATERIAL: { label: "Wartet auf Material", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  ERLEDIGT: { label: "Erledigt", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  ABGENOMMEN: { label: "Abgenommen", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
};

const TYP_LABELS: Record<string, string> = {
  REPARATUR: "Reparatur",
  PRUEFUNG: "Prüfung",
  WARTUNG: "Wartung",
  SONSTIGES: "Sonstiges",
};

function getMangelFotos(m: OffenerMangel): { url: string; fileName?: string }[] {
  const urls = m.fotoUrls as { url: string; fileName?: string }[] | undefined;
  if (urls?.length) return urls;
  if (m.fotoUrl) return [{ url: m.fotoUrl }];
  return [];
}

export default function AufgabenPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const [aufgaben, setAufgaben] = useState<Aufgabe[]>([]);
  const [mitarbeiter, setMitarbeiter] = useState<MitarbeiterOption[]>([]);
  const [objekte, setObjekte] = useState<ObjektOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("alle");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tab, setTab] = useState("alle");
  useEffect(() => {
    if (tabParam === "maengel" || tabParam === "alle" || tabParam === "offen" || tabParam === "erledigt" || tabParam === "meine") {
      setTab(tabParam);
    }
  }, [tabParam]);
  const [maengel, setMaengel] = useState<OffenerMangel[]>([]);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "alle") params.set("status", filterStatus);
      const res = await fetch(`/api/schlosser/aufgaben?${params}`);
      const data = await res.json();
      setAufgaben(Array.isArray(data) ? data : []);
    } catch {
      setAufgaben([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  const loadMaengel = useCallback(async () => {
    try {
      const res = await fetch("/api/schlosser/maengel?offen=true");
      if (res.ok) {
        const data = await res.json();
        setMaengel(Array.isArray(data) ? data : []);
      }
    } catch {
      setMaengel([]);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/mitarbeiter").then((r) => r.json()).catch(() => []),
      fetch("/api/schlosser/objekte").then((r) => r.json()).catch(() => []),
    ]).then(([m, o]) => {
      setMitarbeiter(Array.isArray(m) ? m : []);
      setObjekte(Array.isArray(o) ? o : []);
    });
    loadMaengel();
  }, [loadMaengel]);

  const meineAufgaben = aufgaben.filter((a) => a.zugewiesen?.id === (session?.user as { id?: string })?.id);
  const offeneAufgaben = aufgaben.filter((a) => a.status === "OFFEN" || a.status === "IN_ARBEIT" || a.status === "WARTE_AUF_MATERIAL");
  const erledigteAufgaben = aufgaben.filter((a) => a.status === "ERLEDIGT" || a.status === "ABGENOMMEN");
  const ueberfaellige = aufgaben.filter((a) => a.faelligAm && new Date(a.faelligAm) < new Date() && a.status !== "ERLEDIGT" && a.status !== "ABGENOMMEN");

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries());
    await fetch("/api/schlosser/aufgaben", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, erstelltVon: (session?.user as { id?: string })?.id }),
    });
    setDialogOpen(false);
    load();
  }

  const maengelOhneReparator = maengel.filter((m) => !m.aufgabe || !m.aufgabe.zugewiesen);
  const maengelMitReparator = maengel.filter((m) => m.aufgabe?.zugewiesen);

  function getVisibleAufgaben() {
    if (tab === "meine") return meineAufgaben;
    if (tab === "offen") return offeneAufgaben;
    if (tab === "erledigt") return erledigteAufgaben;
    return aufgaben;
  }

  function isOverdue(a: Aufgabe): boolean {
    return !!(a.faelligAm && new Date(a.faelligAm) < new Date() && a.status !== "ERLEDIGT" && a.status !== "ABGENOMMEN");
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-gray-900">Aufgaben</h1>
            <p className="text-sm text-gray-500">Reparaturen, Prüfungen & Wartungen zuweisen und verfolgen</p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Neue Aufgabe
        </Button>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Card className="p-4 text-center cursor-pointer hover:ring-2 ring-blue-300" onClick={() => setTab("alle")}>
          <p className="text-2xl font-bold text-gray-900">{aufgaben.length}</p>
          <p className="text-xs text-gray-500">Aufgaben</p>
        </Card>
        <Card className="p-4 text-center cursor-pointer hover:ring-2 ring-blue-300" onClick={() => setTab("offen")}>
          <p className="text-2xl font-bold text-blue-600">{offeneAufgaben.length}</p>
          <p className="text-xs text-gray-500">Offen</p>
        </Card>
        <Card className="p-4 text-center cursor-pointer hover:ring-2 ring-red-300" onClick={() => setTab("maengel")}>
          <p className="text-2xl font-bold text-red-600">{maengelOhneReparator.length}</p>
          <p className="text-xs text-gray-500">Ohne Reparateur</p>
        </Card>
        <Card className="p-4 text-center cursor-pointer hover:ring-2 ring-red-300" onClick={() => { setTab("alle"); setFilterStatus("alle"); }}>
          <p className="text-2xl font-bold text-orange-600">{ueberfaellige.length}</p>
          <p className="text-xs text-gray-500">Überfällig</p>
        </Card>
        <Card className="p-4 text-center cursor-pointer hover:ring-2 ring-green-300" onClick={() => setTab("erledigt")}>
          <p className="text-2xl font-bold text-green-600">{erledigteAufgaben.length}</p>
          <p className="text-xs text-gray-500">Erledigt</p>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="alle">Alle</TabsTrigger>
            <TabsTrigger value="meine">Meine ({meineAufgaben.length})</TabsTrigger>
            <TabsTrigger value="offen">Offen</TabsTrigger>
            <TabsTrigger value="erledigt">Erledigt</TabsTrigger>
            <TabsTrigger value="maengel" className="gap-1">
              <ShieldAlert className="h-4 w-4" />
              Mängel ({maengelOhneReparator.length})
            </TabsTrigger>
          </TabsList>
          <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); }}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Status filtern" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle Status</SelectItem>
              <SelectItem value="OFFEN">Offen</SelectItem>
              <SelectItem value="IN_ARBEIT">In Arbeit</SelectItem>
              <SelectItem value="WARTE_AUF_MATERIAL">Wartet auf Material</SelectItem>
              <SelectItem value="ERLEDIGT">Erledigt</SelectItem>
              <SelectItem value="ABGENOMMEN">Abgenommen</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {["alle", "meine", "offen", "erledigt"].map((tabVal) => (
          <TabsContent key={tabVal} value={tabVal}>
            <AufgabenListe aufgaben={getVisibleAufgaben()} isOverdue={isOverdue} />
          </TabsContent>
        ))}

        <TabsContent value="maengel">
          <div className="space-y-4">
            {/* Mängel ohne Reparateur (Admin sieht diese – mit oder ohne Aufgabe) */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-500" />
                Ohne Reparateur ({maengelOhneReparator.length})
              </h3>
              {maengelOhneReparator.length === 0 ? (
                <Card className="flex flex-col items-center p-8 text-gray-400">
                  <CheckCircle2 className="h-10 w-10 text-green-400" />
                  <p className="mt-2 text-sm">Alle Mängel haben einen Reparateur</p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {maengelOhneReparator.map((m) => (
                    <MangelCard
                      key={m.id}
                      mangel={m}
                      onOeffnen={async () => {
                        if (m.aufgabe) {
                          router.push(`/branchenspezifisch/schlosser/aufgaben/${m.aufgabe.id}`);
                        } else {
                          const res = await fetch(`/api/schlosser/maengel/${m.id}/aufgabe-or-create`, { method: "POST" });
                          if (res.ok) {
                            const { aufgabeId } = await res.json();
                            router.push(`/branchenspezifisch/schlosser/aufgaben/${aufgabeId}`);
                            loadMaengel();
                          } else {
                            alert("Aufgabe konnte nicht erstellt werden.");
                          }
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Mängel mit Reparateur */}
            {maengelMitReparator.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-blue-500" />
                  Mit Reparateur ({maengelMitReparator.length})
                </h3>
                <div className="space-y-2">
                  {maengelMitReparator.map((m) => (
                    <MangelCard key={m.id} mangel={m} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Neue-Aufgabe-Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Neue Aufgabe erstellen</h2>
              <button onClick={() => setDialogOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Objekt *</label>
                <Select name="objektId" required>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Objekt wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {objekte.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Titel *</label>
                <Input name="titel" required placeholder="z.B. Brandschutztür EG reparieren" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Beschreibung</label>
                <Textarea name="beschreibung" rows={3} className="mt-1" placeholder="Details zur Aufgabe..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Typ</label>
                  <Select name="typ" defaultValue="REPARATUR">
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REPARATUR">Reparatur</SelectItem>
                      <SelectItem value="PRUEFUNG">Prüfung</SelectItem>
                      <SelectItem value="WARTUNG">Wartung</SelectItem>
                      <SelectItem value="SONSTIGES">Sonstiges</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Priorität</label>
                  <Select name="prioritaet" defaultValue="NORMAL">
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NIEDRIG">Niedrig</SelectItem>
                      <SelectItem value="NORMAL">Normal</SelectItem>
                      <SelectItem value="HOCH">Hoch</SelectItem>
                      <SelectItem value="DRINGEND">Dringend</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Zuweisen an</label>
                  <Select name="zugewiesenAn">
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Mitarbeiter wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {mitarbeiter.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.firstName} {m.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Fällig am</label>
                  <Input name="faelligAm" type="date" className="mt-1" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
                <Button type="submit">Aufgabe erstellen</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AufgabenListe({ aufgaben, isOverdue }: { aufgaben: Aufgabe[]; isOverdue: (a: Aufgabe) => boolean }) {
  if (aufgaben.length === 0) {
    return (
      <Card className="flex flex-col items-center p-12 text-gray-400">
        <ClipboardList className="h-12 w-12" />
        <p className="mt-3 text-sm">Keine Aufgaben in dieser Ansicht</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {aufgaben.map((a) => {
        const statusConf = STATUS_CONFIG[a.status] || STATUS_CONFIG.OFFEN;
        const StatusIcon = statusConf.icon;
        const prioConf = PRIO_CONFIG[a.prioritaet] || PRIO_CONFIG.NORMAL;
        const overdue = isOverdue(a);

        return (
          <Link key={a.id} href={`/branchenspezifisch/schlosser/aufgaben/${a.id}`}>
            <Card className={`flex items-center gap-4 p-4 transition-all hover:shadow-md cursor-pointer ${overdue ? "border-red-300 bg-red-50/50" : ""}`}>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${statusConf.color}`}>
                <StatusIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium text-gray-900 truncate">{a.titel}</h3>
                  <Badge className={`text-xs ${prioConf.color}`}>{prioConf.label}</Badge>
                  <Badge variant="outline" className="text-xs">{TYP_LABELS[a.typ] || a.typ}</Badge>
                  <Badge className={`text-xs ${statusConf.color}`}>{statusConf.label}</Badge>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-1">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {a.objekt.name}
                  </span>
                  {a.zugewiesen && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {a.zugewiesen.firstName} {a.zugewiesen.lastName}
                    </span>
                  )}
                  {a.faelligAm && (
                    <span className={`flex items-center gap-1 ${overdue ? "text-red-600 font-medium" : ""}`}>
                      <Calendar className="h-3 w-3" />
                      {overdue && <AlertTriangle className="h-3 w-3" />}
                      Fällig: {new Date(a.faelligAm).toLocaleDateString("de-DE")}
                    </span>
                  )}
                  {a._count.kommentare > 0 && (
                    <span>{a._count.kommentare} Kommentar{a._count.kommentare !== 1 ? "e" : ""}</span>
                  )}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-gray-300" />
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

function MangelCard({ mangel, onOeffnen }: { mangel: OffenerMangel; onOeffnen?: () => void }) {
  const schwereConf = SCHWERE_CONFIG[mangel.schwere] || SCHWERE_CONFIG.MITTEL;
  const customer = mangel.customer;
  const customerName = customer
    ? (customer.type === "GESCHAEFT" && customer.company ? customer.company : `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim())
    : "–";

  return (
    <Card className={`p-4 transition-all hover:shadow-md ${mangel.aufgabe ? "bg-gray-50/50" : "border-red-200 bg-red-50/30"}`}>
      <div className="flex gap-3">
        {getMangelFotos(mangel).length > 0 ? (
          <div className="flex gap-1 shrink-0">
            {getMangelFotos(mangel).slice(0, 3).map((f, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={f.url} alt={f.fileName || "Mangel"} className="h-16 w-16 rounded-lg object-cover border" />
            ))}
          </div>
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-300">
            <ImageIcon className="h-8 w-8" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-gray-900">{mangel.beschreibung}</p>
                <Badge className={`text-xs ${schwereConf.color}`}>{schwereConf.label}</Badge>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
                {mangel.element && (
                  <span className="flex items-center gap-1">
                    <DoorOpen className="h-3 w-3" />
                    {mangel.element.bezeichnung} ({TYP_ELEMENT_LABELS[mangel.element.typ] || mangel.element.typ})
                  </span>
                )}
                {mangel.objekt && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {mangel.objekt.name}
                  </span>
                )}
                <span>{customerName}</span>
                {mangel.element?.standort && <span>Standort: {mangel.element.standort}</span>}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Festgestellt: {mangel.pruefungDatum ? new Date(mangel.pruefungDatum).toLocaleDateString("de-DE") : "–"}
              </p>
              {mangel.notizen && (
                <p className="text-xs text-gray-500 mt-1 italic">{mangel.notizen}</p>
              )}
            </div>

            <div className="flex gap-2 shrink-0">
              {mangel.aufgabe ? (
                <Link href={`/branchenspezifisch/schlosser/aufgaben/${mangel.aufgabe.id}`}>
                  <Button size="sm" variant="outline" className="text-xs">
                    <ExternalLink className="mr-1 h-3 w-3" />
                    Aufgabe ansehen
                    {mangel.aufgabe.zugewiesen && (
                      <span className="ml-1 text-gray-400">
                        ({mangel.aufgabe.zugewiesen.firstName} {mangel.aufgabe.zugewiesen.lastName})
                      </span>
                    )}
                  </Button>
                </Link>
              ) : onOeffnen ? (
                <Button size="sm" onClick={onOeffnen}>
                  Öffnen
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
