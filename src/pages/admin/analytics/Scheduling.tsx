import { Card, CardContent } from "@/components/ui/card";
import { ClipboardCheck, CheckCircle2, AlertCircle, CalendarClock, Building2 } from "lucide-react";
import {
  useOpsAnalytics, AnalyticsShell, MetricCard, HBars, Section, GOLD, pctClass, RangeFooter, SiteLink,
} from "./_shared";

// Per-day stacked coverage: muted = scheduled, green overlay = covered.
function CoverageBars({ data }: { data: { date: string; scheduled: number; covered: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.scheduled));
  return (
    <div>
      <div className="flex h-28 items-end gap-[2px]">
        {data.map((d, i) => (
          <div key={i} title={`${d.date}: ${d.covered}/${d.scheduled} cubiertos`}
            className="relative flex-1 rounded-t bg-muted/50"
            style={{ height: `${(d.scheduled / max) * 100}%`, minHeight: d.scheduled > 0 ? 2 : 0 }}>
            <div className="absolute bottom-0 left-0 w-full rounded-t" style={{ height: `${d.scheduled > 0 ? (d.covered / d.scheduled) * 100 : 0}%`, background: "#22c55e" }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{data[0]?.date.slice(5)}</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-[#22c55e]" /> Cubiertos</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-muted-foreground/40" /> Programados</span>
        </span>
        <span>{data[data.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

export default function Scheduling() {
  const { days, setDays, data, loading, error, reload } = useOpsAnalytics(30);
  const k = data?.kpis;

  return (
    <AnalyticsShell
      title="Planificación de Turnos"
      subtitle="Cobertura de turnos y huecos por cubrir."
      days={days} setDays={setDays} loading={loading} error={error} reload={reload}
    >
      {data && k && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard icon={<ClipboardCheck size={16} />} accent="#0ea5e9" value={`${k.coveragePct}%`} label="Cobertura de turnos" sub={`${k.shiftsCovered}/${k.shiftsTotal}`} pct={k.coveragePct} />
            <MetricCard icon={<CheckCircle2 size={16} />} accent="#22c55e" value={k.shiftsCovered} label="Turnos cubiertos" sub="en el período" />
            <MetricCard icon={<AlertCircle size={16} />} accent="#ef4444" value={k.shiftsOpen ?? (k.shiftsTotal - k.shiftsCovered)} label="Turnos sin cubrir" sub="en el período" />
            <MetricCard icon={<CalendarClock size={16} />} accent={GOLD} value={data.upcomingUncoveredTotal} label="Próximos sin cubrir" sub="próximos 7 días" />
          </div>

          <Section title="Cobertura diaria (programados vs cubiertos)" icon={<ClipboardCheck size={16} className="text-sky-500" />}>
            {data.coverageTrend.every((d) => d.scheduled === 0) ? (
              <p className="py-4 text-sm text-muted-foreground">No hay turnos programados en el período.</p>
            ) : (
              <CoverageBars data={data.coverageTrend} />
            )}
          </Section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Próximos turnos sin cubrir (7 días)" icon={<CalendarClock size={16} className="text-[#C8860A]" />}>
              <HBars items={data.upcomingUncovered.map((s) => ({ label: s.site, count: s.count }))} color="#ef4444" empty="¡Todos los turnos próximos están cubiertos!" />
            </Section>
            <Section title="Cobertura por sitio" icon={<Building2 size={16} className="text-[#C8860A]" />}>
              {data.perSite.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">Sin turnos en el período.</p>
              ) : (
                <div className="space-y-2.5">
                  {data.perSite.filter((s) => s.shiftsTotal > 0).slice(0, 8).map((s, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate" title={s.site}><SiteLink id={s.id} name={s.site} /></span>
                        <span className={pctClass(s.coveragePct)}>{s.coveragePct}% <span className="text-muted-foreground">({s.shiftsCovered}/{s.shiftsTotal})</span></span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full" style={{ width: `${s.coveragePct}%`, background: s.coveragePct >= 90 ? "#22c55e" : s.coveragePct >= 70 ? "#f59e0b" : "#ef4444" }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>

          <RangeFooter data={data} />
        </>
      )}
    </AnalyticsShell>
  );
}
