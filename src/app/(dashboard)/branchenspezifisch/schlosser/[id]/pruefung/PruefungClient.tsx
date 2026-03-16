"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  History,
  ClipboardCheck,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  RefreshCw,
  ImageIcon,
} from "lucide-react";

interface MangelFoto {
  url: string;
  fileName?: string;
}

interface Mangel {
  id: string;
  pruefungId?: string;
  beschreibung: string;
  schwere: string;
  fotoUrl: string | null;
  fotoName: string | null;
  fotoUrls?: MangelFoto[] | null;
  behoben: boolean;
  behobenAm: string | null;
  behobenVon?: string | null;
  behobenNotiz?: string | null;
  notizen: string | null;
  createdAt: string;
  aufgabeId?: string | null;
}

interface TextEintrag {
  id: string;
  text: string;
  createdAt: string;
}

interface Pruefung {
  id: string;
  datum: string;
  pruefer: string | null;
  ergebnis: string;
  notizen: string | null;
  naechstePruefung: string | null;
  maengel: Mangel[];
  texteintraege?: TextEintrag[];
}

interface Element {
  id: string;
  typ: string;
  bezeichnung: string;
  standort: string | null;
  hersteller: string | null;
  baujahr: number | null;
}

const ERGEBNIS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  BESTANDEN: { label: "Bestanden", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  MAENGEL: { label: "Mängel festgestellt", color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle },
  MAENGEL_ERLEDIGT: { label: "Erledigt", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  NICHT_BESTANDEN: { label: "Nicht bestanden", color: "bg-red-100 text-red-800", icon: XCircle },
};

const SCHWERE_CONFIG: Record<string, { label: string; color: string }> = {
  LEICHT: { label: "Leicht", color: "bg-blue-100 text-blue-700" },
  MITTEL: { label: "Mittel", color: "bg-yellow-100 text-yellow-700" },
  SCHWER: { label: "Schwer", color: "bg-orange-100 text-orange-700" },
  KRITISCH: { label: "Kritisch", color: "bg-red-100 text-red-700" },
};

const TYP_LABELS: Record<string, string> = {
  TUER: "Tür", FENSTER: "Fenster", TOR: "Tor", GELAENDER: "Geländer",
  ZAUN: "Zaun", SCHLOSS: "Schloss", FLUCHTWEG: "Fluchtweg",
  BRANDSCHUTZTUER: "Brandschutztür", SONSTIGES: "Sonstiges",
};

function formatDate(d: string | Date | null | undefined): string {
  if (d == null) return "–";
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? "–" : date.toLocaleDateString("de-DE");
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function getMangelFotos(m: Mangel): { url: string; fileName?: string }[] {
  const urls = m.fotoUrls as { url: string; fileName: string }[] | undefined;
  if (Array.isArray(urls) && urls.length > 0) return urls;
  if (m.fotoUrl) return [{ url: m.fotoUrl, fileName: m.fotoName || undefined }];
  return [];
}

export default function PruefungClient({
  objektId,
  elementId,
  initialElement,
  initialPruefungen,
  isAdmin = false,
  expandPruefungId,
}: {
  objektId: string;
  elementId: string;
  initialElement?: Element | null;
  initialPruefungen?: Pruefung[];
  isAdmin?: boolean;
  expandPruefungId?: string;
}) {
  const [element, setElement] = useState<Element | null>(initialElement ?? null);
  const [pruefungen, setPruefungen] = useState<Pruefung[]>(initialPruefungen ?? []);
  const [loading, setLoading] = useState(initialPruefungen === undefined);

  const [neuePruefung, setNeuePruefung] = useState(false);
  const [pruefForm, setPruefForm] = useState({
    datum: new Date().toISOString().split("T")[0],
    pruefer: "",
    ergebnis: "BESTANDEN",
    notizen: "",
  });

  const router = useRouter();

  const [behobenDialog, setBehobenDialog] = useState<{ mangel: Mangel; pruefungId: string } | null>(null);
  const [behobenForm, setBehobenForm] = useState({ name: "", notiz: "" });

  const [detailModal, setDetailModal] = useState<{ pruefung: Pruefung; mangel: Mangel } | null>(null);

  const [expandedPruefung, setExpandedPruefung] = useState<string | null>(expandPruefungId ?? null);
  const [creatingPruefung, setCreatingPruefung] = useState(false);
  const [intervallMonate, setIntervallMonate] = useState<number>(12);
  const [mitarbeiter, setMitarbeiter] = useState<{ id: string; firstName: string; lastName: string }[]>([]);

  const load = useCallback(async () => {
    const cacheBust = `_=${Date.now()}`;
    const [elRes, prRes, configRes] = await Promise.all([
      fetch(`/api/schlosser/objekte/${objektId}/elemente?${cacheBust}`, { cache: "no-store" }),
      fetch(`/api/schlosser/elemente/${elementId}/pruefungen?${cacheBust}`, { cache: "no-store" }),
      fetch(`/api/schlosser/einstellungen/pruef-config?${cacheBust}`, { cache: "no-store" }),
    ]);
    const elemente = elRes.ok ? await elRes.json().catch(() => []) : [];
    const el = Array.isArray(elemente) ? elemente.find((e: Element) => e.id === elementId) : null;
    setElement(el || null);
    const pruefData = prRes.ok ? await prRes.json().catch(() => []) : [];
    setPruefungen(Array.isArray(pruefData) ? pruefData : []);
    if (configRes.ok) {
      const configs = await configRes.json().catch(() => []);
      const typ = (el || initialElement)?.typ || "TUER";
      const cfg = Array.isArray(configs) ? configs.find((c: { elementTyp: string }) => c.elementTyp === typ) : null;
      setIntervallMonate(cfg?.intervallMonate ?? 12);
    }
    setLoading(false);
  }, [objektId, elementId, initialElement]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (expandPruefungId) setExpandedPruefung(expandPruefungId);
  }, [expandPruefungId]);

  useEffect(() => {
    fetch("/api/mitarbeiter")
      .then((r) => r.json())
      .then((users) => setMitarbeiter(Array.isArray(users) ? users.filter((u: { isActive?: boolean }) => u.isActive !== false) : []));
  }, []);

  async function handleCreatePruefung(e: React.FormEvent) {
    e.preventDefault();
    setCreatingPruefung(true);
    const naechstePruefung = addMonths(new Date(pruefForm.datum), intervallMonate);

    const res = await fetch(`/api/schlosser/elemente/${elementId}/pruefungen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...pruefForm,
        naechstePruefung: naechstePruefung.toISOString(),
      }),
    });
    setNeuePruefung(false);
    setPruefForm({ datum: new Date().toISOString().split("T")[0], pruefer: "", ergebnis: "BESTANDEN", notizen: "" });

    if (res.ok) {
      try {
        const newPruefung: Pruefung = await res.json();
        setPruefungen((prev) => [{ ...newPruefung, texteintraege: newPruefung.texteintraege || [], maengel: newPruefung.maengel || [] }, ...prev]);
        if (pruefForm.ergebnis === "MAENGEL" || pruefForm.ergebnis === "NICHT_BESTANDEN") {
          setExpandedPruefung(newPruefung.id);
          router.push(`/branchenspezifisch/schlosser/${objektId}/pruefung/${elementId}/mangel-neu?pruefungId=${newPruefung.id}`);
        }
      } catch {
        load();
      }
    } else {
      alert("Prüfung konnte nicht gespeichert werden.");
      load();
    }
    setCreatingPruefung(false);
  }

  function openBehobenDialog(mangel: Mangel, pruefungId: string) {
    setBehobenDialog({ mangel, pruefungId });
    setBehobenForm({ name: "", notiz: "" });
  }

  async function handleBehobenSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!behobenDialog) return;
    const behobenVonName = behobenForm.name === "__none__" || !behobenForm.name ? "" : behobenForm.name.trim();
    if (!behobenVonName) {
      alert("Bitte wählen Sie den Mitarbeiter, der den Mangel behoben hat.");
      return;
    }
    const behobenVon = behobenVonName;
    await fetch(`/api/schlosser/pruefungen/${behobenDialog.pruefungId}/maengel`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: behobenDialog.mangel.id,
        behoben: true,
        behobenVon: behobenVon || null,
        behobenNotiz: behobenForm.notiz.trim() || null,
      }),
    });
    setBehobenDialog(null);
    setBehobenForm({ name: "", notiz: "" });
    load();
  }

  function openDetailModal(pruefung: Pruefung, mangel: Mangel) {
    setDetailModal({ pruefung, mangel });
  }

  async function handleDeletePruefung(pruefungId: string) {
    if (!confirm("Prüfung wirklich löschen? Alle Mängel und Texteinträge werden ebenfalls gelöscht.")) return;
    try {
      const res = await fetch(`/api/schlosser/pruefungen/${pruefungId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setPruefungen((prev) => prev.filter((p) => p.id !== pruefungId));
        setExpandedPruefung(null);
        await load();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || "Prüfung konnte nicht gelöscht werden.");
      }
    } catch (e) {
      alert("Fehler beim Löschen der Prüfung.");
    }
  }

  async function handleDeleteMangel(pruefungId: string, mangelId: string) {
    if (!confirm("Mangel wirklich löschen?")) return;
    const res = await fetch(`/api/schlosser/pruefungen/${pruefungId}/maengel`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: mangelId }),
    });
    if (res.ok) {
      setPruefungen((prev) =>
        prev.map((p) =>
          p.id === pruefungId ? { ...p, maengel: (p.maengel || []).filter((m) => m.id !== mangelId) } : p
        )
      );
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err?.error || "Mangel konnte nicht gelöscht werden.");
    }
    load();
  }

  async function handleDeleteText(pruefungId: string, eintragId: string) {
    await fetch(`/api/schlosser/pruefungen/${pruefungId}/texte`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: eintragId }),
    });
    load();
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!element) {
    return (
      <div className="space-y-4">
        <Link href={`/branchenspezifisch/schlosser/${objektId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück zum Objekt
          </Button>
        </Link>
        <Card className="p-12 text-center text-gray-400">Element nicht gefunden</Card>
      </div>
    );
  }

  const lastPruefung = pruefungen[0];
  const offeneMaengel = pruefungen.flatMap((p) => p.maengel || []).filter((m) => !m.behoben);

  return (
    <div className="space-y-6">
      <div className="flex flex-row flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/branchenspezifisch/schlosser/${objektId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zurück
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{element.bezeichnung}</h1>
              <Badge variant="outline">{TYP_LABELS[element.typ] || element.typ}</Badge>
            </div>
            <p className="text-sm text-gray-500">
              {element.standort && `${element.standort} · `}
              {element.hersteller && `${element.hersteller} · `}
              {element.baujahr && `Baujahr ${element.baujahr}`}
            </p>
          </div>
        </div>
        <Button onClick={() => setNeuePruefung(true)}>
          <ClipboardCheck className="mr-2 h-4 w-4" />
          Neue Prüfung
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-gray-400">Letzte Prüfung</p>
          {lastPruefung ? (
            <>
              <p className="text-lg font-bold text-gray-900">
                {formatDate(lastPruefung.datum)}
              </p>
              <Badge className={`mt-1 ${(lastPruefung.ergebnis === "MAENGEL" && (lastPruefung.maengel || []).length > 0 && (lastPruefung.maengel || []).every((m) => m.behoben))
                ? ERGEBNIS_CONFIG.MAENGEL_ERLEDIGT.color
                : ERGEBNIS_CONFIG[lastPruefung.ergebnis]?.color || ""}`}>
                {(lastPruefung.ergebnis === "MAENGEL" && (lastPruefung.maengel || []).length > 0 && (lastPruefung.maengel || []).every((m) => m.behoben))
                  ? ERGEBNIS_CONFIG.MAENGEL_ERLEDIGT.label
                  : ERGEBNIS_CONFIG[lastPruefung.ergebnis]?.label || lastPruefung.ergebnis}
              </Badge>
            </>
          ) : (
            <p className="text-lg font-bold text-amber-600">Noch nie geprüft</p>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-gray-400">Nächste Prüfung fällig</p>
          {(() => {
            const naechste = lastPruefung?.naechstePruefung
              ? new Date(lastPruefung.naechstePruefung)
              : lastPruefung?.datum
                ? addMonths(new Date(lastPruefung.datum), intervallMonate)
                : null;
            if (!naechste || Number.isNaN(naechste.getTime())) {
              return <p className="text-lg font-bold text-gray-400">–</p>;
            }
            const istUeberfaellig = naechste < new Date();
            return (
              <p className={`text-lg font-bold ${istUeberfaellig ? "text-red-600" : "text-gray-900"}`}>
                {naechste.toLocaleDateString("de-DE")}
              </p>
            );
          })()}
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-gray-400">Offene Mängel</p>
          <p className={`text-lg font-bold ${offeneMaengel.length > 0 ? "text-red-600" : "text-green-600"}`}>
            {offeneMaengel.length}
          </p>
        </Card>
      </div>

      {offeneMaengel.length > 0 && (
        <Card className="p-5">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-red-700 mb-3">
            <AlertTriangle className="h-5 w-5" />
            Offene Mängel
          </h3>
          <div className="space-y-3">
            {offeneMaengel.map((m) => (
              <div key={m.id} className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{m.beschreibung}</p>
                    <Badge className={`text-xs ${SCHWERE_CONFIG[m.schwere]?.color || ""}`}>
                      {SCHWERE_CONFIG[m.schwere]?.label || m.schwere}
                    </Badge>
                  </div>
                  {m.notizen && <p className="text-sm text-gray-500 mt-1">{m.notizen}</p>}
                </div>
                {m.aufgabeId ? (
                  <Link href={`/branchenspezifisch/schlosser/aufgaben/${m.aufgabeId}`}>
                    <Button size="sm" variant="outline">
                      Öffnen
                    </Button>
                  </Link>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const res = await fetch(`/api/schlosser/maengel/${m.id}/aufgabe-or-create`, { method: "POST" });
                      if (res.ok) {
                        const { aufgabeId } = await res.json();
                        router.push(`/branchenspezifisch/schlosser/aufgaben/${aufgabeId}`);
                      } else {
                        alert("Aufgabe konnte nicht erstellt werden.");
                      }
                    }}
                  >
                    Öffnen
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <History className="h-5 w-5" />
            Prüf-Historie ({pruefungen.length})
          </h3>
          <Button variant="outline" size="sm" onClick={() => load()}>
            <RefreshCw className="mr-1 h-4 w-4" />
            Aktualisieren
          </Button>
        </div>

        {pruefungen.length === 0 ? (
          <Card className="flex flex-col items-center p-12 text-gray-400">
            <ClipboardCheck className="h-12 w-12" />
            <p className="mt-3 text-sm">Noch keine Prüfungen durchgeführt</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {pruefungen.map((p) => {
              const maengel = p.maengel || [];
              const alleMangelBehoben = p.ergebnis === "MAENGEL" && maengel.length > 0 && maengel.every((m) => m.behoben);
              const conf = alleMangelBehoben ? ERGEBNIS_CONFIG.MAENGEL_ERLEDIGT : (ERGEBNIS_CONFIG[p.ergebnis] || ERGEBNIS_CONFIG.BESTANDEN);
              const ConfIcon = conf.icon;
              const expanded = expandedPruefung === p.id;

              return (
                <Card key={p.id} className="overflow-hidden">
                  <button
                    onClick={() => setExpandedPruefung(expanded ? null : p.id)}
                    className="flex w-full items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${conf.color}`}>
                      <ConfIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">
                          {new Date(p.datum).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
                        </p>
                        <Badge className={conf.color}>{conf.label}</Badge>
                        {maengel.length > 0 && (
                          <span className="text-xs text-gray-400">
                            {maengel.length} Mangel/Mängel
                          </span>
                        )}
                      </div>
                      {p.pruefer && <p className="text-sm text-gray-500">Prüfer: {p.pruefer}</p>}
                    </div>
                    {expanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                  </button>

                  {expanded && (
                    <div className="border-t px-4 pb-4 pt-3 space-y-3">
                      {p.notizen && (
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{p.notizen}</p>
                      )}
                      {p.naechstePruefung && (
                        <p className="text-sm text-gray-500">
                          Nächste Prüfung: {new Date(p.naechstePruefung).toLocaleDateString("de-DE")}
                        </p>
                      )}

                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-gray-700">
                          Mängel ({maengel.length}) · Text ({(p.texteintraege || []).length})
                        </h4>
                        <div className="flex gap-2">
                          {isAdmin && (
                            <Button type="button" size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDeletePruefung(p.id); }}>
                              <Trash2 className="mr-1 h-4 w-4" />
                              Prüfung löschen
                            </Button>
                          )}
                          <Link
                            href={`/branchenspezifisch/schlosser/${objektId}/pruefung/${elementId}/mangel-neu?pruefungId=${p.id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button size="sm" variant="outline" type="button">
                              <Plus className="mr-1 h-4 w-4" />
                              Mangel hinzufügen
                            </Button>
                          </Link>
                        </div>
                      </div>

                      {(p.texteintraege || []).length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-500">Texteinträge</p>
                          {(p.texteintraege || []).map((te) => (
                            <div key={te.id} className="flex items-start gap-2 rounded-lg border bg-gray-50 p-3">
                              <FileText className="h-4 w-4 shrink-0 text-gray-400 mt-0.5" />
                              <p className="flex-1 text-sm text-gray-700 whitespace-pre-wrap">{te.text}</p>
                              {isAdmin && (
                                <button
                                  onClick={() => handleDeleteText(p.id, te.id)}
                                  className="text-gray-400 hover:text-red-500 shrink-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {maengel.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">Keine Mängel bei dieser Prüfung</p>
                      ) : (
                        <div className="space-y-2">
                          {maengel.map((m) => (
                            <div
                              key={m.id}
                              className={`flex items-start gap-3 rounded-lg border p-3 ${
                                m.behoben ? "bg-green-50 border-green-200" : "bg-white"
                              }`}
                            >
                              {getMangelFotos(m).length > 0 ? (
                                <div className="flex gap-1 shrink-0">
                                  {getMangelFotos(m).map((f, i) => (
                                    <a key={i} href={f.url} target="_blank" rel="noopener noreferrer">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={f.url} alt={f.fileName || "Mangel"} className="h-14 w-14 rounded object-cover border" />
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-gray-100 text-gray-300">
                                  <ImageIcon className="h-6 w-6" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className={`text-sm font-medium ${m.behoben ? "line-through text-gray-400" : "text-gray-900"}`}>
                                    {m.beschreibung}
                                  </p>
                                  <Badge className={`text-xs ${SCHWERE_CONFIG[m.schwere]?.color || ""}`}>
                                    {SCHWERE_CONFIG[m.schwere]?.label || m.schwere}
                                  </Badge>
                                  {m.behoben && (
                                    <Badge className="text-xs bg-green-100 text-green-700">
                                      Behoben {m.behobenAm && `am ${new Date(m.behobenAm).toLocaleDateString("de-DE")}`}
                                    </Badge>
                                  )}
                                </div>
                                {m.notizen && <p className="text-xs text-gray-500 mt-1">{m.notizen}</p>}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {m.aufgabeId ? (
                                  <Link href={`/branchenspezifisch/schlosser/aufgaben/${m.aufgabeId}`}>
                                    <Button size="sm" variant="ghost">
                                      Öffnen
                                    </Button>
                                  </Link>
                                ) : m.behoben ? (
                                  <Button size="sm" variant="ghost" onClick={() => openDetailModal(p, m)}>
                                    Öffnen
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={async () => {
                                      const res = await fetch(`/api/schlosser/maengel/${m.id}/aufgabe-or-create`, { method: "POST" });
                                      if (res.ok) {
                                        const { aufgabeId } = await res.json();
                                        router.push(`/branchenspezifisch/schlosser/aufgaben/${aufgabeId}`);
                                      } else {
                                        alert("Aufgabe konnte nicht erstellt werden.");
                                      }
                                    }}
                                  >
                                    Öffnen
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {neuePruefung && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-4">Neue Prüfung durchführen</h2>
            <form onSubmit={handleCreatePruefung} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Prüfdatum *</label>
                <Input
                  type="date"
                  value={pruefForm.datum}
                  onChange={(e) => setPruefForm({ ...pruefForm, datum: e.target.value })}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Prüfer</label>
                <Select
                  value={pruefForm.pruefer || "__none__"}
                  onValueChange={(v) => setPruefForm({ ...pruefForm, pruefer: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Mitarbeiter wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">– Keiner –</SelectItem>
                    {mitarbeiter.map((m) => (
                      <SelectItem key={m.id} value={`${m.firstName} ${m.lastName}`}>
                        {m.firstName} {m.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Ergebnis *</label>
                <Select
                  value={pruefForm.ergebnis}
                  onValueChange={(v) => setPruefForm({ ...pruefForm, ergebnis: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BESTANDEN">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Bestanden
                      </span>
                    </SelectItem>
                    <SelectItem value="MAENGEL">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        Mängel festgestellt
                      </span>
                    </SelectItem>
                    <SelectItem value="NICHT_BESTANDEN">
                      <span className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        Nicht bestanden
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Notizen</label>
                <Textarea
                  value={pruefForm.notizen}
                  onChange={(e) => setPruefForm({ ...pruefForm, notizen: e.target.value })}
                  rows={3}
                  className="mt-1"
                  placeholder="Bemerkungen zur Prüfung..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setNeuePruefung(false)}>
                  Abbrechen
                </Button>
                <Button type="submit" disabled={creatingPruefung}>
                  {creatingPruefung ? "Speichern..." : "Prüfung speichern"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {behobenDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-4">Mangel als behoben markieren</h2>
            <p className="text-sm text-gray-600 mb-4">{behobenDialog.mangel.beschreibung}</p>
            <form onSubmit={handleBehobenSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Name (wer hat es behoben?) *</label>
                <Select
                  value={behobenForm.name || "__none__"}
                  onValueChange={(v) => setBehobenForm({ ...behobenForm, name: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Mitarbeiter wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">– Bitte wählen –</SelectItem>
                    {mitarbeiter.map((m) => (
                      <SelectItem key={m.id} value={`${m.firstName} ${m.lastName}`}>
                        {m.firstName} {m.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Zusätzliche Anmerkung</label>
                <Textarea
                  value={behobenForm.notiz}
                  onChange={(e) => setBehobenForm({ ...behobenForm, notiz: e.target.value })}
                  rows={3}
                  className="mt-1"
                  placeholder="Bemerkung, was wurde gemacht..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setBehobenDialog(null)}>
                  Abbrechen
                </Button>
                <Button type="submit">Behoben speichern</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDetailModal(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Prüfungsdetails</h2>
              <Button variant="ghost" size="sm" onClick={() => setDetailModal(null)}>
                <XCircle className="h-5 w-5" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-400">Prüfdatum</p>
                <p className="font-medium">{formatDate(detailModal.pruefung.datum)}</p>
              </div>
              {detailModal.pruefung.pruefer && (
                <div>
                  <p className="text-xs font-medium text-gray-400">Prüfer</p>
                  <p className="font-medium">{detailModal.pruefung.pruefer}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-gray-400">Ergebnis</p>
                <Badge className={ERGEBNIS_CONFIG[detailModal.pruefung.ergebnis]?.color || ""}>
                  {ERGEBNIS_CONFIG[detailModal.pruefung.ergebnis]?.label || detailModal.pruefung.ergebnis}
                </Badge>
              </div>
              {detailModal.pruefung.notizen && (
                <div>
                  <p className="text-xs font-medium text-gray-400">Notizen</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{detailModal.pruefung.notizen}</p>
                </div>
              )}
              {detailModal.pruefung.naechstePruefung && (
                <div>
                  <p className="text-xs font-medium text-gray-400">Nächste Prüfung</p>
                  <p className="font-medium">{formatDate(detailModal.pruefung.naechstePruefung)}</p>
                </div>
              )}
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <h3 className="font-semibold text-gray-900">Mangel: {detailModal.mangel.beschreibung}</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge className={SCHWERE_CONFIG[detailModal.mangel.schwere]?.color || ""}>
                      {SCHWERE_CONFIG[detailModal.mangel.schwere]?.label || detailModal.mangel.schwere}
                    </Badge>
                    <Badge className="bg-green-100 text-green-700" >
                      Behoben: {formatDate(detailModal.mangel.behobenAm)}
                    </Badge>
                  </div>
                  {detailModal.mangel.behobenVon && (
                    <p><span className="text-gray-500">Behoben von:</span> {detailModal.mangel.behobenVon}</p>
                  )}
                  {detailModal.mangel.behobenNotiz && (
                    <p><span className="text-gray-500">Anmerkung:</span> {detailModal.mangel.behobenNotiz}</p>
                  )}
                  {detailModal.mangel.notizen && (
                    <p><span className="text-gray-500">Notizen:</span> {detailModal.mangel.notizen}</p>
                  )}
                  {getMangelFotos(detailModal.mangel).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {getMangelFotos(detailModal.mangel).map((f, i) => (
                        <a key={i} href={f.url} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={f.url} alt={f.fileName || "Mangel"} className="h-32 rounded-lg object-cover border" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {(detailModal.pruefung.texteintraege || []).length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Texteinträge</h3>
                  <div className="space-y-2">
                    {(detailModal.pruefung.texteintraege || []).map((te) => (
                      <div key={te.id} className="rounded-lg border bg-gray-50 p-3 text-sm">
                        <p className="text-gray-700 whitespace-pre-wrap">{te.text}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatDate(te.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-between">
              <div>
                {isAdmin && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm("Mangel wirklich löschen?")) {
                        handleDeleteMangel(detailModal.pruefung.id, detailModal.mangel.id);
                        setDetailModal(null);
                      }
                    }}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Mangel löschen
                  </Button>
                )}
              </div>
              <Button onClick={() => setDetailModal(null)}>Schließen</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
