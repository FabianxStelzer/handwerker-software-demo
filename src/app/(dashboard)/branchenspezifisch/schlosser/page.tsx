"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  Building2,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wrench,
  ChevronRight,
  DoorOpen,
  X,
  ClipboardList,
  MapPin,
  Navigation,
  Settings,
} from "lucide-react";

interface Objekt {
  id: string;
  name: string;
  street: string | null;
  zip: string | null;
  city: string | null;
  status: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    company: string | null;
    type: string;
  };
  elemente: {
    id: string;
    typ: string;
    bezeichnung: string;
    pruefungen: {
      datum: string;
      ergebnis: string;
      maengel: { id: string; behoben: boolean }[];
    }[];
  }[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  OK: { label: "Alles OK", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  WARTUNG_FAELLIG: { label: "Wartung offen", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  REPARATUR_NOETIG: { label: "Reparatur nötig", color: "bg-orange-100 text-orange-800", icon: Wrench },
  NACHPRUEFUNG_OFFEN: { label: "Nachprüfung offen", color: "bg-blue-100 text-blue-800", icon: ClipboardList },
  PRUEFUNG_UEBERFAELLIG: { label: "Prüfung überfällig", color: "bg-red-100 text-red-800", icon: AlertTriangle },
};

const ELEMENT_TYP_LABELS: Record<string, string> = {
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

export default function SchlosserPage() {
  const [objekte, setObjekte] = useState<Objekt[]>([]);
  const [customers, setCustomers] = useState<{ id: string; firstName: string; lastName: string; company: string | null; type: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("alle");
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/schlosser/objekte?search=${encodeURIComponent(search)}`);
      const text = await res.text();
      const data = text ? JSON.parse(text) : [];
      setObjekte(Array.isArray(data) ? data : []);
    } catch {
      setObjekte([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    fetch("/api/kunden").then((r) => r.json()).then(setCustomers);
  }, []);

  const filtered = filterStatus === "alle"
    ? objekte
    : objekte.filter((o) => o.status === filterStatus);

  const stats = {
    total: objekte.length,
    ok: objekte.filter((o) => o.status === "OK").length,
    wartung: objekte.filter((o) => o.status === "WARTUNG_FAELLIG").length,
    reparatur: objekte.filter((o) => o.status === "REPARATUR_NOETIG").length,
    nachpruefung: objekte.filter((o) => o.status === "NACHPRUEFUNG_OFFEN").length,
    ueberfaellig: objekte.filter((o) => o.status === "PRUEFUNG_UEBERFAELLIG").length,
    elemente: objekte.reduce((sum, o) => sum + o.elemente.length, 0),
  };

  function getLetztePruefung(objekt: Objekt) {
    let latest: string | null = null;
    for (const el of objekt.elemente) {
      if (el.pruefungen.length > 0) {
        const d = el.pruefungen[0].datum;
        if (!latest || d > latest) latest = d;
      }
    }
    return latest;
  }

  function getOffeneMaengel(objekt: Objekt) {
    let count = 0;
    for (const el of objekt.elemente) {
      for (const p of el.pruefungen) {
        count += p.maengel.filter((m) => !m.behoben).length;
      }
    }
    return count;
  }

  const { data: session } = useSession();
  const userId = (session?.user as { id?: string })?.id;

  const [routeSelection, setRouteSelection] = useState(false);
  const [selectedForRoute, setSelectedForRoute] = useState<Set<string>>(new Set());
  const [routeDialogOpen, setRouteDialogOpen] = useState(false);
  const [routeStart, setRouteStart] = useState<"firma" | "zuhause">("firma");
  const [routeEnd, setRouteEnd] = useState<"firma" | "zuhause">("zuhause");
  const [companyAddress, setCompanyAddress] = useState<{ street: string; zip: string; city: string } | null>(null);
  const [userAddress, setUserAddress] = useState<{ street: string; zip: string; city: string } | null>(null);

  useEffect(() => {
    if (routeDialogOpen) {
      fetch("/api/settings/company")
        .then((r) => r.json())
        .then((c) => {
          if (c.street && c.city) setCompanyAddress({ street: c.street, zip: c.zip || "", city: c.city });
          else setCompanyAddress(null);
        });
      if (userId) {
        fetch(`/api/mitarbeiter/${userId}`)
          .then((r) => r.json())
          .then((u) => {
            if (u.street && u.city) setUserAddress({ street: u.street, zip: u.zip || "", city: u.city });
            else setUserAddress(null);
          });
      } else setUserAddress(null);
    }
  }, [routeDialogOpen, userId]);

  function formatAddress(a: { street: string; zip: string; city: string }) {
    return `${a.street}, ${a.zip} ${a.city}`.trim();
  }

  function planRoute(selectedObjekte: Objekt[], originAddr: string, destAddr: string) {
    const waypoints = selectedObjekte
      .filter((o) => o.street && o.city)
      .map((o) => `${o.street}, ${o.zip || ""} ${o.city}`.trim());

    if (waypoints.length === 0) {
      window.open(`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originAddr)}&destination=${encodeURIComponent(destAddr)}&travelmode=driving`, "_blank");
      return;
    }

    const stops = waypoints.join("|");
    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originAddr)}&destination=${encodeURIComponent(destAddr)}&waypoints=${encodeURIComponent(stops)}&travelmode=driving`;
    window.open(url, "_blank");
  }

  function toggleRouteSelection(objektId: string) {
    setSelectedForRoute((prev) => {
      const next = new Set(prev);
      if (next.has(objektId)) next.delete(objektId);
      else next.add(objektId);
      return next;
    });
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch("/api/schlosser/objekte", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    setDialogOpen(false);
    load();
  }

  function customerDisplayName(c: { firstName: string; lastName: string; company: string | null; type: string }) {
    return c.type === "GESCHAEFT" && c.company ? c.company : `${c.firstName} ${c.lastName}`;
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
          <Link href="/branchenspezifisch">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zurück
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Schlosser – Prüfmanagement</h1>
            <p className="text-sm text-gray-500">Objekte, Elemente & jährliche Prüfungen verwalten</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {routeSelection ? (
            <>
              <Button
                variant="outline"
                onClick={() => { setRouteSelection(false); setSelectedForRoute(new Set()); }}
              >
                Abbrechen
              </Button>
              <Button
                disabled={selectedForRoute.size === 0}
                onClick={() => setRouteDialogOpen(true)}
              >
                <Navigation className="mr-2 h-4 w-4" />
                Route starten ({selectedForRoute.size})
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setRouteSelection(true)} disabled={filtered.filter((o) => o.street).length === 0}>
                <MapPin className="mr-2 h-4 w-4" />
                Route planen
              </Button>
              <Link href="/branchenspezifisch/schlosser/aufgaben">
                <Button variant="outline">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Aufgaben
                </Button>
              </Link>
              <Link href="/branchenspezifisch/schlosser/einstellungen">
                <Button variant="outline">
                  <Settings className="mr-2 h-4 w-4" />
                  Einstellungen
                </Button>
              </Link>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Neues Objekt
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <Card
          className={`p-4 text-center cursor-pointer transition-all hover:shadow-md ${filterStatus === "alle" ? "ring-2 ring-blue-400 bg-blue-50" : "hover:ring-2 hover:ring-blue-300"}`}
          onClick={() => setFilterStatus("alle")}
        >
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500">Objekte gesamt</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.elemente}</p>
          <p className="text-xs text-gray-500">Elemente</p>
        </Card>
        <Card
          className={`p-4 text-center cursor-pointer transition-all hover:shadow-md ${filterStatus === "OK" ? "ring-2 ring-green-400 bg-green-50" : "hover:ring-2 hover:ring-green-300"}`}
          onClick={() => setFilterStatus(filterStatus === "OK" ? "alle" : "OK")}
        >
          <p className="text-2xl font-bold text-green-600">{stats.ok}</p>
          <p className="text-xs text-gray-500">OK</p>
        </Card>
        <Card
          className={`p-4 text-center cursor-pointer transition-all hover:shadow-md ${filterStatus === "WARTUNG_FAELLIG" ? "ring-2 ring-yellow-400 bg-yellow-50" : "hover:ring-2 hover:ring-yellow-300"}`}
          onClick={() => setFilterStatus(filterStatus === "WARTUNG_FAELLIG" ? "alle" : "WARTUNG_FAELLIG")}
        >
          <p className="text-2xl font-bold text-yellow-600">{stats.wartung}</p>
          <p className="text-xs text-gray-500">Wartung offen</p>
        </Card>
        <Card
          className={`p-4 text-center cursor-pointer transition-all hover:shadow-md ${filterStatus === "REPARATUR_NOETIG" ? "ring-2 ring-orange-400 bg-orange-50" : "hover:ring-2 hover:ring-orange-300"}`}
          onClick={() => setFilterStatus(filterStatus === "REPARATUR_NOETIG" ? "alle" : "REPARATUR_NOETIG")}
        >
          <p className="text-2xl font-bold text-orange-600">{stats.reparatur}</p>
          <p className="text-xs text-gray-500">Reparatur</p>
        </Card>
        <Card
          className={`p-4 text-center cursor-pointer transition-all hover:shadow-md ${filterStatus === "NACHPRUEFUNG_OFFEN" ? "ring-2 ring-blue-400 bg-blue-50" : "hover:ring-2 hover:ring-blue-300"}`}
          onClick={() => setFilterStatus(filterStatus === "NACHPRUEFUNG_OFFEN" ? "alle" : "NACHPRUEFUNG_OFFEN")}
        >
          <p className="text-2xl font-bold text-blue-600">{stats.nachpruefung}</p>
          <p className="text-xs text-gray-500">Nachprüfung</p>
        </Card>
        <Card
          className={`p-4 text-center cursor-pointer transition-all hover:shadow-md ${filterStatus === "PRUEFUNG_UEBERFAELLIG" ? "ring-2 ring-red-400 bg-red-50" : "hover:ring-2 hover:ring-red-300"}`}
          onClick={() => setFilterStatus(filterStatus === "PRUEFUNG_UEBERFAELLIG" ? "alle" : "PRUEFUNG_UEBERFAELLIG")}
        >
          <p className="text-2xl font-bold text-red-600">{stats.ueberfaellig}</p>
          <p className="text-xs text-gray-500">Überfällig</p>
        </Card>
      </div>

      {/* Aktiver Filter-Hinweis */}
      {filterStatus !== "alle" && (
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700">
          <span>Filter aktiv: <strong>{STATUS_CONFIG[filterStatus]?.label || filterStatus}</strong></span>
          <span className="text-blue-400">·</span>
          <span>{filtered.length} von {objekte.length} Objekte{objekte.length !== 1 ? "n" : ""}</span>
          <button onClick={() => setFilterStatus("alle")} className="ml-auto flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium hover:bg-blue-200 transition-colors">
            <X className="h-3 w-3" />
            Filter zurücksetzen
          </button>
        </div>
      )}

      {/* Suche & Filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Objekt, Kunde, Adresse suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Status filtern" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Status</SelectItem>
            <SelectItem value="OK">OK</SelectItem>
            <SelectItem value="WARTUNG_FAELLIG">Wartung offen</SelectItem>
            <SelectItem value="REPARATUR_NOETIG">Reparatur nötig</SelectItem>
            <SelectItem value="NACHPRUEFUNG_OFFEN">Nachprüfung offen</SelectItem>
            <SelectItem value="PRUEFUNG_UEBERFAELLIG">Prüfung überfällig</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Objekt-Liste */}
      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-gray-400">
          <Building2 className="h-12 w-12" />
          <p className="mt-3 text-sm">
            {objekte.length === 0 ? "Noch keine Objekte angelegt" : "Keine Objekte mit diesem Filter"}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((objekt) => {
            const statusConf = STATUS_CONFIG[objekt.status] || STATUS_CONFIG.OK;
            const StatusIcon = statusConf.icon;
            const letztePruefung = getLetztePruefung(objekt);
            const offeneMaengel = getOffeneMaengel(objekt);

            const cardContent = (
              <Card className={`flex items-center gap-4 p-4 transition-all hover:shadow-md cursor-pointer ${routeSelection && selectedForRoute.has(objekt.id) ? "ring-2 ring-blue-500 bg-blue-50/50" : "hover:-translate-y-0.5"}`}>
                {routeSelection && (
                  <input
                    type="checkbox"
                    checked={selectedForRoute.has(objekt.id)}
                    onChange={() => toggleRouteSelection(objekt.id)}
                    className="h-5 w-5 shrink-0 rounded border-gray-300 text-blue-600"
                    disabled={!objekt.street}
                  />
                )}
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${statusConf.color}`}>
                  <StatusIcon className="h-6 w-6" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 truncate">{objekt.name}</h3>
                    <Badge variant="outline" className={`shrink-0 ${statusConf.color}`}>
                      {statusConf.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">
                    {customerDisplayName(objekt.customer)}
                    {objekt.street && ` · ${objekt.street}, ${objekt.zip} ${objekt.city}`}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <DoorOpen className="h-3 w-3" />
                      {objekt.elemente.length} Element{objekt.elemente.length !== 1 ? "e" : ""}
                    </span>
                    {letztePruefung && (
                      <span>
                        Letzte Prüfung: {new Date(letztePruefung).toLocaleDateString("de-DE")}
                      </span>
                    )}
                    {offeneMaengel > 0 && (
                      <span className="text-red-500 font-medium">
                        {offeneMaengel} offene{offeneMaengel === 1 ? "r Mangel" : " Mängel"}
                      </span>
                    )}
                    {!objekt.street && routeSelection && (
                      <span className="text-amber-500">Keine Adresse hinterlegt</span>
                    )}
                  </div>
                </div>

                {!routeSelection && <ChevronRight className="h-5 w-5 shrink-0 text-gray-300" />}
              </Card>
            );

            return routeSelection ? (
              <div key={objekt.id} onClick={() => objekt.street && toggleRouteSelection(objekt.id)}>
                {cardContent}
              </div>
            ) : (
              <Link key={objekt.id} href={`/branchenspezifisch/schlosser/${objekt.id}`}>
                {cardContent}
              </Link>
            );
          })}
        </div>
      )}

      {/* Route-Start/Ende-Dialog */}
      {routeDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Route starten</h2>
              <button onClick={() => setRouteDialogOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Wählen Sie Start- und Zielpunkt. Die ausgewählten Objekte werden als Zwischenstopps eingetragen.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Startpunkt (Abfahrt)</label>
                <Select value={routeStart} onValueChange={(v: "firma" | "zuhause") => setRouteStart(v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="firma">
                      Firma {companyAddress ? `(${companyAddress.city})` : "(nicht hinterlegt)"}
                    </SelectItem>
                    <SelectItem value="zuhause">
                      Zuhause (Mitarbeiter) {userAddress ? `(${userAddress.city})` : "(nicht hinterlegt)"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Zielpunkt (Ankunft)</label>
                <Select value={routeEnd} onValueChange={(v: "firma" | "zuhause") => setRouteEnd(v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="firma">
                      Firma {companyAddress ? `(${companyAddress.city})` : "(nicht hinterlegt)"}
                    </SelectItem>
                    <SelectItem value="zuhause">
                      Zuhause (Mitarbeiter) {userAddress ? `(${userAddress.city})` : "(nicht hinterlegt)"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {((routeStart === "firma" && !companyAddress) || (routeStart === "zuhause" && !userAddress) ||
                (routeEnd === "firma" && !companyAddress) || (routeEnd === "zuhause" && !userAddress)) && (
                <p className="text-sm text-amber-600">
                  Bitte hinterlegen Sie die fehlende Adresse in den Einstellungen (Profil bzw. Firma).
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setRouteDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button
                disabled={
                  (routeStart === "firma" && !companyAddress) || (routeStart === "zuhause" && !userAddress) ||
                  (routeEnd === "firma" && !companyAddress) || (routeEnd === "zuhause" && !userAddress)
                }
                onClick={() => {
                  const originAddr = routeStart === "firma" && companyAddress ? formatAddress(companyAddress) : (userAddress ? formatAddress(userAddress) : "");
                  const destAddr = routeEnd === "firma" && companyAddress ? formatAddress(companyAddress) : (userAddress ? formatAddress(userAddress) : "");
                  const selected = filtered.filter((o) => selectedForRoute.has(o.id));
                  planRoute(selected, originAddr, destAddr);
                  setRouteDialogOpen(false);
                  setRouteSelection(false);
                  setSelectedForRoute(new Set());
                }}
              >
                <Navigation className="mr-2 h-4 w-4" />
                Route in Google Maps öffnen
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Neues-Objekt-Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Neues Objekt anlegen</h2>
              <button onClick={() => setDialogOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Kunde *</label>
                <Select name="customerId" required>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Kunde wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {customerDisplayName(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Objektname *</label>
                <Input name="name" required placeholder="z.B. Bürogebäude Hauptstraße" className="mt-1" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700">Straße</label>
                  <Input name="street" placeholder="Musterstraße 1" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">PLZ</label>
                  <Input name="zip" placeholder="12345" className="mt-1" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Stadt</label>
                <Input name="city" placeholder="Musterstadt" className="mt-1" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Abbrechen
                </Button>
                <Button type="submit">Anlegen</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
