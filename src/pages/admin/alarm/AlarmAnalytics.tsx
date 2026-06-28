import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Activity, Clock, Send, ShieldCheck, TrendingUp, AlertTriangle, PhoneCall, Download, Users, RefreshCw, BarChart3,
} from "lucide-react";
import AppLayout from "@/layouts/app-layout";
import { MetricCard, DayBars, HBars, Section, GOLD } from "@/pages/admin/analytics/_shared";
import { alarmService } from "@/lib/api/alarmService";
import {
  PageContainer,
  PageHeader,
  Stagger,
  SkeletonCards,
  EmptyState,
} from "@/components/kit";

const PERIODS = [7, 30, 90, 365];

function fmtDur(sec?: number): string {
  if (!sec || sec <= 0) return "—";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

const CAT_LABEL: Record<string, string> = {
  burglary: "Robo", fire: "Incendio", holdup: "Atraco", panic: "Pánico", medical: "Médica",
  tamper: "Sabotaje", trouble: "Avería", openclose: "Apertura/Cierre", test: "Prueba",
  supervisory: "Supervisión", restore: "Restauración", desconocido: "Desconocido",
};

function toItems(obj: Record<string, number>, labeler?: (k: string) => string) {
  return Object.entries(obj || {})
    .map(([k, v]) => ({ label: labeler ? labeler(k) : k, count: v as number }))
    .sort((a, b) => b.count - a.count);
}

function downloadCsv(rows: any[], filename: string) {
  if (!rows.length) { toast.info("Sin registros para exportar"); return; }
  const cols = Object.keys(rows[0]);
  const esc = (v: any) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function AlarmAnalytics() {
  const [days, setDays] = useState(30);
  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    alarmService.analytics({ days }).then(setD).catch(() => {}).finally(() => setLoading(false));
  }, [days]);

  const exportAudit = async () => {
    setExporting(true);
    try {
      const r = await alarmService.auditExport({ days });
      downloadCsv(r.rows || [], `auditoria-alarmas-${days}d.csv`);
      toast.success(`${r.count} registros exportados`);
    } catch (e: any) {
      toast.error(e?.message || "No se pudo exportar la auditoría");
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppLayout>
      <PageContainer width="wide">
        <PageHeader
          icon={<Activity />}
          title="Análisis de Monitoreo"
          subtitle="Tiempos de respuesta, cumplimiento de SLA y desempeño de operadores."
          actions={
            <>
              <div className="flex rounded-lg border border-border p-0.5">
                {PERIODS.map((p) => (
                  <button key={p} onClick={() => setDays(p)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${days === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                    {p}d
                  </button>
                ))}
              </div>
              <button onClick={exportAudit} disabled={exporting}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary disabled:opacity-50">
                {exporting ? <RefreshCw className="size-3.5 animate-spin" /> : <Download className="size-3.5" />} Exportar auditoría
              </button>
              <Link to="/alarm/reports" className="text-xs text-primary hover:underline">Falsas alarmas →</Link>
            </>
          }
        />

        {loading || !d ? (
          <SkeletonCards count={8} className="lg:grid-cols-4" />
        ) : (
          <>
            <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <MetricCard icon={<BarChart3 size={16} />} accent={GOLD} value={d.total} label="Casos" sub={`${d.open} abiertos`} />
              <MetricCard icon={<Clock size={16} />} accent="#0ea5e9" value={fmtDur(d.avgTtaSec)} label="Reconocimiento prom." sub="tiempo a reconocer" />
              <MetricCard icon={<Send size={16} />} accent="#8b5cf6" value={fmtDur(d.avgTtdSec)} label="Despacho prom." sub="tiempo a despachar" />
              <MetricCard icon={<TrendingUp size={16} />} accent="#22c55e" value={fmtDur(d.avgTtrSec)} label="Resolución prom." sub="tiempo a resolver" />
              <MetricCard icon={<ShieldCheck size={16} />} accent="#22c55e" value={`${d.slaAckCompliance}%`} label="Cumplimiento SLA" sub="reconocidos a tiempo" pct={d.slaAckCompliance} />
              <MetricCard icon={<AlertTriangle size={16} />} accent="#f59e0b" value={`${d.escalationRate}%`} label="Tasa de escalado" sub="superaron el SLA" pct={d.escalationRate} />
              <MetricCard icon={<AlertTriangle size={16} />} accent="#ef4444" value={`${d.falseRate}%`} label="Tasa de falsas" sub="falsas + runaway" pct={d.falseRate} />
              <MetricCard icon={<PhoneCall size={16} />} accent="#0ea5e9" value={d.ecvSatisfiedCases} label="ECV satisfecho" sub={`${d.totalCalls} llamadas`} />
            </Stagger>

            <div className="mt-5">
              <DayBars title="Casos de alarma por día" color={GOLD} points={(d.trend || []).map((t: any) => ({ k: t.k, v: t.v }))} />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
              <Section title="Por categoría" icon={<AlertTriangle size={16} className="text-primary" />}>
                <HBars items={toItems(d.byCategory, (k) => CAT_LABEL[k] || k)} color={GOLD} empty="Sin datos" />
              </Section>
              <Section title="Por prioridad" icon={<BarChart3 size={16} className="text-primary" />}>
                <HBars items={toItems(d.byPriority)} color="#8b5cf6" empty="Sin datos" />
              </Section>
              <Section title="Despachos" icon={<Send size={16} className="text-primary" />}>
                <HBars
                  items={toItems(d.dispatchByType, (k) => ({ guard: "Vigilante", police: "Policía", fire: "Bomberos", medical: "Médico" }[k] || k))}
                  color="#0ea5e9" empty="Sin despachos" />
              </Section>
            </div>

            <div className="mt-5">
              <Section title="Desempeño de operadores" icon={<Users size={16} className="text-primary" />}>
                {(!d.operators || d.operators.length === 0) ? (
                  <EmptyState
                    icon={<Users />}
                    title="Sin operadores"
                    description="Sin casos asignados a operadores en el período."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs text-muted-foreground">
                          <th className="px-2 py-2">Operador</th>
                          <th className="px-2 py-2 text-right">Casos</th>
                          <th className="px-2 py-2 text-right">Reconoc. prom.</th>
                          <th className="px-2 py-2 text-right">Despacho prom.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.operators.map((o: any) => (
                          <tr key={o.operatorId} className="border-b border-border/50">
                            <td className="px-2 py-2 font-medium text-foreground">{o.name}</td>
                            <td className="px-2 py-2 text-right">{o.handled}</td>
                            <td className="px-2 py-2 text-right text-muted-foreground">{fmtDur(o.avgTtaSec)}</td>
                            <td className="px-2 py-2 text-right text-muted-foreground">{fmtDur(o.avgTtdSec)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>
            </div>
          </>
        )}
      </PageContainer>
    </AppLayout>
  );
}
