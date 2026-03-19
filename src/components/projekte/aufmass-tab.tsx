"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Ruler, Plus, ExternalLink, Trash2, ChevronDown, ChevronRight, PackageOpen, Check, FileText, FileSpreadsheet, Download, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/select";

interface AufmassPosition {
  id: string;
  bezeichnung: string;
  menge: number;
  einheit: string;
  einzelpreis: number;
  kategorie: string | null;
  raum: string | null;
  position: number;
}

interface AufmassDatei {
  id: string;
  dateiName: string;
  dateiTyp: string;
  dateiUrl: string;
}

interface Aufmass {
  id: string;
  titel: string;
  beschreibung: string | null;
  status: string;
  positionen: AufmassPosition[];
  dateien: AufmassDatei[];
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [transferring, setTransferring] = useState<string | null>(null);
  const [transferResult, setTransferResult] = useState<{ aufmassId: string; count: number } | null>(null);
  const [selectedPositions, setSelectedPositions] = useState<Set<string>>(new Set());

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

  function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      setSelectedPositions(new Set());
    } else {
      setExpandedId(id);
      setSelectedPositions(new Set());
    }
  }

  function togglePosition(posId: string) {
    setSelectedPositions((prev) => {
      const next = new Set(prev);
      if (next.has(posId)) next.delete(posId);
      else next.add(posId);
      return next;
    });
  }

  function selectAll(aufmass: Aufmass) {
    if (selectedPositions.size === aufmass.positionen.length) {
      setSelectedPositions(new Set());
    } else {
      setSelectedPositions(new Set(aufmass.positionen.map((p) => p.id)));
    }
  }

  async function transferToMaterial(aufmass: Aufmass) {
    const posIds = selectedPositions.size > 0
      ? Array.from(selectedPositions)
      : aufmass.positionen.map((p) => p.id);

    const positions = aufmass.positionen.filter((p) => posIds.includes(p.id));
    if (positions.length === 0) return;

    setTransferring(aufmass.id);
    let count = 0;

    for (const pos of positions) {
      try {
        await fetch(`/api/projekte/${project.id}/materialien`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: pos.bezeichnung,
            description: [pos.kategorie, pos.raum].filter(Boolean).join(" · ") || null,
            unit: pos.einheit || "Stk",
            quantityPlanned: pos.menge,
            pricePerUnit: pos.einzelpreis,
          }),
        });
        count++;
      } catch { /* skip failed */ }
    }

    setTransferring(null);
    setTransferResult({ aufmassId: aufmass.id, count });
    setSelectedPositions(new Set());
    setTimeout(() => setTransferResult(null), 4000);
  }

  function fileIcon(typ: string) {
    if (typ === "pdf") return <FileText className="h-3.5 w-3.5 text-red-500" />;
    if (["xlsx", "xls", "csv"].includes(typ)) return <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />;
    return <FileText className="h-3.5 w-3.5 text-blue-500" />;
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
              <NativeSelect value={assignId} onChange={(e) => setAssignId(e.target.value)} className="text-xs h-8">
                <option value="">Aufmaß zuordnen...</option>
                {allAufmasse.map((a) => (
                  <option key={a.id} value={a.id}>{a.titel}</option>
                ))}
              </NativeSelect>
              <Button size="sm" variant="outline" className="text-xs gap-1.5"
                disabled={!assignId} onClick={() => assignId && assignToProject(assignId)}>
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
            const isExpanded = expandedId === a.id;
            const result = transferResult?.aufmassId === a.id ? transferResult : null;

            return (
              <Card key={a.id}>
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <button className="flex items-center gap-3 text-left" onClick={() => toggleExpand(a.id)}>
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 shrink-0">
                        {isExpanded ? <ChevronDown className="h-5 w-5 text-blue-600" /> : <Ruler className="h-5 w-5 text-blue-600" />}
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
                    </button>
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

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="mt-4 border-t pt-4 space-y-4">
                      {/* Dateien */}
                      {a.dateien.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase mb-2">Dateien</p>
                          <div className="flex flex-wrap gap-2">
                            {a.dateien.map((d) => (
                              <a key={d.id} href={d.dateiUrl} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 rounded-lg border text-xs hover:bg-gray-100 transition-colors">
                                {fileIcon(d.dateiTyp)}
                                <span className="text-gray-700">{d.dateiName}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Positionen */}
                      {a.positionen.length > 0 ? (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-gray-500 uppercase">Positionen ({a.positionen.length})</p>
                            <div className="flex items-center gap-2">
                              <button className="text-[10px] text-blue-600 hover:underline" onClick={() => selectAll(a)}>
                                {selectedPositions.size === a.positionen.length ? "Keine auswählen" : "Alle auswählen"}
                              </button>
                              <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7"
                                onClick={() => transferToMaterial(a)}
                                disabled={transferring === a.id}>
                                {transferring === a.id ? (
                                  <><div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />Übertrage…</>
                                ) : (
                                  <><ArrowRight className="h-3 w-3" />{selectedPositions.size > 0 ? `${selectedPositions.size} als Material übernehmen` : "Alle als Material übernehmen"}</>
                                )}
                              </Button>
                            </div>
                          </div>

                          {result && (
                            <div className="mb-2 px-3 py-2 rounded bg-green-50 text-green-700 text-xs flex items-center gap-1.5">
                              <Check className="h-3.5 w-3.5" />{result.count} Positionen als Projekt-Material übernommen
                            </div>
                          )}

                          <div className="overflow-x-auto border rounded-lg">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-gray-50 text-left text-gray-500">
                                  <th className="p-2 w-8"></th>
                                  <th className="p-2">#</th>
                                  <th className="p-2">Bezeichnung</th>
                                  <th className="p-2">Kategorie</th>
                                  <th className="p-2">Raum</th>
                                  <th className="p-2 text-right">Menge</th>
                                  <th className="p-2">Einheit</th>
                                  <th className="p-2 text-right">EP</th>
                                  <th className="p-2 text-right">Gesamt</th>
                                </tr>
                              </thead>
                              <tbody>
                                {a.positionen.map((p) => (
                                  <tr key={p.id} className={`border-t ${selectedPositions.has(p.id) ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                                    <td className="p-2">
                                      <input type="checkbox" checked={selectedPositions.has(p.id)}
                                        onChange={() => togglePosition(p.id)} className="rounded" />
                                    </td>
                                    <td className="p-2 text-gray-400">{p.position}</td>
                                    <td className="p-2 text-gray-900 font-medium">{p.bezeichnung}</td>
                                    <td className="p-2 text-gray-500">{p.kategorie || "–"}</td>
                                    <td className="p-2 text-gray-500">{p.raum || "–"}</td>
                                    <td className="p-2 text-right text-gray-900">{p.menge}</td>
                                    <td className="p-2 text-gray-500">{p.einheit}</td>
                                    <td className="p-2 text-right text-gray-900">{p.einzelpreis.toFixed(2)} €</td>
                                    <td className="p-2 text-right font-medium text-gray-900">{(p.menge * p.einzelpreis).toFixed(2)} €</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="border-t bg-gray-50 font-bold">
                                  <td colSpan={8} className="p-2 text-right text-gray-700">Gesamt:</td>
                                  <td className="p-2 text-right text-gray-900">{total.toFixed(2)} €</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-xs text-gray-400">
                          Keine Positionen vorhanden. Importiere Dateien im Aufmaß-Bereich.
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
