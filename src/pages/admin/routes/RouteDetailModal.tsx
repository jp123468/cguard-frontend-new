import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onOpenChange(false); else onOpenChange(true); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Detalle de la Ruta</DialogTitle>
          <DialogDescription>
            {loading ? 'Cargando...' : route ? `Información de ${route.name || route.id}` : 'Sin datos'}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          {loading && <div>Cargando...</div>}
          {!loading && route && (
            <div>
              <div className="mb-2"><strong>Nombre:</strong> {route.name || '—'}</div>
              <div className="mb-2"><strong>Tipo:</strong> {route.continuous ? 'Continua' : 'Programada'}</div>
              {route.days && route.days.length > 0 && (
                <div className="mb-2"><strong>Días:</strong> {route.days.map((day) => DAY_LABEL[day] || day).join(', ')}</div>
              )}
              <div className="mb-2"><strong>Supervisor:</strong> {guardLabel ?? (
                (typeof route.assignedGuard === 'object' && (route.assignedGuard?.firstName || route.assignedGuard?.lastName))
                  ? `${route.assignedGuard?.firstName || ''} ${route.assignedGuard?.lastName || ''}`.trim()
                  : (typeof route.assignedGuard === 'object' && route.assignedGuard?.email)
                    ? route.assignedGuard.email
                    : (typeof route.assignedGuard === 'string')
                      ? route.assignedGuard
                      : (route.supervisorId || '—')
              )}</div>

              <div className="mb-2"><strong>Vehículo:</strong> {vehicleLabel ?? (
                (typeof route.vehicle === 'object')
                  ? (route.vehicle?.name || route.vehicle?.licensePlate || route.vehicle?.id)
                  : (typeof route.vehicle === 'string')
                    ? route.vehicle
                    : (route.vehicleId || '—')
              )}</div>
              <div className="mb-2"><strong>Estado:</strong> {route.completed ? 'Completada' : (route.active === false ? 'Inactivo' : 'Activo')}</div>
              <div className="mb-2"><strong>Ventana:</strong> {route.windowStart ? new Date(route.windowStart).toLocaleDateString() : '—'} — {route.windowEnd ? new Date(route.windowEnd).toLocaleDateString() : '—'}</div>
              <div className="mb-2"><strong>Hora de Inicio:</strong> {(route.windowStart ? new Date(route.windowStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : route.startTime) || '—'}</div>
              <div className="mb-2"><strong>Hora de Fin:</strong> {(route.windowEnd ? new Date(route.windowEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : route.endTime) || '—'}</div>

              <div className="mt-3"><strong>Puestos:</strong></div>
              <ul className="list-disc ml-6 mt-2">
                {(route.points && route.points.length) ? route.points.map((p: any) => (
                  <li key={p.id || p.siteId}>
                    <div className="font-medium">{p.siteName || p.address || p.siteId}</div>
                    <div className="text-sm text-muted-foreground">Pasadas: {(p.scheduledHits !== undefined && p.scheduledHits !== null) ? String(p.scheduledHits) : '—'} — Duración: {(p.duration !== undefined && p.duration !== null) ? String(p.duration) + ' min' : '—'}</div>
                  </li>
                )) : <li>—</li>}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
            <Button onClick={handleEdit}>Editar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
