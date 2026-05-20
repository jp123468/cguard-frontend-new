import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Car } from 'lucide-react';
import { visitorLogService } from '@/lib/api/visitorLogService';

type Props = { station: any; stationId: string; postSiteId: string };

const PARKING_PLACE_TYPES = ['Parking', 'Parqueadero', 'Estacionamiento', 'Vehículo', 'Vehiculo'];

function formatDate(val: string | null | undefined) {
  if (!val) return '-';
  try { return new Date(val).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }); }
  catch { return val; }
}

export default function StationParking({ stationId }: Props) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stationId) return;
    let mounted = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Try each parking placeType until one returns results, fallback to all stationId logs
        let found: any[] = [];

        for (const placeType of PARKING_PLACE_TYPES) {
          try {
            const res: any = await visitorLogService.list(
              { stationId, placeType } as any,
              { limit: 200, offset: 0 }
            );
            const list = Array.isArray(res) ? res : (res?.rows ?? []);
            if (list.length > 0) { found = list; break; }
          } catch {}
        }

        // Fallback: all visitor logs for this station
        if (found.length === 0) {
          const res: any = await visitorLogService.list(
            { stationId } as any,
            { limit: 200, offset: 0 }
          );
          found = Array.isArray(res) ? res : (res?.rows ?? []);
        }

        if (mounted) setRows(found);
      } catch (e: any) {
        if (mounted) setError(e?.message || t('station.parking.loadError', 'Error al cargar registros'));
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [stationId]);

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b">
        <h3 className="text-base font-semibold text-foreground">
          {t('station.parking.title', 'Gestión de Parking')}
          {!loading && rows.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">({rows.length})</span>
          )}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t('station.parking.subtitle', 'Registro de entrada y salida de vehículos en este puesto')}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="animate-spin text-[#C8860A]" />
        </div>
      ) : error ? (
        <div className="p-6 text-sm text-red-600">{error}</div>
      ) : rows.length === 0 ? (
        <div className="p-6 flex flex-col items-center gap-2 text-muted-foreground">
          <Car size={24} className="text-muted-foreground/60" />
          <span className="text-sm">{t('station.parking.empty', 'No hay registros de parking para este puesto.')}</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-foreground/70">
                  {t('station.parking.col.visitor', 'Visitante / Vehículo')}
                </th>
                <th className="px-6 py-3 text-left font-semibold text-foreground/70">
                  {t('station.parking.col.placeType', 'Tipo')}
                </th>
                <th className="px-6 py-3 text-left font-semibold text-foreground/70">
                  {t('station.parking.col.entry', 'Entrada')}
                </th>
                <th className="px-6 py-3 text-left font-semibold text-foreground/70">
                  {t('station.parking.col.exit', 'Salida')}
                </th>
                <th className="px-6 py-3 text-left font-semibold text-foreground/70">
                  {t('station.parking.col.guard', 'Guardia')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r: any, i: number) => {
                const firstName = r.firstName || r.first_name || '';
                const lastName = r.lastName || r.last_name || '';
                const visitorName = [firstName, lastName].filter(Boolean).join(' ') || r.name || r.visitorName || '-';
                const placeType = r.placeType || r.place_type || '-';
                const entry = formatDate(r.visitDate || r.entryTime || r.createdAt);
                const exit = formatDate(r.exitTime || r.exit_time);
                const guard = r.guard || r.securityGuard || {};
                const guardName = [guard.firstName || guard.first_name, guard.lastName || guard.last_name]
                  .filter(Boolean).join(' ') || guard.name || guard.fullName || r.guardName || '-';
                return (
                  <tr key={r.id || i} className="hover:bg-muted/30">
                    <td className="px-6 py-3 text-foreground font-medium">{visitorName}</td>
                    <td className="px-6 py-3 text-muted-foreground">{placeType}</td>
                    <td className="px-6 py-3 text-foreground">{entry}</td>
                    <td className="px-6 py-3 text-muted-foreground">{exit}</td>
                    <td className="px-6 py-3 text-foreground">{guardName}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
