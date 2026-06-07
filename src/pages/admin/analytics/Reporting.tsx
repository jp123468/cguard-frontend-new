import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2, RefreshCw, Shield, ClipboardCheck, MapPin, AlertTriangle, Clock,
  Users, TrendingUp, Building2,
} from "lucide-react";
import { analyticsService, OpsAnalytics } from "@/lib/api/analyticsService";

const GOLD = "#C8860A";
const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const PRESETS: { id: string; label: string; days: number }[] = [
  { id: "1", label: "Hoy", days: 1 },
  { id: "7", label: "7 días", days: 7 },
  { id: "30", label: "30 días", days: 30 },
  { id: "90", label: "90 días", days: 90 },
];

// ── KPI card ────────────────────────────────────────────────────────────────
function MetricCard({ icon, value, label, sub, accent, pct }: {
  icon: React.ReactNode; value: string | number; label: string; sub?: string;
  accent: string; pct?: number;
}) {
  return (
    <Card className="h-full rounded-2xl border bg-card shadow-sm">
      <CardContent className="flex h-full flex-col p-4">
        <div className="flex items-center justify-between">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${accent}1A`, color: accent }}>{icon}</span>
          {typeof pct === "number" && <span className="text-xs font-semibold" style={{ color: accent }}>{pct}%</span>}
        </div>
        <p className="mt-3 text-3xl font-semibold leading-none text-foreground">{value}</p>
        <p className="mt-1 text-sm font-medium text-foreground/80">{label}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        {typeof pct === "number" && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: accent }} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── daily bar chart ───────────────────────────────────────────────────────────
function DayBars({ data, metric, color, label }: {
  data: OpsAnalytics["trend"]; metric: "scans" | "incidents" | "rondas"; color: string; label: string;
}) {
  const max = Math.max(1, ...data.map((d) => d[metric]));
  const total = data.reduce((s, d) => s + d[metric], 0);
  return (
    <Card className="rounded-2xl border bg-card shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{total}</span> total</p>
        </div>
        <div className="mt-3 flex h-24 items-end gap-[2px]">
          {data.map((d, i) => (
            <div key={i} title={`${d.date}: ${d[metric]}`} className="flex flex-1 items-end" style={{ height: "100%" }}>
              <div className="w-full rounded-t" style={{ height: `${(d[metric] / max) * 100}%`, minHeight: d[metric] > 0 ? 2 : 0, background: color }} />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>{data[0]?.date.slice(5)}</span>
          <span>{data[data.length - 1]?.date.slice(5)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ── horizontal bars (breakdowns) ──────────────────────────────────────────────
function HBars({ items, color, empty }: { items: { label: string; count: number }[]; color: string; empty: string }) {
  if (!items.length) return <p className="py-4 text-sm text-muted-foreground">{empty}</p>;
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-32 shrink-0 truncate text-xs text-foreground/80" title={it.label}>{it.label}</span>
          <div className="h-4 flex-1 overflow-hidden rounded bg-muted/40">
            <div className="h-full rounded" style={{ width: `${(it.count / max) * 100}%`, background: color }} />
          </div>
          <span className="w-8 shrink-0 text-right text-xs font-semibold text-foreground">{it.count}</span>
        </div>
      ))}
    </div>
  );
}

function Section({ title, icon, children, right }: { title: string; icon?: React.ReactNode; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <Card className="rounded-2xl border bg-card shadow-sm">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">{icon}{title}</h3>
          {right}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export default function Reporting() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<OpsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => {
    const end = new Date();
    const start = new Date(end.getTime() - (days - 1) * 86400000);
    return { startDate: fmtDate(start), endDate: fmtDate(end) };
  }, [days]);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      setData(await analyticsService.operations(range));
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar las analíticas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [days]);

  const k = data?.kpis;

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Analíticas de Operaciones</h1>
          <p className="text-sm text-muted-foreground">Indicadores clave del servicio de guardia para tu operación.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border bg-card p-0.5">
            {PRESETS.map((p) => (
              <button key={p.id} onClick={() => setDays(p.days)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${days === p.days ? "bg-[#C8860A] text-white" : "text-muted-foreground hover:text-foreground"}`}>
                {p.label}
              </button>
            ))}
          </div>
          <button onClick={load} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted/30" title="Actualizar">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-[#C8860A]" /></div>
      ) : error ? (
        <Card className="rounded-2xl border bg-card"><CardContent className="p-6 text-sm text-red-600">{error}</CardContent></Card>
      ) : !k ? null : (
        <>
          {/* KPI cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <MetricCard icon={<Shield size={16} />} accent={GOLD} value={k.guardsOnDuty} label="Guardias en servicio" sub="ahora mismo" />
            <MetricCard icon={<ClipboardCheck size={16} />} accent="#0ea5e9" value={`${k.coveragePct}%`} label="Cobertura de turnos" sub={`${k.shiftsCovered}/${k.shiftsTotal} cubiertos`} pct={k.coveragePct} />
            <MetricCard icon={<TrendingUp size={16} />} accent="#22c55e" value={`${k.rondaCompletionPct}%`} label="Rondas completadas" sub={`${k.rondasCompleted}/${k.rondasTotal}`} pct={k.rondaCompletionPct} />
            <MetricCard icon={<MapPin size={16} />} accent="#8b5cf6" value={`${k.locationCompliancePct}%`} label="Cumplimiento de ubicación" sub={`${k.scansValid}/${k.scansTotal} escaneos`} pct={k.locationCompliancePct} />
            <MetricCard icon={<AlertTriangle size={16} />} accent="#ef4444" value={k.incidentsTotal} label="Incidentes" sub={`${k.incidentsOpen} abiertos`} />
            <MetricCard icon={<Clock size={16} />} accent="#f59e0b" value={`${k.punctualityPct}%`} label="Puntualidad" sub={`${k.clockinsOnTime}/${k.clockinsTotal} a tiempo`} pct={k.punctualityPct} />
          </div>

          {/* Trend */}
          <div className="grid gap-4 lg:grid-cols-3">
            <DayBars data={data!.trend} metric="scans" color={GOLD} label="Escaneos de ronda por día" />
            <DayBars data={data!.trend} metric="rondas" color="#22c55e" label="Rondas completadas por día" />
            <DayBars data={data!.trend} metric="incidents" color="#ef4444" label="Incidentes por día" />
          </div>

          {/* Incidents + Attendance */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Section title="Incidentes por prioridad" icon={<AlertTriangle size={16} className="text-red-500" />}>
              <HBars items={data!.incidentsByPriority} color="#ef4444" empty="Sin incidentes en el período." />
            </Section>
            <Section title="Sitios con más incidentes" icon={<Building2 size={16} className="text-[#C8860A]" />}>
              <HBars items={data!.topIncidentSites.map((s) => ({ label: s.site, count: s.count }))} color={GOLD} empty="Sin incidentes en el período." />
            </Section>
            <Section title="Asistencia" icon={<Clock size={16} className="text-amber-500" />}>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Horas trabajadas", value: data!.attendance.hoursWorked, accent: "#0ea5e9" },
                  { label: "Tardanzas", value: data!.attendance.late, accent: "#f59e0b" },
                  { label: "Salidas tempranas", value: data!.attendance.earlyDeparture, accent: "#8b5cf6" },
                  { label: "Fuera de geocerca", value: data!.attendance.geofenceViolations, accent: "#ef4444" },
                ].map((c) => (
                  <div key={c.label} className="rounded-xl border border-border bg-muted/10 p-3">
                    <p className="text-2xl font-semibold" style={{ color: c.accent }}>{c.value}</p>
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                  </div>
                ))}
              </div>
            </Section>
          </div>

          {/* Per-site performance */}
          <Section title="Rendimiento por sitio de servicio" icon={<Building2 size={16} className="text-[#C8860A]" />}>
            {data!.perSite.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Sin actividad registrada en el período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Sitio</th>
                      <th className="px-3 py-2 text-right font-semibold">Guardias</th>
                      <th className="px-3 py-2 text-right font-semibold">Cobertura</th>
                      <th className="px-3 py-2 text-right font-semibold">Rondas</th>
                      <th className="px-3 py-2 text-right font-semibold">Ubicación</th>
                      <th className="px-3 py-2 text-right font-semibold">Incidentes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data!.perSite.map((s, i) => (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="px-3 py-2 font-medium text-foreground">{s.site}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{s.guards}</td>
                        <td className="px-3 py-2 text-right"><span className={s.coveragePct >= 90 ? "text-emerald-600" : s.coveragePct >= 70 ? "text-amber-600" : "text-rose-600"}>{s.coveragePct}%</span> <span className="text-muted-foreground">({s.shiftsCovered}/{s.shiftsTotal})</span></td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{s.rondasCompleted}</td>
                        <td className="px-3 py-2 text-right"><span className={s.locationCompliancePct >= 90 ? "text-emerald-600" : s.locationCompliancePct >= 70 ? "text-amber-600" : "text-rose-600"}>{s.locationCompliancePct}%</span></td>
                        <td className="px-3 py-2 text-right font-semibold text-foreground">{s.incidents}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* Per-guard performance */}
          <Section title="Rendimiento por guardia" icon={<Users size={16} className="text-[#C8860A]" />}>
            {data!.perGuard.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Sin asistencia registrada en el período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Guardia</th>
                      <th className="px-3 py-2 text-right font-semibold">Turnos</th>
                      <th className="px-3 py-2 text-right font-semibold">Horas</th>
                      <th className="px-3 py-2 text-right font-semibold">Puntualidad</th>
                      <th className="px-3 py-2 text-right font-semibold">Tardanzas</th>
                      <th className="px-3 py-2 text-right font-semibold">Incidentes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data!.perGuard.map((g, i) => (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="px-3 py-2 font-medium text-foreground">{g.name}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{g.shifts}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{g.hoursWorked}</td>
                        <td className="px-3 py-2 text-right"><span className={g.onTimePct >= 90 ? "text-emerald-600" : g.onTimePct >= 70 ? "text-amber-600" : "text-rose-600"}>{g.onTimePct}%</span></td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{g.late}</td>
                        <td className="px-3 py-2 text-right font-semibold text-foreground">{g.incidents}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <p className="text-center text-xs text-muted-foreground">
            Período: {data!.range.start.slice(0, 10)} → {data!.range.end.slice(0, 10)} · {data!.range.days} días
          </p>
        </>
      )}
    </div>
  );
}
