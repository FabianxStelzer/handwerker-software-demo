"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Plus, FileSignature, Trash2, Edit2, Copy, Eye, ChevronLeft, GripVertical,
  Type, Heading1, Columns3, Minus, MoveVertical, Image, Table, PenLine,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, X, Save,
  ChevronUp, ChevronDown,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translations";

// ─── Block Types ──────────────────────────────────

interface TextStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  color?: string;
  align?: "left" | "center" | "right";
}

interface HeadingBlock {
  type: "heading";
  id: string;
  content: string;
  level: 1 | 2 | 3;
  style: TextStyle;
}

interface TextBlock {
  type: "text";
  id: string;
  content: string;
  style: TextStyle;
}

interface ColumnBlock {
  type: "columns";
  id: string;
  columns: number;
  backgroundColor: string;
  cells: { content: string; style: TextStyle }[];
}

interface DividerBlock {
  type: "divider";
  id: string;
  thickness: number;
  color: string;
}

interface SpacerBlock {
  type: "spacer";
  id: string;
  height: number;
}

interface ImageBlock {
  type: "image";
  id: string;
  src: string;
  alt: string;
  width: number;
}

interface SignatureBlock {
  type: "signature";
  id: string;
  label: string;
}

type ContentBlock = HeadingBlock | TextBlock | ColumnBlock | DividerBlock | SpacerBlock | ImageBlock | SignatureBlock;

interface Agreement {
  id: string;
  title: string;
  status: string;
  isTemplate: boolean;
  customerId: string | null;
  customer: { id: string; firstName: string; lastName: string; company: string | null } | null;
  projectId: string | null;
  project: { id: string; name: string; projectNumber: string | null } | null;
  blocks: string | null;
  createdAt: string;
  updatedAt: string;
}

function uid() { return Math.random().toString(36).slice(2, 10); }

const STATUS_MAP: Record<string, { tKey: TranslationKey; color: string }> = {
  ENTWURF: { tKey: "vb.entwurf", color: "bg-gray-100 text-gray-700" },
  AKTIV: { tKey: "vb.aktiv", color: "bg-green-100 text-green-700" },
  ABGESCHLOSSEN: { tKey: "vb.abgeschlossen", color: "bg-blue-100 text-blue-700" },
  GEKUENDIGT: { tKey: "vb.gekuendigt", color: "bg-red-100 text-red-700" },
};

function createBlock(type: string): ContentBlock {
  switch (type) {
    case "heading": return { type: "heading", id: uid(), content: "", level: 1, style: { fontSize: 24, color: "#212f46", align: "left" } };
    case "text": return { type: "text", id: uid(), content: "", style: { fontSize: 14, color: "#333333", align: "left" } };
    case "columns": return { type: "columns", id: uid(), columns: 2, backgroundColor: "transparent", cells: [{ content: "", style: { fontSize: 14, color: "#333", align: "left" } }, { content: "", style: { fontSize: 14, color: "#333", align: "left" } }] };
    case "divider": return { type: "divider", id: uid(), thickness: 1, color: "#d1d5db" };
    case "spacer": return { type: "spacer", id: uid(), height: 32 };
    case "image": return { type: "image", id: uid(), src: "", alt: "", width: 100 };
    case "signature": return { type: "signature", id: uid(), label: "Unterschrift" };
    default: return { type: "text", id: uid(), content: "", style: { fontSize: 14, color: "#333", align: "left" } };
  }
}

// ─── Style Toolbar ────────────────────────────────

function StyleToolbar({ style, onChange }: { style: TextStyle; onChange: (s: TextStyle) => void }) {
  return (
    <div className="flex items-center gap-1 flex-wrap bg-gray-50 rounded-lg p-1.5 border">
      <button onClick={() => onChange({ ...style, bold: !style.bold })} title="Fett"
        className={`p-1.5 rounded ${style.bold ? "bg-[#9eb552] text-white" : "hover:bg-gray-200"}`}><Bold className="h-3.5 w-3.5" /></button>
      <button onClick={() => onChange({ ...style, italic: !style.italic })} title="Kursiv"
        className={`p-1.5 rounded ${style.italic ? "bg-[#9eb552] text-white" : "hover:bg-gray-200"}`}><Italic className="h-3.5 w-3.5" /></button>
      <button onClick={() => onChange({ ...style, underline: !style.underline })} title="Unterstrichen"
        className={`p-1.5 rounded ${style.underline ? "bg-[#9eb552] text-white" : "hover:bg-gray-200"}`}><Underline className="h-3.5 w-3.5" /></button>
      <div className="w-px h-5 bg-gray-300 mx-1" />
      <button onClick={() => onChange({ ...style, align: "left" })}
        className={`p-1.5 rounded ${style.align === "left" || !style.align ? "bg-[#9eb552] text-white" : "hover:bg-gray-200"}`}><AlignLeft className="h-3.5 w-3.5" /></button>
      <button onClick={() => onChange({ ...style, align: "center" })}
        className={`p-1.5 rounded ${style.align === "center" ? "bg-[#9eb552] text-white" : "hover:bg-gray-200"}`}><AlignCenter className="h-3.5 w-3.5" /></button>
      <button onClick={() => onChange({ ...style, align: "right" })}
        className={`p-1.5 rounded ${style.align === "right" ? "bg-[#9eb552] text-white" : "hover:bg-gray-200"}`}><AlignRight className="h-3.5 w-3.5" /></button>
      <div className="w-px h-5 bg-gray-300 mx-1" />
      <label className="flex items-center gap-1 text-xs text-gray-500">
        Größe
        <input type="number" min={8} max={72} value={style.fontSize || 14}
          onChange={e => onChange({ ...style, fontSize: +e.target.value })}
          className="w-12 h-7 rounded border text-center text-xs" />
      </label>
      <label className="flex items-center gap-1 text-xs text-gray-500">
        Farbe
        <input type="color" value={style.color || "#333333"}
          onChange={e => onChange({ ...style, color: e.target.value })}
          className="w-7 h-7 rounded border cursor-pointer" />
      </label>
    </div>
  );
}

function textStyleToCss(s: TextStyle): React.CSSProperties {
  return {
    fontWeight: s.bold ? "bold" : "normal",
    fontStyle: s.italic ? "italic" : "normal",
    textDecoration: s.underline ? "underline" : "none",
    fontSize: `${s.fontSize || 14}px`,
    color: s.color || "#333",
    textAlign: s.align || "left",
  };
}

// ─── Main Component ───────────────────────────────

export default function VereinbarungenPage() {
  const { t } = useTranslation();
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "edit" | "preview">("list");
  const [listTab, setListTab] = useState<"vereinbarungen" | "vorlagen">("vereinbarungen");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("ENTWURF");
  const [isTemplate, setIsTemplate] = useState(false);
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [customers, setCustomers] = useState<{ id: string; firstName: string; lastName: string; company: string | null }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string; projectNumber: string | null }[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [aRes, cRes, pRes] = await Promise.all([
      fetch("/api/vereinbarungen"), fetch("/api/kunden"), fetch("/api/projekte"),
    ]);
    if (aRes.ok) setAgreements(await aRes.json());
    if (cRes.ok) { const d = await cRes.json(); setCustomers(Array.isArray(d) ? d : d.customers || []); }
    if (pRes.ok) { const d = await pRes.json(); setProjects(Array.isArray(d) ? d : d.projects || []); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function openEditor(a?: Agreement, asTemplate?: boolean) {
    if (a) {
      setCurrentId(a.id);
      setTitle(a.title);
      setStatus(a.status);
      setIsTemplate(a.isTemplate);
      setCustomerId(a.customerId || "");
      setProjectId(a.projectId || "");
      try { setBlocks(JSON.parse(a.blocks || "[]")); } catch { setBlocks([]); }
    } else {
      setCurrentId(null);
      setTitle(asTemplate ? "Neue Vorlage" : "Neue Vereinbarung");
      setStatus("ENTWURF");
      setIsTemplate(asTemplate || false);
      setCustomerId("");
      setProjectId("");
      setBlocks([]);
    }
    setSelectedBlock(null);
    setView("edit");
  }

  async function save() {
    setSaving(true);
    const body = { title, status, isTemplate, customerId: customerId || null, projectId: projectId || null, blocks: JSON.stringify(blocks) };
    const url = currentId ? `/api/vereinbarungen/${currentId}` : "/api/vereinbarungen";
    const res = await fetch(url, { method: currentId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      const saved = await res.json();
      if (!currentId) setCurrentId(saved.id);
      setMsg(t("vb.speichern") + " ✓");
      fetchAll();
      setTimeout(() => setMsg(""), 2000);
    }
    setSaving(false);
  }

  async function deleteAgreement(id: string) {
    if (!confirm(t("vb.loeschen") + "?")) return;
    await fetch(`/api/vereinbarungen/${id}`, { method: "DELETE" });
    if (currentId === id) setView("list");
    fetchAll();
  }

  async function duplicate(a: Agreement) {
    const body = { title: a.title + " (Kopie)", status: "ENTWURF", isTemplate: a.isTemplate, customerId: a.customerId, projectId: a.projectId, blocks: a.blocks };
    await fetch("/api/vereinbarungen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    fetchAll();
  }

  async function createFromTemplate(tmpl: Agreement) {
    const body = { title: tmpl.title, status: "ENTWURF", isTemplate: false, customerId: null, projectId: null, blocks: tmpl.blocks };
    const res = await fetch("/api/vereinbarungen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      const created = await res.json();
      await fetchAll();
      openEditor(created);
    }
  }

  async function rename(id: string, newTitle: string) {
    await fetch(`/api/vereinbarungen/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newTitle }) });
    setRenamingId(null);
    fetchAll();
  }

  function addBlock(type: string) {
    const newBlock = createBlock(type);
    setBlocks(prev => [...prev, newBlock]);
    setSelectedBlock(newBlock.id);
  }

  function updateBlock(id: string, updates: Partial<ContentBlock>) {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } as ContentBlock : b));
  }

  function removeBlock(id: string) {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (selectedBlock === id) setSelectedBlock(null);
  }

  function moveBlock(id: string, dir: -1 | 1) {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  }

  const blockTypes = useMemo(() => [
    { type: "heading", icon: Heading1, tKey: "vb.ueberschrift" as TranslationKey },
    { type: "text", icon: Type, tKey: "vb.text" as TranslationKey },
    { type: "columns", icon: Columns3, tKey: "vb.spalten" as TranslationKey },
    { type: "divider", icon: Minus, tKey: "vb.trennlinie" as TranslationKey },
    { type: "spacer", icon: MoveVertical, tKey: "vb.abstand" as TranslationKey },
    { type: "signature", icon: PenLine, tKey: "vb.unterschrift" as TranslationKey },
  ], []);

  if (loading) return <div className="p-8 text-center opacity-50">{t("common.laden")}</div>;

  const regularAgreements = useMemo(() => agreements.filter(a => !a.isTemplate), [agreements]);
  const templates = useMemo(() => agreements.filter(a => a.isTemplate), [agreements]);

  // ─── LIST VIEW ──────────────────────────────────
  if (view === "list") return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: "#212f46" }}>{t("vb.title")}</h1>
        <div className="flex gap-2">
          {listTab === "vorlagen" ? (
            <Button onClick={() => openEditor(undefined, true)} className="gap-2" style={{ background: "#9eb552" }}>
              <Plus className="h-4 w-4" /> Neue Vorlage
            </Button>
          ) : (
            <Button onClick={() => openEditor()} className="gap-2" style={{ background: "#9eb552" }}>
              <Plus className="h-4 w-4" /> {t("vb.neueVereinbarung")}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        <button onClick={() => setListTab("vereinbarungen")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${listTab === "vereinbarungen" ? "bg-white shadow text-[#212f46]" : "text-gray-600 hover:text-gray-900"}`}>
          <FileSignature className="h-4 w-4" /> {t("vb.liste")}
          {regularAgreements.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{regularAgreements.length}</Badge>}
        </button>
        <button onClick={() => setListTab("vorlagen")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${listTab === "vorlagen" ? "bg-white shadow text-[#212f46]" : "text-gray-600 hover:text-gray-900"}`}>
          <Copy className="h-4 w-4" /> Vorlagen
          {templates.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{templates.length}</Badge>}
        </button>
      </div>

      {/* Vereinbarungen Tab */}
      {listTab === "vereinbarungen" && (
        <>
          {regularAgreements.length === 0 ? (
            <Card><CardContent className="py-16 text-center text-gray-500">
              <FileSignature className="h-12 w-12 mx-auto mb-3 opacity-30" />
              {t("vb.keineVereinbarungen")}
              {templates.length > 0 && (
                <p className="mt-3 text-sm">Erstellen Sie eine neue Vereinbarung aus einer <button onClick={() => setListTab("vorlagen")} className="text-[#9eb552] underline">Vorlage</button>.</p>
              )}
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {regularAgreements.map(a => {
                const s = STATUS_MAP[a.status] || STATUS_MAP.ENTWURF;
                return (
                  <Card key={a.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openEditor(a)}>
                    <CardContent className="py-3 flex items-center gap-4">
                      <FileSignature className="h-5 w-5 text-[#354360] shrink-0" />
                      <div className="flex-1 min-w-0">
                        {renamingId === a.id ? (
                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            <Input value={renameValue} onChange={e => setRenameValue(e.target.value)} className="h-8 text-sm w-60" autoFocus
                              onKeyDown={e => { if (e.key === "Enter") rename(a.id, renameValue); if (e.key === "Escape") setRenamingId(null); }} />
                            <Button size="sm" variant="ghost" onClick={() => rename(a.id, renameValue)}><Save className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => setRenamingId(null)}><X className="h-3.5 w-3.5" /></Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-medium truncate">{a.title}</span>
                              <Badge className={s.color}>{t(s.tKey)}</Badge>
                            </div>
                            <div className="text-xs text-gray-500 flex gap-4">
                              {a.customer && <span>{a.customer.firstName} {a.customer.lastName}</span>}
                              {a.project && <span>{a.project.name}</span>}
                              <span>{t("vb.zuletzt")}: {new Date(a.updatedAt).toLocaleDateString("de-DE")}</span>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" title="Umbenennen" onClick={() => { setRenamingId(a.id); setRenameValue(a.title); }}><Edit2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => duplicate(a)}><Copy className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteAgreement(a.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Vorlagen Tab */}
      {listTab === "vorlagen" && (
        <>
          {templates.length === 0 ? (
            <Card><CardContent className="py-16 text-center text-gray-500">
              <Copy className="h-12 w-12 mx-auto mb-3 opacity-30" />
              Keine Vorlagen vorhanden. Erstellen Sie eine Vorlage, um sie für neue Vereinbarungen wiederzuverwenden.
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {templates.map(tmpl => (
                <Card key={tmpl.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-3 flex items-center gap-4">
                    <Copy className="h-5 w-5 text-[#9eb552] shrink-0" />
                    <div className="flex-1 min-w-0">
                      {renamingId === tmpl.id ? (
                        <div className="flex items-center gap-2">
                          <Input value={renameValue} onChange={e => setRenameValue(e.target.value)} className="h-8 text-sm w-60" autoFocus
                            onKeyDown={e => { if (e.key === "Enter") rename(tmpl.id, renameValue); if (e.key === "Escape") setRenamingId(null); }} />
                          <Button size="sm" variant="ghost" onClick={() => rename(tmpl.id, renameValue)}><Save className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setRenamingId(null)}><X className="h-3.5 w-3.5" /></Button>
                        </div>
                      ) : (
                        <>
                          <div className="font-medium">{tmpl.title}</div>
                          <div className="text-xs text-gray-500">
                            {t("vb.zuletzt")}: {new Date(tmpl.updatedAt).toLocaleDateString("de-DE")}
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="gap-1 text-[#9eb552] border-[#9eb552]/30" onClick={() => createFromTemplate(tmpl)}>
                        <Plus className="h-3.5 w-3.5" /> Verwenden
                      </Button>
                      <Button variant="ghost" size="sm" title="Im Baukasten bearbeiten" onClick={() => openEditor(tmpl)}><Edit2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" title="Umbenennen" onClick={() => { setRenamingId(tmpl.id); setRenameValue(tmpl.title); }}><Edit2 className="h-4 w-4 text-blue-500" /></Button>
                      <Button variant="ghost" size="sm" title="Vorlage duplizieren" onClick={() => duplicate(tmpl)}><Copy className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteAgreement(tmpl.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );

  // ─── PREVIEW VIEW ──────────────────────────────
  if (view === "preview") return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={() => setView("edit")}><ChevronLeft className="h-4 w-4 mr-1" /> {t("vb.baukasten")}</Button>
        <h2 className="text-lg font-semibold">{t("vb.vorschau")}: {title}</h2>
      </div>
      <div className="bg-white rounded-xl shadow-lg max-w-[800px] mx-auto p-12">
        {blocks.map(b => <PreviewBlock key={b.id} block={b} />)}
      </div>
    </div>
  );

  // ─── EDITOR VIEW ───────────────────────────────
  return (
    <div className="space-y-4">
      {msg && <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded-lg text-sm">{msg}</div>}

      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setView("list")}><ChevronLeft className="h-4 w-4" /></Button>
          <Input value={title} onChange={e => setTitle(e.target.value)} className="text-lg font-semibold w-64" />
          <select value={status} onChange={e => setStatus(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{t(v.tKey)}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setView("preview")} className="gap-1"><Eye className="h-4 w-4" /> {t("vb.vorschau")}</Button>
          <Button onClick={save} disabled={saving} className="gap-1" style={{ background: "#9eb552" }}><Save className="h-4 w-4" /> {t("vb.speichern")}</Button>
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">{t("vb.kunde")}</label>
          <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm">
            <option value="">—</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName} {c.company ? `(${c.company})` : ""}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">{t("vb.projekt")}</label>
          <select value={projectId} onChange={e => setProjectId(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm">
            <option value="">—</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.projectNumber ? `${p.projectNumber} – ` : ""}{p.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-4">
        {/* Block editor area */}
        <div className="space-y-2">
          {blocks.length === 0 && (
            <Card><CardContent className="py-16 text-center text-gray-400 text-sm">
              {t("vb.blockHinzufuegen")}
            </CardContent></Card>
          )}
          {blocks.map((block, idx) => (
            <div key={block.id}
              className={`group border rounded-xl transition-all ${selectedBlock === block.id ? "border-[#9eb552] ring-2 ring-[#9eb552]/20" : "border-gray-200 hover:border-gray-300"}`}
              onClick={() => setSelectedBlock(block.id)}>
              {/* Block header */}
              <div className="flex items-center gap-1 px-3 py-1.5 border-b bg-gray-50/50 rounded-t-xl">
                <GripVertical className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs font-medium text-gray-500 flex-1">
                  {block.type === "heading" && t("vb.ueberschrift")}
                  {block.type === "text" && t("vb.text")}
                  {block.type === "columns" && t("vb.spalten")}
                  {block.type === "divider" && t("vb.trennlinie")}
                  {block.type === "spacer" && t("vb.abstand")}
                  {block.type === "signature" && t("vb.unterschrift")}
                </span>
                <button onClick={(e) => { e.stopPropagation(); moveBlock(block.id, -1); }} className="p-1 hover:bg-gray-200 rounded" disabled={idx === 0}>
                  <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 1); }} className="p-1 hover:bg-gray-200 rounded" disabled={idx === blocks.length - 1}>
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }} className="p-1 hover:bg-red-100 rounded">
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </button>
              </div>

              {/* Block content */}
              <div className="p-3">
                {/* HEADING */}
                {block.type === "heading" && (
                  <div className="space-y-2">
                    {selectedBlock === block.id && (
                      <>
                        <StyleToolbar style={block.style} onChange={s => updateBlock(block.id, { style: s } as Partial<HeadingBlock>)} />
                        <div className="flex gap-1">
                          {([1, 2, 3] as const).map(lvl => (
                            <button key={lvl} onClick={() => updateBlock(block.id, { level: lvl } as Partial<HeadingBlock>)}
                              className={`px-2 py-1 text-xs rounded ${block.level === lvl ? "bg-[#9eb552] text-white" : "bg-gray-100 hover:bg-gray-200"}`}>H{lvl}</button>
                          ))}
                        </div>
                      </>
                    )}
                    <input value={block.content} onChange={e => updateBlock(block.id, { content: e.target.value } as Partial<HeadingBlock>)}
                      placeholder="Überschrift eingeben..." className="w-full bg-transparent outline-none" style={textStyleToCss(block.style)} />
                  </div>
                )}

                {/* TEXT */}
                {block.type === "text" && (
                  <div className="space-y-2">
                    {selectedBlock === block.id && (
                      <StyleToolbar style={block.style} onChange={s => updateBlock(block.id, { style: s } as Partial<TextBlock>)} />
                    )}
                    <textarea value={block.content} onChange={e => updateBlock(block.id, { content: e.target.value } as Partial<TextBlock>)}
                      placeholder="Text eingeben..." rows={3} className="w-full bg-transparent outline-none resize-y" style={textStyleToCss(block.style)} />
                  </div>
                )}

                {/* COLUMNS */}
                {block.type === "columns" && (
                  <div className="space-y-2">
                    {selectedBlock === block.id && (
                      <div className="flex items-center gap-3 flex-wrap">
                        <label className="flex items-center gap-1 text-xs text-gray-500">
                          {t("vb.spaltenAnzahl")}
                          <select value={block.columns} onChange={e => {
                            const n = +e.target.value;
                            const cells = [...block.cells];
                            while (cells.length < n) cells.push({ content: "", style: { fontSize: 14, color: "#333", align: "left" } });
                            updateBlock(block.id, { columns: n, cells: cells.slice(0, n) } as Partial<ColumnBlock>);
                          }} className="rounded border px-2 py-1 text-xs">
                            <option value={2}>2</option><option value={3}>3</option><option value={4}>4</option>
                          </select>
                        </label>
                        <label className="flex items-center gap-1 text-xs text-gray-500">
                          {t("vb.hintergrundfarbe")}
                          <input type="color" value={block.backgroundColor === "transparent" ? "#ffffff" : block.backgroundColor}
                            onChange={e => updateBlock(block.id, { backgroundColor: e.target.value } as Partial<ColumnBlock>)}
                            className="w-7 h-7 rounded border cursor-pointer" />
                          {block.backgroundColor !== "transparent" && (
                            <button onClick={() => updateBlock(block.id, { backgroundColor: "transparent" } as Partial<ColumnBlock>)}
                              className="text-xs text-red-400 hover:text-red-600">✕</button>
                          )}
                        </label>
                      </div>
                    )}
                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${block.columns}, 1fr)`, backgroundColor: block.backgroundColor === "transparent" ? undefined : block.backgroundColor, borderRadius: "8px", padding: block.backgroundColor !== "transparent" ? "12px" : undefined }}>
                      {block.cells.map((cell, ci) => (
                        <div key={ci} className="border rounded-lg p-2 min-h-[80px]">
                          {selectedBlock === block.id && (
                            <StyleToolbar style={cell.style} onChange={s => {
                              const cells = [...block.cells];
                              cells[ci] = { ...cells[ci], style: s };
                              updateBlock(block.id, { cells } as Partial<ColumnBlock>);
                            }} />
                          )}
                          <textarea value={cell.content} onChange={e => {
                            const cells = [...block.cells];
                            cells[ci] = { ...cells[ci], content: e.target.value };
                            updateBlock(block.id, { cells } as Partial<ColumnBlock>);
                          }} placeholder={`Spalte ${ci + 1}...`} rows={3}
                            className="w-full bg-transparent outline-none resize-y mt-2" style={textStyleToCss(cell.style)} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* DIVIDER */}
                {block.type === "divider" && (
                  <div className="space-y-2">
                    {selectedBlock === block.id && (
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1 text-xs text-gray-500">
                          {t("vb.linienstaerke")}
                          <input type="range" min={1} max={10} value={block.thickness}
                            onChange={e => updateBlock(block.id, { thickness: +e.target.value } as Partial<DividerBlock>)}
                            className="w-24 accent-[#9eb552]" />
                          <span className="text-xs font-mono w-6">{block.thickness}px</span>
                        </label>
                        <label className="flex items-center gap-1 text-xs text-gray-500">
                          {t("vb.linienfarbe")}
                          <input type="color" value={block.color}
                            onChange={e => updateBlock(block.id, { color: e.target.value } as Partial<DividerBlock>)}
                            className="w-7 h-7 rounded border cursor-pointer" />
                        </label>
                      </div>
                    )}
                    <hr style={{ borderTopWidth: `${block.thickness}px`, borderColor: block.color }} />
                  </div>
                )}

                {/* SPACER */}
                {block.type === "spacer" && (
                  <div className="space-y-2">
                    {selectedBlock === block.id && (
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 text-xs text-gray-500">
                          {t("vb.abstandHoehe")}
                          <input type="range" min={8} max={200} value={block.height}
                            onChange={e => updateBlock(block.id, { height: +e.target.value } as Partial<SpacerBlock>)}
                            className="w-32 accent-[#9eb552]" />
                          <span className="text-xs font-mono w-10">{block.height}px</span>
                        </label>
                      </div>
                    )}
                    <div className="border-2 border-dashed border-gray-200 rounded flex items-center justify-center text-xs text-gray-400" style={{ height: `${block.height}px` }}>
                      {block.height}px
                    </div>
                  </div>
                )}

                {/* SIGNATURE */}
                {block.type === "signature" && (
                  <div className="space-y-2">
                    {selectedBlock === block.id && (
                      <Input value={block.label} onChange={e => updateBlock(block.id, { label: e.target.value } as Partial<SignatureBlock>)}
                        placeholder="Label..." className="text-sm" />
                    )}
                    <div className="border-t-2 border-gray-800 pt-2 mt-8 w-48">
                      <span className="text-xs text-gray-500">{block.label}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Right sidebar - block palette */}
        <div className="space-y-3">
          <Card>
            <CardHeader className="py-3 px-4"><CardTitle className="text-sm">{t("vb.inhaltsbloecke")}</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-2">
                {blockTypes.map(bt => (
                  <button key={bt.type} onClick={() => addBlock(bt.type)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-gray-200 hover:border-[#9eb552] hover:bg-[#9eb552]/5 transition-colors text-xs text-gray-600 hover:text-[#9eb552]">
                    <bt.icon className="h-5 w-5" />
                    {t(bt.tKey)}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Preview Block Renderer ──────────────────────

function PreviewBlock({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "heading": {
      const Tag = `h${block.level}` as keyof JSX.IntrinsicElements;
      return <Tag style={textStyleToCss(block.style)} className="mb-2">{block.content || "…"}</Tag>;
    }
    case "text":
      return <p style={textStyleToCss(block.style)} className="mb-2 whitespace-pre-wrap">{block.content || "…"}</p>;
    case "columns":
      return (
        <div className="grid gap-4 mb-2" style={{
          gridTemplateColumns: `repeat(${block.columns}, 1fr)`,
          backgroundColor: block.backgroundColor === "transparent" ? undefined : block.backgroundColor,
          borderRadius: "8px", padding: block.backgroundColor !== "transparent" ? "16px" : undefined,
        }}>
          {block.cells.map((cell, i) => (
            <div key={i} style={textStyleToCss(cell.style)} className="whitespace-pre-wrap">{cell.content || "…"}</div>
          ))}
        </div>
      );
    case "divider":
      return <hr className="my-4" style={{ borderTopWidth: `${block.thickness}px`, borderColor: block.color }} />;
    case "spacer":
      return <div style={{ height: `${block.height}px` }} />;
    case "signature":
      return <div className="mt-12 mb-4"><div className="border-t-2 border-gray-800 pt-2 w-48"><span className="text-xs text-gray-500">{block.label}</span></div></div>;
    default:
      return null;
  }
}
