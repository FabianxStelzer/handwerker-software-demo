"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Upload, MapPin, Trash2, X, ChevronLeft, FileText, User,
  ZoomIn, ZoomOut, Maximize, Download, Printer,
  Pencil, Undo2, Eraser, RotateCw, StickyNote, ImagePlus, Wrench, Pen, Camera,
  ClipboardList, Search, Plus, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// ── Types ───────────────────────────────────────────────────

interface Marker {
  id: string; xPercent: number; yPercent: number; beschreibung: string;
  mitarbeiterId: string | null; mitarbeiterName: string | null;
  createdAt: string;
}
interface EinbauPlan {
  id: string; titel: string; dateiUrl: string; dateiName: string;
  markers: Marker[]; createdAt: string;
}

interface Annotation {
  id: string;
  type: "path" | "note";
  points?: { x: number; y: number }[];
  x?: number; y?: number;
  title?: string;
  description?: string;
  image?: string;
  color: string;
  strokeWidth?: number;
}

const MATERIAL_SEP = "\n---MATERIAL---\n";
function formatBeschreibung(leistung: string, material: string): string {
  if (material.trim()) return leistung + MATERIAL_SEP + material;
  return leistung;
}
function parseBeschreibung(b: string): { leistung: string; material: string } {
  const idx = b.indexOf(MATERIAL_SEP);
  if (idx >= 0) return { leistung: b.slice(0, idx), material: b.slice(idx + MATERIAL_SEP.length) };
  return { leistung: b, material: "" };
}

const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#000000", "#f97316", "#a855f7"];
function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>");
}
const STROKE_RANGE = { min: 0.08, max: 2, step: 0.02 };

// ── PDF.js lazy loader ──────────────────────────────────────

let _pdfjs: any = null;
async function loadPdfjs() {
  if (!_pdfjs) {
    _pdfjs = await import("pdfjs-dist");
    _pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }
  return _pdfjs;
}

// ── Annotations hook (localStorage persisted) ───────────────

function useAnnotations(planId: string) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem(`einbau-ann-${planId}`);
      if (s) setAnnotations(JSON.parse(s));
    } catch { /* ignore */ }
    loaded.current = true;
  }, [planId]);

  useEffect(() => {
    if (!loaded.current) return;
    try { localStorage.setItem(`einbau-ann-${planId}`, JSON.stringify(annotations)); } catch { /* ignore */ }
  }, [annotations, planId]);

  const add = useCallback((a: Annotation) => setAnnotations((p) => [...p, a]), []);
  const update = useCallback((id: string, patch: Partial<Annotation>) =>
    setAnnotations((p) => p.map((a) => (a.id === id ? { ...a, ...patch } : a))), []);
  const remove = useCallback((id: string) => setAnnotations((p) => p.filter((a) => a.id !== id)), []);
  const undo = useCallback(() => setAnnotations((p) => p.slice(0, -1)), []);
  const clear = useCallback(() => { if (confirm("Alle Zeichnungen löschen?")) setAnnotations([]); }, []);

  return { annotations, add, update, remove, undo, clear, setAnnotations };
}

// ── SVG drawing overlay ─────────────────────────────────────

function SvgOverlay({
  annotations, tool, color, strokeWidth,
  onAdd, onRemove,
  placingMarker, onPlaceMarker,
  placingNote, onPlaceNote,
  svgRefOut,
}: {
  annotations: Annotation[];
  tool: "none" | "draw" | "eraser";
  color: string; strokeWidth: number;
  onAdd: (a: Annotation) => void;
  onRemove: (id: string) => void;
  placingMarker: boolean;
  onPlaceMarker: (x: number, y: number) => void;
  placingNote: boolean;
  onPlaceNote: (x: number, y: number) => void;
  svgRefOut: React.RefObject<SVGSVGElement | null>;
}) {
  const svgRef = svgRefOut || useRef<SVGSVGElement>(null);
  const currentPathRef = useRef<SVGPathElement>(null);
  const strokeRef = useRef<{ x: number; y: number }[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [hoveredEraseId, setHoveredEraseId] = useState<string | null>(null);

  function getPos(e: React.MouseEvent): { x: number; y: number } | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 };
  }

  function handleMouseDown(e: React.MouseEvent) {
    const pos = getPos(e);
    if (!pos) return;
    if (placingMarker) { onPlaceMarker(pos.x, pos.y); return; }
    if (placingNote) { onPlaceNote(pos.x, pos.y); return; }
    if (tool === "draw") {
      strokeRef.current = [pos];
      setDrawing(true);
      if (currentPathRef.current) currentPathRef.current.setAttribute("d", `M${pos.x} ${pos.y}`);
      e.preventDefault();
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (drawing && tool === "draw") {
      const pos = getPos(e);
      if (!pos) return;
      strokeRef.current.push(pos);
      const d = strokeRef.current.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
      if (currentPathRef.current) currentPathRef.current.setAttribute("d", d);
    }
  }

  function handleMouseUp() {
    if (drawing) {
      setDrawing(false);
      if (strokeRef.current.length > 1) {
        onAdd({ id: `ann-${Date.now()}`, type: "path", points: [...strokeRef.current], color, strokeWidth });
      }
      strokeRef.current = [];
      if (currentPathRef.current) currentPathRef.current.setAttribute("d", "");
    }
  }

  const isEraser = tool === "eraser";
  const cursor = (placingMarker || placingNote) ? "crosshair" : tool === "draw" ? "crosshair" : isEraser ? "pointer" : "default";
  const hasInteraction = tool !== "none" || placingMarker || placingNote;

  return (
    <svg ref={svgRef} className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none"
      style={{ cursor, pointerEvents: hasInteraction ? "auto" : "none", zIndex: 15 }}
      onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      {annotations.filter((a) => a.type === "path").map((ann) => {
        if (!ann.points || ann.points.length < 2) return null;
        const d = ann.points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
        const isHovered = isEraser && hoveredEraseId === ann.id;
        return (
          <g key={ann.id}>
            {isEraser && (
              <path d={d} stroke="transparent" strokeWidth={Math.max((ann.strokeWidth || 0.3) * 8, 3)}
                fill="none" style={{ pointerEvents: "auto", cursor: "pointer" }}
                onMouseEnter={() => setHoveredEraseId(ann.id)}
                onMouseLeave={() => setHoveredEraseId(null)}
                onClick={(e) => { e.stopPropagation(); onRemove(ann.id); }} />
            )}
            <path d={d} stroke={isHovered ? "#ef4444" : ann.color} strokeWidth={ann.strokeWidth || 0.3}
              fill="none" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
              opacity={isHovered ? 0.4 : 1}
              style={{ pointerEvents: "none" }} />
          </g>
        );
      })}
      <path ref={currentPathRef} d="" stroke={color} strokeWidth={strokeWidth}
        fill="none" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// ── Export helper: render everything to a canvas for download/print ──

async function exportPlanToCanvas(
  contentEl: HTMLDivElement,
  svgEl: SVGSVGElement,
  markers: Marker[],
  noteAnnotations: Annotation[],
): Promise<HTMLCanvasElement> {
  const rect = contentEl.getBoundingClientRect();
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = rect.width * scale;
  canvas.height = rect.height * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  // Draw PDF canvases / images
  const children = contentEl.querySelectorAll("canvas, img");
  let yOffset = 0;
  for (const child of children) {
    const childRect = child.getBoundingClientRect();
    const w = childRect.width;
    const h = childRect.height;
    if (child instanceof HTMLCanvasElement) {
      ctx.drawImage(child, 0, yOffset, w, h);
    } else if (child instanceof HTMLImageElement) {
      ctx.drawImage(child, 0, yOffset, w, h);
    }
    yOffset += h;
  }

  // Draw SVG annotations
  try {
    const svgClone = svgEl.cloneNode(true) as SVGSVGElement;
    svgClone.setAttribute("width", `${rect.width}`);
    svgClone.setAttribute("height", `${rect.height}`);
    const svgData = new XMLSerializer().serializeToString(svgClone);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    ctx.drawImage(img, 0, 0, rect.width, rect.height);
    URL.revokeObjectURL(url);
  } catch { /* SVG export failed, skip */ }

  // Draw markers (small, proportional to image)
  const markerR = Math.max(Math.min(rect.width * 0.008, 10), 5);
  for (let i = 0; i < markers.length; i++) {
    const m = markers[i];
    const mx = (m.xPercent / 100) * rect.width;
    const my = (m.yPercent / 100) * rect.height;
    ctx.beginPath();
    ctx.arc(mx, my - markerR, markerR, 0, Math.PI * 2);
    ctx.fillStyle = "#2563eb";
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "white";
    ctx.font = `bold ${Math.round(markerR * 1.1)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${i + 1}`, mx, my - markerR);
  }

  // Draw note markers (orange)
  for (let i = 0; i < noteAnnotations.length; i++) {
    const note = noteAnnotations[i];
    const nx = ((note.x || 0) / 100) * rect.width;
    const ny = ((note.y || 0) / 100) * rect.height;
    ctx.beginPath();
    ctx.arc(nx, ny - markerR, markerR, 0, Math.PI * 2);
    ctx.fillStyle = "#f97316";
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "white";
    ctx.font = `bold ${Math.round(markerR * 1.1)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${i + 1}`, nx, ny - markerR);
  }

  return canvas;
}

// ── Plan Viewer (shared by PDF + Image) ─────────────────────

function PlanViewer({
  planId, contentRef, svgRef, children, pdfReady,
  markers, selectedMarkerId, placingMarker,
  onPlaceMarker, onSelectMarker, onDeactivateMarker,
  placingNote, onDeactivateNote,
  onSummary, onNotesChange,
  url, dateiName,
}: {
  planId: string;
  contentRef: React.RefObject<HTMLDivElement | null>;
  svgRef: React.RefObject<SVGSVGElement | null>;
  children: React.ReactNode;
  pdfReady: boolean;
  markers: Marker[];
  selectedMarkerId: string | null;
  placingMarker: boolean;
  onPlaceMarker: (x: number, y: number) => void;
  onSelectMarker: (m: Marker) => void;
  onDeactivateMarker: () => void;
  placingNote: boolean;
  onDeactivateNote: () => void;
  onSummary: () => void;
  onNotesChange: (notes: Annotation[]) => void;
  url: string;
  dateiName: string;
}) {
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState<"none" | "draw" | "eraser">("none");
  const [color, setColor] = useState("#ef4444");
  const [strokeWidth, setStrokeWidth] = useState(0.3);
  const [exporting, setExporting] = useState(false);

  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [notePos, setNotePos] = useState<{ x: number; y: number } | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteDesc, setNoteDesc] = useState("");
  const [noteImage, setNoteImage] = useState<string | null>(null);

  const [editNoteOpen, setEditNoteOpen] = useState(false);
  const [editNoteId, setEditNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editImage, setEditImage] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const noteFileRef = useRef<HTMLInputElement>(null);
  const noteCameraRef = useRef<HTMLInputElement>(null);
  const editNoteFileRef = useRef<HTMLInputElement>(null);
  const editNoteCameraRef = useRef<HTMLInputElement>(null);
  const ann = useAnnotations(planId);

  const noteAnnotations = ann.annotations.filter((a) => a.type === "note");

  useEffect(() => { onNotesChange(noteAnnotations); }, [ann.annotations]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZoom((z) => Math.min(Math.max(z + (e.deltaY > 0 ? -0.15 : 0.15), 0.25), 5)); }
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function activateTool(t: "draw" | "eraser") {
    if (tool === t) { setTool("none"); return; }
    setTool(t);
    onDeactivateNote();
    onDeactivateMarker();
  }

  useEffect(() => { if (placingMarker) { setTool("none"); onDeactivateNote(); } }, [placingMarker, onDeactivateNote]);
  useEffect(() => { if (placingNote) { setTool("none"); } }, [placingNote]);

  function handlePlaceNote(x: number, y: number) {
    setNotePos({ x, y });
    setNoteTitle("");
    setNoteDesc("");
    setNoteImage(null);
    setNoteDialogOpen(true);
    onDeactivateNote();
  }

  function saveNote() {
    if (!notePos || !noteTitle.trim()) return;
    ann.add({
      id: `ann-${Date.now()}`,
      type: "note",
      x: notePos.x,
      y: notePos.y,
      title: noteTitle.trim(),
      description: noteDesc.trim() || undefined,
      image: noteImage || undefined,
      color: "#f97316",
    });
    setNoteDialogOpen(false);
    setNotePos(null);
  }

  function handleNoteImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setNoteImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleEditNoteImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setEditImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function openEditNote(note: Annotation) {
    setEditNoteId(note.id);
    setEditTitle(note.title || "");
    setEditDesc(note.description || "");
    setEditImage(note.image || null);
    setEditNoteOpen(true);
  }

  function saveEditNote() {
    if (!editNoteId || !editTitle.trim()) return;
    ann.update(editNoteId, { title: editTitle.trim(), description: editDesc.trim() || undefined, image: editImage || undefined });
    setEditNoteOpen(false);
    setEditNoteId(null);
  }

  function handleNoteMouseDown(e: React.MouseEvent, note: Annotation) {
    e.preventDefault();
    e.stopPropagation();
    const cEl = contentRef.current;
    if (!cEl) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = note.x || 0;
    const origY = note.y || 0;
    let moved = false;
    function onMove(ev: MouseEvent) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
      if (!moved) return;
      const rect = cEl!.getBoundingClientRect();
      ann.update(note.id, {
        x: Math.max(0, Math.min(100, origX + (dx / rect.width) * 100)),
        y: Math.max(0, Math.min(100, origY + (dy / rect.height) * 100)),
      });
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      if (!moved) openEditNote(note);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  async function handleExport(mode: "download" | "print") {
    if (!contentRef.current || !svgRef.current) return;
    setExporting(true);
    try {
      const canvas = await exportPlanToCanvas(contentRef.current, svgRef.current, markers, noteAnnotations);
      if (mode === "download") {
        const link = document.createElement("a");
        link.download = dateiName.replace(/\.\w+$/, "") + "_annotiert.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
      } else {
        const w = window.open("");
        if (w) {
          w.document.write(`<img src="${canvas.toDataURL("image/png")}" style="max-width:100%"/>`);
          w.document.close();
          w.onload = () => w.print();
        }
      }
    } catch (e) { console.error("Export error:", e); }
    setExporting(false);
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-1 mb-1.5 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.max(z - 0.25, 0.25))}><ZoomOut className="h-3.5 w-3.5" /></Button>
        <span className="text-xs font-medium text-gray-700 w-12 text-center">{Math.round(zoom * 100)}%</span>
        <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.min(z + 0.25, 5))}><ZoomIn className="h-3.5 w-3.5" /></Button>
        <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setZoom(1)}><Maximize className="h-3.5 w-3.5" /></Button>

        <div className="h-4 border-l border-gray-300 mx-0.5" />

        <Button variant={tool === "draw" ? "default" : "outline"} size="sm" className="gap-1 text-xs" onClick={() => activateTool("draw")}>
          <Pencil className="h-3.5 w-3.5" />Zeichnen
        </Button>
        <Button variant={tool === "eraser" ? "default" : "outline"} size="sm" className="gap-1 text-xs" onClick={() => activateTool("eraser")}>
          <Eraser className="h-3.5 w-3.5" />Radierer
        </Button>

        {ann.annotations.filter((a) => a.type === "path").length > 0 && (
          <Button variant="outline" size="sm" onClick={ann.undo} title="Letzte Zeichnung rückgängig"><Undo2 className="h-3.5 w-3.5" /></Button>
        )}

        <div className="flex-1" />
        <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleExport("download")} disabled={exporting}>
          <Download className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleExport("print")} disabled={exporting}>
          <Printer className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={onSummary} disabled={exporting}>
          <ClipboardList className="h-3.5 w-3.5" />Zusammenfassung
        </Button>
      </div>

      {/* Drawing options */}
      {tool === "draw" && (
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap bg-gray-50 rounded-lg px-2 py-1.5">
          <span className="text-[10px] text-gray-500 mr-1">Farbe:</span>
          {COLORS.map((c) => (
            <button key={c} className={`h-5 w-5 rounded-full border-2 transition-transform ${color === c ? "scale-125 border-gray-800" : "border-gray-300 hover:scale-110"}`}
              style={{ backgroundColor: c }} onClick={() => setColor(c)} />
          ))}
          <div className="h-4 border-l border-gray-300 mx-1" />
          <span className="text-[10px] text-gray-500 mr-1">Stärke:</span>
          <input type="range" min={STROKE_RANGE.min} max={STROKE_RANGE.max} step={STROKE_RANGE.step}
            value={strokeWidth} onChange={(e) => setStrokeWidth(parseFloat(e.target.value))}
            className="w-24 h-1.5 accent-gray-800 cursor-pointer" />
          <span className="text-[10px] text-gray-500 w-8">{strokeWidth.toFixed(2)}</span>
        </div>
      )}

      {tool === "eraser" && (
        <div className="flex items-center gap-1.5 mb-1.5 bg-red-50 rounded-lg px-3 py-1.5">
          <Eraser className="h-3.5 w-3.5 text-red-500" />
          <span className="text-xs text-red-600">Klicke auf einen Strich, um ihn zu entfernen</span>
        </div>
      )}

      {/* Scroll container – FIXED HEIGHT */}
      <div ref={scrollRef} className="overflow-auto rounded-lg border border-gray-200" style={{ height: "75vh", background: "#525659" }}>
        <div ref={contentRef as any} className="relative mx-auto" style={{ width: `${zoom * 100}%` }}>
          {children}

          <SvgOverlay
            svgRefOut={svgRef}
            annotations={ann.annotations}
            tool={tool}
            color={color}
            strokeWidth={strokeWidth}
            onAdd={ann.add}
            onRemove={ann.remove}
            placingMarker={placingMarker}
            onPlaceMarker={onPlaceMarker}
            placingNote={placingNote}
            onPlaceNote={handlePlaceNote}
          />

          {/* Markers (blue) + Note markers (orange) */}
          <div className="absolute inset-0" style={{ pointerEvents: "none", zIndex: 20 }}>
            {markers.map((marker, i) => (
              <button key={marker.id} className={`absolute transition-transform ${selectedMarkerId === marker.id ? "z-30 scale-125" : "z-20 hover:scale-110"}`}
                style={{ left: `${marker.xPercent}%`, top: `${marker.yPercent}%`, transform: "translate(-50%, -100%)", pointerEvents: "auto" }}
                onClick={(e) => { e.stopPropagation(); onSelectMarker(marker); }} title={`#${i + 1}: ${marker.beschreibung}`}>
                <div className={`flex items-center justify-center h-7 w-7 rounded-full shadow-lg border-2 text-xs font-bold ${
                  selectedMarkerId === marker.id ? "bg-blue-600 border-white text-white" : "bg-white border-blue-600 text-blue-600"
                }`}>{i + 1}</div>
                <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-blue-600 mx-auto -mt-0.5" />
              </button>
            ))}
            {noteAnnotations.map((note, i) => (
              <div key={note.id} className="absolute z-20 transition-transform hover:scale-110"
                style={{ left: `${note.x}%`, top: `${note.y}%`, transform: "translate(-50%, -100%)", pointerEvents: "auto", cursor: "grab" }}
                onMouseDown={(e) => handleNoteMouseDown(e, note)} title={note.title || "Notiz"}>
                <div className={`flex items-center justify-center h-7 w-7 rounded-full shadow-lg border-2 text-xs font-bold ${
                  editNoteId === note.id ? "bg-orange-600 border-white text-white" : "bg-white border-orange-500 text-orange-500"
                }`}>{i + 1}</div>
                <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-orange-500 mx-auto -mt-0.5" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* New note dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><StickyNote className="h-5 w-5 text-orange-500" />Neue Notiz</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Titel *" autoFocus />
            <Textarea value={noteDesc} onChange={(e) => setNoteDesc(e.target.value)} placeholder="Beschreibung (optional)" rows={3} />
            <div>
              <input ref={noteFileRef} type="file" accept="image/*" className="hidden" onChange={handleNoteImage} />
              <input ref={noteCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleNoteImage} />
              {noteImage ? (
                <div className="relative">
                  <img src={noteImage} alt="Vorschau" className="w-full max-h-40 object-contain rounded-lg border" />
                  <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 bg-white/80" onClick={() => setNoteImage(null)}><X className="h-3.5 w-3.5" /></Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1" onClick={() => noteFileRef.current?.click()}>
                    <ImagePlus className="h-3.5 w-3.5" />Bild hinzufügen
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1" onClick={() => noteCameraRef.current?.click()}>
                    <Camera className="h-3.5 w-3.5" />Foto aufnehmen
                  </Button>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setNoteDialogOpen(false); setNotePos(null); }}>Abbrechen</Button>
              <Button className="bg-orange-500 hover:bg-orange-600" onClick={saveNote} disabled={!noteTitle.trim()}>Speichern</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit note dialog */}
      <Dialog open={editNoteOpen} onOpenChange={(open) => { if (!open) { setEditNoteOpen(false); setEditNoteId(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Pen className="h-4 w-4 text-orange-500" />Notiz bearbeiten</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Titel *" autoFocus />
            <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Beschreibung (optional)" rows={3} />
            <div>
              <input ref={editNoteFileRef} type="file" accept="image/*" className="hidden" onChange={handleEditNoteImage} />
              <input ref={editNoteCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleEditNoteImage} />
              {editImage ? (
                <div className="relative">
                  <img src={editImage} alt="Vorschau" className="w-full max-h-40 object-contain rounded-lg border" />
                  <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 bg-white/80" onClick={() => setEditImage(null)}><X className="h-3.5 w-3.5" /></Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1" onClick={() => editNoteFileRef.current?.click()}>
                    <ImagePlus className="h-3.5 w-3.5" />Bild hinzufügen
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1" onClick={() => editNoteCameraRef.current?.click()}>
                    <Camera className="h-3.5 w-3.5" />Foto aufnehmen
                  </Button>
                </div>
              )}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" size="sm" className="gap-1 text-xs text-red-500"
                onClick={() => { if (editNoteId) ann.remove(editNoteId); setEditNoteOpen(false); setEditNoteId(null); }}>
                <Trash2 className="h-3.5 w-3.5" />Löschen
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setEditNoteOpen(false); setEditNoteId(null); }}>Abbrechen</Button>
                <Button className="bg-orange-500 hover:bg-orange-600" onClick={saveEditNote} disabled={!editTitle.trim()}>Speichern</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── PDF Canvas Viewer ───────────────────────────────────────

function PdfCanvasViewer(props: {
  url: string; dateiName: string; planId: string;
  placingMarker: boolean; markers: Marker[]; selectedMarkerId: string | null;
  onPlaceMarker: (x: number, y: number) => void; onSelectMarker: (m: Marker) => void; onDeactivateMarker: () => void;
  placingNote: boolean; onDeactivateNote: () => void;
  onSummary: () => void; onNotesChange: (notes: Annotation[]) => void;
}) {
  const [pdfReady, setPdfReady] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasListRef = useRef<HTMLCanvasElement[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      setPdfReady(false); setPdfError(null);
      try {
        const pdfjs = await loadPdfjs();
        const pdf = await pdfjs.getDocument(props.url).promise;
        if (cancelled) return;
        setNumPages(pdf.numPages);
        const container = contentRef.current;
        if (!container) return;
        canvasListRef.current.forEach((c) => c.remove());
        canvasListRef.current = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          if (cancelled) return;
          const vp = page.getViewport({ scale: 3 });
          const canvas = document.createElement("canvas");
          canvas.width = vp.width; canvas.height = vp.height;
          canvas.style.width = "100%"; canvas.style.height = "auto"; canvas.style.display = "block";
          canvas.style.position = "relative"; canvas.style.zIndex = "1";
          await page.render({ canvasContext: canvas.getContext("2d")!, viewport: vp }).promise;
          container.prepend(canvas);
          canvasListRef.current.push(canvas);
        }
        setPdfReady(true);
      } catch (err: any) { if (!cancelled) setPdfError(err?.message || "PDF Fehler"); }
    }
    render();
    return () => { cancelled = true; };
  }, [props.url]);

  return (
    <PlanViewer planId={props.planId} contentRef={contentRef} svgRef={svgRef} pdfReady={pdfReady}
      markers={props.markers} selectedMarkerId={props.selectedMarkerId} placingMarker={props.placingMarker}
      onPlaceMarker={props.onPlaceMarker} onSelectMarker={props.onSelectMarker} onDeactivateMarker={props.onDeactivateMarker}
      placingNote={props.placingNote} onDeactivateNote={props.onDeactivateNote}
      onSummary={props.onSummary} onNotesChange={props.onNotesChange}
      url={props.url} dateiName={props.dateiName}>
      {pdfError && <div className="p-6 text-center"><p className="text-sm text-red-400">{pdfError}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => window.location.reload()}><RotateCw className="h-3.5 w-3.5 mr-1" />Laden</Button></div>}
      {!pdfReady && !pdfError && (
        <div className="flex items-center justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" /><span className="ml-3 text-sm text-white/70">PDF wird geladen…</span></div>
      )}
    </PlanViewer>
  );
}

// ── Image Viewer ────────────────────────────────────────────

function ImageViewerComp(props: {
  url: string; dateiName: string; planId: string;
  placingMarker: boolean; markers: Marker[]; selectedMarkerId: string | null;
  onPlaceMarker: (x: number, y: number) => void; onSelectMarker: (m: Marker) => void; onDeactivateMarker: () => void;
  placingNote: boolean; onDeactivateNote: () => void;
  onSummary: () => void; onNotesChange: (notes: Annotation[]) => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  return (
    <PlanViewer planId={props.planId} contentRef={contentRef} svgRef={svgRef} pdfReady={true}
      markers={props.markers} selectedMarkerId={props.selectedMarkerId} placingMarker={props.placingMarker}
      onPlaceMarker={props.onPlaceMarker} onSelectMarker={props.onSelectMarker} onDeactivateMarker={props.onDeactivateMarker}
      placingNote={props.placingNote} onDeactivateNote={props.onDeactivateNote}
      onSummary={props.onSummary} onNotesChange={props.onNotesChange}
      url={props.url} dateiName={props.dateiName}>
      <img src={props.url} alt={props.dateiName} className="w-full h-auto block relative z-[1]" draggable={false} style={{ pointerEvents: "none" }} />
    </PlanViewer>
  );
}

// ── Main component ──────────────────────────────────────────

interface ProjectMaterial {
  id: string; name: string; description?: string; imageUrl?: string;
  unit: string; quantityPlanned: number; quantityUsed: number;
  isAdditional: boolean; pricePerUnit: number;
}

export function EinbauTab({ project }: { project: any }) {
  const [plans, setPlans] = useState<EinbauPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [viewPlan, setViewPlan] = useState<EinbauPlan | null>(null);
  const [placingMarker, setPlacingMarker] = useState(false);
  const [placingNote, setPlacingNote] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<Marker | null>(null);
  const [markerDialogOpen, setMarkerDialogOpen] = useState(false);
  const [newMarkerPos, setNewMarkerPos] = useState<{ x: number; y: number } | null>(null);
  const [markerLeistung, setMarkerLeistung] = useState("");
  const [saving, setSaving] = useState(false);

  const [projectMaterials, setProjectMaterials] = useState<ProjectMaterial[]>([]);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<string>>(new Set());
  const [materialQuantities, setMaterialQuantities] = useState<Record<string, number>>({});
  const [materialSearch, setMaterialSearch] = useState("");
  const [extraMaterialName, setExtraMaterialName] = useState("");
  const [extraMaterialMenge, setExtraMaterialMenge] = useState("");
  const [extraMaterialEinheit, setExtraMaterialEinheit] = useState("STUECK");
  const [summaryGenerating, setSummaryGenerating] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [noteAnnotations, setNoteAnnotations] = useState<Annotation[]>([]);


  const load = useCallback(async () => {
    const res = await fetch(`/api/projekte/${project.id}/einbau`);
    if (res.ok) setPlans(await res.json());
    setLoading(false);
  }, [project.id]);

  useEffect(() => { load(); }, [load]);

  const loadMaterials = useCallback(async () => {
    try {
      const res = await fetch(`/api/projekte/${project.id}`);
      if (res.ok) {
        const data = await res.json();
        setProjectMaterials(data.materials || []);
      }
    } catch { /* ignore */ }
  }, [project.id]);

  useEffect(() => { loadMaterials(); }, [loadMaterials]);

  async function refreshPlan(planId: string) {
    const all = await fetch(`/api/projekte/${project.id}/einbau`).then((r) => r.json());
    setPlans(all);
    const u = all.find((p: EinbauPlan) => p.id === planId);
    if (u) setViewPlan(u);
    return u;
  }

  async function uploadPlan(file: File) {
    setUploading(true); setUploadError(null);
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("titel", file.name.replace(/\.[^.]+$/, ""));
      const res = await fetch(`/api/projekte/${project.id}/einbau`, { method: "POST", body: fd });
      if (res.ok) await load(); else { const t = await res.text(); try { setUploadError(JSON.parse(t).error); } catch { setUploadError(t.slice(0, 200)); } }
    } catch (e: any) { setUploadError(e.message); }
    setUploading(false);
  }

  async function deletePlan(planId: string) {
    if (!confirm("Bauplan löschen?")) return;
    await fetch(`/api/projekte/${project.id}/einbau`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId }) });
    if (viewPlan?.id === planId) { setViewPlan(null); setSelectedMarker(null); }
    await load();
  }

  async function createMarker() {
    if (!viewPlan || !newMarkerPos) return;
    setSaving(true);

    const matLines: string[] = [];
    for (const mid of selectedMaterialIds) {
      const pm = projectMaterials.find((m) => m.id === mid);
      if (pm) {
        const qty = materialQuantities[mid] || 1;
        matLines.push(`${pm.name} × ${qty} ${pm.unit}`);
      }
    }
    const materialStr = matLines.join("\n");
    const beschreibung = formatBeschreibung(markerLeistung, materialStr);

    await fetch(`/api/projekte/${project.id}/einbau`, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "marker", planId: viewPlan.id, xPercent: newMarkerPos.x, yPercent: newMarkerPos.y, beschreibung }) });

    for (const mid of selectedMaterialIds) {
      const pm = projectMaterials.find((m) => m.id === mid);
      if (pm) {
        const qty = materialQuantities[mid] || 1;
        await fetch(`/api/projekte/${project.id}/materialien`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: pm.id, quantityUsed: (pm.quantityUsed || 0) + qty }),
        });
      }
    }
    await loadMaterials();

    const u = await refreshPlan(viewPlan.id);
    if (u) setSelectedMarker(u.markers[u.markers.length - 1]);
    setMarkerDialogOpen(false); setNewMarkerPos(null); setSaving(false);
  }

  async function addExtraMaterial() {
    if (!extraMaterialName.trim()) return;
    try {
      await fetch(`/api/projekte/${project.id}/materialien`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: extraMaterialName.trim(),
          isAdditional: true,
          unit: extraMaterialEinheit,
          quantityPlanned: parseFloat(extraMaterialMenge) || 1,
        }),
      });
      await loadMaterials();
      setExtraMaterialName(""); setExtraMaterialMenge(""); setExtraMaterialEinheit("STUECK");
    } catch { /* ignore */ }
  }

  function toggleMaterial(id: string) {
    setSelectedMaterialIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    if (!materialQuantities[id]) setMaterialQuantities((prev) => ({ ...prev, [id]: 1 }));
  }

  function deleteNote(noteId: string) {
    if (!viewPlan) return;
    try {
      const key = `einbau-ann-${viewPlan.id}`;
      const s = localStorage.getItem(key);
      if (s) {
        const all = (JSON.parse(s) as Annotation[]).filter((a) => a.id !== noteId);
        localStorage.setItem(key, JSON.stringify(all));
        setNoteAnnotations(all.filter((a) => a.type === "note"));
      }
    } catch { /* ignore */ }
    setSelectedNoteId(null);
  }

  async function deleteMarker(markerId: string) {
    await fetch(`/api/projekte/${project.id}/einbau`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markerId }) });
    setSelectedMarker(null); await refreshPlan(viewPlan!.id);
  }

  async function generateSummary() {
    if (!viewPlan) return;
    setSummaryGenerating(true);
    try {
      const annKey = `einbau-ann-${viewPlan.id}`;
      let noteAnns: Annotation[] = [];
      try {
        const s = localStorage.getItem(annKey);
        if (s) noteAnns = (JSON.parse(s) as Annotation[]).filter((a) => a.type === "note");
      } catch { /* ignore */ }

      const w = window.open("", "_blank");
      if (!w) { alert("Popup blockiert – bitte Popups erlauben."); setSummaryGenerating(false); return; }

      const mrkrs = viewPlan.markers;
      let html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Zusammenfassung – ${viewPlan.titel}</title>
        <style>
          @media print { @page { margin: 15mm; } }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20px; color: #111; font-size: 13px; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          h2 { font-size: 15px; margin-top: 24px; margin-bottom: 8px; border-bottom: 2px solid #2563eb; padding-bottom: 4px; }
          h3 { font-size: 14px; margin-top: 20px; margin-bottom: 6px; border-bottom: 2px solid #f97316; padding-bottom: 4px; }
          .meta { color: #666; font-size: 11px; margin-bottom: 16px; }
          .plan-img { max-width: 100%; border: 1px solid #ddd; border-radius: 8px; margin: 12px 0; }
          .point { margin-bottom: 12px; padding: 8px 12px; border-radius: 6px; }
          .point-blue { background: #eff6ff; border-left: 4px solid #2563eb; }
          .point-orange { background: #fff7ed; border-left: 4px solid #f97316; }
          .point-num { font-weight: 700; margin-bottom: 4px; }
          .point-label { font-size: 11px; color: #666; }
          .point-content { margin-top: 4px; white-space: pre-wrap; }
          .note-img { max-width: 200px; max-height: 150px; border-radius: 4px; margin-top: 6px; }
          .btn-dl { display: inline-block; margin: 16px 0; padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; }
          .btn-dl:hover { background: #1d4ed8; }
          @media print { .no-print { display: none !important; } }
        </style></head><body>`;

      html += `<h1>${viewPlan.titel}</h1>`;
      html += `<div class="meta">${project.name || ""} · Erstellt am ${new Date(viewPlan.createdAt).toLocaleDateString("de-DE")}</div>`;
      html += `<img class="plan-img" src="${viewPlan.dateiUrl}" />`;

      if (mrkrs.length > 0) {
        html += `<h2>Material & Leistungen (${mrkrs.length})</h2>`;
        mrkrs.forEach((m, i) => {
          const p = parseBeschreibung(m.beschreibung || "");
          html += `<div class="point point-blue">`;
          html += `<div class="point-num">Punkt #${i + 1}</div>`;
          html += `<div class="point-label">${m.mitarbeiterName || "Unbekannt"} · ${new Date(m.createdAt).toLocaleDateString("de-DE")}</div>`;
          if (p.leistung) html += `<div class="point-content"><strong>Leistung:</strong> ${escapeHtml(p.leistung)}</div>`;
          if (p.material) html += `<div class="point-content"><strong>Material:</strong> ${escapeHtml(p.material)}</div>`;
          html += `</div>`;
        });
      }

      if (noteAnns.length > 0) {
        html += `<h3>Notizen (${noteAnns.length})</h3>`;
        noteAnns.forEach((n, i) => {
          html += `<div class="point point-orange">`;
          html += `<div class="point-num">Notiz #${i + 1}: ${escapeHtml(n.title || "")}</div>`;
          if (n.description) html += `<div class="point-content">${escapeHtml(n.description)}</div>`;
          if (n.image) html += `<img class="note-img" src="${n.image}" />`;
          html += `</div>`;
        });
      }

      html += `<button class="btn-dl no-print" onclick="window.print()">Drucken / Als PDF speichern</button>`;
      html += `</body></html>`;

      w.document.write(html);
      w.document.close();
    } catch (e) { console.error("Summary error:", e); }
    setSummaryGenerating(false);
  }


  if (loading) return <div className="flex justify-center py-10"><div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div>;

  if (viewPlan) {
    const isImage = /\.(png|jpg|jpeg|webp|gif)$/i.test(viewPlan.dateiUrl);
    const vProps = {
      url: viewPlan.dateiUrl, dateiName: viewPlan.dateiName, planId: viewPlan.id,
      placingMarker, markers: viewPlan.markers, selectedMarkerId: selectedMarker?.id || null,
      onPlaceMarker: (x: number, y: number) => {
        setNewMarkerPos({ x, y }); setMarkerLeistung("");
        setSelectedMaterialIds(new Set()); setMaterialQuantities({}); setMaterialSearch("");
        setExtraMaterialName(""); setExtraMaterialMenge(""); setExtraMaterialEinheit("STUECK");
        setMarkerDialogOpen(true); setPlacingMarker(false);
      },
      onSelectMarker: (m: Marker) => { setSelectedMarker(m); setPlacingMarker(false); },
      onDeactivateMarker: () => setPlacingMarker(false),
      placingNote,
      onDeactivateNote: () => setPlacingNote(false),
      onSummary: generateSummary,
      onNotesChange: (notes: Annotation[]) => setNoteAnnotations(notes),
    };

    const selectedParsed = selectedMarker ? parseBeschreibung(selectedMarker.beschreibung || "") : null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setViewPlan(null); setSelectedMarker(null); setPlacingMarker(false); setPlacingNote(false); }}>
              <ChevronLeft className="h-4 w-4 mr-1" />Zurück</Button>
            <h3 className="text-sm font-bold text-gray-900">{viewPlan.titel}</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={placingNote ? "default" : "outline"} size="sm" className="gap-1.5 text-xs"
              onClick={() => { setPlacingNote(!placingNote); setPlacingMarker(false); setSelectedMarker(null); }}>
              <StickyNote className="h-3.5 w-3.5" />{placingNote ? "Klicke auf Plan..." : "Notiz"}
            </Button>
            <Button variant={placingMarker ? "default" : "outline"} size="sm" className="gap-1.5 text-xs"
              onClick={() => { setPlacingMarker(!placingMarker); setPlacingNote(false); setSelectedMarker(null); }}>
              <Wrench className="h-3.5 w-3.5" />{placingMarker ? "Klicke auf Plan..." : "Material & Leistungen"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-8">
            {isImage ? <ImageViewerComp {...vProps} /> : <PdfCanvasViewer {...vProps} />}
          </div>
          <div className="lg:col-span-4 space-y-3">
            {selectedMarker && selectedParsed ? (
              <Card><CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5"><Wrench className="h-4 w-4 text-blue-600" />Punkt #{viewPlan.markers.indexOf(selectedMarker) + 1}</h4>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => deleteMarker(selectedMarker.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedMarker(null)}><X className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3 text-xs text-gray-500"><User className="h-3.5 w-3.5" />
                  <span>{selectedMarker.mitarbeiterName || "Unbekannt"} · {new Date(selectedMarker.createdAt).toLocaleDateString("de-DE")}</span></div>
                <div className="mb-3">
                  <label className="text-xs font-medium text-gray-700">Leistung</label>
                  <p className="text-sm text-gray-900 mt-1 bg-gray-50 rounded-lg p-2 whitespace-pre-wrap">{selectedParsed.leistung || "–"}</p>
                </div>
                {selectedParsed.material && (
                  <div className="mb-3">
                    <label className="text-xs font-medium text-gray-700">Material</label>
                    <p className="text-sm text-gray-900 mt-1 bg-blue-50 border border-blue-100 rounded-lg p-2 whitespace-pre-wrap">{selectedParsed.material}</p>
                    <p className="text-[10px] text-gray-400 mt-1">→ Reiter „Material" für vollständige Verwaltung</p>
                  </div>
                )}
              </CardContent></Card>
            ) : selectedNoteId && noteAnnotations.find((n) => n.id === selectedNoteId) ? (() => {
              const note = noteAnnotations.find((n) => n.id === selectedNoteId)!;
              const noteIdx = noteAnnotations.indexOf(note);
              return (
                <Card><CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5"><StickyNote className="h-4 w-4 text-orange-500" />Notiz #{noteIdx + 1}</h4>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => deleteNote(note.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedNoteId(null)}><X className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="text-xs font-medium text-gray-700">Titel</label>
                    <p className="text-sm text-gray-900 mt-1 bg-orange-50 rounded-lg p-2 font-medium">{note.title || "–"}</p>
                  </div>
                  {note.description && (
                    <div className="mb-3">
                      <label className="text-xs font-medium text-gray-700">Beschreibung</label>
                      <p className="text-sm text-gray-900 mt-1 bg-gray-50 rounded-lg p-2 whitespace-pre-wrap">{note.description}</p>
                    </div>
                  )}
                  {note.image && (
                    <div className="mb-3">
                      <label className="text-xs font-medium text-gray-700">Bild</label>
                      <img src={note.image} alt="Notiz-Bild" className="mt-1 w-full max-h-48 object-contain rounded-lg border" />
                    </div>
                  )}
                </CardContent></Card>
              );
            })() : (
              <Card><CardContent className="p-6 text-center"><MapPin className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-500">{placingMarker || placingNote ? "Klicke auf den Bauplan" : "Wähle einen Punkt oder setze einen neuen"}</p>
              </CardContent></Card>
            )}
            {(viewPlan.markers.length > 0 || noteAnnotations.length > 0) && (
              <Card><CardContent className="p-4">
                <h4 className="text-xs font-bold text-gray-900 mb-2">Alle Punkte ({viewPlan.markers.length + noteAnnotations.length})</h4>
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {viewPlan.markers.length > 0 && (
                    <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide px-2 pt-1">Material & Leistungen</p>
                  )}
                  {viewPlan.markers.map((m, i) => (
                    <button key={m.id} className={`w-full text-left p-2 rounded-lg text-xs transition-colors ${selectedMarker?.id === m.id ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50"}`}
                      onClick={() => { setSelectedMarker(m); setSelectedNoteId(null); setPlacingMarker(false); }}>
                      <div className="flex items-center gap-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold shrink-0">{i + 1}</div>
                        <div className="flex-1 min-w-0"><p className="text-gray-900 truncate">{parseBeschreibung(m.beschreibung || "").leistung || "–"}</p><p className="text-[10px] text-gray-400">{m.mitarbeiterName}</p></div>
                      </div>
                    </button>))}
                  {noteAnnotations.length > 0 && (
                    <p className="text-[10px] font-semibold text-orange-500 uppercase tracking-wide px-2 pt-2">Notizen</p>
                  )}
                  {noteAnnotations.map((n, i) => (
                    <button key={n.id} className={`w-full text-left p-2 rounded-lg text-xs transition-colors ${selectedNoteId === n.id ? "bg-orange-50 border border-orange-200" : "hover:bg-gray-50"}`}
                      onClick={() => { setSelectedNoteId(n.id); setSelectedMarker(null); }}>
                      <div className="flex items-center gap-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-bold shrink-0">{i + 1}</div>
                        <div className="flex-1 min-w-0"><p className="text-gray-900 truncate">{n.title || "–"}</p>{n.description && <p className="text-[10px] text-gray-400 truncate">{n.description}</p>}</div>
                      </div>
                    </button>))}
                </div>
              </CardContent></Card>)}
          </div>
        </div>

        <Dialog open={markerDialogOpen} onOpenChange={setMarkerDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Wrench className="h-5 w-5 text-blue-600" />Material & Leistungen</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Leistung – Was wurde gemacht?</label>
                <Textarea value={markerLeistung} onChange={(e) => setMarkerLeistung(e.target.value)} placeholder="z.B. Fußbodenheizung verlegt…" rows={3} autoFocus />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Verwendete Materialien</label>
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                  <Input value={materialSearch} onChange={(e) => setMaterialSearch(e.target.value)}
                    placeholder="Material suchen…" className="pl-8 text-xs h-9" />
                </div>
                <div className="border rounded-lg max-h-[200px] overflow-y-auto">
                  {projectMaterials.filter((m) =>
                    !materialSearch || m.name.toLowerCase().includes(materialSearch.toLowerCase())
                  ).length === 0 ? (
                    <p className="text-xs text-gray-400 p-3 text-center">Keine Materialien gefunden</p>
                  ) : (
                    projectMaterials.filter((m) =>
                      !materialSearch || m.name.toLowerCase().includes(materialSearch.toLowerCase())
                    ).map((m) => {
                      const selected = selectedMaterialIds.has(m.id);
                      return (
                        <div key={m.id} className={`flex items-center gap-2 px-3 py-2 border-b last:border-b-0 cursor-pointer transition-colors ${selected ? "bg-blue-50" : "hover:bg-gray-50"}`}
                          onClick={() => toggleMaterial(m.id)}>
                          <div className={`flex h-5 w-5 items-center justify-center rounded border-2 shrink-0 ${selected ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300"}`}>
                            {selected && <Check className="h-3 w-3" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{m.name}</p>
                            <p className="text-[10px] text-gray-400">Geplant: {m.quantityPlanned} {m.unit}{m.isAdditional ? " · Zusätzlich" : ""}</p>
                          </div>
                          {selected && (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <Input type="number" min={1} value={materialQuantities[m.id] || 1}
                                onChange={(e) => setMaterialQuantities((prev) => ({ ...prev, [m.id]: parseInt(e.target.value) || 1 }))}
                                className="w-16 h-7 text-xs text-center" />
                              <span className="text-[10px] text-gray-500">{m.unit}</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="border-t pt-3">
                <label className="text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" />Nicht aufgelistetes Material hinzufügen</label>
                <div className="flex gap-2">
                  <Input value={extraMaterialName} onChange={(e) => setExtraMaterialName(e.target.value)} placeholder="Materialname" className="text-xs h-8 flex-1" />
                  <Input value={extraMaterialMenge} onChange={(e) => setExtraMaterialMenge(e.target.value)} placeholder="Menge" type="number" min={1} className="text-xs h-8 w-20" />
                  <select value={extraMaterialEinheit} onChange={(e) => setExtraMaterialEinheit(e.target.value)} className="text-xs h-8 border rounded-md px-2">
                    <option value="STUECK">Stk</option><option value="METER">m</option><option value="QUADRATMETER">m²</option>
                    <option value="KUBIKMETER">m³</option><option value="KILOGRAMM">kg</option><option value="LITER">l</option><option value="PAUSCHAL">psch</option>
                  </select>
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={addExtraMaterial} disabled={!extraMaterialName.trim()}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Wird als „Zusätzliches Material" im Material-Reiter angelegt.</p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setMarkerDialogOpen(false); setNewMarkerPos(null); }}>Abbrechen</Button>
                <Button onClick={createMarker} disabled={saving}>{saving ? "Speichern…" : "Erstellen"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Plan list
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Einbau-Dokumentation</h3>
        <Button size="sm" className="gap-1.5" onClick={() => { setUploadError(null); fileRef.current?.click(); }} disabled={uploading}>
          <Upload className="h-3.5 w-3.5" />{uploading ? "Hochladen…" : "Bauplan hochladen"}</Button>
      </div>
      <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPlan(f); e.target.value = ""; }} />
      {uploadError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{uploadError}</div>}
      {uploading && <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg"><div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /><span className="text-sm text-blue-700">Hochladen…</span></div>}
      {plans.length === 0 && !uploading ? (
        <Card><CardContent className="p-10 text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" /><p className="text-sm text-gray-500">Keine Baupläne</p>
          <Button size="sm" className="mt-4 gap-1.5" onClick={() => fileRef.current?.click()}><Upload className="h-3.5 w-3.5" />Hochladen</Button>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {plans.map((plan) => (
            <Card key={plan.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewPlan(plan)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50"><FileText className="h-5 w-5 text-red-500" /></div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-bold truncate">{plan.titel}</p><p className="text-xs text-gray-400">{plan.dateiName}</p></div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={(e) => { e.stopPropagation(); deletePlan(plan.id); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span><MapPin className="h-3 w-3 inline" /> {plan.markers.length} Punkte</span>
                  <span>{new Date(plan.createdAt).toLocaleDateString("de-DE")}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
