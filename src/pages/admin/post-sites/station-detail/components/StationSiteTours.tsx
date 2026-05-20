import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { ApiService } from '@/services/api/apiService';

type Props = { station: any; stationId: string; postSiteId: string };

export default function StationSiteTours({ stationId }: Props) {
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
        const tenantId = localStorage.getItem('tenantId') || '';
        const res: any = await ApiService.get(
          `/tenant/${tenantId}/site-tour?stationId=${encodeURIComponent(stationId)}&limit=999`
        );
        const list = Array.isArray(res) ? res : (res?.rows ?? []);
        if (mounted) setRows(list);
      } catch (e: any) {
        if (mounted) setError(e?.message || t('station.siteTours.loadError', 'Error al cargar rondas'));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [stationId]);

  const fmt = (v: any) => {
    if (!v) return '-';
    try {
      return new Intl.DateTimeFormat(undefined, { dateStyle: 'short' }).format(new Date(v));
    } catch {
      return String(v);
    }
  };

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b">
        <h3 className="text-base font-semibold text-foreground">
          {t('station.siteTours.title', 'Rondas de Seguridad')}
          {rows.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">({rows.length})</span>
          )}
        </h3>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="animate-spin text-[#C8860A]" />
        </div>
      ) : error ? (
        <div className="p-6 text-sm text-red-600">{error}</div>
      ) : rows.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">
          {t('station.siteTours.empty', 'No hay rondas de seguridad para este puesto.')}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-foreground/70">
                  {t('station.siteTours.col.name', 'Nombre')}
                </th>
                <th className="px-6 py-3 text-left font-semibold text-foreground/70">
                  {t('station.siteTours.col.status', 'Estado')}
                </th>
                <th className="px-6 py-3 text-left font-semibold text-foreground/70">
                  {t('station.siteTours.col.date', 'Fecha')}
                </th>
                <th className="px-6 py-3 text-left font-semibold text-foreground/70">
                  {t('station.siteTours.col.guard', 'Guardia')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r: any, i: number) => {
                const name = r.name || r.tourName || r.description || '-';
                const status = r.active === false ? t('station.siteTours.inactive', 'Inactiva') : (r.status || t('station.siteTours.active', 'Activa'));
                const date = r.createdAt || r.scheduledDate || r.date;
                const g = r.securityGuard || r.guard || r.assignedGuard || {};
                const guardName =
                  g.fullName ||
                  g.name ||
                  `${g.firstName || ''} ${g.lastName || ''}`.trim() ||
                  r.guardName ||
                  '-';
                return (
                  <tr key={r.id || i} className="hover:bg-muted/30">
                    <td className="px-6 py-3 text-foreground font-medium">{name}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.active !== false
                          ? 'bg-green-100 text-green-700'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground font-mono text-xs">{fmt(date)}</td>
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
