import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Kpi } from "../types";
import { KPI_ROUTES } from "../navigation";
import { GlassCard, StatusDot, statusColor } from "./primitives";

export function KpiCard({ kpi, icon: Icon, index = 0 }: { kpi: Kpi; icon?: LucideIcon; index?: number }) {
  const navigate = useNavigate();
  const accent = kpi.status && kpi.status !== "neutral" ? statusColor(kpi.status as any) : "var(--cc-accent)";
  const TrendIcon = kpi.trend == null ? Minus : kpi.trend > 0.02 ? TrendingUp : kpi.trend < -0.02 ? TrendingDown : Minus;
  const trendColor = kpi.trend == null ? "text-muted-foreground" : kpi.trend > 0.02 ? "text-emerald-400" : kpi.trend < -0.02 ? "text-rose-400" : "text-muted-foreground";
  // Explicit per-kpi route wins; otherwise resolve from the central map by key.
  const to = kpi.to ?? KPI_ROUTES[kpi.key];

  return (
    <GlassCard
      delay={index * 0.04}
      className="p-4 group"
      onClick={to ? () => navigate(to) : undefined}
      ariaLabel={to ? `Ver ${kpi.label}` : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="grid h-11 w-11 place-items-center rounded-xl transition-transform group-hover:scale-105"
          style={{ background: `color-mix(in oklab, ${accent} 16%, transparent)`, color: accent }}>
          {Icon ? <Icon size={20} /> : <StatusDot color={accent} />}
        </div>
        {kpi.status && kpi.status !== "neutral" && (
          <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide"
            style={{ color: accent }}>
            <StatusDot color={accent} />
          </span>
        )}
      </div>
      <div className="mt-3">
        <div className="flex items-end gap-1">
          <motion.span
            key={String(kpi.value)}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="font-display text-2xl font-bold tabular-nums leading-tight text-foreground">
            {kpi.value}
          </motion.span>
          {kpi.unit && <span className="mb-0.5 text-xs text-muted-foreground">{kpi.unit}</span>}
          {kpi.fallback && (
            <span title={kpi.hint || "Sin datos en backend"} className="mb-1 ml-1 text-[9px] uppercase text-amber-400/80">s/d</span>
          )}
        </div>
        <div className="mt-0.5 flex items-center justify-between">
          <p className="cg-eyebrow truncate">{kpi.label}</p>
          {kpi.trend != null && (
            <span className={`flex items-center gap-0.5 text-[11px] ${trendColor}`}>
              <TrendIcon size={12} />{Math.abs(Math.round((kpi.trend || 0) * 100))}%
            </span>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
