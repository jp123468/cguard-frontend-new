import { useEffect, useMemo, useRef, useState } from 'react';
import useScrollToTopOnMount from '@/hooks/useScrollToTopOnMount';
import { clientService } from '@/lib/api/clientService';
import GoogleMapEmbed from '@/components/GoogleMap/GoogleMapEmbed';
import { Section, EmptyState, StatusBadge } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Search, AlertTriangle, ShieldCheck, Clock, Timer, CheckCircle2, Gauge,
  MapPin, Paperclip, ListChecks, FileText, RefreshCw, Play, ShieldAlert,
} from 'lucide-react';

const inputCls = 'flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-all placeholder:text-muted-foreground hover:border-ring/40 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]';

const PRIO: Record<string, { label: string; tone: any }> = {
  alta: { label: 'Alta', tone: 'red' }, media: { label: 'Media', tone: 'orange' }, baja: { label: 'Baja', tone: 'blue' },
};
const ESTADO: Record<string, { label: string; tone: any; dot: string }> = {
  abierto: { label: 'Abierto', tone: 'red', dot: 'bg-red-500' },
  investigacion: { label: 'En investigación', tone: 'orange', dot: 'bg-orange-500' },
  resuelto: { label: 'Resuelto', tone: 'green', dot: 'bg-emerald-500' },
};
const WS_OPTIONS = [{ v: 'open', l: 'Abierto' }, { v: 'inProgress', l: 'En investigación' }, { v: 'resolved', l: 'Resuelto' }];

const fmtDT = (iso: string) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
const fmtDate = (iso: string) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' }); };
const fmtTime = (iso: string) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }); };
const resLabel = (ms: number | null) => {
  if (ms == null) return '—';
  const h = ms / 3600000;
  if (h < 1) return `${Math.max(1, Math.round(ms / 60000))} min`;
  if (h < 24) return `${Math.round(h)} h`;
  return `${Math.round(h / 24 * 10) / 10} días`;
};
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function Kpi({ icon, value, label, sub, accent = 'primary', bar }: any) {
  const ACC: Record<string, string> = {
    primary: 'bg-primary/12 text-primary', green: 'bg-emerald-500/12 text-emerald-600',
    orange: 'bg-orange-500/12 text-orange-600', red: 'bg-red-500/12 text-red-600', blue: 'bg-blue-500/12 text-blue-600', slate: 'bg-muted text-muted-foreground',
  };
  return (
    <div className="cg-card p-4">
      <div className={`mb-2 grid h-9 w-9 place-items-center rounded-xl ${ACC[accent]} [&_svg]:size-4`}>{icon}</div>
      <div className="flex items-baseline gap-1.5"><span className="font-display text-2xl font-bold leading-tight">{value}</span>{sub}</div>
      <div className="text-xs text-muted-foreground truncate">{label}</div>
      {bar != null && <div className="mt-2 h-1.5 w-full rounded-full bg-muted"><div className={`h-1.5 rounded-full ${bar >= 90 ? 'bg-emerald-500' : bar >= 60 ? 'bg-orange-500' : 'bg-red-500'}`} style={{ width: `${Math.max(3, Math.min(100, bar))}%` }} /></div>}
    </div>
  );
}

export default function ClientIncidents({ client }: { client: any }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  useScrollToTopOnMount(containerRef);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [tab, setTab] = useState<'detalles' | 'evidencia' | 'bitacora'>('detalles');

  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(ymd(new Date(today.getTime() - 30 * 24 * 3600 * 1000)));
  const [to, setTo] = useState(ymd(today));
  const [q, setQ] = useState('');
  const [sedeId, setSedeId] = useState('');
  const [puestoId, setPuestoId] = useState('');
  const [tipo, setTipo] = useState('');
  const [estado, setEstado] = useState('');
  const [prioridad, setPrioridad] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const d = await clientService.getClientIncidentsBoard(client.id, { from, to, q: q.trim() || undefined, sedeId: sedeId || undefined, puestoId: puestoId || undefined, tipo: tipo || undefined, estado: estado || undefined, prioridad: prioridad || undefined, page, perPage });
      setData(d);
      if (d?.incidents?.length && !selectedId) setSelectedId(d.incidents[0].id);
    } catch { /* silent */ } finally { setLoading(false); }
  };
  useEffect(() => { const t = setTimeout(() => load(), 250); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [from, to, q, sedeId, puestoId, tipo, estado, prioridad, page, client.id]);

  const incidents: any[] = data?.incidents || [];
  const kpis = data?.kpis || {};
  const sedes: any[] = data?.sedes || [];
  const puestos: any[] = data?.puestos || [];
  const tipos: any[] = data?.tipos || [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const selected = incidents.find((i) => i.id === selectedId) || null;
  const fmtUpdated = data?.updatedAt ? new Date(data.updatedAt).toLocaleString('es-EC', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

  // Load evidence when selection changes.
  useEffect(() => {
    setEvidence([]); setTab('detalles');
    if (!selected || !selected.evidenceCount) return;
    let alive = true;
    clientService.getIncidentEvidence(client.id, selected.id).then((items) => { if (alive) setEvidence(items); }).catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line
  }, [selectedId]);

  const changeStatus = async (ws: string) => {
    if (!selected) return;
    try { await clientService.updateIncidentStatus(client.id, selected.id, ws); toast.success('Estado actualizado'); await load(true); }
    catch { toast.error('No se pudo actualizar'); }
  };

  const resetPage = (fn: (v: any) => void) => (v: any) => { fn(v); setPage(1); };

  if (loading && !data) return <div className="p-8 text-sm text-muted-foreground">Cargando incidentes…</div>;

  return (
    <div ref={containerRef} className="space-y-4">
      {/* Top bar: date range + new incident */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-xs font-medium text-muted-foreground">Rango</span>
          <input type="date" className={`${inputCls} w-auto`} value={from} onChange={(e) => resetPage(setFrom)(e.target.value)} />
          <span className="text-muted-foreground">–</span>
          <input type="date" className={`${inputCls} w-auto`} value={to} onChange={(e) => resetPage(setTo)(e.target.value)} />
        </div>
        <Button size="sm" variant="brand" onClick={() => window.location.assign('/dispatch-tickets/new')}><AlertTriangle className="mr-1.5 h-4 w-4" /> Nuevo incidente</Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        <Kpi icon={<AlertTriangle />} value={kpis.total ?? 0} label="Total de incidentes" accent="primary" />
        <Kpi icon={<ShieldAlert />} value={kpis.abiertos ?? 0} label="Incidentes abiertos" accent={(kpis.abiertos ?? 0) > 0 ? 'red' : 'slate'} sub={<span className={`rounded-full px-1.5 py-0.5 text-xs ${(kpis.abiertos ?? 0) > 0 ? 'bg-red-500/12 text-red-600' : 'bg-muted text-muted-foreground'}`}>{kpis.abiertosPct ?? 0}%</span>} />
        <Kpi icon={<Search />} value={kpis.investigacion ?? 0} label="En investigación" accent="orange" sub={<span className="rounded-full bg-orange-500/12 px-1.5 py-0.5 text-xs text-orange-600">{kpis.investigacionPct ?? 0}%</span>} />
        <Kpi icon={<CheckCircle2 />} value={kpis.resueltos ?? 0} label="Resueltos" accent="green" sub={<span className="rounded-full bg-emerald-500/12 px-1.5 py-0.5 text-xs text-emerald-600">{kpis.resueltosPct ?? 0}%</span>} />
        <Kpi icon={<Clock />} value={kpis.avgResponseMin != null ? `${kpis.avgResponseMin} min` : '—'} label={`Resp. prom. (Meta ${kpis.metaResponseMin ?? 15} min)`} accent="blue" bar={kpis.avgResponseMin != null ? Math.min(100, Math.round(((kpis.metaResponseMin ?? 15) / Math.max(1, kpis.avgResponseMin)) * 100)) : null} />
        <Kpi icon={<Timer />} value={kpis.avgResolutionDays != null ? `${kpis.avgResolutionDays} días` : '—'} label={`Resol. prom. (Meta ${kpis.metaResolutionDays ?? 3} días)`} accent="blue" bar={kpis.avgResolutionDays != null ? Math.min(100, Math.round(((kpis.metaResolutionDays ?? 3) / Math.max(0.1, kpis.avgResolutionDays)) * 100)) : null} />
        <Kpi icon={<Gauge />} value={`${kpis.slaPct ?? 0}%`} label={`Cumplimiento SLA (Meta ${kpis.metaSlaPct ?? 95}%)`} accent={(kpis.slaPct ?? 0) >= (kpis.metaSlaPct ?? 95) ? 'green' : 'orange'} bar={kpis.slaPct ?? 0} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.55fr_1fr]">
        {/* LEFT — filters + table */}
        <Section title="Incidentes" icon={<AlertTriangle className="h-4 w-4" />}>
          <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
            <div className="relative col-span-2 md:col-span-3 xl:col-span-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input className={`${inputCls} pl-8`} placeholder="Buscar por ID, título o ubicación" value={q} onChange={(e) => resetPage(setQ)(e.target.value)} />
            </div>
            <select className={inputCls} value={sedeId} onChange={(e) => resetPage(setSedeId)(e.target.value)}><option value="">Sede: Todas</option>{sedes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            <select className={inputCls} value={puestoId} onChange={(e) => resetPage(setPuestoId)(e.target.value)}><option value="">Puesto: Todos</option>{puestos.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            <select className={inputCls} value={tipo} onChange={(e) => resetPage(setTipo)(e.target.value)}><option value="">Tipo: Todos</option>{tipos.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            <select className={inputCls} value={estado} onChange={(e) => resetPage(setEstado)(e.target.value)}><option value="">Estado: Todos</option><option value="abierto">Abierto</option><option value="investigacion">En investigación</option><option value="resuelto">Resuelto</option></select>
            <select className={inputCls} value={prioridad} onChange={(e) => resetPage(setPrioridad)(e.target.value)}><option value="">Prioridad: Todas</option><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select>
          </div>

          {incidents.length === 0 ? (
            <EmptyState icon={<AlertTriangle className="h-5 w-5" />} title="Sin incidentes" description="No hay incidentes para este cliente en el rango y filtros seleccionados." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-2 font-medium">ID</th>
                    <th className="px-2 py-2 font-medium">Fecha / Hora</th>
                    <th className="px-2 py-2 font-medium">Incidente</th>
                    <th className="px-2 py-2 font-medium">Sede / Puesto</th>
                    <th className="px-2 py-2 font-medium">Reportado por</th>
                    <th className="px-2 py-2 font-medium">Prioridad</th>
                    <th className="px-2 py-2 font-medium">Estado</th>
                    <th className="px-2 py-2 font-medium">Respuesta</th>
                    <th className="px-2 py-2 font-medium">Resolución</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((i) => {
                    const em = ESTADO[i.estado] || ESTADO.abierto;
                    const pm = i.priority ? PRIO[i.priority] : null;
                    const sel = i.id === selectedId;
                    return (
                      <tr key={i.id} onClick={() => setSelectedId(i.id)} className={`cursor-pointer border-b last:border-0 ${sel ? 'bg-primary/5' : 'hover:bg-muted/40'}`}>
                        <td className="px-2 py-2.5">
                          <div className="flex items-center gap-2"><span className={`h-2 w-2 shrink-0 rounded-full ${em.dot}`} /><span className="font-medium">{i.code}</span></div>
                        </td>
                        <td className="px-2 py-2.5"><div className="tabular-nums">{fmtDate(i.date)}</div><div className="text-xs text-muted-foreground tabular-nums">{fmtTime(i.date)}</div></td>
                        <td className="px-2 py-2.5"><div className="font-medium truncate max-w-[200px]">{i.title}</div><div className="text-xs text-muted-foreground truncate max-w-[200px]">{i.description}</div></td>
                        <td className="px-2 py-2.5"><div className="truncate max-w-[150px]">{i.sedeName || '—'}</div><div className="text-xs text-muted-foreground truncate max-w-[150px]">{i.puestoName || ''}</div></td>
                        <td className="px-2 py-2.5"><div className="truncate max-w-[130px]">{i.reportedBy?.name || '—'}</div>{i.reportedBy?.role && <div className="text-xs text-muted-foreground">{i.reportedBy.role}</div>}</td>
                        <td className="px-2 py-2.5">{pm ? <StatusBadge tone={pm.tone} dot={false}>{pm.label}</StatusBadge> : <span className="text-muted-foreground">—</span>}</td>
                        <td className="px-2 py-2.5"><StatusBadge tone={em.tone}>{em.label}</StatusBadge></td>
                        <td className="px-2 py-2.5 tabular-nums">{i.responseMin != null ? `${i.responseMin} min` : '—'}</td>
                        <td className="px-2 py-2.5 tabular-nums">{resLabel(i.resolutionMs)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>Mostrando {total === 0 ? 0 : (page - 1) * perPage + 1} a {Math.min(page * perPage, total)} de {total} incidentes</span>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border px-2 py-1 disabled:opacity-40">‹</button>
              {Array.from({ length: Math.min(5, pageCount) }).map((_, k) => { const n = k + 1; return <button key={n} onClick={() => setPage(n)} className={`grid h-7 min-w-[28px] place-items-center rounded-md px-2 text-xs font-semibold ${n === page ? 'bg-primary text-white' : 'border'}`}>{n}</button>; })}
              <button disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)} className="rounded-md border px-2 py-1 disabled:opacity-40">›</button>
            </div>
          </div>
        </Section>

        {/* RIGHT — incident detail */}
        <div>
          {!selected ? (
            <Section title="Detalle del incidente" icon={<FileText className="h-4 w-4" />}><EmptyState icon={<FileText className="h-5 w-5" />} title="Selecciona un incidente" description="Elige un incidente de la lista para ver su detalle." /></Section>
          ) : (
            <div className="cg-card p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2"><span className="font-mono text-sm font-semibold">{selected.code}</span><StatusBadge tone={(ESTADO[selected.estado] || ESTADO.abierto).tone}>{(ESTADO[selected.estado] || ESTADO.abierto).label}</StatusBadge></div>
                  <h3 className="mt-1 font-display text-lg font-bold leading-tight">{selected.title}</h3>
                  {selected.description && <p className="text-sm text-muted-foreground">{selected.description}</p>}
                </div>
                <select className={`${inputCls} w-auto`} value={selected.estado === 'investigacion' ? 'inProgress' : selected.estado === 'resuelto' ? 'resolved' : 'open'} onChange={(e) => changeStatus(e.target.value)}>
                  {WS_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-3 text-sm">
                <div><div className="cg-eyebrow mb-0.5">Sede / Puesto</div><div className="font-medium">{selected.sedeName || '—'}</div><div className="text-xs text-muted-foreground">{selected.puestoName || ''}</div></div>
                <div><div className="cg-eyebrow mb-0.5">Prioridad</div>{selected.priority ? <StatusBadge tone={(PRIO[selected.priority] || PRIO.media).tone} dot={false}>{(PRIO[selected.priority] || PRIO.media).label}</StatusBadge> : <span className="text-muted-foreground">—</span>}</div>
                <div><div className="cg-eyebrow mb-0.5">Fecha / Hora</div><div className="font-medium tabular-nums">{fmtDT(selected.date)}</div></div>
                <div><div className="cg-eyebrow mb-0.5">Respuesta</div><div className="font-medium tabular-nums">{selected.responseMin != null ? `${selected.responseMin} min` : '—'}</div></div>
                <div><div className="cg-eyebrow mb-0.5">Reportado por</div><div className="font-medium">{selected.reportedBy?.name || '—'}{selected.reportedBy?.role ? ` (${selected.reportedBy.role})` : ''}</div></div>
                <div><div className="cg-eyebrow mb-0.5">Asignado a</div><div className="font-medium">{selected.assignedName || 'Sin asignar'}</div></div>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 border-b">
                {([['detalles', 'Detalles'], ['evidencia', `Evidencia (${selected.evidenceCount || 0})`], ['bitacora', `Bitácora (${(selected.comments || []).length})`]] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setTab(k as any)} className={`relative px-3 py-2 text-sm font-medium ${tab === k ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>{l}{tab === k && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}</button>
                ))}
              </div>

              {tab === 'detalles' && (
                <div className="space-y-4">
                  {selected.description && <div><div className="cg-eyebrow mb-1">Descripción</div><p className="text-sm text-muted-foreground whitespace-pre-line">{selected.description}</p></div>}
                  {selected.causaProbable && <div><div className="cg-eyebrow mb-1">Causa probable</div><p className="text-sm text-muted-foreground">{selected.causaProbable}</p></div>}
                  {selected.actionsTaken?.length > 0 && (
                    <div><div className="cg-eyebrow mb-1">Acciones tomadas</div><ul className="list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">{selected.actionsTaken.map((a: string, i: number) => <li key={i}>{a}</li>)}</ul></div>
                  )}
                  {Number.isFinite(selected.lat) && Number.isFinite(selected.lng) ? (
                    <div>
                      <div className="overflow-hidden rounded-xl border" style={{ height: 180 }}>
                        <GoogleMapEmbed lat={selected.lat} lng={selected.lng} zoom={16} markers={[{ id: selected.id, lat: selected.lat, lng: selected.lng, label: selected.title, role: 'crit' }]} />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {selected.location || 'Ubicación'}</span>
                        <span className="tabular-nums">{selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}</span>
                      </div>
                    </div>
                  ) : selected.location ? <div className="text-sm text-muted-foreground"><MapPin className="mr-1 inline h-3.5 w-3.5" />{selected.location}</div> : null}
                </div>
              )}

              {tab === 'evidencia' && (
                <div>
                  {evidence.length === 0 ? (
                    <EmptyState icon={<Paperclip className="h-5 w-5" />} title="Sin evidencia" description={selected.evidenceCount ? 'Cargando…' : 'Este incidente no tiene evidencia adjunta.'} />
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {evidence.map((e) => (
                        <a key={e.id || e.url} href={e.url} target="_blank" rel="noreferrer" className="group relative aspect-video overflow-hidden rounded-lg border bg-muted">
                          {e.isVideo ? <div className="flex h-full w-full items-center justify-center bg-slate-800"><Play className="h-6 w-6 text-white" /></div> : <img src={e.url} alt={e.name} className="h-full w-full object-cover" />}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === 'bitacora' && (
                <div>
                  {(selected.comments || []).length === 0 ? (
                    <EmptyState icon={<ListChecks className="h-5 w-5" />} title="Sin bitácora" description="No hay registros en la bitácora de este incidente." />
                  ) : (
                    <div className="space-y-2">
                      {(selected.comments || []).map((c: any, i: number) => {
                        const text = typeof c === 'string' ? c : (c?.text || c?.message || c?.note || c?.comment || JSON.stringify(c));
                        const at = typeof c === 'object' ? (c?.createdAt || c?.at || c?.date) : null;
                        return (
                          <div key={i} className="rounded-lg border p-2.5 text-sm">
                            <p className="text-foreground">{text}</p>
                            {at && <p className="mt-0.5 text-xs text-muted-foreground">{fmtDT(at)}</p>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Los tiempos de respuesta se calculan desde el reporte hasta el despacho al supervisor.</span>
        <span className="inline-flex items-center gap-2">{fmtUpdated && <>Última actualización: {fmtUpdated}</>}<button onClick={() => load()} className="inline-flex items-center gap-1 font-medium text-primary hover:underline"><RefreshCw className="h-3.5 w-3.5" /> Actualizar</button></span>
      </div>
    </div>
  );
}
