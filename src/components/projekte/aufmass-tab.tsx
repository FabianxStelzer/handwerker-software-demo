"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Ruler, Plus, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/select";

interface Aufmass {
  id: string;
  titel: string;
  beschreibung: string | null;
  status: string;
  positionen: { menge: number; einzelpreis: number }[];
  dateien: { id: string; dateiName: string; dateiTyp: string }[];
  createdAt: string;
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "success" | "warning" }> = {
  ENTWURF: { label: "Entwurf", variant: "secondary" },
  IN_BEARBEITUNG: { label: "In Bearbeitung", variant: "warning" },
  FERTIG: { label: "Fertig", variant: "success" },
};

export function AufmassTab({ project }: { project: any }) {
  const [aufmasse, setAufmasse] = useState<Aufmass[]>([]);
  const [allAufmasse, setAllAufmasse] = useState<Aufmass[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignId, setAssignId] = useState("");

  const load = useCallback(async () => {
    const [projRes, allRes] = await Promise.all([
      fetch(`/api/aufmass?projectId=${project.id}`),
      fetch("/api/aufmass"),
    ]);
    if (projRes.ok) setAufmasse(await projRes.json());
    if (allRes.ok) {
      const all = await allRes.json();
      setAllAufmasse(all.filter((a: any) => !a.projectId));
    }
    setLoading(false);
  }, [project.id]);

  useEffect(() => { load(); }, [load]);

  async function assignToProject(aufmassId: string) {
    await fetch("/api/aufmass", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "assign", aufmassId, projectId: project.id }),
    });
    setAssignId("");
    await load();
  }

  async function removeFromProject(aufmassId: string) {
    await fetch("/api/aufmass", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "assign", aufmassId, projectId: null }),
    });
    await load();
  }

  if (loading) {
    return <div className="flex justify-center py-10"><div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Aufmaße</h3>
        <div className="flex items-center gap-2">
          {allAufmasse.length > 0 && (
            <div className="flex items-center gap-2">
              <NativeSelect
                value={assignId}
                onChange={(e) => setAssignId(e.target.value)}
                className="text-xs h-8"
              >
                <option value="">Aufmaß zuordnen...</option>
                {allAufmasse.map((a) => (
                  <option key={a.id} value={a.id}>{a.titel}</option>
                ))}
              </NativeSelect>
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1.5"
                disabled={!assignId}
                onClick={() => assignId && assignToProject(assignId)}
              >
                <Plus className="h-3.5 w-3.5" />Zuordnen
              </Button>
            </div>
          )}
          <Link href="/aufmass">
            <Button size="sm" className="gap-1.5 text-xs">
              <Ruler className="h-3.5 w-3.5" />Neues Aufmaß
            </Button>
          </Link>
        </div>
      </div>

      {aufmasse.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Ruler className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Noch keine Aufmaße diesem Projekt zugeordnet</p>
            <p className="text-xs text-gray-400 mt-1">Erstelle ein neues Aufmaß oder ordne ein bestehendes zu</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {aufmasse.map((a) => {
            const sc = statusLabels[a.status] || statusLabels.ENTWURF;
            const total = a.positionen.reduce((s, p) => s + p.menge * p.einzelpreis, 0);
            return (
              <Card key={a.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                        <Ruler className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-900">{a.titel}</p>
                          <Badge variant={sc.variant} className="text-[10px]">{sc.label}</Badge>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {a.positionen.length} Positionen · {a.dateien.length} Dateien · {total.toFixed(2)} €
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href="/aufmass">
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                          <ExternalLink className="h-3 w-3" />Öffnen
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => removeFromProject(a.id)} title="Zuordnung entfernen">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
