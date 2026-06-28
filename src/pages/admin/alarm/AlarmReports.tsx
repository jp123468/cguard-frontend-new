import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, ShieldCheck, Siren, FlaskConical, RefreshCw, BarChart3 } from "lucide-react";
import AppLayout from "@/layouts/app-layout";
import { Card } from "@/components/ui/card";
import { alarmService } from "@/lib/api/alarmService";

const PERIODS = [7, 30, 90, 365];

function Kpi({ label, value, icon, tone }: { label: string; value: string | number; icon: JSX.Element; tone?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon} {label}</div>
      <div className={`mt-1 text-2xl font-bold ${tone || "text-foreground"}`}>{value}</div>
    </Card>
  );
}

export default function AlarmReports() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    alarmService.falseAlarmReport({ days }).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [days]);

  const o = data?.overall || { total: 0, real: 0, false: 0, test: 0, runaway: 0, cancelled: 0, falseRate: 0 };

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
              <BarChart3 className="size-5 text-primary" /> Reportes de falsas alarmas
            </h1>
            <p className="text-sm text-muted-foreground">Dispositiones y tasa de falsas alarmas por panel.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border p-0.5">
              {PERIODS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${days === d ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {d}d
                </button>
              ))}
            </div>
            <Link to="/alarm/queue" className="text-xs text-primary hover:underline">Cola →</Link>
          </div>
        </div>

        {loading ? (
          <Card className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <RefreshCw className="size-4 animate-spin" /> Cargando…
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Kpi label="Total" value={o.total} icon={<BarChart3 className="size-3.5" />} />
              <Kpi label="Reales" value={o.real} icon={<ShieldCheck className="size-3.5 text-green-600" />} tone="text-green-600" />
              <Kpi label="Falsas" value={o.false} icon={<ShieldAlert className="size-3.5 text-amber-600" />} tone="text-amber-600" />
              <Kpi label="Runaway" value={o.runaway} icon={<Siren className="size-3.5 text-red-600" />} tone="text-red-600" />
              <Kpi label="Pruebas" value={o.test} icon={<FlaskConical className="size-3.5" />} />
              <Kpi label="Tasa falsas" value={`${o.falseRate}%`} icon={<ShieldAlert className="size-3.5 text-primary" />} tone="text-primary" />
            </div>

            <Card className="mt-5 overflow-hidden">
              <div className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">Por panel</div>
              {(!data?.panels || data.panels.length === 0) ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">Sin casos cerrados con disposición en el período.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="px-4 py-2">Panel</th>
                        <th className="px-3 py-2">Cuenta</th>
                        <th className="px-3 py-2 text-right">Total</th>
                        <th className="px-3 py-2 text-right">Reales</th>
                        <th className="px-3 py-2 text-right">Falsas</th>
                        <th className="px-3 py-2 text-right">Runaway</th>
                        <th className="px-3 py-2 text-right">Tasa falsas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.panels.map((p: any) => (
                        <tr key={p.panelId} className="border-b border-border/50">
                          <td className="px-4 py-2 font-medium text-foreground">{p.panelName}</td>
                          <td className="px-3 py-2 text-muted-foreground">{p.accountNumber || "—"}</td>
                          <td className="px-3 py-2 text-right">{p.total}</td>
                          <td className="px-3 py-2 text-right text-green-600">{p.real}</td>
                          <td className="px-3 py-2 text-right text-amber-600">{p.false}</td>
                          <td className="px-3 py-2 text-right text-red-600">{p.runaway}</td>
                          <td className="px-3 py-2 text-right font-semibold" style={{ color: p.falseRate >= 50 ? "#dc2626" : p.falseRate >= 25 ? "#C8860A" : undefined }}>
                            {p.falseRate}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
