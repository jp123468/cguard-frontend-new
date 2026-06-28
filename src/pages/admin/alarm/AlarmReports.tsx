import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, ShieldCheck, Siren, FlaskConical, RefreshCw, BarChart3 } from "lucide-react";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { alarmService } from "@/lib/api/alarmService";
import {
  PageContainer,
  PageHeader,
  Section,
  StatCard,
  Stagger,
  SkeletonCards,
  EmptyState,
} from "@/components/kit";

const PERIODS = [7, 30, 90, 365];

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
      <PageContainer width="wide">
        <PageHeader
          icon={<BarChart3 />}
          title="Reportes de falsas alarmas"
          subtitle="Disposiciones y tasa de falsas alarmas por panel."
          actions={
            <>
              <div className="flex rounded-lg border border-border p-0.5">
                {PERIODS.map((dd) => (
                  <button
                    key={dd}
                    onClick={() => setDays(dd)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${days === dd ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {dd}d
                  </button>
                ))}
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/alarm/queue">Cola</Link>
              </Button>
            </>
          }
        />

        {loading ? (
          <SkeletonCards count={6} className="lg:grid-cols-6" />
        ) : (
          <>
            <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <StatCard label="Total" value={o.total} icon={<BarChart3 />} accent="slate" />
              <StatCard label="Reales" value={o.real} icon={<ShieldCheck />} accent="green" />
              <StatCard label="Falsas" value={o.false} icon={<ShieldAlert />} accent="orange" />
              <StatCard label="Runaway" value={o.runaway} icon={<Siren />} accent="red" />
              <StatCard label="Pruebas" value={o.test} icon={<FlaskConical />} accent="slate" />
              <StatCard label="Tasa falsas" value={`${o.falseRate}%`} icon={<ShieldAlert />} accent="primary" />
            </Stagger>

            <Section title="Por panel" icon={<BarChart3 />}>
              {(!data?.panels || data.panels.length === 0) ? (
                <EmptyState
                  icon={<BarChart3 />}
                  title="Sin datos"
                  description="Sin casos cerrados con disposición en el período."
                />
              ) : (
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-2 font-medium">Panel</th>
                        <th className="px-3 py-2 font-medium">Cuenta</th>
                        <th className="px-3 py-2 text-right font-medium">Total</th>
                        <th className="px-3 py-2 text-right font-medium">Reales</th>
                        <th className="px-3 py-2 text-right font-medium">Falsas</th>
                        <th className="px-3 py-2 text-right font-medium">Runaway</th>
                        <th className="px-3 py-2 text-right font-medium">Tasa falsas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.panels.map((p: any) => (
                        <tr key={p.panelId} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                          <td className="px-4 py-2 font-medium text-foreground">{p.panelName}</td>
                          <td className="px-3 py-2 text-muted-foreground">{p.accountNumber || "—"}</td>
                          <td className="px-3 py-2 text-right">{p.total}</td>
                          <td className="px-3 py-2 text-right text-green-600">{p.real}</td>
                          <td className="px-3 py-2 text-right text-amber-600">{p.false}</td>
                          <td className="px-3 py-2 text-right text-red-600">{p.runaway}</td>
                          <td className="px-3 py-2 text-right font-semibold" style={{ color: p.falseRate >= 50 ? "#dc2626" : p.falseRate >= 25 ? "var(--primary)" : undefined }}>
                            {p.falseRate}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          </>
        )}
      </PageContainer>
    </AppLayout>
  );
}
