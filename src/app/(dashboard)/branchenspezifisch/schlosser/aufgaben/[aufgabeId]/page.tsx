"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  Building2,
  User,
  Calendar,
  Camera,
  Send,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Wrench,
  ClipboardList,
  ImageIcon,
  Pencil,
} from "lucide-react";

interface Kommentar {
  id: string;
  text: string;
  fotoUrl: string | null;
  fotoName: string | null;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
}

interface MangelInfo {
  beschreibung: string;
  schwere: string;
  fotoUrl: string | null;
  fotoUrls?: { url: string; fileName?: string }[] | null;
}

interface Aufgabe {
  id: string;
  titel: string;
  beschreibung: string | null;
  typ: string;
  prioritaet: string;
  status: string;
  faelligAm: string | null;
  erledigtAm: string | null;
  elementId: string | null;
  mangelId: string | null;
  createdAt: string;
  pruefer?: string | null;
  mangelPruefungId?: string | null;
  mangel?: MangelInfo | null;
  objekt: { id: string; name: string; street: string | null; city: string | null; customer: { firstName: string; lastName: string; company: string | null; type: string } };
  zugewiesen: { id: string; firstName: string; lastName: string; avatarUrl: string | null } | null;
  ersteller: { id: string; firstName: string; lastName: string };
  kommentare: Kommentar[];
}

const STATUS_OPTIONS = [
  { value: "OFFEN", label: "Offen" },
  { value: "IN_ARBEIT", label: "In Arbeit" },
  { value: "WARTE_AUF_MATERIAL", label: "Wartet auf Material" },
  { value: "ERLEDIGT", label: "Erledigt" },
  { value: "ABGENOMMEN", label: "Abgenommen" },
];

const PRIO_CONFIG: Record<string, { label: string; color: string }> = {
  NIEDRIG: { label: "Niedrig", color: "bg-gray-100 text-gray-600" },
  NORMAL: { label: "Normal", color: "bg-blue-100 text-blue-700" },
  HOCH: { label: "Hoch", color: "bg-orange-100 text-orange-700" },
  DRINGEND: { label: "Dringend", color: "bg-red-100 text-red-700" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  OFFEN: { label: "Offen", color: "bg-gray-100 text-gray-700", icon: ClipboardList },
  IN_ARBEIT: { label: "In Arbeit", color: "bg-blue-100 text-blue-700", icon: Wrench },
  WARTE_AUF_MATERIAL: { label: "Wartet auf Material", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  ERLEDIGT: { label: "Erledigt", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  ABGENOMMEN: { label: "Abgenommen", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
};

const TYP_LABELS: Record<string, string> = { REPARATUR: "Reparatur", PRUEFUNG: "Prüfung", WARTUNG: "Wartung", SONSTIGES: "Sonstiges" };

const SCHWERE_CONFIG: Record<string, string> = {
  LEICHT: "Leicht",
  MITTEL: "Mittel",
  SCHWER: "Schwer",
  KRITISCH: "Kritisch",
};

function getMangelFotos(m: MangelInfo): { url: string; fileName?: string }[] {
  const urls = m.fotoUrls as { url: string; fileName?: string }[] | undefined;
  if (urls?.length) return urls;
  if (m.fotoUrl) return [{ url: m.fotoUrl }];
  return [];
}

export default function AufgabeDetailPage() {
  const { aufgabeId } = useParams<{ aufgabeId: string }>();
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";
  const [aufgabe, setAufgabe] = useState<Aufgabe | null>(null);
  const [loading, setLoading] = useState(true);
  const [kommentarText, setKommentarText] = useState("");
  const [kommentarFoto, setKommentarFoto] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [mitarbeiter, setMitarbeiter] = useState<{ id: string; firstName: string; lastName: string }[]>([]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/schlosser/aufgaben/${aufgabeId}`);
    if (res.ok) setAufgabe(await res.json());
    setLoading(false);
  }, [aufgabeId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/mitarbeiter").then((r) => r.json()).then(setMitarbeiter);
  }, []);

  async function handleStatusChange(newStatus: string) {
    const res = await fetch(`/api/schlosser/aufgaben/${aufgabeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      load();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err?.error || "Status konnte nicht geändert werden.");
    }
  }

  async function handleAssign(userId: string) {
    const res = await fetch(`/api/schlosser/aufgaben/${aufgabeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zugewiesenAn: userId || null }),
    });
    if (res.ok) load();
  }

  async function handleDeleteMangel() {
    if (!aufgabe?.mangelId || !aufgabe?.mangelPruefungId) return;
    if (!confirm("Mangel wirklich löschen? Die Aufgabe bleibt bestehen.")) return;
    const res = await fetch(`/api/schlosser/pruefungen/${aufgabe.mangelPruefungId}/maengel`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: aufgabe.mangelId }),
    });
    if (res.ok) {
      window.location.href = "/branchenspezifisch/schlosser/aufgaben";
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err?.error || "Mangel konnte nicht gelöscht werden.");
    }
  }

  async function handleSendKommentar(e: React.FormEvent) {
    e.preventDefault();
    if (!kommentarText.trim() && !kommentarFoto) return;
    setSending(true);

    let fotoUrl = null;
    let fotoName = null;
    if (kommentarFoto) {
      const fd = new FormData();
      fd.append("file", kommentarFoto);
      fd.append("type", "aufgaben");
      const res = await fetch("/api/schlosser/upload", { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        fotoUrl = data.url;
        fotoName = data.fileName;
      }
    }

    await fetch(`/api/schlosser/aufgaben/${aufgabeId}/kommentare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: (session?.user as { id?: string })?.id,
        text: kommentarText,
        fotoUrl,
        fotoName,
      }),
    });

    setKommentarText("");
    setKommentarFoto(null);
    setSending(false);
    load();
  }

  if (loading || !aufgabe) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const statusConf = STATUS_CONFIG[aufgabe.status] || STATUS_CONFIG.OFFEN;
  const prioConf = PRIO_CONFIG[aufgabe.prioritaet] || PRIO_CONFIG.NORMAL;
  const isOverdue = aufgabe.faelligAm && new Date(aufgabe.faelligAm) < new Date() && aufgabe.status !== "ERLEDIGT" && aufgabe.status !== "ABGENOMMEN";
  const customerName = aufgabe.objekt.customer.type === "GESCHAEFT" && aufgabe.objekt.customer.company
    ? aufgabe.objekt.customer.company
    : `${aufgabe.objekt.customer.firstName} ${aufgabe.objekt.customer.lastName}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/branchenspezifisch/schlosser/aufgaben">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{aufgabe.titel}</h1>
            <Badge className={statusConf.color}>{statusConf.label}</Badge>
            <Badge className={prioConf.color}>{prioConf.label}</Badge>
            {isOverdue && <Badge className="bg-red-100 text-red-700"><AlertTriangle className="mr-1 h-3 w-3" />Überfällig</Badge>}
          </div>
        </div>
        {isAdmin && aufgabe.mangelId && (
          <Button variant="destructive" size="sm" onClick={handleDeleteMangel}>
            <Trash2 className="mr-1 h-4 w-4" />
            Mangel löschen
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Linke Spalte: Details + Kommentare */}
        <div className="lg:col-span-2 space-y-6">
          {/* Mangel (bei Mangel-Aufgaben) */}
          {aufgabe.mangel && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-gray-400 mb-2">Mangel</h3>
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-500 mb-1">Beschreibung</p>
                <p className="text-gray-700 whitespace-pre-wrap">{aufgabe.mangel.beschreibung}</p>
              </div>
              <Badge className="mb-3">{SCHWERE_CONFIG[aufgabe.mangel.schwere] || aufgabe.mangel.schwere}</Badge>
              {getMangelFotos(aufgabe.mangel).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {getMangelFotos(aufgabe.mangel).map((f, i) => (
                    <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={f.url} alt={f.fileName || "Mangel"} className="h-24 w-24 rounded-lg object-cover border shadow-sm hover:shadow-md transition-shadow" />
                    </a>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Kommentare */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-gray-400 mb-4">
              Kommentare & Fortschritt ({aufgabe.kommentare.length})
            </h3>

            {aufgabe.kommentare.length === 0 && (
              <p className="text-sm text-gray-400 italic mb-4">Noch keine Kommentare</p>
            )}

            <div className="space-y-4 mb-6">
              {aufgabe.kommentare.map((k) => (
                <div key={k.id} className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                    {k.user.firstName[0]}{k.user.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {k.user.firstName} {k.user.lastName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(k.createdAt).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {k.text && <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{k.text}</p>}
                    {k.fotoUrl && (
                      <a href={k.fotoUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={k.fotoUrl} alt={k.fotoName || "Foto"} className="max-w-xs rounded-lg border shadow-sm hover:shadow-md transition-shadow" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Kommentar-Eingabe */}
            <form onSubmit={handleSendKommentar} className="border-t pt-4 space-y-3">
              <Textarea
                value={kommentarText}
                onChange={(e) => setKommentarText(e.target.value)}
                placeholder="Kommentar schreiben, Fortschritt dokumentieren..."
                rows={3}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {kommentarFoto ? (
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 rounded-lg px-3 py-1.5">
                      <Camera className="h-4 w-4" />
                      <span className="truncate max-w-[150px]">{kommentarFoto.name}</span>
                      <button type="button" onClick={() => setKommentarFoto(null)}>
                        <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer text-gray-400 hover:text-gray-600 transition-colors">
                      <Camera className="h-5 w-5" />
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setKommentarFoto(e.target.files?.[0] || null)} />
                    </label>
                  )}
                </div>
                <Button type="submit" size="sm" disabled={sending || (!kommentarText.trim() && !kommentarFoto)}>
                  <Send className="mr-2 h-4 w-4" />
                  {sending ? "Senden..." : "Senden"}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Rechte Spalte: Seitenleiste */}
        <div className="space-y-4">
          {/* Status ändern */}
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-400">Status ändern</h3>
            <Select value={aufgabe.status} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="Status wählen" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Card>

          {/* Prüfer & Reparateur (bei Mangel-Aufgaben) bzw. Zugewiesen an */}
          <Card className="p-5 space-y-3">
            {aufgabe.mangelId ? (
              <>
                <h3 className="text-sm font-semibold text-gray-400">Prüfer & Reparateur</h3>
                {aufgabe.pruefer && (
                  <div className="text-sm">
                    <span className="text-gray-500">Prüfer:</span>{" "}
                    <span className="font-medium">{aufgabe.pruefer}</span>
                  </div>
                )}
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Reparateur (zugewiesen an)</label>
                  <Select value={aufgabe.zugewiesen?.id || "__none__"} onValueChange={(v) => handleAssign(v === "__none__" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Mitarbeiter wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nicht zugewiesen</SelectItem>
                      {mitarbeiter.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.firstName} {m.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-sm font-semibold text-gray-400">Zugewiesen an</h3>
                <Select value={aufgabe.zugewiesen?.id || "__none__"} onValueChange={(v) => handleAssign(v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Mitarbeiter wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nicht zugewiesen</SelectItem>
                    {mitarbeiter.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.firstName} {m.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </Card>

          {/* Info */}
          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-400">Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-500">
                <Building2 className="h-4 w-4" />
                <Link href={`/branchenspezifisch/schlosser/${aufgabe.objekt.id}`} className="text-blue-600 hover:underline">
                  {aufgabe.objekt.name}
                </Link>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <User className="h-4 w-4" />
                {customerName}
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <Pencil className="h-4 w-4" />
                Erstellt von {aufgabe.ersteller.firstName} {aufgabe.ersteller.lastName}
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <Calendar className="h-4 w-4" />
                Erstellt am {new Date(aufgabe.createdAt).toLocaleDateString("de-DE")}
              </div>
              {aufgabe.faelligAm && (
                <div className={`flex items-center gap-2 ${isOverdue ? "text-red-600 font-medium" : "text-gray-500"}`}>
                  <AlertTriangle className="h-4 w-4" />
                  Fällig: {new Date(aufgabe.faelligAm).toLocaleDateString("de-DE")}
                </div>
              )}
              {aufgabe.erledigtAm && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Erledigt am {new Date(aufgabe.erledigtAm).toLocaleDateString("de-DE")}
                </div>
              )}
              <div className="pt-1">
                <Badge variant="outline">{TYP_LABELS[aufgabe.typ] || aufgabe.typ}</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
