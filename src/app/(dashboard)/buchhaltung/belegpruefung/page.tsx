"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Upload, FileText, CheckCircle2, XCircle, Clock, Trash2,
  Loader2, AlertTriangle, ChevronDown, ChevronUp, RefreshCw, Search, Plus, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface BelegCheckDoc {
  id: string;
  role: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

interface BelegCheck {
  id: string;
  title: string | null;
  status: "AUSSTEHEND" | "GEPRUEFT" | "FEHLER";
  resultSummary: string | null;
  resultDetails: string | null;
  checkedAt: string | null;
  createdAt: string;
  documents: BelegCheckDoc[];
  createdBy?: { firstName: string; lastName: string } | null;
}

interface ParsedResult {
  status: "ok" | "fehler";
  summary: string;
  positions?: { position: string; doc1Value: string; doc2Value: string; match: boolean; note?: string }[];
  totals?: { doc1Total: string; doc2Total: string; match: boolean; difference?: string } | null;
  issues?: string[];
  rawResponse?: string;
}

const ROLE_OPTIONS = [
  { value: "angebot", label: "Angebot" },
  { value: "rechnung", label: "Rechnung" },
  { value: "lieferschein", label: "Lieferschein" },
  { value: "eingangsrechnung", label: "Eingangsrechnung" },
  { value: "sonstiges", label: "Sonstiges" },
];

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusBadge({ status }: { status: BelegCheck["status"] }) {
  if (status === "GEPRUEFT") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
        <CheckCircle2 className="h-4 w-4" />
        Geprüft – ohne Fehler
      </span>
    );
  }
  if (status === "FEHLER") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
        <XCircle className="h-4 w-4" />
        Fehler gefunden
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">
      <Clock className="h-4 w-4" />
      Ausstehend
    </span>
  );
}

function ResultDetails({ details }: { details: string }) {
  const [open, setOpen] = useState(true);
  let parsed: ParsedResult;
  try {
    parsed = JSON.parse(details);
  } catch {
    return <p className="text-sm text-gray-500">Ergebnis konnte nicht geladen werden.</p>;
  }

  return (
    <div className="mt-4 space-y-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
      >
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        Details {parsed.status === "ok" ? "anzeigen" : "– Unstimmigkeiten"}
      </button>

      {open && (
        <div className="space-y-4">
          {parsed.positions && parsed.positions.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-2 pr-4 text-left font-medium text-gray-600">Position</th>
                    <th className="py-2 pr-4 text-left font-medium text-gray-600">Dokument 1</th>
                    <th className="py-2 pr-4 text-left font-medium text-gray-600">Dokument 2</th>
                    <th className="py-2 pr-4 text-left font-medium text-gray-600">Status</th>
                    <th className="py-2 text-left font-medium text-gray-600">Anmerkung</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.positions.map((pos, i) => (
                    <tr key={i} className={`border-b border-gray-100 ${!pos.match ? "bg-red-50" : ""}`}>
                      <td className="py-2 pr-4 font-medium">{pos.position}</td>
                      <td className="py-2 pr-4">{pos.doc1Value}</td>
                      <td className="py-2 pr-4">{pos.doc2Value}</td>
                      <td className="py-2 pr-4">
                        {pos.match ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </td>
                      <td className="py-2 text-gray-500">{pos.note || "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {parsed.totals && (
            <div className={`rounded-lg p-4 ${parsed.totals.match ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Gesamtbeträge</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Dokument 1: <strong>{parsed.totals.doc1Total}</strong> · Dokument 2: <strong>{parsed.totals.doc2Total}</strong>
                  </p>
                </div>
                <div className="text-right">
                  {parsed.totals.match ? (
                    <span className="text-green-700 font-medium text-sm">Stimmt überein</span>
                  ) : (
                    <span className="text-red-700 font-medium text-sm">Differenz: {parsed.totals.difference}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {parsed.issues && parsed.issues.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
              <p className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" /> Gefundene Probleme
              </p>
              <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
                {parsed.issues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {parsed.rawResponse && (
            <details className="text-xs text-gray-400">
              <summary className="cursor-pointer">Rohe KI-Antwort</summary>
              <pre className="mt-2 whitespace-pre-wrap bg-gray-50 p-3 rounded">{parsed.rawResponse}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

export default function BelegpruefungPage() {
  const { t } = useTranslation();
  const [checks, setChecks] = useState<BelegCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [filePairs, setFilePairs] = useState<{ file: File; role: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadChecks = useCallback(async () => {
    try {
      const res = await fetch("/api/belegpruefung");
      if (res.ok) setChecks(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadChecks(); }, [loadChecks]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    const pairs = newFiles.map((file, i) => ({
      file,
      role: filePairs.length + i === 0 ? "angebot" : "rechnung",
    }));
    setFilePairs((prev) => [...prev, ...pairs]);
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setFilePairs((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRole = (index: number, role: string) => {
    setFilePairs((prev) => prev.map((p, i) => (i === index ? { ...p, role } : p)));
  };

  const handleUploadAndCheck = async () => {
    if (filePairs.length < 2) {
      setError("Bitte mindestens 2 Dokumente hochladen (z.B. Angebot + Rechnung)");
      return;
    }
    setError("");
    setUploading(true);

    try {
      const fd = new FormData();
      if (newTitle) fd.append("title", newTitle);
      for (const pair of filePairs) {
        fd.append("files", pair.file);
        fd.append("roles", pair.role);
      }

      const uploadRes = await fetch("/api/belegpruefung", { method: "POST", body: fd });
      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        setError(err.error || "Upload fehlgeschlagen");
        setUploading(false);
        return;
      }

      const created = await uploadRes.json();
      setUploading(false);
      setChecking(created.id);
      setShowNew(false);
      setNewTitle("");
      setFilePairs([]);

      await loadChecks();

      const checkRes = await fetch("/api/belegpruefung/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkId: created.id }),
      });

      if (!checkRes.ok) {
        const err = await checkRes.json();
        setError(err.error || "Prüfung fehlgeschlagen");
      }

      await loadChecks();
    } catch (err) {
      setError("Netzwerkfehler beim Hochladen");
    } finally {
      setUploading(false);
      setChecking(null);
    }
  };

  const handleRecheck = async (checkId: string) => {
    setChecking(checkId);
    try {
      const res = await fetch("/api/belegpruefung/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkId }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Prüfung fehlgeschlagen");
      }
      await loadChecks();
    } finally {
      setChecking(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Prüfung wirklich löschen?")) return;
    await fetch(`/api/belegpruefung/${id}`, { method: "DELETE" });
    await loadChecks();
  };

  const filtered = checks.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.title?.toLowerCase().includes(s) ||
      c.documents.some((d) => d.fileName.toLowerCase().includes(s)) ||
      c.resultSummary?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("buch.belegpruefung")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("buch.belegpruefungSubtitle")}</p>
        </div>
        <Button onClick={() => setShowNew(!showNew)} className="gap-2">
          <Plus className="h-4 w-4" />
          {t("buch.neuePruefung")}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Fehler</p>
            <p>{error}</p>
          </div>
          <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {showNew && (
        <Card className="p-6 space-y-5 border-2 border-dashed border-gray-300">
          <h2 className="text-lg font-semibold text-gray-900">{t("buch.neuePruefung")}</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("buch.pruefungTitel")}</label>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="z.B. Projekt Müller – Angebot vs. Rechnung"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t("buch.dokumenteHochladen")}</label>
            <div className="space-y-3">
              {filePairs.map((pair, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                  <FileText className="h-5 w-5 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-700 truncate flex-1">{pair.file.name}</span>
                  <span className="text-xs text-gray-400">{formatFileSize(pair.file.size)}</span>
                  <select
                    value={pair.role}
                    onChange={(e) => updateRole(i, e.target.value)}
                    className="text-sm border border-gray-200 rounded-md px-2 py-1 bg-white"
                  >
                    {ROLE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-6 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors">
              <Upload className="h-5 w-5" />
              <span>{t("buch.dokumenteAuswaehlen")}</span>
              <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileSelect} />
            </label>
            <p className="mt-1 text-xs text-gray-400">PDF, JPG oder PNG – z.B. Angebot und zugehörige Rechnung</p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleUploadAndCheck}
              disabled={filePairs.length < 2 || uploading}
              className="gap-2"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {uploading ? "Wird hochgeladen..." : t("buch.hochladenUndPruefen")}
            </Button>
            <Button variant="outline" onClick={() => { setShowNew(false); setFilePairs([]); setNewTitle(""); }}>
              {t("common.abbrechen")}
            </Button>
          </div>
        </Card>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("buch.pruefungenSuchen")}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> {t("common.laden")}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">{t("buch.keinePruefungen")}</p>
          <p className="text-sm text-gray-400 mt-1">{t("buch.keinePruefungenHinweis")}</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((check) => (
            <Card key={check.id} className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{check.title || "Belegprüfung"}</h3>
                    <StatusBadge status={check.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                    <span>{new Date(check.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    {check.createdBy && (
                      <span>· {check.createdBy.firstName} {check.createdBy.lastName}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {check.documents.map((doc) => (
                      <a
                        key={doc.id}
                        href={`/api/uploads/${doc.fileUrl.replace(/^\/uploads\//, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-200 transition-colors"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span className="font-medium capitalize">{doc.role}:</span> {doc.fileName}
                      </a>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {checking === check.id ? (
                    <span className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" /> KI prüft...
                    </span>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" onClick={() => handleRecheck(check.id)} className="gap-1.5">
                        <RefreshCw className="h-3.5 w-3.5" />
                        {check.status === "AUSSTEHEND" ? t("buch.jetztPruefen") : t("buch.erneutPruefen")}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(check.id)} className="text-red-500 hover:text-red-700 hover:border-red-300">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {check.resultSummary && (
                <div className={`mt-4 rounded-lg p-4 ${check.status === "GEPRUEFT" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                  <p className={`text-sm font-medium ${check.status === "GEPRUEFT" ? "text-green-800" : "text-red-800"}`}>
                    {check.status === "GEPRUEFT" ? (
                      <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {check.resultSummary}</span>
                    ) : (
                      <span className="flex items-center gap-2"><XCircle className="h-4 w-4" /> {check.resultSummary}</span>
                    )}
                  </p>
                </div>
              )}

              {check.resultDetails && <ResultDetails details={check.resultDetails} />}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
