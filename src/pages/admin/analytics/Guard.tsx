import { Shield, Clock, Timer, AlertTriangle } from "lucide-react";
import {
  useOpsAnalytics, AnalyticsShell, MetricCard, Section, GOLD, pctClass, RangeFooter,
} from "./_shared";

export default function Guard() {
  const { days, setDays, data, loading, error, reload } = useOpsAnalytics(30);
  const k = data?.kpis;

  return (
    <AnalyticsShell
      title="Analíticas de Guardias"
      subtitle="Asistencia, puntualidad y desempeño de tu personal de seguridad."
      days={days} setDays={setDays} loading={loading} error={error} reload={reload}
    >
      {data && k && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard icon={<Shield size={16} />} accent={GOLD} value={k.guardsOnDuty} label="Guardias en servicio" sub="ahora mismo" />
            <MetricCard icon={<Clock size={16} />} accent="#22c55e" value={`${k.punctualityPct}%`} label="Puntualidad" sub={`${k.clockinsOnTime}/${k.clockinsTotal} a tiempo`} pct={k.punctualityPct} />
            <MetricCard icon={<Timer size={16} />} accent="#0ea5e9" value={data.attendance.hoursWorked} label="Horas trabajadas" sub="en el período" />
            <MetricCard icon={<AlertTriangle size={16} />} accent="#ef4444" value={data.attendance.late} label="Tardanzas" sub={`${data.attendance.geofenceViolations} fuera de geocerca`} />
          </div>

          <Section title="Desempeño por guardia" icon={<Shield size={16} className="text-[#C8860A]" />}>
            {data.perGuard.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Sin asistencia registrada en el período. Los datos provienen de los registros de entrada/salida de los guardias en la app.</p>
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
                    {data.perGuard.map((g, i) => (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="px-3 py-2 font-medium text-foreground">{g.name}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{g.shifts}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{g.hoursWorked}</td>
                        <td className="px-3 py-2 text-right"><span className={pctClass(g.onTimePct)}>{g.onTimePct}%</span></td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{g.late}</td>
                        <td className="px-3 py-2 text-right font-semibold text-foreground">{g.incidents}</td>
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
