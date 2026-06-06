import { useId } from "react";
import type { MonthPoint } from "../types";

/** Lightweight dependency-free area/line chart (the project has no chart lib).
 *  Renders a smooth gradient area with an accent stroke + hover dots. */
export function AreaChart({
  data, height = 160, color = "var(--cc-accent)", valuePrefix = "", valueSuffix = "",
}: { data: MonthPoint[]; height?: number; color?: string; valuePrefix?: string; valueSuffix?: string }) {
  const gid = useId().replace(/:/g, "");
  const W = 600, H = height, pad = 8;
  if (!data.length) return <div className="grid h-40 place-items-center text-xs text-muted-foreground">Sin datos</div>;

  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / Math.max(1, data.length - 1)) * (W - pad * 2);
  const y = (v: number) => H - pad - ((v - min) / span) * (H - pad * 2 - 14);

  const linePts = data.map((d, i) => [x(i), y(d.value)] as const);
  const path = smooth(linePts);
  const area = `${path} L ${x(data.length - 1)},${H - pad} L ${x(0)},${H - pad} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`area-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* gridlines */}
      {[0.25, 0.5, 0.75].map((g) => (
        <line key={g} x1={pad} x2={W - pad} y1={pad + g * (H - pad * 2)} y2={pad + g * (H - pad * 2)}
          stroke="currentColor" strokeOpacity="0.06" />
      ))}
      <path d={area} fill={`url(#area-${gid})`} />
      <path d={path} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      {linePts.map(([cx, cy], i) => (
        <g key={i} className="group">
          <circle cx={cx} cy={cy} r={8} fill="transparent" />
          <circle cx={cx} cy={cy} r={3} fill={color} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          <title>{`${data[i].month}: ${valuePrefix}${fmt(data[i].value)}${valueSuffix}`}</title>
        </g>
      ))}
    </svg>
  );
}

function smooth(pts: ReadonlyArray<readonly [number, number]>) {
  if (pts.length < 2) return `M ${pts[0]?.[0] ?? 0},${pts[0]?.[1] ?? 0}`;
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const cx = (x0 + x1) / 2;
    d += ` C ${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  return d;
}
function fmt(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n)); }
