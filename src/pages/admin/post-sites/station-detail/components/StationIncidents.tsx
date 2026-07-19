import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { ApiService } from '@/services/api/apiService';
import { Section, EmptyState, SkeletonCards, StatusBadge } from '@/components/kit';
import type { Station } from '@/types';

type Props = { station: Station; stationId: string; postSiteId: string };

// An incident row from the backend /incident endpoint. Fields are read
// defensively (several backend aliases), so this stays permissive.
interface IncidentGuardRef { fullName?: string; name?: string; firstName?: string; lastName?: string }
interface IncidentRow {
  id?: string;
  description?: string;
  subject?: string;
  title?: string;
  incidentDescription?: string;
  status?: string;
  incidentStatus?: string;
  createdAt?: string;
  incidentDate?: string;
  date?: string;
  stationId?: string;
  guard?: IncidentGuardRef | null;
  securityGuard?: IncidentGuardRef | null;
  responsibleGuard?: IncidentGuardRef | null;
  guardName?: string;
}

export default function StationIncidents({ stationId, postSiteId }: Props) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<IncidentRow[]>([]);
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

  const statusTone = (status: string): 'slate' | 'orange' | 'blue' => {
    const s = (status || '').toLowerCase();
    if (s === 'cerrado' || s === 'closed' || s === 'resolved') return 'slate';
    if (s === 'abierto' || s === 'open') return 'orange';
    return 'blue';
  };

  return (
    <Section
      icon={<AlertTriangle />}
      title={
        <>
          {t('station.incidents.title', 'Incidencias')}
          {rows.length > 0 && (
            <span className="ml-2 font-normal text-muted-foreground">({rows.length})</span>
          )}
        </>
      }
      contentClassName="-mx-5 -mb-5"
    >
      {loading ? (
        <div className="px-5 pb-5"><SkeletonCards count={3} /></div>
      ) : error ? (
        <div className="px-5 pb-5 text-sm text-red-600">{error}</div>
      ) : rows.length === 0 ? (
        <div className="px-5 pb-5">
          <EmptyState
            icon={<AlertTriangle />}
            title={t('station.incidents.empty', 'No hay incidencias para este puesto.')}
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/30 border-y">
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
              {rows.map((r: IncidentRow, i: number) => {
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
                      <StatusBadge tone={statusTone(status)} className="capitalize">{status}</StatusBadge>
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
    </Section>
  );
}
