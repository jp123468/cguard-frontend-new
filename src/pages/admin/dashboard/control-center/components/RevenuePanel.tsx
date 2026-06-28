import { DollarSign, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/kit";
import type { RevenueSeries } from "../types";
import { GlassCard, SectionHeader } from "./primitives";
import { AreaChart } from "./AreaChart";

const money = (n: number) => new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

export function RevenuePanel({ revenue }: { revenue: RevenueSeries }) {
  const last = revenue.points[revenue.points.length - 1]?.value ?? 0;
  const prev = revenue.points[revenue.points.length - 2]?.value ?? 0;
  const growth = prev > 0 ? ((last - prev) / prev) * 100 : null;

  return (
    <GlassCard className="overflow-hidden">
      <SectionHeader title="Ingresos" icon={<DollarSign size={16} />} right={
        growth != null ? (
          <span className={`flex items-center gap-1 text-xs ${growth >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            <TrendingUp size={13} />{growth >= 0 ? "+" : ""}{growth.toFixed(1)}%
          </span>
        ) : null
      } />
      {!revenue.hasData ? (
        <EmptyState
          className="border-0 py-10"
          icon={<DollarSign />}
          title="Sin datos de facturación"
          description="Registra cobros (billing) para ver ingresos mensuales y tendencia."
        />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 px-4 pb-1">
            <Stat label="Acumulado 12m" value={money(revenue.total)} />
            <Stat label="Mes actual" value={money(last)} />
            <Stat label="Pagado / Pend." value="—" hint="Falta endpoint de desglose pagado/pendiente" />
          </div>
          <div className="px-2 pb-3">
            <AreaChart data={revenue.points} valuePrefix="$" />
          </div>
        </>
      )}
    </GlassCard>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div title={hint} className="rounded-lg bg-white/[0.03] px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
