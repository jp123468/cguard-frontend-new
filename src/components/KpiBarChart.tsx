import React from 'react';

type Point = {
  name: string;
  target: number;
  actual: number;
};

type Props = {
  data: Point[];
  width?: number;
  height?: number;
};

export default function KpiBarChart({ data, width = 720, height = 300 }: Props) {
  if (!data || !data.length) return null;

  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const maxValue = Math.max(
    ...data.flatMap((d) => [d.target ?? 0, d.actual ?? 0]),
    1,
  );

  const barGroupWidth = innerW / data.length;
  const barWidth = Math.min(120, Math.max(24, (barGroupWidth * 0.6) / 2));

  return (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      <svg width={width} height={height} style={{ display: 'block' }}>
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* horizontal grid lines */}
          {Array.from({ length: 5 }).map((_, i) => {
            const y = (i / 4) * innerH;
            return (
              <line
                key={i}
                x1={0}
                x2={innerW}
                y1={y}
                y2={y}
                stroke="#e9e9e9"
              />
            );
          })}

          {/* bars */}
          {data.map((d, i) => {
            const groupX = i * barGroupWidth + barGroupWidth / 2 - barWidth;
            const targetH = (d.target / maxValue) * innerH;
            const actualH = (d.actual / maxValue) * innerH;

            return (
              <g key={d.name}>
                {/* Target bar (left, gray) */}
                <rect
                  x={groupX}
                  y={innerH - targetH}
                  width={barWidth}
                  height={targetH}
                  fill="url(#gradGray)"
                >
                  <title>{`${d.name} - Target\n${d.target}`}</title>
                </rect>

                {/* Actual bar (right, green) */}
                <rect
                  x={groupX + barWidth + 8}
                  y={innerH - actualH}
                  width={barWidth}
                  height={actualH}
                  fill="#10b981"
                >
                  <title>{`${d.name} - Actual\n${d.actual}`}</title>
                </rect>

                {/* label */}
                <text
                  x={groupX + barWidth}
                  y={innerH + 18}
                  textAnchor="middle"
                  fontSize={12}
                  fill="#444"
                >
                  {d.name}
                </text>

                {/* target value label above bar */}
                <text
                  x={groupX + barWidth / 2}
                  y={innerH - targetH - 6}
                  textAnchor="middle"
                  fontSize={12}
                  fill="#333"
                >
                  {d.target}
                </text>

                {/* actual value label above bar */}
                <text
                  x={groupX + barWidth + 8 + barWidth / 2}
                  y={innerH - actualH - 6}
                  textAnchor="middle"
                  fontSize={12}
                  fill="#064e3b"
                >
                  {d.actual}
                </text>
              </g>
            );
          })}

          {/* y-axis values (0..max) */}
          {Array.from({ length: 5 }).map((_, i) => {
            const val = ((4 - i) / 4) * maxValue;
            const y = (i / 4) * innerH;
            return (
              <g key={`y-${i}`}>
                <text x={-8} y={y + 4} textAnchor="end" fontSize={10} fill="#666">
                  {val.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* defs */}
          <defs>
            <linearGradient id="gradGray" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#666" stopOpacity="1" />
              <stop offset="100%" stopColor="#ddd" stopOpacity="1" />
            </linearGradient>
          </defs>
        </g>
      </svg>

      {/* Legend (right side) */}
      <div style={{ minWidth: 120, display: 'flex', alignItems: 'center', height }}> 
        <div style={{ background: '#fff', padding: 12, borderRadius: 6, border: '1px solid #eee', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 14, height: 14, background: 'linear-gradient(#666,#ddd)', borderRadius: 3 }} />
            <div style={{ fontSize: 13, color: '#444' }}>Target</div>
          </div>
          <div style={{ height: 8 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 14, height: 14, background: '#10b981', borderRadius: 3 }} />
            <div style={{ fontSize: 13, color: '#444' }}>Actual</div>
          </div>
        </div>
      </div>
    </div>
  );
}
