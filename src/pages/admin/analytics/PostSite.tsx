import { Building2, AlertTriangle, ClipboardCheck, MapPin } from "lucide-react";
import {
  useOpsAnalytics, AnalyticsShell, MetricCard, HBars, Section, GOLD, pctClass, RangeFooter, SiteLink,
} from "./_shared";
import { Stagger, EmptyState } from "@/components/kit";

export default function PostSite() {
  const { days, setDays, data, loading, error, reload } = useOpsAnalytics(30);
  const k = data?.kpis;

  return (
    <AnalyticsShell
      title="Analíticas por Sitio de Servicio"
      subtitle="Desempeño operativo de cada sitio: cobertura, rondas, ubicación e incidentes."
      days={days} setDays={setDays} loading={loading} error={error} reload={reload}
    >
      {data && k && (
        <>
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard icon={<Building2 size={16} />} accent={GOLD} value={data.perSite.length} label="Sitios con actividad" sub="en el período" />
            <MetricCard icon={<ClipboardCheck size={16} />} accent="#0ea5e9" value={`${k.coveragePct}%`} label="Cobertura promedio" sub={`${k.shiftsCovered}/${k.shiftsTotal}`} pct={k.coveragePct} />
            <MetricCard icon={<MapPin size={16} />} accent="#8b5cf6" value={`${k.locationCompliancePct}%`} label="Cumplimiento de ubicación" sub={`${k.scansValid}/${k.scansTotal} escaneos`} pct={k.locationCompliancePct} />
            <MetricCard icon={<AlertTriangle size={16} />} accent="#ef4444" value={k.incidentsTotal} label="Incidentes" sub={`${k.incidentsOpen} abiertos`} />
          </Stagger>

          <Section title="Sitios con más incidentes" icon={<AlertTriangle size={16} className="text-red-500" />}>
            <HBars items={data.topIncidentSites.map((s) => ({ label: s.site, count: s.count }))} color="#ef4444" empty="Sin incidentes en el período." />
          </Section>

          <Section title="Desempeño por sitio de servicio" icon={<Building2 size={16} className="text-primary" />}>
            {data.perSite.length === 0 ? (
              <EmptyState icon={<Building2 />} title="Sin actividad" description="Sin actividad registrada en el período." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Sitio</th>
                      <th className="px-3 py-2 text-right font-semibold">Vigilantes</th>
                      <th className="px-3 py-2 text-right font-semibold">Turnos</th>
                      <th className="px-3 py-2 text-right font-semibold">Cobertura</th>
                      <th className="px-3 py-2 text-right font-semibold">Rondas</th>
                      <th className="px-3 py-2 text-right font-semibold">Ubicación</th>
                      <th className="px-3 py-2 text-right font-semibold">Incidentes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.perSite.map((s, i) => (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="px-3 py-2"><SiteLink id={s.id} name={s.site} /></td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{s.guards}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{s.shiftsCovered}/{s.shiftsTotal}</td>
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
