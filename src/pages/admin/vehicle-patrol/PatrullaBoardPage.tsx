import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Car, Plus, MapPin, Route as RouteIcon, CheckCircle2, Wand2, Clock, User,
  Loader2, Eye, ListChecks,
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import Breadcrumb from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { PageContainer, PageHeader, Section, Stagger, StatCard, StatusBadge, EmptyState, SkeletonCards } from '@/components/kit';
import { usePageTitle } from '@/hooks/usePageTitle';
import routeService from '@/lib/api/routeService';
import RouteDetailModal from '../routes/RouteDetailModal';
import { loadGoogleMaps } from '@/utils/loadGoogleMaps';

const DOW_NUM: Record<string, number> = {
  sun: 0, sunday: 0, dom: 0, domingo: 0,
  mon: 1, monday: 1, lun: 1, lunes: 1,
  tue: 2, tuesday: 2, mar: 2, martes: 2,
  wed: 3, wednesday: 3, mie: 3, 'mié': 3, miercoles: 3, 'miércoles': 3,
  thu: 4, thursday: 4, jue: 4, jueves: 4,
  fri: 5, friday: 5, vie: 5, viernes: 5,
  sat: 6, saturday: 6, sab: 6, 'sáb': 6, sabado: 6, 'sábado': 6,
};

function scheduledOn(route: any, weekday: number): boolean {
  let days = route.days;
  if (typeof days === 'string') { try { days = JSON.parse(days); } catch { days = null; } }
  if (!Array.isArray(days) || days.length === 0) return true; // no schedule = every day
  return days.some((d: any) => {
    if (typeof d === 'number') return d === weekday;
    const n = DOW_NUM[String(d).toLowerCase().trim()];
    return n === weekday;
  });
}

const hasCoord = (p: any) => p.lat != null && p.lng != null && !isNaN(parseFloat(p.lat)) && !isNaN(parseFloat(p.lng));

/**
 * Real road-distance optimization via the Google Directions API (waypoint
 * optimization). Treats the first stop as the base (round trip) and lets Google
 * reorder the rest to minimise driving. Returns null if it can't run; the caller
 * falls back to the straight-line greedy method.
 */
async function optimizeWithGoogle(points: any[]): Promise<any[] | null> {
  const coordPts = points.filter(hasCoord).map((p) => ({ ...p, _ll: { lat: parseFloat(p.lat), lng: parseFloat(p.lng) } }));
  if (coordPts.length < 3) return null;
  await loadGoogleMaps();
  const g = (window as any).google;
  if (!g?.maps?.DirectionsService) return null;
  const svc = new g.maps.DirectionsService();
  const origin = coordPts[0]._ll;
  const waypoints = coordPts.slice(1).map((p) => ({ location: p._ll, stopover: true }));
  const res: any = await new Promise((resolve, reject) =>
    svc.route(
      { origin, destination: origin, waypoints, optimizeWaypoints: true, travelMode: g.maps.TravelMode.DRIVING },
      (r: any, status: string) => (status === 'OK' ? resolve(r) : reject(new Error(status))),
    ),
  );
  const order: number[] = res?.routes?.[0]?.waypoint_order || [];
  if (!order.length) return null;
  const reordered = [coordPts[0], ...order.map((i) => coordPts[i + 1])];
  const noC = points.filter((p) => !hasCoord(p));
  return [...reordered.map(({ _ll, ...rest }) => rest), ...noC].map((p, i) => ({ ...p, order: i + 1 }));
}

/** Greedy nearest-neighbour ordering of the route's stops by lat/lng. */
function optimizePoints(points: any[]): any[] | null {
  const has = (p: any) => p.lat != null && p.lng != null && !isNaN(parseFloat(p.lat)) && !isNaN(parseFloat(p.lng));
  const withC = points.filter(has).map((p) => ({ ...p, _la: parseFloat(p.lat), _lo: parseFloat(p.lng) }));
  if (withC.length < 3) return null;
  const used = new Set<number>([0]);
  const order = [withC[0]];
  let cur = withC[0];
  while (order.length < withC.length) {
    let best = -1, bd = Infinity;
    withC.forEach((p, i) => {
      if (used.has(i)) return;
      const d = (p._la - cur._la) ** 2 + (p._lo - cur._lo) ** 2;
      if (d < bd) { bd = d; best = i; }
    });
    used.add(best); order.push(withC[best]); cur = withC[best];
  }
  const noC = points.filter((p) => !has(p));
  return [...order.map(({ _la, _lo, ...rest }) => rest), ...noC].map((p, i) => ({ ...p, order: i + 1 }));
}

export default function PatrullaBoardPage() {
  usePageTitle('Patrulla vehicular');
  const navigate = useNavigate();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [routes, setRoutes] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const weekday = useMemo(() => new Date(`${date}T12:00:00`).getDay(), [date]);

  const load = async () => {
    setLoading(true);
    try {
      const [r, runRes] = await Promise.all([
        routeService.list({ limit: 300 }),
        routeService.runs(date).catch(() => []),
      ]);
      setRoutes(r?.rows ?? []);
      setRuns(runRes || []);
    } catch (e: any) {
      toast.error(e?.message || 'No se pudieron cargar las rutas');
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [date]);

  const isDone = (routeId: string) => runs.some((x) => x.routeId === routeId && x.status === 'completed');
  const todays = routes.filter((r) => scheduledOn(r, weekday));
  const shown = showAll ? routes : todays;
  const doneCount = todays.filter((r) => isDone(r.id)).length;

  const toggleDone = async (route: any) => {
    setBusyId(route.id);
    try {
      if (isDone(route.id)) { await routeService.unmarkRun(route.id, date); }
      else { await routeService.markRun(route.id, date); }
      const runRes = await routeService.runs(date).catch(() => []);
      setRuns(runRes || []);
    } catch (e: any) { toast.error(e?.message || 'Error'); }
    finally { setBusyId(null); }
  };

  const optimize = async (route: any) => {
    setBusyId(route.id);
    try {
      let opt: any[] | null = null;
      let byRoad = false;
      try { opt = await optimizeWithGoogle(route.points || []); byRoad = !!opt; }
      catch { /* Directions API unavailable / not enabled — fall back */ }
      if (!opt) opt = optimizePoints(route.points || []);
      if (!opt) { toast.info('Se necesitan al menos 3 paradas con ubicación para optimizar.'); return; }
      await routeService.update(route.id, { name: route.name, points: opt });
      toast.success(byRoad ? 'Ruta optimizada por distancia de manejo' : 'Ruta optimizada por cercanía (en línea recta)');
      await load();
    } catch (e: any) { toast.error(e?.message || 'No se pudo optimizar'); }
    finally { setBusyId(null); }
  };

  const goCreate = () => {
    const tid = localStorage.getItem('tenantId');
    navigate(tid ? `/tenant/${tid}/vehicle-patrol/routes/add-new` : '/vehicle-patrol/routes');
  };

  return (
    <AppLayout>
      <Breadcrumb items={[{ label: 'Patrulla vehicular' }]} />
      <PageContainer width="wide" className="cc-root px-4 py-6 sm:px-6">
        <PageHeader
          icon={<Car />}
          title="Patrulla vehicular"
          subtitle="Rutas que el supervisor debe recorrer y su estado del día."
          actions={(
            <>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
              <Button variant="outline" onClick={() => navigate('/vehicle-patrol/routes')}>
                <RouteIcon size={15} className="mr-1.5" /> Gestionar rutas
              </Button>
              <Button variant="brand" onClick={goCreate}>
                <Plus size={16} className="mr-1.5" /> Crear patrulla vehicular
              </Button>
            </>
          )}
        />

        <Stagger className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Programadas hoy" value={todays.length} icon={<ListChecks />} accent="primary" />
          <StatCard label="Completadas" value={doneCount} icon={<CheckCircle2 />} accent="green" />
        </Stagger>

        <Section
          title="Rutas del día"
          icon={<RouteIcon />}
          action={(
            <button onClick={() => setShowAll((s) => !s)} className="text-sm text-muted-foreground hover:text-foreground">
              {showAll ? 'Ver solo del día' : 'Ver todas las rutas'}
            </button>
          )}
        >
        {loading ? (
          <SkeletonCards count={4} />
        ) : shown.length === 0 ? (
          <EmptyState
            icon={<RouteIcon />}
            title={showAll ? 'No hay rutas creadas' : 'No hay rutas programadas para este día'}
            description="Crea una patrulla vehicular con sus paradas (sitios de clientes) para empezar."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {shown.map((route) => {
              const done = isDone(route.id);
              const stops = (route.points || []).length;
              return (
                <div key={route.id} className={`glass cc-glass-hover p-4 ${done ? 'opacity-80' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-foreground">{route.name}</h3>
                        {done
                          ? <StatusBadge tone="green">Completada</StatusBadge>
                          : <StatusBadge tone="orange">Pendiente</StatusBadge>}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><MapPin size={12} className="text-[color:var(--primary)]" />{stops} paradas</span>
                        {route.vehicleName || route.vehicle?.name ? <span className="flex items-center gap-1"><Car size={12} />{route.vehicleName || route.vehicle?.name}</span> : null}
                        {route.assignedGuardName || route.guardName ? <span className="flex items-center gap-1"><User size={12} />{route.assignedGuardName || route.guardName}</span> : null}
                        {route.windowStart && <span className="flex items-center gap-1"><Clock size={12} />{new Date(route.windowStart).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button onClick={() => toggleDone(route)} disabled={busyId === route.id}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${done ? 'border border-border text-muted-foreground' : 'text-foreground'}`}
                      style={done ? undefined : { background: 'var(--primary)' }}>
                      {busyId === route.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                      {done ? 'Deshacer' : 'Marcar completada'}
                    </button>
                    <button onClick={() => optimize(route)} disabled={busyId === route.id}
                      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-foreground hover:text-[color:var(--primary)] disabled:opacity-50">
                      <Wand2 size={13} /> Optimizar
                    </button>
                    <button onClick={() => setDetailId(route.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-foreground hover:text-[color:var(--primary)]">
                      <Eye size={13} /> Ver ruta
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </Section>

        <RouteDetailModal open={!!detailId} onOpenChange={(v) => { if (!v) setDetailId(null); }} routeId={detailId} />
      </PageContainer>
    </AppLayout>
  );
}
