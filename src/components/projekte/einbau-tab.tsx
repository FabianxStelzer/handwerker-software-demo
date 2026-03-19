"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Upload, MapPin, Plus, Trash2, X, ChevronLeft, FileText, User,
  ZoomIn, ZoomOut, Maximize, Download, Printer,
  Pencil, Type, Undo2, Eraser, Move, RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// ── Types ───────────────────────────────────────────────────

interface MarkerMaterial { id: string; name: string; menge: number; einheit: string; }
interface Marker {
  id: string; xPercent: number; yPercent: number; beschreibung: string;
  mitarbeiterId: string | null; mitarbeiterName: string | null;
  materialien: MarkerMaterial[]; createdAt: string;
}
interface EinbauPlan {
  id: string; titel: string; dateiUrl: string; dateiName: string;
  markers: Marker[]; createdAt: string;
}

interface Annotation {
  id: string;
  type: "path" | "text";
  points?: { x: number; y: number }[];
  x?: number; y?: number;
  text?: string;
  color: string;
  strokeWidth?: number;
  fontSize?: number;
}

const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#000000", "#f97316", "#a855f7"];
const STROKE_RANGE = { min: 0.08, max: 2, step: 0.02 };
const FONT_RANGE = { min: 1, max: 10, step: 0.5 };

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
  annotations, tool, color, strokeWidth, fontSize,
  selectedId, onSelect, onAdd, onUpdate,
  placingMarker, onPlaceMarker, svgRefOut,
}: {
  annotations: Annotation[];
  tool: "none" | "draw" | "text";
  color: string; strokeWidth: number; fontSize: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (a: Annotation) => void;
  onUpdate: (id: string, patch: Partial<Annotation>) => void;
  placingMarker: boolean;
  onPlaceMarker: (x: number, y: number) => void;
  svgRefOut: React.RefObject<SVGSVGElement | null>;
}) {
  const svgRef = svgRefOut || useRef<SVGSVGElement>(null);
  const currentPathRef = useRef<SVGPathElement>(null);
  const strokeRef = useRef<{ x: number; y: number }[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [dragging, setDragging] = useState<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [inlineText, setInlineText] = useState<{ x: number; y: number; value: string } | null>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);

  function getPos(e: React.MouseEvent): { x: number; y: number } | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 };
  }

  function commitInlineText() {
    if (inlineText && inlineText.value.trim()) {
      onAdd({ id: `ann-${Date.now()}`, type: "text", x: inlineText.x, y: inlineText.y, text: inlineText.value, color, fontSize });
    }
    setInlineText(null);
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (inlineText) return;
    const pos = getPos(e);
    if (!pos) return;

    if (placingMarker) { onPlaceMarker(pos.x, pos.y); return; }
    if (tool === "draw") {
      strokeRef.current = [pos];
      setDrawing(true);
      if (currentPathRef.current) currentPathRef.current.setAttribute("d", `M${pos.x} ${pos.y}`);
      e.preventDefault();
    } else if (tool === "text") {
      setInlineText({ x: pos.x, y: pos.y, value: "" });
      requestAnimationFrame(() => inlineInputRef.current?.focus());
    } else if (tool === "none") {
      onSelect(null);
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (drawing && tool === "draw") {
      const pos = getPos(e);
      if (!pos) return;
      strokeRef.current.push(pos);
      const d = strokeRef.current.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
      if (currentPathRef.current) currentPathRef.current.setAttribute("d", d);
    } else if (dragging) {
      const pos = getPos(e);
      if (!pos) return;
      const dx = pos.x - dragging.startX;
      const dy = pos.y - dragging.startY;
      onUpdate(dragging.id, { x: dragging.origX + dx, y: dragging.origY + dy });
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
    if (dragging) setDragging(null);
  }

  function startDrag(e: React.MouseEvent, ann: Annotation) {
    e.stopPropagation();
    if (tool !== "none") return;
    const pos = getPos(e);
    if (!pos) return;
    onSelect(ann.id);
    setDragging({ id: ann.id, startX: pos.x, startY: pos.y, origX: ann.x || 0, origY: ann.y || 0 });
  }

  const cursor = placingMarker ? "crosshair" : tool === "draw" ? "crosshair" : tool === "text" ? "text" : "default";
  const hasInteraction = tool !== "none" || placingMarker || inlineText !== null;

  return (
    <svg ref={svgRef} className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none"
      style={{ cursor, pointerEvents: hasInteraction ? "auto" : "none", zIndex: 15 }}
      onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      {annotations.map((ann) => {
        if (ann.type === "path" && ann.points && ann.points.length > 1) {
          const d = ann.points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
          return <path key={ann.id} d={d} stroke={ann.color} strokeWidth={ann.strokeWidth || 0.3}
            fill="none" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
            style={{ pointerEvents: "none" }} />;
        }
        if (ann.type === "text") {
          const isSelected = selectedId === ann.id;
          return (
            <g key={ann.id} style={{ pointerEvents: "auto", cursor: "move" }}
              onMouseDown={(e) => startDrag(e, ann)}>
              {isSelected && (
                <rect x={(ann.x || 0) - 0.5} y={(ann.y || 0) - (ann.fontSize || 3.5)}
                  width="20" height={(ann.fontSize || 3.5) * 1.3}
                  fill="none" stroke="#3b82f6" strokeWidth="0.15" strokeDasharray="0.4" rx="0.3" />
              )}
              <text x={ann.x || 0} y={ann.y || 0} fill={ann.color}
                fontSize={ann.fontSize || 3.5} fontWeight="bold" fontFamily="sans-serif"
                dominantBaseline="auto">{ann.text}</text>
            </g>
          );
        }
        return null;
      })}
      {/* Live stroke */}
      <path ref={currentPathRef} d="" stroke={color} strokeWidth={strokeWidth}
        fill="none" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {/* Inline text input */}
      {inlineText && (
        <foreignObject x={`${inlineText.x}%`} y={`${inlineText.y - fontSize * 1.1}%`} width="40%" height={`${fontSize * 2}%`} style={{ overflow: "visible" }}>
          <input
            ref={inlineInputRef}
            type="text"
            autoFocus
            value={inlineText.value}
            onChange={(e) => setInlineText({ ...inlineText, value: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter") commitInlineText(); if (e.key === "Escape") setInlineText(null); }}
            onBlur={commitInlineText}
            style={{
              fontSize: `${fontSize * 3.5}px`,
              fontWeight: "bold",
              fontFamily: "sans-serif",
              color,
              background: "rgba(255,255,255,0.85)",
              border: `2px solid ${color}`,
              borderRadius: "4px",
              padding: "2px 6px",
              outline: "none",
              width: "auto",
              minWidth: "80px",
            }}
            placeholder="Text eingeben…"
          />
        </foreignObject>
      )}
    </svg>
  );
}

// ── Export helper: render everything to a canvas for download/print ──

async function exportPlanToCanvas(
  contentEl: HTMLDivElement,
  svgEl: SVGSVGElement,
  markers: Marker[],
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

  // Draw markers
  for (let i = 0; i < markers.length; i++) {
    const m = markers[i];
    const mx = (m.xPercent / 100) * rect.width;
    const my = (m.yPercent / 100) * rect.height;
    ctx.beginPath();
    ctx.arc(mx, my - 14, 14, 0, Math.PI * 2);
    ctx.fillStyle = "#2563eb";
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "white";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${i + 1}`, mx, my - 14);
  }

  return canvas;
}

// ── Plan Viewer (shared by PDF + Image) ─────────────────────

function PlanViewer({
  planId, contentRef, svgRef, children, pdfReady,
  markers, selectedMarkerId, placingMarker,
  onPlaceMarker, onSelectMarker, onDeactivateMarker,
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
  url: string;
  dateiName: string;
}) {
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState<"none" | "draw" | "text">("none");
  const [color, setColor] = useState("#ef4444");
  const [strokeWidth, setStrokeWidth] = useState(0.3);
  const [fontSize, setFontSize] = useState(3.5);
  const [selectedAnnId, setSelectedAnnId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const ann = useAnnotations(planId);

  const selectedAnn = ann.annotations.find((a) => a.id === selectedAnnId) || null;

  // Ctrl+Scroll zoom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZoom((z) => Math.min(Math.max(z + (e.deltaY > 0 ? -0.15 : 0.15), 0.25), 5)); }
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function activateTool(t: "draw" | "text") {
    if (tool === t) { setTool("none"); return; }
    setTool(t);
    setSelectedAnnId(null);
    onDeactivateMarker();
  }

  // Deactivate draw tools when marker mode activates
  useEffect(() => { if (placingMarker) { setTool("none"); setSelectedAnnId(null); } }, [placingMarker]);

  async function handleExport(mode: "download" | "print") {
    if (!contentRef.current || !svgRef.current) return;
    setExporting(true);
    try {
      const canvas = await exportPlanToCanvas(contentRef.current, svgRef.current, markers);
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
      {/* Toolbar row 1: Zoom + tools */}
      <div className="flex items-center gap-1 mb-1.5 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.max(z - 0.25, 0.25))}><ZoomOut className="h-3.5 w-3.5" /></Button>
        <span className="text-xs font-medium text-gray-700 w-12 text-center">{Math.round(zoom * 100)}%</span>
        <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.min(z + 0.25, 5))}><ZoomIn className="h-3.5 w-3.5" /></Button>
        <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setZoom(1)}><Maximize className="h-3.5 w-3.5" /></Button>

        <div className="h-4 border-l border-gray-300 mx-0.5" />

        <Button variant={tool === "draw" ? "default" : "outline"} size="sm" className="gap-1 text-xs" onClick={() => activateTool("draw")}>
          <Pencil className="h-3.5 w-3.5" />Zeichnen
        </Button>
        <Button variant={tool === "text" ? "default" : "outline"} size="sm" className="gap-1 text-xs" onClick={() => activateTool("text")}>
          <Type className="h-3.5 w-3.5" />Text
        </Button>

        {ann.annotations.length > 0 && (
          <>
            <Button variant="outline" size="sm" onClick={ann.undo}><Undo2 className="h-3.5 w-3.5" /></Button>
            <Button variant="outline" size="sm" className="text-red-500" onClick={ann.clear}><Eraser className="h-3.5 w-3.5" /></Button>
          </>
        )}

        <div className="flex-1" />
        <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleExport("download")} disabled={exporting}>
          <Download className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleExport("print")} disabled={exporting}>
          <Printer className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Toolbar row 2: Options (when tool active or annotation selected) */}
      {(tool !== "none" || selectedAnn) && (
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap bg-gray-50 rounded-lg px-2 py-1.5">
          <span className="text-[10px] text-gray-500 mr-1">Farbe:</span>
          {COLORS.map((c) => (
            <button key={c} className={`h-5 w-5 rounded-full border-2 transition-transform ${color === c ? "scale-125 border-gray-800" : "border-gray-300 hover:scale-110"}`}
              style={{ backgroundColor: c }} onClick={() => {
                setColor(c);
                if (selectedAnn) ann.update(selectedAnn.id, { color: c });
              }} />
          ))}

          {(tool === "draw" || selectedAnn?.type === "path") && (
            <>
              <div className="h-4 border-l border-gray-300 mx-1" />
              <span className="text-[10px] text-gray-500 mr-1">Stärke:</span>
              <input type="range" min={STROKE_RANGE.min} max={STROKE_RANGE.max} step={STROKE_RANGE.step}
                value={strokeWidth} onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setStrokeWidth(v);
                  if (selectedAnn?.type === "path") ann.update(selectedAnn.id, { strokeWidth: v });
                }}
                className="w-24 h-1.5 accent-gray-800 cursor-pointer" />
              <span className="text-[10px] text-gray-500 w-8">{strokeWidth.toFixed(2)}</span>
            </>
          )}

          {(tool === "text" || selectedAnn?.type === "text") && (
            <>
              <div className="h-4 border-l border-gray-300 mx-1" />
              <span className="text-[10px] text-gray-500 mr-1">Größe:</span>
              <input type="range" min={FONT_RANGE.min} max={FONT_RANGE.max} step={FONT_RANGE.step}
                value={fontSize} onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setFontSize(v);
                  if (selectedAnn?.type === "text") ann.update(selectedAnn.id, { fontSize: v });
                }}
                className="w-24 h-1.5 accent-gray-800 cursor-pointer" />
              <span className="text-[10px] text-gray-500 w-8">{fontSize.toFixed(1)}</span>
            </>
          )}

          {selectedAnn?.type === "text" && (
            <>
              <div className="h-4 border-l border-gray-300 mx-1" />
              <input type="text" value={selectedAnn.text || ""} onChange={(e) => ann.update(selectedAnn.id, { text: e.target.value })}
                className="text-[11px] h-6 px-1.5 border border-gray-300 rounded bg-white min-w-[100px]"
                placeholder="Text…" />
              <Button variant="outline" size="sm" className="gap-1 text-[10px] h-6 text-red-500" onClick={() => { ann.remove(selectedAnn.id); setSelectedAnnId(null); }}>
                <Trash2 className="h-3 w-3" />
              </Button>
              <span className="text-[10px] text-gray-400 ml-1"><Move className="h-3 w-3 inline" /> Ziehen zum Verschieben</span>
            </>
          )}
        </div>
      )}

      {/* Scroll container – FIXED HEIGHT */}
      <div ref={scrollRef} className="overflow-auto rounded-lg border border-gray-200" style={{ height: "75vh", background: "#525659" }}>
        <div ref={contentRef as any} className="relative mx-auto" style={{ width: `${zoom * 100}%` }}>
          {children}

          {/* SVG drawing overlay */}
          <SvgOverlay
            svgRefOut={svgRef}
            annotations={ann.annotations}
            tool={tool}
            color={color}
            strokeWidth={strokeWidth}
            fontSize={fontSize}
            selectedId={selectedAnnId}
            onSelect={setSelectedAnnId}
            onAdd={ann.add}
            onUpdate={ann.update}
            placingMarker={placingMarker}
            onPlaceMarker={onPlaceMarker}
          />

          {/* Markers */}
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
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PDF Canvas Viewer ───────────────────────────────────────

function PdfCanvasViewer(props: {
  url: string; dateiName: string; planId: string;
  placingMarker: boolean; markers: Marker[]; selectedMarkerId: string | null;
  onPlaceMarker: (x: number, y: number) => void; onSelectMarker: (m: Marker) => void; onDeactivateMarker: () => void;
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
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  return (
    <PlanViewer planId={props.planId} contentRef={contentRef} svgRef={svgRef} pdfReady={true}
      markers={props.markers} selectedMarkerId={props.selectedMarkerId} placingMarker={props.placingMarker}
      onPlaceMarker={props.onPlaceMarker} onSelectMarker={props.onSelectMarker} onDeactivateMarker={props.onDeactivateMarker}
      url={props.url} dateiName={props.dateiName}>
      <img src={props.url} alt={props.dateiName} className="w-full h-auto block relative z-[1]" draggable={false} style={{ pointerEvents: "none" }} />
    </PlanViewer>
  );
}

// ── Main component ──────────────────────────────────────────

export function EinbauTab({ project }: { project: any }) {
  const [plans, setPlans] = useState<EinbauPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [viewPlan, setViewPlan] = useState<EinbauPlan | null>(null);
  const [placingMarker, setPlacingMarker] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<Marker | null>(null);
  const [markerDialogOpen, setMarkerDialogOpen] = useState(false);
  const [newMarkerPos, setNewMarkerPos] = useState<{ x: number; y: number } | null>(null);
  const [markerBeschreibung, setMarkerBeschreibung] = useState("");
  const [saving, setSaving] = useState(false);

  const [newMaterialName, setNewMaterialName] = useState("");
  const [newMaterialMenge, setNewMaterialMenge] = useState("1");
  const [newMaterialEinheit, setNewMaterialEinheit] = useState("Stk");

  const load = useCallback(async () => {
    const res = await fetch(`/api/projekte/${project.id}/einbau`);
    if (res.ok) setPlans(await res.json());
    setLoading(false);
  }, [project.id]);

  useEffect(() => { load(); }, [load]);


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
    await fetch(`/api/projekte/${project.id}/einbau`, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "marker", planId: viewPlan.id, xPercent: newMarkerPos.x, yPercent: newMarkerPos.y, beschreibung: markerBeschreibung }) });
    const u = await refreshPlan(viewPlan.id);
    if (u) setSelectedMarker(u.markers[u.markers.length - 1]);
    setMarkerDialogOpen(false); setNewMarkerPos(null); setSaving(false);
  }

  async function addMaterialToMarker(name: string, menge: string, einheit: string, isExtra: boolean) {
    if (!selectedMarker || !name.trim()) return;
    setSaving(true);
    await fetch(`/api/projekte/${project.id}/einbau`, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "material", markerId: selectedMarker.id, name, menge, einheit, isExtra }) });
    const u = await refreshPlan(viewPlan!.id);
    if (u) { const m = u.markers.find((mk: Marker) => mk.id === selectedMarker.id); if (m) setSelectedMarker(m); }
    setNewMaterialName(""); setNewMaterialMenge("1"); setNewMaterialEinheit("Stk"); setSaving(false);
  }

  async function deleteMaterial(materialId: string) {
    await fetch(`/api/projekte/${project.id}/einbau`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ materialId }) });
    const u = await refreshPlan(viewPlan!.id);
    if (u && selectedMarker) setSelectedMarker(u.markers.find((mk: Marker) => mk.id === selectedMarker.id) || null);
  }

  async function deleteMarker(markerId: string) {
    await fetch(`/api/projekte/${project.id}/einbau`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markerId }) });
    setSelectedMarker(null); await refreshPlan(viewPlan!.id);
  }


  if (loading) return <div className="flex justify-center py-10"><div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div>;

  if (viewPlan) {
    const isImage = /\.(png|jpg|jpeg|webp|gif)$/i.test(viewPlan.dateiUrl);
    const vProps = {
      url: viewPlan.dateiUrl, dateiName: viewPlan.dateiName, planId: viewPlan.id,
      placingMarker, markers: viewPlan.markers, selectedMarkerId: selectedMarker?.id || null,
      onPlaceMarker: (x: number, y: number) => { setNewMarkerPos({ x, y }); setMarkerBeschreibung(""); setMarkerDialogOpen(true); setPlacingMarker(false); },
      onSelectMarker: (m: Marker) => { setSelectedMarker(m); setPlacingMarker(false); },
      onDeactivateMarker: () => setPlacingMarker(false),
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setViewPlan(null); setSelectedMarker(null); setPlacingMarker(false); }}>
              <ChevronLeft className="h-4 w-4 mr-1" />Zurück</Button>
            <h3 className="text-sm font-bold text-gray-900">{viewPlan.titel}</h3>
          </div>
          <Button variant={placingMarker ? "default" : "outline"} size="sm" className="gap-1.5 text-xs"
            onClick={() => { setPlacingMarker(!placingMarker); setSelectedMarker(null); }}>
            <MapPin className="h-3.5 w-3.5" />{placingMarker ? "Klicke auf Plan..." : "Punkt setzen"}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-8">
            {isImage ? <ImageViewerComp {...vProps} /> : <PdfCanvasViewer {...vProps} />}
          </div>
          <div className="lg:col-span-4 space-y-3">
            {selectedMarker ? (
              <Card><CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-gray-900">Punkt #{viewPlan.markers.indexOf(selectedMarker) + 1}</h4>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => deleteMarker(selectedMarker.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedMarker(null)}><X className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3 text-xs text-gray-500"><User className="h-3.5 w-3.5" />
                  <span>{selectedMarker.mitarbeiterName || "Unbekannt"} · {new Date(selectedMarker.createdAt).toLocaleDateString("de-DE")}</span></div>
                <div className="mb-4"><label className="text-xs font-medium text-gray-700">Durchgeführte Arbeit</label>
                  <p className="text-sm text-gray-900 mt-1 bg-gray-50 rounded-lg p-2 whitespace-pre-wrap">{selectedMarker.beschreibung || "–"}</p></div>
                <div className="mb-3">
                  <label className="text-xs font-medium text-gray-700">Materialien</label>
                  {selectedMarker.materialien.length > 0 && (
                    <div className="mt-1 space-y-1">{selectedMarker.materialien.map((m) => (
                      <div key={m.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                        <div><p className="text-xs font-medium">{m.name}</p><p className="text-[10px] text-gray-400">{m.menge} {m.einheit}</p></div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => deleteMaterial(m.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>))}</div>)}
                  <div className="space-y-1.5 mt-2">
                    <Input placeholder="Material" value={newMaterialName} onChange={(e) => setNewMaterialName(e.target.value)} className="text-xs" />
                    <div className="grid grid-cols-2 gap-1.5">
                      <Input type="number" placeholder="Menge" value={newMaterialMenge} onChange={(e) => setNewMaterialMenge(e.target.value)} className="text-xs" />
                      <Input placeholder="Einheit" value={newMaterialEinheit} onChange={(e) => setNewMaterialEinheit(e.target.value)} className="text-xs" />
                    </div>
                    <Button size="sm" className="w-full gap-1.5 text-xs" onClick={() => addMaterialToMarker(newMaterialName, newMaterialMenge, newMaterialEinheit, false)} disabled={saving || !newMaterialName.trim()}>
                      <Plus className="h-3.5 w-3.5" />Hinzufügen</Button>
                  </div>
                </div>
              </CardContent></Card>
            ) : (
              <Card><CardContent className="p-6 text-center"><MapPin className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-500">{placingMarker ? "Klicke auf den Bauplan" : "Wähle einen Punkt oder setze einen neuen"}</p>
              </CardContent></Card>
            )}
            {viewPlan.markers.length > 0 && (
              <Card><CardContent className="p-4">
                <h4 className="text-xs font-bold text-gray-900 mb-2">Alle Punkte ({viewPlan.markers.length})</h4>
                <div className="space-y-1 max-h-[250px] overflow-y-auto">
                  {viewPlan.markers.map((m, i) => (
                    <button key={m.id} className={`w-full text-left p-2 rounded-lg text-xs transition-colors ${selectedMarker?.id === m.id ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50"}`}
                      onClick={() => { setSelectedMarker(m); setPlacingMarker(false); }}>
                      <div className="flex items-center gap-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold shrink-0">{i + 1}</div>
                        <div className="flex-1 min-w-0"><p className="text-gray-900 truncate">{m.beschreibung || "–"}</p><p className="text-[10px] text-gray-400">{m.mitarbeiterName} · {m.materialien.length} Mat.</p></div>
                      </div>
                    </button>))}
                </div>
              </CardContent></Card>)}
          </div>
        </div>

        <Dialog open={markerDialogOpen} onOpenChange={setMarkerDialogOpen}>
          <DialogContent><DialogHeader><DialogTitle>Neuer Einbau-Punkt</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <Textarea value={markerBeschreibung} onChange={(e) => setMarkerBeschreibung(e.target.value)} placeholder="Was wurde gemacht?" rows={3} autoFocus />
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
