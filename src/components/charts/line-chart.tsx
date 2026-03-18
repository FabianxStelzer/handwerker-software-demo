"use client";

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

export function LineChart({
  data,
  color1 = "#16a34a",
  color2 = "#dc2626",
  label1 = "Einnahmen",
  label2 = "Ausgaben",
  height = 220,
  formatValue = (v) => `${v.toFixed(2)} €`,
}: LineChartProps) {
  if (data.length === 0) return null;

  const allValues = data.flatMap((d) => [d.value1, d.value2]);
  const maxVal = Math.max(...allValues, 1);
  const padding = { top: 10, right: 10, bottom: 30, left: 0 };
  const chartW = 100;
  const chartH = height;
  const innerW = chartW - padding.left - padding.right;
  const innerH = chartH - padding.top - padding.bottom;

  function toPath(values: number[]): string {
    return values
      .map((v, i) => {
        const x = padding.left + (i / (values.length - 1)) * innerW;
        const y = padding.top + innerH - (v / maxVal) * innerH;
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");
  }

  function toArea(values: number[]): string {
    const path = values
      .map((v, i) => {
        const x = padding.left + (i / (values.length - 1)) * innerW;
        const y = padding.top + innerH - (v / maxVal) * innerH;
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");
    const lastX = padding.left + innerW;
    const firstX = padding.left;
    const baseY = padding.top + innerH;
    return `${path} L${lastX},${baseY} L${firstX},${baseY} Z`;
  }

  // Y-axis grid lines
  const gridCount = 5;
  const gridLines = Array.from({ length: gridCount + 1 }, (_, i) => {
    const val = (maxVal / gridCount) * i;
    const y = padding.top + innerH - (val / maxVal) * innerH;
    return { y, label: val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0) };
  });

  return (
    <div>
      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height: `${height}px` }}
      >
        {/* Grid */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={g.y}
              x2={padding.left + innerW}
              y2={g.y}
              stroke="#e5e7eb"
              strokeWidth="0.15"
            />
            <text x={padding.left + 1} y={g.y - 1} fontSize="2.5" fill="#9ca3af">
              {g.label}
            </text>
          </g>
        ))}

        {/* Area fills */}
        <path d={toArea(data.map((d) => d.value1))} fill={color1} fillOpacity="0.08" />
        <path d={toArea(data.map((d) => d.value2))} fill={color2} fillOpacity="0.08" />

        {/* Lines */}
        <path d={toPath(data.map((d) => d.value1))} fill="none" stroke={color1} strokeWidth="0.4" />
        <path d={toPath(data.map((d) => d.value2))} fill="none" stroke={color2} strokeWidth="0.4" />

        {/* X-axis labels */}
        {data.map((d, i) => {
          const x = padding.left + (i / (data.length - 1)) * innerW;
          return (
            <text key={i} x={x} y={chartH - 5} fontSize="2.5" fill="#9ca3af" textAnchor="middle">
              {d.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
