"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Settings,
  Save,
  DoorOpen,
  Calendar,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const ELEMENT_TYPEN = [
  "TUER", "FENSTER", "TOR", "GELAENDER", "ZAUN",
  "SCHLOSS", "FLUCHTWEG", "BRANDSCHUTZTUER", "SONSTIGES",
] as const;

const TYP_LABELS: Record<string, string> = {
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

interface PruefConfig {
  id: string;
  elementTyp: string;
  intervallMonate: number;
  vorlaufTage: number;
  pflicht: boolean;
  bezeichnung: string | null;
}

const DEFAULT_CONFIGS: PruefConfig[] = ELEMENT_TYPEN.map((typ, i) => ({
  id: `default-${typ}`,
  elementTyp: typ,
  intervallMonate: 12,
  vorlaufTage: 30,
  pflicht: true,
  bezeichnung: null,
}));

export default function SchlosserEinstellungenPage() {
  const [configs, setConfigs] = useState<PruefConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    const res = await fetch("/api/schlosser/einstellungen/pruef-config", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setConfigs(Array.isArray(data) ? data : []);
    } else {
      setLoadError("Konfiguration konnte nicht geladen werden.");
      setConfigs(DEFAULT_CONFIGS);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(c: PruefConfig) {
    if (c.id.startsWith("default-")) {
      setLoadError("Bitte laden Sie die Seite neu, um die Konfiguration zu initialisieren.");
      return;
    }
    setSaving(c.id);
    const res = await fetch("/api/schlosser/einstellungen/pruef-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: c.id,
        intervallMonate: c.intervallMonate,
        vorlaufTage: c.vorlaufTage,
        pflicht: c.pflicht,
        bezeichnung: c.bezeichnung,
      }),
    });
    setSaving(null);
    if (res.ok) load();
    else setLoadError("Speichern fehlgeschlagen. Bitte erneut versuchen.");
  }

  function updateConfig(id: string, patch: Partial<PruefConfig>) {
    setConfigs((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/branchenspezifisch/schlosser">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zurück
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Schlosser – Einstellungen</h1>
            <p className="text-sm text-gray-500">
              Prüfintervalle und Pflichtprüfungen für Elementtypen festlegen
            </p>
          </div>
        </div>
      </div>

      <Card className="p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
          <DoorOpen className="h-5 w-5" />
          Prüfintervalle pro Elementtyp
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Legen Sie fest, in welchen Abständen die jeweiligen Elemente geprüft werden müssen, wie viele Tage vor der nächsten Prüfung Objekte/Elemente angezeigt werden, und ob die Prüfung verpflichtend ist.
        </p>

        {loadError && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <span>{loadError}</span>
            <Button variant="outline" size="sm" onClick={() => load()}>
              Erneut laden
            </Button>
          </div>
        )}

        <div className="space-y-4">
          {configs.map((c) => (
            <div
              key={c.id}
              className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                  <DoorOpen className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {TYP_LABELS[c.elementTyp] || c.elementTyp}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant={c.pflicht ? "default" : "outline"}
                      className={c.pflicht ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}
                    >
                      {c.pflicht ? (
                        <>
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Pflicht
                        </>
                      ) : (
                        <>
                          <XCircle className="mr-1 h-3 w-3" />
                          Optional
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <label className="text-sm font-medium text-gray-700">Intervall (Monate)</label>
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={c.intervallMonate}
                    onChange={(e) =>
                      updateConfig(c.id, {
                        intervallMonate: parseInt(e.target.value) || 12,
                      })
                    }
                    className="w-20"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Vorlauf (Tage)</label>
                  <Input
                    type="number"
                    min={0}
                    max={365}
                    value={c.vorlaufTage ?? 30}
                    onChange={(e) =>
                      updateConfig(c.id, {
                        vorlaufTage: parseInt(e.target.value) || 30,
                      })
                    }
                    className="w-20"
                    title="Wie viele Tage vor der nächsten Prüfung soll das Objekt/Element angezeigt werden?"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={c.pflicht}
                      onChange={(e) => updateConfig(c.id, { pflicht: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Prüfung erforderlich</span>
                  </label>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSave(c)}
                  disabled={saving === c.id || c.id.startsWith("default-")}
                  title={c.id.startsWith("default-") ? "Laden Sie die Seite neu" : undefined}
                >
                  {saving === c.id ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Speichern...
                    </span>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Speichern
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-xs text-gray-400">
          Hinweis: Das Intervall wird bei der nächsten Prüfung verwendet, um das Fälligkeitsdatum zu berechnen.
        </p>
      </Card>
    </div>
  );
}
