"use client";

import { useRef, useState, useEffect } from "react";

interface DataPoint {
  label: string;
  value1: number;
  value2: number;
}

interface LineChartProps {
  data: DataPoint[];
  color1?: string;
  color2?: string;
  label1?: string;
  label2?: string;
  height?: number;
  formatValue?: (v: number) => string;
}

function formatK(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return v.toFixed(0);
}

export function LineChart({
  data,
  color1 = "#16a34a",
  color2 = "#dc2626",
  label1 = "Einnahmen",
  label2 = "Ausgaben",
  height = 220,
}: LineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; point: DataPoint } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    setWidth(containerRef.current.clientWidth);
    return () => observer.disconnect();
  }, []);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-400" style={{ height }}>
        Keine Daten vorhanden
      </div>
    );
  }

  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const allValues = data.flatMap((d) => [d.value1, d.value2]);
  const maxVal = Math.max(...allValues, 1);
  const roundedMax = Math.ceil(maxVal / (10 ** Math.floor(Math.log10(maxVal || 1)))) * (10 ** Math.floor(Math.log10(maxVal || 1)));

  const gridCount = 5;
  const gridLines = Array.from({ length: gridCount + 1 }, (_, i) => {
    const val = (roundedMax / gridCount) * i;
    const y = padding.top + innerH - (val / roundedMax) * innerH;
    return { y, val };
  });

  function toPath(values: number[]): string {
    if (values.length === 0) return "";
    return values
      .map((v, i) => {
        const x = padding.left + (i / Math.max(values.length - 1, 1)) * innerW;
        const y = padding.top + innerH - (v / roundedMax) * innerH;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  function toArea(values: number[]): string {
    if (values.length === 0) return "";
    const linePath = values
      .map((v, i) => {
        const x = padding.left + (i / Math.max(values.length - 1, 1)) * innerW;
        const y = padding.top + innerH - (v / roundedMax) * innerH;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
    const lastX = (padding.left + innerW).toFixed(1);
    const firstX = padding.left.toFixed(1);
    const baseY = (padding.top + innerH).toFixed(1);
    return `${linePath} L${lastX},${baseY} L${firstX},${baseY} Z`;
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - padding.left;
    const stepW = innerW / Math.max(data.length - 1, 1);
    const idx = Math.round(mouseX / stepW);
    if (idx >= 0 && idx < data.length) {
      const x = padding.left + (idx / Math.max(data.length - 1, 1)) * innerW;
      const y = e.clientY - rect.top;
      setTooltip({ x, y, point: data[idx] });
    }
  }

  return (
    <div ref={containerRef} className="relative w-full" style={{ height }}>
      {/* Legend */}
      <div className="absolute top-0 right-0 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color1 }} />
          <span className="text-gray-600">{label1}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color2 }} />
          <span className="text-gray-600">{label2}</span>
        </div>
      </div>

      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Grid lines */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={g.y}
              x2={padding.left + innerW}
              y2={g.y}
              stroke="#e5e7eb"
              strokeWidth="1"
              strokeDasharray={i === 0 ? "none" : "4 2"}
            />
            <text x={padding.left - 8} y={g.y + 4} fontSize="11" fill="#9ca3af" textAnchor="end">
              {formatK(g.val)}
            </text>
          </g>
        ))}

        {/* Bottom axis line */}
        <line
          x1={padding.left}
          y1={padding.top + innerH}
          x2={padding.left + innerW}
          y2={padding.top + innerH}
          stroke="#d1d5db"
          strokeWidth="1"
        />

        {/* Area fills */}
        <path d={toArea(data.map((d) => d.value1))} fill={color1} fillOpacity="0.1" />
        <path d={toArea(data.map((d) => d.value2))} fill={color2} fillOpacity="0.1" />

        {/* Lines */}
        <path d={toPath(data.map((d) => d.value1))} fill="none" stroke={color1} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d={toPath(data.map((d) => d.value2))} fill="none" stroke={color2} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots */}
        {data.map((d, i) => {
          const x = padding.left + (i / Math.max(data.length - 1, 1)) * innerW;
          const y1 = padding.top + innerH - (d.value1 / roundedMax) * innerH;
          const y2 = padding.top + innerH - (d.value2 / roundedMax) * innerH;
          return (
            <g key={i}>
              <circle cx={x} cy={y1} r="3" fill="white" stroke={color1} strokeWidth="2" />
              <circle cx={x} cy={y2} r="3" fill="white" stroke={color2} strokeWidth="2" />
            </g>
          );
        })}

        {/* X-axis labels */}
        {data.map((d, i) => {
          const x = padding.left + (i / Math.max(data.length - 1, 1)) * innerW;
          return (
            <text key={i} x={x} y={height - 10} fontSize="11" fill="#6b7280" textAnchor="middle">
              {d.label}
            </text>
          );
        })}

        {/* Tooltip line */}
        {tooltip && (
          <line
            x1={tooltip.x}
            y1={padding.top}
            x2={tooltip.x}
            y2={padding.top + innerH}
            stroke="#9ca3af"
            strokeWidth="1"
            strokeDasharray="4 2"
          />
        )}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs z-10"
          style={{
            left: Math.min(tooltip.x, width - 160),
            top: Math.max(tooltip.y - 70, 0),
          }}
        >
          <p className="font-semibold text-gray-900 mb-1">{tooltip.point.label}</p>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color1 }} />
            <span className="text-gray-600">{label1}:</span>
            <span className="font-medium">{tooltip.point.value1.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color2 }} />
            <span className="text-gray-600">{label2}:</span>
            <span className="font-medium">{tooltip.point.value2.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</span>
          </div>
        </div>
      )}
    </div>
  );
}
