import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Shield, ClipboardCheck, MapPin, AlertTriangle, Clock, TrendingUp, Building2, Award, ArrowRight,
} from "lucide-react";
import {
  useOpsAnalytics, AnalyticsShell, MetricCard, DayBars, HBars, Section, GOLD, pctClass, RangeFooter, SiteLink, GuardLink,
} from "./_shared";
import { analyticsService, PerfLeaderboard } from "@/lib/api/analyticsService";

export default function Reporting() {
  const { days, setDays, data, loading, error, reload } = useOpsAnalytics(30);
  const [lb, setLb] = useState<PerfLeaderboard | null>(null);
  useEffect(() => {
    let on = true;
    analyticsService.performanceGuards(days).then((r) => { if (on) setLb(r); }).catch(() => { if (on) setLb(null); });
    return () => { on = false; };
  }, [days]);
  const k = data?.kpis;

  return (
    <AnalyticsShell
      title="Analíticas de Operaciones"
      subtitle="Indicadores clave del servicio de vigilante para tu operación."
      days={days} setDays={setDays} loading={loading} error={error} reload={reload}
    >
      {data && k && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <MetricCard icon={<Shield size={16} />} accent={GOLD} value={k.guardsOnDuty} label="Vigilantes en servicio" sub="ahora mismo" />
            <MetricCard icon={<ClipboardCheck size={16} />} accent="#0ea5e9" value={`${k.coveragePct}%`} label="Cobertura de turnos" sub={`${k.shiftsCovered}/${k.shiftsTotal} cubiertos`} pct={k.coveragePct} />
            <MetricCard icon={<TrendingUp size={16} />} accent="#22c55e" value={`${k.rondaCompletionPct}%`} label="Rondas completadas" sub={`${k.rondasCompleted}/${k.rondasTotal}`} pct={k.rondaCompletionPct} />
            <MetricCard icon={<MapPin size={16} />} accent="#8b5cf6" value={`${k.locationCompliancePct}%`} label="Cumplimiento de ubicación" sub={`${k.scansValid}/${k.scansTotal} escaneos`} pct={k.locationCompliancePct} />
            <MetricCard icon={<AlertTriangle size={16} />} accent="#ef4444" value={k.incidentsTotal} label="Incidentes" sub={`${k.incidentsOpen} abiertos`} />
            <MetricCard icon={<Clock size={16} />} accent="#f59e0b" value={`${k.punctualityPct}%`} label="Puntualidad" sub={`${k.clockinsOnTime}/${k.clockinsTotal} a tiempo`} pct={k.punctualityPct} />
          </div>

          {/* Team performance — official score (links to Vigilantes) */}
          {lb && lb.averageScore != null && (
            <Section title="Desempeño del equipo" icon={<Award size={16} className="text-primary" />}>
              <div className="grid gap-5 md:grid-cols-3">
                <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-muted/10 p-4 text-center">
                  <p className="text-5xl font-bold text-primary">{lb.averageScore}</p>
                  <p className="text-xs text-muted-foreground">Puntuación promedio /100</p>
                  <p className="mt-1 text-xs text-muted-foreground">{lb.counts.scored} vigilantes evaluados · {lb.counts.excellent} excelentes</p>
                </div>
                <div className="md:col-span-2">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Vigilantes con menor desempeño</p>
                    <Link to="/analytics/guard" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">Ver ranking completo <ArrowRight size={12} /></Link>
                  </div>
                  {lb.guards.filter((g) => g.hasData).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin vigilantes evaluados en el período.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {lb.guards.filter((g) => g.hasData).slice(-5).reverse().map((g) => (
                        <li key={g.id} className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
                          <GuardLink id={g.id} name={g.name} />
                          <span className="text-sm font-bold" style={{ color: g.score != null && g.score >= 75 ? "#0284c7" : g.score != null && g.score >= 60 ? "#d97706" : "#e11d48" }}>
                            {g.score}<span className="text-[10px] font-normal text-muted-foreground">/100</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </Section>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <DayBars title="Escaneos de ronda por día" color={GOLD} points={data.trend.map((t) => ({ k: t.date, v: t.scans }))} />
            <DayBars title="Rondas completadas por día" color="#22c55e" points={data.trend.map((t) => ({ k: t.date, v: t.rondas }))} />
            <DayBars title="Incidentes por día" color="#ef4444" points={data.trend.map((t) => ({ k: t.date, v: t.incidents }))} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Section title="Incidentes por prioridad" icon={<AlertTriangle size={16} className="text-red-500" />}>
              <HBars items={data.incidentsByPriority} color="#ef4444" empty="Sin incidentes en el período." />
            </Section>
            <Section title="Sitios con más incidentes" icon={<Building2 size={16} className="text-primary" />}>
              <HBars items={data.topIncidentSites.map((s) => ({ label: s.site, count: s.count }))} color={GOLD} empty="Sin incidentes en el período." />
            </Section>
            <Section title="Asistencia" icon={<Clock size={16} className="text-amber-500" />}>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Horas trabajadas", value: data.attendance.hoursWorked, accent: "#0ea5e9" },
                  { label: "Tardanzas", value: data.attendance.late, accent: "#f59e0b" },
                  { label: "Salidas tempranas", value: data.attendance.earlyDeparture, accent: "#8b5cf6" },
                  { label: "Fuera de geocerca", value: data.attendance.geofenceViolations, accent: "#ef4444" },
                ].map((c) => (
                  <div key={c.label} className="rounded-xl border border-border bg-muted/10 p-3">
                    <p className="text-2xl font-semibold" style={{ color: c.accent }}>{c.value}</p>
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                  </div>
                ))}
              </div>
            </Section>
          </div>

          <Section title="Resumen por sitio de servicio" icon={<Building2 size={16} className="text-primary" />}>
            {data.perSite.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Sin actividad registrada en el período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Sitio</th>
                      <th className="px-3 py-2 text-right font-semibold">Vigilantes</th>
                      <th className="px-3 py-2 text-right font-semibold">Cobertura</th>
                      <th className="px-3 py-2 text-right font-semibold">Rondas</th>
                      <th className="px-3 py-2 text-right font-semibold">Ubicación</th>
                      <th className="px-3 py-2 text-right font-semibold">Incidentes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.perSite.slice(0, 10).map((s, i) => (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="px-3 py-2"><SiteLink id={s.id} name={s.site} /></td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{s.guards}</td>
                        <td className="px-3 py-2 text-right"><span className={pctClass(s.coveragePct)}>{s.coveragePct}%</span></td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{s.rondasCompleted}</td>
                        <td className="px-3 py-2 text-right"><span className={pctClass(s.locationCompliancePct)}>{s.locationCompliancePct}%</span></td>
                        <td className="px-3 py-2 text-right font-semibold text-foreground">{s.incidents}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <RangeFooter data={data} />
        </>
      )}
    </AnalyticsShell>
  );
}
