import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { ApiService } from '@/services/api/apiService';

type Props = { station: any; stationId: string; postSiteId: string };

export default function StationIncidents({ stationId, postSiteId }: Props) {
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
        // Try stationId filter first, fall back to postSiteId
        let list: any[] = [];
        try {
          const res: any = await ApiService.get(
            `/tenant/${tenantId}/incident?filter[stationId]=${encodeURIComponent(stationId)}&limit=999`
          );
          list = Array.isArray(res) ? res : (res?.rows ?? []);
        } catch {
          // fallback via postSiteId is fine — incidents may not support stationId filter
        }

        if (!list.length && postSiteId) {
          const res2: any = await ApiService.get(
            `/tenant/${tenantId}/incident?postSiteId=${encodeURIComponent(postSiteId)}&limit=50`
          );
          const all = Array.isArray(res2) ? res2 : (res2?.rows ?? []);
          // Filter client-side for this station if stationId is present
          list = all.filter((r: any) =>
            !r.stationId || String(r.stationId) === String(stationId)
          );
        }

        if (mounted) setRows(list);
      } catch (e: any) {
        if (mounted) setError(e?.message || t('station.incidents.loadError', 'Error al cargar incidencias'));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [stationId, postSiteId]);

  const fmt = (v: any) => {
    if (!v) return '-';
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(v));
    } catch {
      return String(v);
    }
  };

  const statusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'cerrado' || s === 'closed' || s === 'resolved')
      return 'bg-muted text-foreground/70';
    if (s === 'abierto' || s === 'open')
      return 'bg-yellow-500/15 text-yellow-700';
    return 'bg-blue-500/10 text-blue-600';
  };

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b">
        <h3 className="text-base font-semibold text-foreground">
          {t('station.incidents.title', 'Incidencias')}
          {rows.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">({rows.length})</span>
          )}
        </h3>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="p-6 text-sm text-red-600">{error}</div>
      ) : rows.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">
          {t('station.incidents.empty', 'No hay incidencias para este puesto.')}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-foreground/70">
                  {t('station.incidents.col.description', 'Descripción')}
                </th>
                <th className="px-6 py-3 text-left font-semibold text-foreground/70">
                  {t('station.incidents.col.status', 'Estado')}
                </th>
                <th className="px-6 py-3 text-left font-semibold text-foreground/70">
                  {t('station.incidents.col.date', 'Fecha')}
                </th>
                <th className="px-6 py-3 text-left font-semibold text-foreground/70">
                  {t('station.incidents.col.guard', 'Vigilante')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r: any, i: number) => {
                const description =
                  r.description || r.subject || r.title || r.incidentDescription || '-';
                const status = r.status || r.incidentStatus || '-';
                const date = r.createdAt || r.incidentDate || r.date;
                const g = r.guard || r.securityGuard || r.responsibleGuard || {};
                const guardName =
                  g.fullName ||
                  g.name ||
                  `${g.firstName || ''} ${g.lastName || ''}`.trim() ||
                  r.guardName ||
                  '-';
                return (
                  <tr key={r.id || i} className="hover:bg-muted/30">
                    <td className="px-6 py-3 text-foreground max-w-xs">
                      <div className="truncate">{description}</div>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(status)}`}>
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
