import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useScrollToTopOnMount from '@/hooks/useScrollToTopOnMount';
import { clientService } from '@/lib/api/clientService';
import GoogleMapEmbed from '@/components/GoogleMap/GoogleMapEmbed';
import { Section, EmptyState, StatusBadge } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Search, MapPin, Users, Shield, ShieldAlert, Clock, AlertTriangle,
  CheckCircle2, Crosshair, RefreshCw, Route as RouteIcon, ChevronRight,
  LayoutGrid, Locate, Satellite, Map as MapIcon, ExternalLink,
} from 'lucide-react';

const inputCls = 'flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-all placeholder:text-muted-foreground hover:border-ring/40 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]';

const STATUS_META: Record<string, { label: string; tone: any; dot: string; role: string }> = {
  cubierto:      { label: 'Cubierto',      tone: 'green',  dot: 'bg-emerald-500', role: 'ok' },
  parcial:       { label: 'Parcial',       tone: 'orange', dot: 'bg-orange-500',  role: 'warn' },
  sin_cobertura: { label: 'Sin cobertura', tone: 'red',    dot: 'bg-red-500',     role: 'crit' },
  sin_turno:     { label: 'Sin turno',     tone: 'slate',  dot: 'bg-slate-400',   role: 'muted' },
};

function Bar({ pct, status }: { pct: number; status: string }) {
  const color = status === 'sin_cobertura' ? 'bg-red-500' : status === 'parcial' ? 'bg-orange-500' : status === 'sin_turno' ? 'bg-slate-300' : 'bg-emerald-500';
  return (
    <div className="h-1.5 w-full min-w-[54px] rounded-full bg-muted">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} />
    </div>
  );
}

function Kpi({ icon, value, label, sub, accent = 'primary', onClick }: any) {
  const ACC: Record<string, string> = {
    primary: 'bg-primary/12 text-primary', green: 'bg-emerald-500/12 text-emerald-600',
    orange: 'bg-orange-500/12 text-orange-600', red: 'bg-red-500/12 text-red-600',
    blue: 'bg-blue-500/12 text-blue-600', slate: 'bg-muted text-muted-foreground',
  };
  return (
    <div className="cg-card p-4">
      <div className={`mb-2 grid h-9 w-9 place-items-center rounded-xl ${ACC[accent]} [&_svg]:size-4`}>{icon}</div>
      <div className="font-display text-2xl font-bold leading-tight">{value}</div>
      <div className="text-xs text-muted-foreground truncate">{label}</div>
      {sub && <div className="mt-1 text-xs">{sub}</div>}
      {onClick && <button onClick={onClick} className="mt-1 text-xs font-medium text-primary hover:underline">Ver detalle</button>}
    </div>
  );
}

export default function ClientCoverage({ client }: { client: any }) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  useScrollToTopOnMount(containerRef);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sedeId, setSedeId] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [mapType, setMapType] = useState<'satellite' | 'roadmap'>('satellite');
  const [centerReq, setCenterReq] = useState(0);

  // filters
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('todos');
  const [tipo, setTipo] = useState('todos');
  const [turno, setTurno] = useState('todos');
  const [orden, setOrden] = useState('nombre');
  const [page, setPage] = useState(1);
  const PER = 10;

  const load = async (sid?: string, quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const d = await clientService.getClientCoverage(client.id, { postSiteId: sid || sedeId || undefined });
      setData(d);
      if (d?.selectedSedeId && d.selectedSedeId !== sedeId) setSedeId(d.selectedSedeId);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  useEffect(() => { setLoading(true); load(); /* eslint-disable-next-line */ }, [client.id]);
  // Live refresh every 45s (coverage is real-time).
  useEffect(() => {
    const t = setInterval(() => load(sedeId, true), 45000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, [sedeId, client.id]);

  const sedes: any[] = data?.sedes || [];
  const puestos: any[] = data?.puestos || [];
  const kpis = data?.kpis || {};
  const turnoSummary: any[] = data?.turnoSummary || [];
  const sinCobertura: any[] = data?.sinCobertura || [];
  const proximos: any[] = data?.proximos || [];
  const objetivoPct = data?.objetivoPct ?? 95;

  const selected = puestos.find((p) => p.id === selectedId) || null;

  const changeSede = (id: string) => { setSedeId(id); setSelectedId(null); setPage(1); load(id); };

  const filtered = useMemo(() => {
    let list = puestos.slice();
    const ql = q.trim().toLowerCase();
    if (ql) list = list.filter((p) => (p.name || '').toLowerCase().includes(ql) || (p.nickname || '').toLowerCase().includes(ql));
    if (estado !== 'todos') list = list.filter((p) => p.status === estado);
    if (tipo !== 'todos') list = list.filter((p) => p.type === tipo);
    if (turno !== 'todos') list = list.filter((p) => (p.turno || '') === turno);
    list.sort((a, b) => {
      if (orden === 'cobertura_desc') return (b.coveragePct ?? -1) - (a.coveragePct ?? -1);
      if (orden === 'cobertura_asc') return (a.coveragePct ?? 999) - (b.coveragePct ?? 999);
      if (orden === 'estado') return (a.status || '').localeCompare(b.status || '');
      return (a.name || '').localeCompare(b.name || '');
    });
    return list;
  }, [puestos, q, estado, tipo, turno, orden]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER));
  const pageItems = filtered.slice((page - 1) * PER, page * PER);
  const idxOf = (id: string) => puestos.findIndex((p) => p.id === id);

  const mapMarkers = puestos
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
    .map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, label: p.name, role: STATUS_META[p.status]?.role || 'ok' }));

  const selectPuesto = (p: any) => {
    setSelectedId(p.id);
    if (Number.isFinite(p.lat) && Number.isFinite(p.lng)) setCenterReq((n) => n + 1);
  };

  const onMapClick = async (lat: number, lng: number) => {
    if (!placing || !selected) return;
    try {
      await clientService.setStationLocation(selected.id, { lat, lng });
      toast.success(`Ubicación de "${selected.name}" fijada`);
      setPlacing(false);
      await load(sedeId, true);
      setCenterReq((n) => n + 1);
    } catch { toast.error('No se pudo fijar la ubicación'); }
  };

  const sede = sedes.find((s) => s.id === sedeId);
  const mapCenter = selected && Number.isFinite(selected.lat)
    ? { lat: selected.lat, lng: selected.lng }
    : sede && Number.isFinite(sede.lat) ? { lat: sede.lat, lng: sede.lng }
    : mapMarkers[0] ? { lat: mapMarkers[0].lat, lng: mapMarkers[0].lng } : null;

  const fmtUpdated = data?.updatedAt ? new Date(data.updatedAt).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

  if (loading && !data) return <div className="p-8 text-sm text-muted-foreground">Cargando puestos y cobertura…</div>;

  return (
    <div ref={containerRef} className="space-y-4">
      {/* Sede selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LayoutGrid className="h-4 w-4" /> Puestos y cobertura en vivo de la sede seleccionada
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground">Sede / Sitio</label>
          <select className={`${inputCls} min-w-[220px]`} value={sedeId} onChange={(e) => changeSede(e.target.value)}>
            {sedes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        <Kpi icon={<LayoutGrid />} value={kpis.puestosTotales ?? 0} label="Puestos totales" accent="primary" />
        <Kpi icon={<CheckCircle2 />} value={kpis.puestosCubiertos ?? 0} label="Puestos cubiertos" accent="green"
          sub={<span className="rounded-full bg-emerald-500/12 px-1.5 py-0.5 text-emerald-600">{kpis.puestosTotales ? Math.round((kpis.puestosCubiertos / kpis.puestosTotales) * 100) : 0}%</span>} />
        <Kpi icon={<Shield />} value={`${kpis.coberturaPct ?? 0}%`} label="Cobertura actual" accent={(kpis.coberturaPct ?? 0) >= objetivoPct ? 'green' : 'orange'}
          sub={<span className="text-muted-foreground">Objetivo: {objetivoPct}%</span>} />
        <Kpi icon={<Users />} value={`${kpis.guardiasEnPuestos ?? 0}`} label="Guardias en puestos" accent="blue"
          sub={<span className="text-muted-foreground">de {kpis.guardiasRequeridas ?? 0} requeridos</span>} />
        <Kpi icon={<ShieldAlert />} value={kpis.puestosSinCobertura ?? 0} label="Puestos sin cobertura" accent={(kpis.puestosSinCobertura ?? 0) > 0 ? 'red' : 'slate'} />
        <Kpi icon={<Clock />} value={kpis.proximosAIniciar ?? 0} label="Próximos a iniciar" accent="blue" sub={<span className="text-muted-foreground">próximas 2 horas</span>} />
        <Kpi icon={<AlertTriangle />} value={kpis.puestosConNovedad ?? 0} label="Puestos con novedad" accent={(kpis.puestosConNovedad ?? 0) > 0 ? 'orange' : 'slate'} />
        <Kpi icon={<CheckCircle2 />} value={`${kpis.cumplimientoHoy ?? 0}%`} label="Cumplimiento hoy" accent="green" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_1fr]">
        {/* LEFT — filters + table */}
        <div className="space-y-4">
          <Section title="Puestos del sitio" icon={<LayoutGrid className="h-4 w-4" />}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[180px] flex-1">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input className={`${inputCls} pl-8`} placeholder="Buscar puesto por nombre" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
              </div>
              <select className={inputCls} value={estado} onChange={(e) => { setEstado(e.target.value); setPage(1); }}>
                <option value="todos">Estado: Todos</option>
                <option value="cubierto">Cubierto</option>
                <option value="parcial">Parcial</option>
                <option value="sin_cobertura">Sin cobertura</option>
                <option value="sin_turno">Sin turno</option>
              </select>
              <select className={inputCls} value={tipo} onChange={(e) => { setTipo(e.target.value); setPage(1); }}>
                <option value="todos">Tipo: Todos</option>
                <option value="fijo">Fijo</option>
                <option value="patrulla">Patrulla</option>
              </select>
              <select className={inputCls} value={turno} onChange={(e) => { setTurno(e.target.value); setPage(1); }}>
                <option value="todos">Turno: Todos</option>
                <option value="Diurno">Diurno</option>
                <option value="Vespertino">Vespertino</option>
                <option value="Nocturno">Nocturno</option>
              </select>
              <select className={inputCls} value={orden} onChange={(e) => setOrden(e.target.value)}>
                <option value="nombre">Nombre A-Z</option>
                <option value="cobertura_desc">Cobertura ↓</option>
                <option value="cobertura_asc">Cobertura ↑</option>
                <option value="estado">Estado</option>
              </select>
            </div>

            {filtered.length === 0 ? (
              <EmptyState icon={<LayoutGrid className="h-5 w-5" />} title="Sin puestos" description="Esta sede no tiene puestos que coincidan con los filtros." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-2 py-2 font-medium">Puesto</th>
                      <th className="px-2 py-2 font-medium">Tipo</th>
                      <th className="px-2 py-2 font-medium">Turno actual</th>
                      <th className="px-2 py-2 font-medium">Guardias</th>
                      <th className="px-2 py-2 font-medium">Cobertura</th>
                      <th className="px-2 py-2 font-medium">Estado</th>
                      <th className="px-2 py-2 font-medium">Última actividad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((p) => {
                      const meta = STATUS_META[p.status] || STATUS_META.sin_turno;
                      const n = idxOf(p.id) + 1;
                      const sel = p.id === selectedId;
                      return (
                        <tr key={p.id} onClick={() => selectPuesto(p)}
                          className={`cursor-pointer border-b last:border-0 ${sel ? 'bg-primary/5' : 'hover:bg-muted/40'}`}>
                          <td className="px-2 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white ${meta.dot}`}>{n}</span>
                              <div className="min-w-0">
                                <div className="font-medium truncate">{p.name}</div>
                                {p.nickname && <div className="text-xs text-muted-foreground truncate">{p.nickname}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-2.5">
                            <span className="rounded-md bg-muted px-2 py-0.5 text-xs capitalize">{p.type === 'patrulla' ? 'Patrulla' : 'Fijo'}</span>
                          </td>
                          <td className="px-2 py-2.5">
                            {p.window ? <div><div>{p.window}</div><div className="text-xs text-muted-foreground">{p.turno || '—'}</div></div> : <span className="text-muted-foreground">Sin turno</span>}
                          </td>
                          <td className="px-2 py-2.5">
                            <div className="tabular-nums">{p.onPost} / {p.required || 0}</div>
                            <div className="max-w-[130px] truncate text-xs text-muted-foreground">{p.guards?.length ? p.guards.join(', ') : (p.status === 'sin_turno' ? '—' : 'Sin asignar')}</div>
                          </td>
                          <td className="px-2 py-2.5">
                            {p.coveragePct == null ? <span className="text-muted-foreground">—</span> : (
                              <div className="flex items-center gap-2"><span className="w-8 text-xs tabular-nums">{p.coveragePct}%</span><Bar pct={p.coveragePct} status={p.status} /></div>
                            )}
                          </td>
                          <td className="px-2 py-2.5"><StatusBadge tone={meta.tone}>{meta.label}</StatusBadge></td>
                          <td className="px-2 py-2.5">
                            {p.lastActivity?.type === 'ronda' ? <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><RouteIcon className="h-3.5 w-3.5" /> Ronda activa</span>
                              : p.lastActivity?.type === 'checkin' ? <div><div className="tabular-nums">{p.lastActivity.time}</div><div className="text-xs text-muted-foreground">Check-in</div></div>
                              : <span className="text-xs text-muted-foreground">Sin actividad</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
              <span>Mostrando {filtered.length === 0 ? 0 : (page - 1) * PER + 1} a {Math.min(page * PER, filtered.length)} de {filtered.length} puestos</span>
              <div className="flex items-center gap-1">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border px-2 py-1 disabled:opacity-40">‹</button>
                <span className="grid h-7 min-w-[28px] place-items-center rounded-md bg-primary px-2 text-xs font-semibold text-white">{page}</span>
                <button disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)} className="rounded-md border px-2 py-1 disabled:opacity-40">›</button>
              </div>
            </div>
          </Section>
        </div>

        {/* RIGHT — map + summaries */}
        <div className="space-y-4">
          <Section
            title="Mapa del sitio"
            icon={<MapPin className="h-4 w-4" />}
            action={
              <div className="flex items-center gap-1">
                <div className="flex rounded-lg border p-0.5">
                  <button onClick={() => setMapType('satellite')} className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs ${mapType === 'satellite' ? 'bg-primary text-white' : 'text-muted-foreground'}`}><Satellite className="h-3.5 w-3.5" /> Satélite</button>
                  <button onClick={() => setMapType('roadmap')} className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs ${mapType === 'roadmap' ? 'bg-primary text-white' : 'text-muted-foreground'}`}><MapIcon className="h-3.5 w-3.5" /> Mapa</button>
                </div>
              </div>
            }
          >
            {mapMarkers.length === 0 && !mapCenter ? (
              <EmptyState icon={<MapPin className="h-5 w-5" />} title="Sin ubicaciones" description="Ningún puesto de esta sede tiene coordenadas. Selecciona un puesto y usa “Fijar ubicación exacta”." />
            ) : (
              <>
                {placing && (
                  <div className="mb-2 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
                    <Crosshair className="h-4 w-4" /> Toca el mapa para fijar la ubicación exacta de <b>{selected?.name}</b>.
                    <button onClick={() => setPlacing(false)} className="ml-auto font-medium underline">Cancelar</button>
                  </div>
                )}
                <div className="overflow-hidden rounded-xl border" style={{ height: 380 }}>
                  <GoogleMapEmbed
                    lat={mapCenter?.lat}
                    lng={mapCenter?.lng}
                    zoom={20}
                    focusZoom={21}
                    mapType={mapType}
                    markers={mapMarkers}
                    centerRequest={centerReq}
                    enableClickToSet={placing}
                    onMapClick={onMapClick}
                    showGeofence={!!selected && Number.isFinite(selected?.lat)}
                    geofenceRadius={150}
                  />
                </div>
                {/* Legend */}
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {Object.entries(STATUS_META).map(([k, m]) => (
                    <span key={k} className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${m.dot}`} />{m.label}</span>
                  ))}
                </div>
              </>
            )}
          </Section>

          {/* Selected puesto detail + place-location */}
          {selected && (
            <Section title="Puesto seleccionado" icon={<Locate className="h-4 w-4" />}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold">{selected.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{selected.type === 'patrulla' ? 'Patrulla' : 'Fijo'} · {selected.window || 'Sin turno'}</div>
                  <div className="mt-1"><StatusBadge tone={(STATUS_META[selected.status] || STATUS_META.sin_turno).tone}>{(STATUS_META[selected.status] || STATUS_META.sin_turno).label}</StatusBadge></div>
                  {Number.isFinite(selected.lat)
                    ? <div className="mt-2 text-xs text-muted-foreground">📍 {selected.lat.toFixed(6)}, {selected.lng.toFixed(6)}</div>
                    : <div className="mt-2 text-xs text-orange-600">Este puesto aún no tiene ubicación exacta.</div>}
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <Button size="sm" variant={placing ? 'brand' : 'outline'} onClick={() => setPlacing((v) => !v)}>
                    <Crosshair className="mr-1.5 h-4 w-4" /> {placing ? 'Fijando…' : 'Fijar ubicación exacta'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/post-sites/${sedeId}/stations/${selected.id}/overview`)}>
                    <ExternalLink className="mr-1.5 h-4 w-4" /> Ver puesto
                  </Button>
                </div>
              </div>
            </Section>
          )}

          {/* Resumen de cobertura por turno */}
          <Section title="Resumen de cobertura por turno" icon={<Shield className="h-4 w-4" />}>
            <div className="space-y-3">
              {turnoSummary.map((t) => (
                <div key={t.key}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t.label} <span className="text-xs">({t.window})</span></span>
                    <span className="tabular-nums"><b className={t.pct >= 90 ? 'text-emerald-600' : t.pct >= 60 ? 'text-orange-600' : 'text-red-600'}>{t.pct}%</b> <span className="text-xs text-muted-foreground">{t.covered} / {t.required}</span></span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div className={`h-2 rounded-full ${t.pct >= 90 ? 'bg-emerald-500' : t.pct >= 60 ? 'bg-orange-500' : 'bg-red-500'}`} style={{ width: `${Math.max(2, Math.min(100, t.pct))}%` }} />
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between border-t pt-3">
                <span className="font-medium">Cobertura general del sitio</span>
                <span className={`font-display text-lg font-bold ${(data?.generalPct ?? 0) >= 90 ? 'text-emerald-600' : 'text-orange-600'}`}>{data?.generalPct ?? 0}%</span>
              </div>
              <p className="text-xs text-muted-foreground">Según asistencia registrada hoy.</p>
            </div>
          </Section>

          {/* Puestos sin cobertura */}
          <Section title={`Puestos sin cobertura (${sinCobertura.length})`} icon={<ShieldAlert className="h-4 w-4" />}>
            {sinCobertura.length === 0 ? (
              <div className="flex items-center gap-2 py-2 text-sm text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Todos los puestos con turno están cubiertos.</div>
            ) : (
              <div className="divide-y">
                {sinCobertura.map((p) => (
                  <button key={p.id} onClick={() => selectPuesto(puestos.find((x) => x.id === p.id))} className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:bg-muted/40">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-red-500/12 text-red-600"><Shield className="h-4 w-4" /></span>
                      <div>
                        <div className="text-sm font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.window || 'Sin turno'} {p.turno ? `(${p.turno})` : ''} · Requiere {p.requiredGuards} {p.requiredGuards === 1 ? 'guardia' : 'guardias'}</div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">Sin asignación <ChevronRight className="h-3.5 w-3.5" /></span>
                  </button>
                ))}
              </div>
            )}
          </Section>

          {/* Próximos a iniciar */}
          <Section title="Próximos a iniciar" icon={<Clock className="h-4 w-4" />}
            action={<button onClick={() => navigate('/scheduler')} className="text-xs font-medium text-primary hover:underline">Ver calendario</button>}>
            {proximos.length === 0 ? (
              <div className="py-2 text-sm text-muted-foreground">No hay turnos próximos en las siguientes 2 horas.</div>
            ) : (
              <div className="divide-y">
                {proximos.slice(0, 6).map((p) => (
                  <button key={p.id} onClick={() => selectPuesto(puestos.find((x) => x.id === p.id))} className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:bg-muted/40">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-500/12 text-blue-600 text-xs font-bold">{idxOf(p.id) + 1}</span>
                      <div>
                        <div className="text-sm font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.window} ({p.turno})</div>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{p.startsInMin <= 0 ? 'Ahora' : p.startsInMin < 60 ? `En ${p.startsInMin}m` : `En ${Math.floor(p.startsInMin / 60)}h ${p.startsInMin % 60}m`}</span>
                  </button>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><RefreshCw className="h-3.5 w-3.5" /> La cobertura se actualiza en tiempo real según el check-in de guardias y asignaciones de turnos.</span>
        <span className="inline-flex items-center gap-2">
          {fmtUpdated && <>Última actualización: {fmtUpdated}</>}
          <button onClick={() => load(sedeId)} className="inline-flex items-center gap-1 font-medium text-primary hover:underline"><RefreshCw className="h-3.5 w-3.5" /> Actualizar</button>
        </span>
      </div>
    </div>
  );
}
