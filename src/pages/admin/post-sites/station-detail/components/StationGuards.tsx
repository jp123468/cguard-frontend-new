import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { ApiService } from '@/services/api/apiService';

type Props = { station: any; stationId: string; postSiteId: string };

export default function StationGuards({ station, stationId }: Props) {
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
        // First, try the guards already embedded in the loaded station object
        const embedded = Array.isArray(station?.assignedGuards)
          ? station.assignedGuards
          : Array.isArray(station?.assignedGuards?.rows)
          ? station.assignedGuards.rows
          : null;

        if (embedded && embedded.length > 0) {
          if (mounted) { setRows(embedded); setLoading(false); }
          return;
        }

        // Try dedicated station-guards endpoint, fall back to security-guard filter
        let fetched: any[] = [];
        try {
          const res: any = await ApiService.get(
            `/tenant/${tenantId}/stations/${encodeURIComponent(stationId)}/guards?limit=999`
          );
          fetched = Array.isArray(res) ? res : (res?.rows ?? []);
        } catch {
          // fallback
        }

        if (!fetched.length) {
          const res2: any = await ApiService.get(
            `/tenant/${tenantId}/security-guard?filter[station]=${encodeURIComponent(stationId)}&limit=999`
          );
          fetched = Array.isArray(res2) ? res2 : (res2?.rows ?? []);
        }

        if (mounted) setRows(fetched);
      } catch (e: any) {
        if (mounted) setError(e?.message || t('station.guards.loadError', 'Error al cargar guardias'));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [stationId, station]);

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b">
        <h3 className="text-base font-semibold text-foreground">
          {t('station.guards.title', 'Guardias Asignados')}
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
          {t('station.guards.empty', 'No hay guardias asignados a este puesto.')}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-foreground/70">
                  {t('station.guards.col.name', 'Nombre')}
                </th>
                <th className="px-6 py-3 text-left font-semibold text-foreground/70">
                  {t('station.guards.col.email', 'Email')}
                </th>
                <th className="px-6 py-3 text-left font-semibold text-foreground/70">
                  {t('station.guards.col.phone', 'Teléfono')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r: any, i: number) => {
                const g = r.guard || r.securityGuard || r.user || r;
                const fullName =
                  g.fullName ||
                  g.name ||
                  `${g.firstName || ''} ${g.lastName || ''}`.trim() ||
                  g.email ||
                  '-';
                const email = g.email || g.guardEmail || '-';
                const phone = g.phone || g.phoneNumber || g.cellphone || '-';
                return (
                  <tr key={g.id || r.id || i} className="hover:bg-muted/30">
                    <td className="px-6 py-3 text-foreground font-medium">{fullName}</td>
                    <td className="px-6 py-3 text-muted-foreground">{email}</td>
                    <td className="px-6 py-3 text-muted-foreground">{phone}</td>
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
