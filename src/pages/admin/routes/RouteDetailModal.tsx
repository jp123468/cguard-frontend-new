import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal, Field, StatusBadge, SkeletonBlock, EmptyState } from '@/components/kit';
import { Route, MapPin, Pencil } from 'lucide-react';
import routeService from '@/lib/api/routeService';
import userService from '@/lib/api/userService';
import vehicleService from '@/lib/api/vehicleService';
import { postSiteService } from '@/lib/api/postSiteService';
import { useNavigate } from 'react-router-dom';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routeId: string | null;
};

interface RoutePoint {
  id?: string;
  siteId?: string;
  postSiteId?: string;
  siteName?: string;
  address?: string;
  scheduledHits?: number;
  duration?: number;
}

interface RouteType {
  id?: string;
  name?: string;
  continuous?: boolean;
  days?: string[];
  assignedGuard?: string | { firstName?: string; lastName?: string; email?: string; id?: string } | null;
  guard?: any;
  assignedTo?: any;
  vehicle?: string | { name?: string; licensePlate?: string; id?: string } | null;
  vehicleId?: string;
  supervisorId?: string;
  completed?: boolean;
  active?: boolean;
  windowStart?: string;
  windowEnd?: string;
  startTime?: string;
  endTime?: string;
  points?: RoutePoint[];
  status?: string;
}

const DAY_LABEL: Record<string, string> = {
  sun: 'Domingo',
  mon: 'Lunes',
  tue: 'Martes',
  wed: 'Miércoles',
  thu: 'Jueves',
  fri: 'Viernes',
  sat: 'Sábado',
};

export default function RouteDetailModal({ open, onOpenChange, routeId }: Props) {
  const [loading, setLoading] = useState(false);
  const [route, setRoute] = useState<RouteType | null>(null);
  const [guardLabel, setGuardLabel] = useState<string | null>(null);
  const [vehicleLabel, setVehicleLabel] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    if (!open || !routeId) {
      setRoute(null);
      return () => { mounted = false; };
    }

    (async () => {
      try {
        setLoading(true);
        const resp: any = await routeService.find(String(routeId));
        if (!mounted) return;
        const r = (resp?.data || resp || null) as RouteType | null;
        setRoute(r);
        // If points are present but missing siteName, try to fetch their names
        (async () => {
          try {
            if (!r || !r.points || !Array.isArray(r.points)) return;
            const missing = (r.points || []).filter((p: RoutePoint) => !p.siteName && (p.siteId || p.postSiteId));
            if (missing.length === 0) return;
            const ids = Array.from(new Set(missing.map((p: RoutePoint) => String(p.siteId || p.postSiteId))));
            const results = await Promise.all(ids.map((id) => postSiteService.get(String(id)).catch(() => null)));
            const map = new Map<string, any>();
            results.forEach((res: any, i: number) => {
              const id = ids[i];
              if (res) map.set(id, res.companyName || res.name || (res.company && (res.company.name || res.company.companyName)) || String(res.id));
            });
            if (map.size > 0) {
              const patched: RouteType = { ...r, points: (r.points || []).map((p: RoutePoint) => ({ ...p, siteName: p.siteName || map.get(String(p.siteId || p.postSiteId)) || p.siteName })) };
              if (mounted) setRoute(patched);
            }
          } catch (e) {
            console.warn('Failed to resolve post site names for route', e);
          }
        })();
      } catch (e) {
        console.error('Error loading route details', e);
        setRoute(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [open, routeId]);

  // Resolve guard and vehicle display labels when route changes
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!route) {
        setGuardLabel(null);
        setVehicleLabel(null);
        return;
      }

      // Guard
      try {
        const g = route.assignedGuard || route.guard || route.assignedTo || null;
        if ((typeof g === 'string') || (typeof g === 'number')) {
          const gId = String(g);
          const u = await userService.fetchUser(gId);
          if (!mounted) return;
          const name = u ? (u.firstName || u.lastName ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : (u.email || u.id)) : gId;
          setGuardLabel(name || gId);
        } else if (g && typeof g === 'object') {
          const name = (g.firstName || g.lastName) ? `${g.firstName || ''} ${g.lastName || ''}`.trim() : (g.email || g.id || null);
          setGuardLabel(name || null);
        } else {
          setGuardLabel(null);
        }
      } catch (e) {
        console.warn('Failed to fetch guard info', e);
      }

      // Vehicle
      try {
        const v = route.vehicle || route.vehicleId || null;
        if ((typeof v === 'string') || (typeof v === 'number')) {
          const vId = String(v);
          const vehResp: any = await vehicleService.find(vId);
          if (!mounted) return;
          const veh = vehResp?.data || vehResp || null;
          const label = veh ? (veh.name || veh.licensePlate || veh.id) : vId;
          setVehicleLabel(label || vId);
        } else if (v && typeof v === 'object') {
          const label = v.name || v.licensePlate || v.id || null;
          setVehicleLabel(label || null);
        } else {
          setVehicleLabel(null);
        }
      } catch (e) {
        console.warn('Failed to fetch vehicle info', e);
      }
    })();

    return () => { mounted = false; };
  }, [route]);

  const handleEdit = () => {
    try {
      const t = localStorage.getItem('tenantId');
      const id = route?.id || routeId;
      if (!id) {
        console.error('Cannot edit route without id');
        return;
      }
      const path = t ? `/tenant/${t}/vehicle-patrol/routes/${id}/edit` : `/vehicle-patrol/routes/${id}/edit`;
      navigate(path);
      onOpenChange(false);
    } catch (e) {
      console.error('Navigation error', e);
    }
  };

  const supervisorValue = guardLabel ?? (
    (typeof route?.assignedGuard === 'object' && (route?.assignedGuard?.firstName || route?.assignedGuard?.lastName))
      ? `${route?.assignedGuard?.firstName || ''} ${route?.assignedGuard?.lastName || ''}`.trim()
      : (typeof route?.assignedGuard === 'object' && route?.assignedGuard?.email)
        ? route.assignedGuard.email
        : (typeof route?.assignedGuard === 'string')
          ? route.assignedGuard
          : (route?.supervisorId || '—')
  );

  const vehicleValue = vehicleLabel ?? (
    (typeof route?.vehicle === 'object')
      ? (route?.vehicle?.name || route?.vehicle?.licensePlate || route?.vehicle?.id)
      : (typeof route?.vehicle === 'string')
        ? route.vehicle
        : (route?.vehicleId || '—')
  );

  return (
    <Modal
      open={open}
      onOpenChange={(v) => { if (!v) onOpenChange(false); else onOpenChange(true); }}
      size="lg"
      icon={<Route />}
      title="Detalle de la Ruta"
      description={loading ? 'Cargando...' : route ? `Información de ${route.name || route.id}` : 'Sin datos'}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          <Button variant="brand" onClick={handleEdit}><Pencil className="size-4" />Editar</Button>
        </div>
      }
    >
      {loading && (
        <div className="space-y-3">
          <SkeletonBlock className="h-4 w-1/2" />
          <SkeletonBlock className="h-4 w-2/3" />
          <SkeletonBlock className="h-4 w-1/3" />
        </div>
      )}
      {!loading && route && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nombre" value={route.name || '—'} />
            <Field label="Tipo" value={route.continuous ? 'Continua' : 'Programada'} />
            <Field label="Supervisor" value={supervisorValue} />
            <Field label="Vehículo" value={vehicleValue} />
            <div className="min-w-0">
              <div className="cg-eyebrow mb-0.5">Estado</div>
              <StatusBadge tone={route.completed ? 'green' : (route.active === false ? 'slate' : 'primary')}>
                {route.completed ? 'Completada' : (route.active === false ? 'Inactivo' : 'Activo')}
              </StatusBadge>
            </div>
            <Field
              label="Ventana"
              value={`${route.windowStart ? new Date(route.windowStart).toLocaleDateString() : '—'} — ${route.windowEnd ? new Date(route.windowEnd).toLocaleDateString() : '—'}`}
            />
            <Field
              label="Hora de Inicio"
              value={(route.windowStart ? new Date(route.windowStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : route.startTime) || '—'}
            />
            <Field
              label="Hora de Fin"
              value={(route.windowEnd ? new Date(route.windowEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : route.endTime) || '—'}
            />
            {route.days && route.days.length > 0 && (
              <Field className="sm:col-span-2" label="Días" value={route.days.map((day) => DAY_LABEL[day] || day).join(', ')} />
            )}
          </div>

          <div>
            <div className="cg-eyebrow mb-2 flex items-center gap-1.5">
              <MapPin className="size-3.5" /> Puestos
            </div>
            {(route.points && route.points.length) ? (
              <div className="space-y-2">
                {route.points.map((p: any) => (
                  <div key={p.id || p.siteId} className="rounded-xl border bg-muted/20 p-3">
                    <div className="font-medium text-sm">{p.siteName || p.address || p.siteId}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Pasadas: {(p.scheduledHits !== undefined && p.scheduledHits !== null) ? String(p.scheduledHits) : '—'} — Duración: {(p.duration !== undefined && p.duration !== null) ? String(p.duration) + ' min' : '—'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={<MapPin />} title="Sin puestos" description="Esta ruta no tiene puestos definidos." />
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
