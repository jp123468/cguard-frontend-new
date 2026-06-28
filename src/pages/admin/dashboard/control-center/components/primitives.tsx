import { ReactNode, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import type { LiveStatus } from "../types";

export const STATUS_LABEL: Record<LiveStatus, string> = {
  online: "En línea", offline: "Fuera de línea", patrol: "En ronda",
  incident: "Incidente", delayed: "Retrasado", emergency: "Emergencia",
};

export function GlassCard({
  children, className = "", hover = true, scan = false, delay = 0, onClick, ariaLabel,
}: {
  children: ReactNode; className?: string; hover?: boolean; scan?: boolean; delay?: number;
  /** When provided the card becomes an accessible button (click + Enter/Space). */
  onClick?: () => void; ariaLabel?: string;
}) {
  const clickable = !!onClick;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.2, 0.8, 0.2, 1] }}
      className={`cc-glass ${hover ? "cc-glass-hover" : ""} ${scan ? "cc-scan" : ""} ${clickable ? "cursor-pointer" : ""} ${className}`}
      {...(clickable
        ? {
            role: "button",
            tabIndex: 0,
            "aria-label": ariaLabel,
            onClick,
            onKeyDown: (e: KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick!();
              }
            },
          }
        : {})}
    >
      {children}
    </motion.div>
  );
}

export function StatusDot({ status, color }: { status?: LiveStatus; color?: string }) {
  const c = color ?? statusColor(status);
  return <span className="cc-dot" style={{ background: c, color: c }} aria-label={status} />;
}

export function statusColor(s?: LiveStatus) {
  return ({
    online: "#22c55e", offline: "#64748b", patrol: "#38bdf8",
    incident: "#ef4444", delayed: "#f59e0b", emergency: "#e11d48",
  } as Record<string, string>)[s || "offline"] || "#64748b";
}

export function SectionHeader({ title, icon, right, live }: { title: string; icon?: ReactNode; right?: ReactNode; live?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2">
      <div className="flex items-center gap-2 min-w-0">
        {icon && <span className="cc-accent-text shrink-0">{icon}</span>}
        <h3 className="font-display text-sm font-semibold tracking-wide text-foreground truncate uppercase">{title}</h3>
        {live && (
          <span className="ml-1 flex items-center gap-1 text-[10px] font-semibold uppercase text-emerald-400">
            <StatusDot status="online" /> live
          </span>
        )}
      </div>
      {right}
    </div>
  );
}

/** Tiny inline sparkline used in KPI cards. */
export function Sparkline({ points, color = "currentColor", height = 28 }: { points: number[]; color?: string; height?: number }) {
  if (!points.length) return null;
  const w = 80, max = Math.max(...points, 1), min = Math.min(...points, 0);
  const span = max - min || 1;
  const d = points.map((p, i) => `${(i / (points.length - 1)) * w},${height - ((p - min) / span) * (height - 4) - 2}`).join(" ");
  return (
    <svg width={w} height={height} className="overflow-visible">
      <polyline points={d} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
      <circle cx={w} cy={height - ((points[points.length - 1] - min) / span) * (height - 4) - 2} r={2.4} fill={color} />
    </svg>
  );
}
