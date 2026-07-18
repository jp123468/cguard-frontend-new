import { useEffect, useMemo, useRef, useState } from 'react';
import useScrollToTopOnMount from '@/hooks/useScrollToTopOnMount';
import { clientService } from '@/lib/api/clientService';
import { Section, EmptyState, StatusBadge, Modal } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  TrendingUp, TrendingDown, Search, AlertTriangle, Route as RouteIcon, Users, MapPin, Clock,
  ShieldCheck, FileBarChart, CalendarClock, Plus, Trash2, Download, RefreshCw, FileText,
} from 'lucide-react';

const inputCls = 'flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-all placeholder:text-muted-foreground hover:border-ring/40 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]';

const TONE_HEX: Record<string, string> = { red: '#ef4444', green: '#16a34a', blue: '#2563eb', violet: '#7c3aed', orange: '#f59e0b' };
const TYPE_COLORS = ['#2563eb', '#06b6d4', '#f59e0b', '#f97316', '#ef4444', '#7c3aed', '#16a34a'];
const QUICK_ICON: Record<string, any> = { incidents: AlertTriangle, rounds: RouteIcon, attendance: Users, coverage: MapPin, 'guard-activity': Users };
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtDT = (iso: string) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
const fmtD = (iso: string) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' }); };

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return <div className="h-8" />;
  const max = Math.max(...data, 1), min = Math.min(...data, 0);
  const w = 120, h = 32, rng = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / rng) * (h - 4) - 2}`).join(' ');
  return <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-full" preserveAspectRatio="none"><polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function Donut({ segments, centerTop, centerBottom }: { segments: Array<{ value: number; color: string }>; centerTop: string; centerBottom: string }) {
  const R = 52, C = 2 * Math.PI * R, sum = segments.reduce((a, s) => a + s.value, 0) || 1;
  let off = 0;
  return (
    <div className="relative h-[130px] w-[130px] shrink-0">
      <svg viewBox="0 0 130 130" className="h-full w-full -rotate-90">
        <circle cx="65" cy="65" r={R} fill="none" stroke="currentColor" className="text-muted" strokeWidth="15" />
        {segments.map((s, i) => { const len = (s.value / sum) * C; const el = <circle key={i} cx="65" cy="65" r={R} fill="none" stroke={s.color} strokeWidth="15" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} />; off += len; return el; })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center"><div className="font-display text-xl font-bold leading-none">{centerTop}</div><div className="text-[11px] text-muted-foreground">{centerBottom}</div></div>
    </div>
  );
}

function AreaChart({ data }: { data: Array<{ date: string; value: number }> }) {
  if (!data || data.length < 2) return <EmptyState icon={<FileBarChart className="h-5 w-5" />} title="Sin datos" description="No hay actividad en el período." />;
  const w = 520, h = 180, pad = 24;
  const max = Math.max(...data.map((d) => d.value), 1);
  const x = (i: number) => pad + (i / (data.length - 1)) * (w - pad * 2);
  const y = (v: number) => h - pad - (v / max) * (h - pad * 2);
  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(d.value)}`).join(' ');
  const area = `${line} L${x(data.length - 1)},${h - pad} L${x(0)},${h - pad} Z`;
  const ticks = 4;
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-[200px] w-full min-w-[440px]">
        {Array.from({ length: ticks + 1 }).map((_, i) => { const yy = pad + (i / ticks) * (h - pad * 2); return <line key={i} x1={pad} y1={yy} x2={w - pad} y2={yy} stroke="currentColor" className="text-muted" strokeWidth="1" strokeDasharray="3 3" />; })}
        <path d={area} fill="url(#areaGrad)" opacity="0.9" />
        <path d={line} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round" />
        <defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" /><stop offset="100%" stopColor="#2563eb" stopOpacity="0" /></linearGradient></defs>
      </svg>
      <div className="flex justify-between px-6 text-[10px] text-muted-foreground">
        {data.filter((_, i) => i % Math.ceil(data.length / 6) === 0).map((d) => <span key={d.date}>{new Date(d.date).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}</span>)}
      </div>
    </div>
  );
}

function Kpi({ icon, k }: { icon: any; k: any }) {
  const up = (k.deltaPct || 0) >= 0;
  const good = k.invert ? !up : up; // for incidents/response, up is bad
  const val = k.isTime && k.value != null ? `${Math.floor(k.value / 60).toString().padStart(2, '0')}:${(k.value % 60).toString().padStart(2, '0')}` : (k.value ?? 0).toLocaleString('es-EC');
  return (
    <div className="cg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs text-muted-foreground truncate">{k.label}</div>
        <span className={`grid h-7 w-7 place-items-center rounded-lg [&_svg]:size-3.5`} style={{ background: `${TONE_HEX[k.tone] || '#2563eb'}1f`, color: TONE_HEX[k.tone] || '#2563eb' }}>{icon}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-2xl font-bold leading-none">{val}{k.unit ? <span className="ml-1 text-sm font-medium text-muted-foreground">{k.unit}</span> : ''}</span>
        {k.deltaPct != null && k.deltaPct !== 0 && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${good ? 'text-emerald-600' : 'text-red-600'}`}>{up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{Math.abs(k.deltaPct)}%</span>
        )}
      </div>
      <div className="mt-1.5"><Sparkline data={k.spark || []} color={TONE_HEX[k.tone] || '#2563eb'} /></div>
      <div className="text-[11px] text-muted-foreground">Vs. período anterior</div>
    </div>
  );
}

export default function ClientReports({ client }: { client: any }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  useScrollToTopOnMount(containerRef);

  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(ymd(new Date(today.getTime() - 30 * 24 * 3600 * 1000)));
  const [to, setTo] = useState(ymd(today));
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 8;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState('');

  const [schedOpen, setSchedOpen] = useState(false);
  const [schedForm, setSchedForm] = useState({ name: '', type: 'incidents', frequency: 'weekly' });
  const [saving, setSaving] = useState(false);

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try { const d = await clientService.getClientReports(client.id, { from, to, q: q.trim() || undefined, page, perPage }); setData(d); }
    catch { /* silent */ } finally { setLoading(false); }
  };
  useEffect(() => { const t = setTimeout(() => load(), 250); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [from, to, q, page, client.id]);

  const kpis: any[] = data?.kpis || [];
  const cumplimiento = data?.cumplimiento || {};
  const porTipo: any[] = data?.incidentesPorTipo || [];
  const porEstado: any[] = data?.incidentesPorEstado || [];
  const actividades: any[] = data?.actividadesPorDia || [];
  const quickReports: any[] = data?.quickReports || [];
  const programados: any[] = data?.programados || [];
  const reportsList: any[] = data?.reportsList || [];
  const reportsTotal = data?.reportsTotal ?? 0;
  const pageCount = Math.max(1, Math.ceil(reportsTotal / perPage));
  const fmtUpdated = data?.updatedAt ? new Date(data.updatedAt).toLocaleString('es-EC', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

  const KPI_ICONS: Record<string, any> = { incidentes: <AlertTriangle />, rondas: <RouteIcon />, asistencias: <Users />, checkpoints: <MapPin />, respuesta: <Clock /> };

  const doExport = async (type: string) => {
    setExporting(type);
    try { await clientService.exportClientReport(client.id, type, from, to); toast.success('Exportación descargada'); }
    catch { toast.error('No se pudo exportar'); } finally { setExporting(''); }
  };
  const saveSchedule = async () => {
    setSaving(true);
    try { await clientService.createReportSchedule(client.id, schedForm); toast.success('Reporte programado'); setSchedOpen(false); setSchedForm({ name: '', type: 'incidents', frequency: 'weekly' }); await load(true); }
    catch { toast.error('No se pudo programar'); } finally { setSaving(false); }
  };
  const delSchedule = async (s: any) => { if (!window.confirm(`¿Eliminar "${s.name}"?`)) return; try { await clientService.deleteReportSchedule(client.id, s.id); await load(true); } catch { toast.error('No se pudo eliminar'); } };

  if (loading && !data) return <div className="p-8 text-sm text-muted-foreground">Cargando reportes…</div>;

  return (
    <div ref={containerRef} className="space-y-4">
      {/* Date range */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm"><span className="text-xs font-medium text-muted-foreground">Período</span>
          <input type="date" className={`${inputCls} w-auto`} value={from} onChange={(e) => setFrom(e.target.value)} /><span className="text-muted-foreground">–</span>
          <input type="date" className={`${inputCls} w-auto`} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button size="sm" variant="brand" onClick={() => setSchedOpen(true)}><CalendarClock className="mr-1.5 h-4 w-4" /> Programar reporte</Button>
      </div>

      {/* KPI row + cumplimiento */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => <Kpi key={k.key} k={k} icon={KPI_ICONS[k.key] || <FileBarChart />} />)}
        <div className="cg-card p-4">
          <div className="mb-1 text-xs text-muted-foreground">Cumplimiento de puestos</div>
          <div className="flex items-center gap-2">
            <Donut segments={[{ value: cumplimiento.cumplidos || 0, color: '#2563eb' }, { value: cumplimiento.parciales || 0, color: '#f59e0b' }, { value: cumplimiento.incumplidos || 0, color: '#ef4444' }].filter((s) => s.value > 0)} centerTop={`${cumplimiento.pct ?? 0}%`} centerBottom="Cumplim." />
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-600" />Cumplidos <b className="ml-auto">{cumplimiento.cumplidosPct ?? 0}%</b></div>
              <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" />Parciales <b className="ml-auto">{cumplimiento.parcialesPct ?? 0}%</b></div>
              <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" />Incumplidos <b className="ml-auto">{cumplimiento.incumplidosPct ?? 0}%</b></div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts + right column */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2.2fr_1fr]">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Section title="Incidentes por tipo" icon={<AlertTriangle className="h-4 w-4" />}>
            {porTipo.length === 0 ? <EmptyState icon={<AlertTriangle className="h-5 w-5" />} title="Sin incidentes" description="No hay incidentes en el período." /> : (
              <div className="flex items-center gap-3">
                <Donut segments={porTipo.map((t, i) => ({ value: t.count, color: TYPE_COLORS[i % TYPE_COLORS.length] }))} centerTop={String(data?.incidentesTotal ?? 0)} centerBottom="Total" />
                <div className="flex-1 space-y-1.5 text-xs">
                  {porTipo.slice(0, 6).map((t, i) => (<div key={t.type} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: TYPE_COLORS[i % TYPE_COLORS.length] }} /><span className="truncate">{t.type}</span><span className="ml-auto tabular-nums text-muted-foreground">{t.count} ({t.pct}%)</span></div>))}
                </div>
              </div>
            )}
          </Section>

          <Section title="Incidentes por estado" icon={<ShieldCheck className="h-4 w-4" />}>
            {porEstado.every((e) => e.count === 0) ? <EmptyState icon={<ShieldCheck className="h-5 w-5" />} title="Sin incidentes" description="No hay incidentes en el período." /> : (
              <div className="space-y-3 pt-1">
                {porEstado.map((e) => (
                  <div key={e.key}>
                    <div className="mb-1 flex items-center justify-between text-sm"><span className="text-muted-foreground">{e.label}</span><span className="tabular-nums text-xs">{e.count} ({e.pct}%)</span></div>
                    <div className="h-2 w-full rounded-full bg-muted"><div className={`h-2 rounded-full ${e.key === 'resuelto' ? 'bg-emerald-500' : e.key === 'investigacion' ? 'bg-blue-500' : 'bg-red-500'}`} style={{ width: `${Math.max(2, e.pct)}%` }} /></div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Actividades por día" icon={<TrendingUp className="h-4 w-4" />}><AreaChart data={actividades} /></Section>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <Section title="Filtros aplicados" icon={<Search className="h-4 w-4" />}>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs">Período: {fmtD(from)} – {fmtD(to)}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs">Cliente: {client?.name || client?.companyName || 'Cliente'}</span>
            </div>
          </Section>

          <Section title="Reportes rápidos" icon={<FileBarChart className="h-4 w-4" />}>
            <div className="space-y-1">
              {quickReports.map((r) => { const Icon = QUICK_ICON[r.key] || FileText; return (
                <button key={r.key} onClick={() => doExport(r.key)} disabled={!!exporting} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted/60 disabled:opacity-50">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary [&_svg]:size-4"><Icon /></span>
                  <span className="flex-1">{r.label}</span>
                  {exporting === r.key ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : <Download className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
              ); })}
            </div>
          </Section>

          <Section title="Reportes programados" icon={<CalendarClock className="h-4 w-4" />}
            action={<button onClick={() => setSchedOpen(true)} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"><Plus className="h-3.5 w-3.5" /> Programar</button>}>
            {programados.length === 0 ? <EmptyState icon={<CalendarClock className="h-5 w-5" />} title="Sin reportes programados" description="Programa un reporte recurrente por correo." /> : (
              <div className="divide-y">
                {programados.map((s) => (
                  <div key={s.id} className="flex items-start justify-between gap-2 py-2.5">
                    <div className="min-w-0"><div className="text-sm font-medium truncate">{s.name}</div><div className="text-xs text-muted-foreground">{s.frequency || s.cron}</div></div>
                    <div className="flex shrink-0 items-center gap-1.5"><StatusBadge tone={s.active ? 'green' : 'slate'} dot={false}>{s.active ? 'Activo' : 'Pausado'}</StatusBadge><button onClick={() => delSchedule(s)} className="rounded-md p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button></div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>

      {/* Todos los reportes */}
      <Section title="Todos los reportes" icon={<FileText className="h-4 w-4" />}>
        <div className="mb-3 relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input className={`${inputCls} pl-8`} placeholder="Buscar reporte por nombre…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        {reportsList.length === 0 ? (
          <EmptyState icon={<FileText className="h-5 w-5" />} title="Sin reportes" description="Aún no hay reportes operativos generados para este cliente en el período." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-2 py-2 font-medium">Nombre del reporte</th><th className="px-2 py-2 font-medium">Tipo</th><th className="px-2 py-2 font-medium">Sede / Puesto</th><th className="px-2 py-2 font-medium">Generado por</th><th className="px-2 py-2 font-medium">Generado el</th><th className="px-2 py-2 font-medium">Formato</th>
              </tr></thead>
              <tbody>
                {reportsList.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="px-2 py-2.5"><div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary"><FileText className="h-4 w-4" /></span><div><div className="font-medium truncate max-w-[220px]">{r.name}</div><div className="text-xs text-muted-foreground">{r.code}</div></div></div></td>
                    <td className="px-2 py-2.5"><StatusBadge tone="slate" dot={false}>{r.tipo}</StatusBadge></td>
                    <td className="px-2 py-2.5"><div className="truncate max-w-[150px]">{r.sede}</div>{r.puesto && r.puesto !== r.sede && <div className="text-xs text-muted-foreground truncate max-w-[150px]">{r.puesto}</div>}</td>
                    <td className="px-2 py-2.5 truncate max-w-[130px]">{r.generadoPor}</td>
                    <td className="px-2 py-2.5 tabular-nums text-xs">{r.fecha ? fmtDT(r.fecha) : '—'}</td>
                    <td className="px-2 py-2.5">{r.formato}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>Mostrando {reportsTotal === 0 ? 0 : (page - 1) * perPage + 1} a {Math.min(page * perPage, reportsTotal)} de {reportsTotal} reportes</span>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border px-2 py-1 disabled:opacity-40">‹</button>
            {Array.from({ length: Math.min(5, pageCount) }).map((_, k) => { const n = k + 1; return <button key={n} onClick={() => setPage(n)} className={`grid h-7 min-w-[28px] place-items-center rounded-md px-2 text-xs font-semibold ${n === page ? 'bg-primary text-white' : 'border'}`}>{n}</button>; })}
            <button disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)} className="rounded-md border px-2 py-1 disabled:opacity-40">›</button>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><FileBarChart className="h-3.5 w-3.5" /> Las métricas se calculan sobre la operación real del cliente en el período seleccionado.</span>
        <span className="inline-flex items-center gap-2">{fmtUpdated && <>Última actualización: {fmtUpdated}</>}<button onClick={() => load()} className="inline-flex items-center gap-1 font-medium text-primary hover:underline"><RefreshCw className="h-3.5 w-3.5" /> Actualizar</button></span>
      </div>

      {/* Schedule modal */}
      <Modal open={schedOpen} onOpenChange={(o) => { if (!saving) setSchedOpen(o); }} title="Programar reporte" icon={<CalendarClock className="h-5 w-5" />}
        footer={<><Button variant="outline" onClick={() => setSchedOpen(false)} disabled={saving}>Cancelar</Button><Button onClick={saveSchedule} disabled={saving || !schedForm.name.trim()}>{saving ? 'Guardando…' : 'Programar'}</Button></>}>
        <div className="space-y-3">
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre</label><input className={inputCls} placeholder="Informe semanal de operaciones" value={schedForm.name} onChange={(e) => setSchedForm({ ...schedForm, name: e.target.value })} /></div>
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Reporte</label>
            <select className={inputCls} value={schedForm.type} onChange={(e) => setSchedForm({ ...schedForm, type: e.target.value })}>
              <option value="incidents">Reporte de incidentes</option><option value="rounds">Reporte de rondas</option><option value="attendance">Reporte de asistencia</option><option value="coverage">Cumplimiento de puestos</option><option value="guard-activity">Actividad por guardia</option>
            </select>
          </div>
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Frecuencia</label>
            <select className={inputCls} value={schedForm.frequency} onChange={(e) => setSchedForm({ ...schedForm, frequency: e.target.value })}>
              <option value="daily">Diario (07:00)</option><option value="weekly">Semanal (lunes 08:00)</option><option value="monthly">Mensual (día 1, 09:00)</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
