import { Fragment, useEffect, useState } from "react";
import { Shield, Clock, Award, Timer, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import {
  useOpsAnalytics, AnalyticsShell, MetricCard, Section, GOLD, pctClass, RangeFooter, GuardLink,
} from "./_shared";
import { analyticsService, PerfLeaderboard, GuardPerformance } from "@/lib/api/analyticsService";
import { Stagger, StatCard, EmptyState } from "@/components/kit";

const TIER: Record<string, { label: string; color: string; bg: string }> = {
  excellent: { label: "Excelente", color: "#059669", bg: "rgba(5,150,105,0.12)" },
  good: { label: "Bueno", color: "#0284c7", bg: "rgba(2,132,199,0.12)" },
  fair: { label: "Regular", color: "#d97706", bg: "rgba(217,119,6,0.12)" },
  poor: { label: "Bajo", color: "#e11d48", bg: "rgba(225,29,72,0.12)" },
};
const tierOf = (t: string) => TIER[t] || TIER.poor;

const FACTOR_ES: Record<string, string> = {
  punctuality: "Puntualidad", uniform: "Uniforme", inventory: "Inventario",
  consignas: "Consignas", rondas: "Rondas", quiz: "Quiz", training: "Capacitación",
};

function ScoreBadge({ score, tier }: { score: number | null; tier: string }) {
  const t = tierOf(tier);
  if (score == null) return <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">Sin datos</span>;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-bold" style={{ background: t.bg, color: t.color }}>
      {score}<span className="text-[10px] font-medium opacity-80">/100</span>
    </span>
  );
}

function FactorBars({ g }: { g: GuardPerformance }) {
  if (!g.components?.length) return <p className="text-xs text-muted-foreground">Sin factores con datos en el período.</p>;
  return (
    <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
      {g.components.map((c) => (
        <div key={c.key} className="flex items-center gap-2">
          <span className="w-24 shrink-0 text-xs text-foreground/80">{FACTOR_ES[c.key] || c.key}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full" style={{ width: `${c.score}%`, background: c.score >= 75 ? "#22c55e" : c.score >= 50 ? "#f59e0b" : "#ef4444" }} />
          </div>
          <span className="w-8 shrink-0 text-right text-xs font-semibold text-foreground">{c.score}</span>
          <span className="w-10 shrink-0 text-right text-[10px] text-muted-foreground">×{Math.round(c.weight * 100)}%</span>
        </div>
      ))}
    </div>
  );
}

export default function Guard() {
  const ops = useOpsAnalytics(30);
  const [lb, setLb] = useState<PerfLeaderboard | null>(null);
  const [lbLoading, setLbLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadLb = (period: number) => {
    setLbLoading(true);
    analyticsService.performanceGuards(period).then(setLb).catch(() => setLb(null)).finally(() => setLbLoading(false));
  };
  useEffect(() => { loadLb(ops.days); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [ops.days]);

  const k = ops.data?.kpis;
  const counts = lb?.counts;
  const tierTotal = counts ? counts.excellent + counts.good + counts.fair + counts.poor : 0;

  return (
    <AnalyticsShell
      title="Analíticas de Vigilantes"
      subtitle="Puntuación de desempeño (mismo algoritmo de la app) y asistencia de tu personal."
      days={ops.days} setDays={ops.setDays} loading={ops.loading} error={ops.error}
      reload={() => { ops.reload(); loadLb(ops.days); }}
    >
      {ops.data && k && (
        <>
          {/* KPIs */}
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard icon={<Award size={16} />} accent={GOLD} value={lb?.averageScore ?? "—"} label="Puntuación promedio" sub={`${counts?.scored ?? 0} vigilantes evaluados`} pct={lb?.averageScore ?? undefined} />
            <MetricCard icon={<Shield size={16} />} accent="#059669" value={counts?.excellent ?? 0} label="Excelentes" sub={`${counts?.good ?? 0} buenos · ${counts?.poor ?? 0} bajos`} />
            <MetricCard icon={<Shield size={16} />} accent="#0ea5e9" value={k.guardsOnDuty} label="En servicio" sub="ahora mismo" />
            <MetricCard icon={<Clock size={16} />} accent="#f59e0b" value={`${k.punctualityPct}%`} label="Puntualidad" sub={`${k.clockinsOnTime}/${k.clockinsTotal} a tiempo`} pct={k.punctualityPct} />
          </Stagger>

          {/* Tier distribution */}
          {!!tierTotal && (
            <Section title="Distribución de desempeño" icon={<Award size={16} className="text-primary" />}>
              <div className="flex h-3 w-full overflow-hidden rounded-full">
                {(["excellent", "good", "fair", "poor"] as const).map((t) => {
                  const v = counts![t]; if (!v) return null;
                  return <div key={t} title={`${tierOf(t).label}: ${v}`} style={{ width: `${(v / tierTotal) * 100}%`, background: tierOf(t).color }} />;
                })}
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                {(["excellent", "good", "fair", "poor"] as const).map((t) => (
                  <span key={t} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded" style={{ background: tierOf(t).color }} /> {tierOf(t).label}: <span className="font-semibold text-foreground">{counts![t]}</span></span>
                ))}
              </div>
            </Section>
          )}

          {/* Leaderboard */}
          <Section title="Ranking de desempeño" icon={<Award size={16} className="text-primary" />}>
            {lbLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin text-primary" size={18} /></div>
            ) : !lb || lb.guards.length === 0 ? (
              <EmptyState icon={<Award />} title="Sin evaluaciones" description="No hay vigilantes para evaluar." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">#</th>
                      <th className="px-3 py-2 text-left font-semibold">Vigilante</th>
                      <th className="px-3 py-2 text-left font-semibold">Puntuación</th>
                      <th className="px-3 py-2 text-left font-semibold">Nivel</th>
                      <th className="px-3 py-2 text-right font-semibold">Asistencia</th>
                      <th className="px-3 py-2 text-right font-semibold">Faltas</th>
                      <th className="px-3 py-2 text-right font-semibold">Atrasos</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {lb.guards.map((g, i) => {
                      const open = expanded === g.id;
                      return (
                        <Fragment key={g.id}>
                          <tr className="cursor-pointer hover:bg-muted/20" onClick={() => setExpanded(open ? null : g.id)}>
                            <td className="px-3 py-2 text-muted-foreground">{g.hasData ? i + 1 : "—"}</td>
                            <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}><GuardLink id={g.id} name={g.name} /></td>
                            <td className="px-3 py-2"><ScoreBadge score={g.score} tier={g.tier} /></td>
                            <td className="px-3 py-2"><span style={{ color: tierOf(g.tier).color }} className="text-xs font-semibold">{g.hasData ? tierOf(g.tier).label : "—"}</span></td>
                            <td className="px-3 py-2 text-right">{g.attendanceRate != null ? <span className={pctClass(g.attendanceRate)}>{g.attendanceRate}%</span> : <span className="text-muted-foreground">—</span>}</td>
                            <td className="px-3 py-2 text-right text-muted-foreground">{g.absences}</td>
                            <td className="px-3 py-2 text-right text-muted-foreground">{g.tardies}</td>
                            <td className="px-3 py-2 text-right text-muted-foreground">{open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</td>
                          </tr>
                          {open && (
                            <tr className="bg-muted/10">
                              <td colSpan={8} className="px-6 py-3">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Desglose de factores (puntaje × peso)</p>
                                <FactorBars g={g} />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* Attendance summary (raw) */}
          <Section title="Asistencia (registros de la app)" icon={<Timer size={16} className="text-sky-500" />}>
            <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Horas trabajadas", value: ops.data.attendance.hoursWorked, accent: "blue" as const },
                { label: "Tardanzas", value: ops.data.attendance.late, accent: "orange" as const },
                { label: "Salidas tempranas", value: ops.data.attendance.earlyDeparture, accent: "primary" as const },
                { label: "Fuera de geocerca", value: ops.data.attendance.geofenceViolations, accent: "red" as const },
              ].map((c) => (
                <StatCard key={c.label} accent={c.accent} label={c.label} value={c.value} />
              ))}
            </Stagger>
          </Section>

          <RangeFooter data={ops.data} />
        </>
      )}
    </AnalyticsShell>
  );
}
