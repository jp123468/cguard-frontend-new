import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, MapPin, MapPinOff, HelpCircle } from 'lucide-react';
import { ApiService } from '@/services/api/apiService';

type Props = { station: any; stationId: string; postSiteId: string };

export default function StationTagScans({ stationId }: Props) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const LIMIT = 25;

  useEffect(() => {
    if (!stationId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const tenantId = localStorage.getItem('tenantId') || '';
        const res: any = await ApiService.get(
          `/tenant/${tenantId}/tag-scan?filter[stationId]=${encodeURIComponent(stationId)}&limit=${LIMIT}&offset=${page * LIMIT}`
        );
        const list = Array.isArray(res) ? res : (res?.rows ?? []);
        const count = typeof res?.count === 'number' ? res.count : list.length;
        if (mounted) { setRows(list); setTotal(count); }
      } catch (e: any) {
        if (mounted) setError(e?.message || t('station.tagScans.loadError', 'Error al cargar escaneos'));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [stationId, page]);

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

  // Server-side location verdict: validLocation/distanceMeters live on the row
  // (DB columns) with a fallback to the scannedData JSON for older rows.
  const locationBadge = (r: any) => {
    const valid = r.validLocation ?? r.scannedData?.validLocation ?? null;
    const dist = r.distanceMeters ?? r.scannedData?.distanceMeters ?? null;
    const distTxt = dist != null ? ` · ${Math.round(Number(dist))} m` : '';
    if (valid === true) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700">
          <MapPin className="h-3.5 w-3.5" /> {t('station.tagScans.inLocation', 'En ubicación')}{distTxt}
        </span>
      );
    }
    if (valid === false) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-700">
          <MapPinOff className="h-3.5 w-3.5" /> {t('station.tagScans.outOfRange', 'Fuera de rango')}{distTxt}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        <HelpCircle className="h-3.5 w-3.5" /> {t('station.tagScans.unverified', 'Sin verificar')}
      </span>
    );
  };

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b">
        <h3 className="text-base font-semibold text-foreground">
          {t('station.tagScans.title', 'Escaneos de Tags')}
          {total > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">({total})</span>
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
          {t('station.tagScans.empty', 'No hay escaneos para este puesto.')}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/30 border-b">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-foreground/70">
                    {t('station.tagScans.col.tag', 'Tag')}
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-foreground/70">
                    {t('station.tagScans.col.guard', 'Vigilante')}
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-foreground/70">
                    {t('station.tagScans.col.location', 'Ubicación')}
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-foreground/70">
                    {t('station.tagScans.col.scannedAt', 'Escaneado')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r: any, i: number) => {
                  const tag = r.tagIdentifier || r.tag || r.tagId || r.code || '-';
                  const g = r.securityGuard || r.guard || r.assignment?.guard || {};
                  const guardName =
                    g.fullName ||
                    g.name ||
                    `${g.firstName || ''} ${g.lastName || ''}`.trim() ||
                    r.guardName ||
                    '-';
                  const scannedAt = r.scannedAt || r.createdAt || r.timestamp;
                  return (
                    <tr key={r.id || i} className="hover:bg-muted/30">
                      <td className="px-6 py-3 text-foreground font-mono">{tag}</td>
                      <td className="px-6 py-3 text-foreground">{guardName}</td>
                      <td className="px-6 py-3">{locationBadge(r)}</td>
                      <td className="px-6 py-3 text-muted-foreground font-mono text-xs">{fmt(scannedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {total > LIMIT && (
            <div className="px-6 py-3 border-t flex items-center justify-between text-sm text-foreground/70">
              <span>
                {t('pagination.showing', 'Mostrando')} {page * LIMIT + 1}–
                {Math.min((page + 1) * LIMIT, total)} {t('pagination.of', 'de')} {total}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1 rounded border disabled:opacity-40"
                >
                  {t('pagination.prev', 'Anterior')}
                </button>
                <button
                  disabled={(page + 1) * LIMIT >= total}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1 rounded border disabled:opacity-40"
                >
                  {t('pagination.next', 'Siguiente')}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
