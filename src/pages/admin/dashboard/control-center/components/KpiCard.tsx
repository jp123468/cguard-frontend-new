import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Kpi, LiveStatus } from "../types";
import { KPI_ROUTES } from "../navigation";
import { GlassCard, statusColor, STATUS_LABEL, Sparkline } from "./primitives";

export function KpiCard({ kpi, icon: Icon, index = 0 }: { kpi: Kpi; icon?: LucideIcon; index?: number }) {
  const navigate = useNavigate();
  const isStatus = !!kpi.status && kpi.status !== "neutral";
  const accent = isStatus ? statusColor(kpi.status as LiveStatus) : "var(--cc-accent)";
  const up = (kpi.trend ?? 0) > 0.02;
  const down = (kpi.trend ?? 0) < -0.02;
  const TrendIcon = up ? TrendingUp : down ? TrendingDown : null;
  const trendColor = up ? "text-emerald-400" : down ? "text-rose-400" : "text-muted-foreground";
  const to = kpi.to ?? KPI_ROUTES[kpi.key];
  const statusLabel = isStatus ? STATUS_LABEL[kpi.status as LiveStatus] : null;
  const hasFooter = !!kpi.sub || (!!kpi.spark && kpi.spark.length > 1);

  return (
    <GlassCard
      delay={index * 0.04}
      className="cc-kpi group relative overflow-hidden p-4"
      onClick={to ? () => navigate(to) : undefined}
      ariaLabel={to ? `Ver ${kpi.label}` : undefined}
    >
      {/* corner accent glow — the futuristic depth cue */}
      <span
        className="pointer-events-none absolute inset-0 opacity-70 transition-opacity group-hover:opacity-100"
        style={{ background: `radial-gradient(60% 60% at 100% 0%, color-mix(in oklab, ${accent} 24%, transparent), transparent 70%)` }}
      />

      <div className="relative flex items-start justify-between gap-2">
        <div
          className="grid h-11 w-11 place-items-center rounded-xl transition-transform group-hover:scale-105"
          style={{
            background: `color-mix(in oklab, ${accent} 16%, transparent)`,
            color: accent,
            boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${accent} 24%, transparent)`,
          }}
        >
          {Icon ? <Icon size={20} /> : null}
        </div>
        {statusLabel && (
          <span
            className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: accent, background: `color-mix(in oklab, ${accent} 13%, transparent)` }}
          >
            <span className="cc-dot" style={{ background: accent, color: accent, width: 6, height: 6 }} />
            {statusLabel}
          </span>
        )}
      </div>

      <div className="relative mt-3 flex items-end gap-1">
        <motion.span
          key={String(kpi.value)}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-[28px] font-bold leading-none tabular-nums text-foreground"
        >
          {kpi.value}
        </motion.span>
        {kpi.unit && <span className="mb-0.5 text-sm font-medium text-muted-foreground">{kpi.unit}</span>}
        {kpi.fallback && (
          <span title={kpi.hint || "Sin datos disponibles"} className="mb-1 ml-1 text-[9px] uppercase text-amber-400/80">s/d</span>
        )}
        {TrendIcon && kpi.trend != null && (
          <span className={`mb-0.5 ml-auto flex items-center gap-0.5 text-[11px] font-medium ${trendColor}`}>
            <TrendIcon size={12} />{Math.abs(Math.round((kpi.trend || 0) * 100))}%
          </span>
        )}
      </div>

      <p className="cg-eyebrow relative mt-1 truncate">{kpi.label}</p>

      {hasFooter && (
        <div className="relative mt-2.5 flex items-end justify-between gap-2 border-t border-border/40 pt-2 dark:border-white/[0.06]">
          <span className="truncate text-[11px] text-muted-foreground">{kpi.sub}</span>
          {kpi.spark && kpi.spark.length > 1 && <Sparkline points={kpi.spark} color={accent} height={22} />}
        </div>
      )}
    </GlassCard>
  );
}
