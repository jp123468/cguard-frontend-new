import { useEffect, useState } from "react";
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";
import RouteForm from "./RouteForm";
import routeService from "@/lib/api/routeService";

export default function EditRoutePage() {
  const params = useParams<{ tenantId?: string; id?: string }>();
  const navigate = useNavigate();
  const [routeData, setRouteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params?.tenantId) {
      try {
        localStorage.setItem('tenantId', params.tenantId);
      } catch (error) {
        console.error(error);
      }
    }

    const routeId = params?.id;
    if (!routeId) {
      setLoading(false);
      return;
    }

    let mounted = true;

    (async () => {
      try {
        const route: any = await routeService.find(routeId);
        if (!mounted || !route) return;

        // assignedGuard may be an object or a plain string id depending on backend
        let supervisorId = '';
        let supervisorName = '';
        if (route.assignedGuard) {
          if (typeof route.assignedGuard === 'string') {
            supervisorId = String(route.assignedGuard);
          } else if (route.assignedGuard.id) {
            supervisorId = String(route.assignedGuard.id);
            supervisorName = route.assignedGuard.displayName || route.assignedGuard.name || route.assignedGuard.email || '';
          }
        }
        if (!supervisorId && route.supervisorId) supervisorId = String(route.supervisorId);
        const vehicleId = route.vehicle?.id ? String(route.vehicle.id) : route.vehicleId ? String(route.vehicleId) : '';
        const vehicleName = route.vehicle?.name || '';
        const vehicleLicensePlate = route.vehicle?.licensePlate || '';

        setRouteData({
          name: route.name || '',
          description: route.description || '',
          continuous: route.continuous !== undefined ? route.continuous : true,
          dateFrom: route.windowStart ? new Date(route.windowStart).toISOString().slice(0, 10) : '',
          startTime: route.windowStart ? new Date(route.windowStart).toISOString().slice(11, 16) : '00:00',
          dateTo: route.windowEnd ? new Date(route.windowEnd).toISOString().slice(0, 10) : '',
          endTime: route.windowEnd ? new Date(route.windowEnd).toISOString().slice(11, 16) : '23:59',
          days: route.days || [],
          supervisorId,
          supervisorName,
          siteIds: Array.isArray(route.points) ? route.points.map((point: any) => point.siteId) : [],
          vehicleId,
          vehicleName,
          vehicleLicensePlate,
          syncHitsBetweenGuards: route.syncHitsBetweenGuards || false,
          forceVehicleRouteOrder: route.forceVehicleRouteOrder || false,
          notifyBefore: route.notifyBefore || '00:15',
          autoCheckInByGeofence: route.autoCheckInByGeofence || false,
          forceCheckInBeforeStart: route.forceCheckInBeforeStart || false,
          points: Array.isArray(route.points)
            ? route.points.map((point: any) => ({
                siteId: point.siteId,
                siteName: point.siteName,
                address: point.address || '',
                duration: point.duration ?? 5,
                scheduledHits: point.scheduledHits ?? 1,
                lat: point.lat ?? null,
                lng: point.lng ?? null,
              }))
            : [],
        });
      } catch (error) {
        console.error(error);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [params]);

  if (loading) {
    return (
      <AppLayout>
        <Breadcrumb
          items={[
            { label: 'Panel de control', path: '/dashboard' },
            { label: 'Editar ruta' },
          ]}
        />
        <div className="p-6">Cargando ruta...</div>
      </AppLayout>
    );
  }

  if (!routeData) {
    return (
      <AppLayout>
        <Breadcrumb
          items={[
            { label: 'Panel de control', path: '/dashboard' },
            { label: 'Editar ruta' },
          ]}
        />
        <div className="p-6">No se encontró la ruta.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: 'Panel de control', path: '/dashboard' },
          { label: 'Editar ruta' },
        ]}
      />
      <div className="p-6">
        <RouteForm
          mode="edit"
          routeId={params.id}
          initialData={routeData}
          onSuccess={() => navigate('/vehicle-patrol/routes', { replace: true })}
        />
      </div>
    </AppLayout>
  );
}