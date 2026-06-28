import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tag } from 'lucide-react';
import { ApiService, ApiError } from '@/services/api/apiService';
import { Section, EmptyState, SkeletonCards, StatusBadge, FadeIn } from '@/components/kit';

type Props = { station: any; stationId: string; postSiteId: string };

export default function StationSiteTourTags({ stationId, postSiteId }: Props) {
  const { t } = useTranslation();
  const [tags, setTags] = useState<any[]>([]);
  const [tours, setTours] = useState<any[]>([]);
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
        const ts = Date.now();

        // 1. Load tours for this station
        const toursRes: any = await ApiService.get(
          `/tenant/${tenantId}/site-tour?stationId=${encodeURIComponent(stationId)}&limit=999&_=${ts}`
        );
        const tourRows: any[] = Array.isArray(toursRes)
          ? toursRes
          : (toursRes?.rows ?? []);

        if (mounted) setTours(tourRows);

        if (tourRows.length === 0) {
          if (mounted) { setTags([]); setLoading(false); }
          return;
        }

        // 2. For each tour, load tags
        const collected: any[] = [];
        const tourMap: Record<string, string> = {};
        for (const tr of tourRows) {
          const tid = tr.id || tr._id;
          if (!tid) continue;
          tourMap[tid] = tr.name || tr.tourName || tr.siteTourName || tid;
          try {
            const tagsRes: any = await ApiService.get(
              `/tenant/${tenantId}/site-tour/${encodeURIComponent(tid)}/tags?_=${ts}`
            );
            const rows = Array.isArray(tagsRes) ? tagsRes : (tagsRes?.rows ?? []);
            rows.forEach((tag: any) => collected.push({ ...tag, _tourName: tourMap[tid] }));
          } catch (e1) {
            // try alternate singular path
            try {
              const tagsRes2: any = await ApiService.get(
                `/tenant/${tenantId}/site-tour/${encodeURIComponent(tid)}/tag?_=${ts}`
              );
              const rows2 = Array.isArray(tagsRes2) ? tagsRes2 : (tagsRes2?.rows ?? []);
              rows2.forEach((tag: any) => collected.push({ ...tag, _tourName: tourMap[tid] }));
            } catch {}
          }
        }

        // Deduplicate by id
        const seen = new Map<string, any>();
        for (const tag of collected) {
          const key = String(tag.id || tag._id || tag.tagIdentifier || JSON.stringify(tag));
          if (!seen.has(key)) seen.set(key, tag);
        }

        if (mounted) setTags(Array.from(seen.values()));
      } catch (e: any) {
        if (mounted) {
          if (e instanceof ApiError && e.status === 404) {
            setTags([]);
          } else {
            setError(e?.message || t('station.tags.loadError', 'Error al cargar etiquetas'));
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [stationId]);

  return (
    <Section
      icon={<Tag />}
      title={
        <span>
          {t('station.tags.title', 'Etiquetas de Rondas')}
          {!loading && tags.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">({tags.length})</span>
          )}
        </span>
      }
      contentClassName="-mx-5 -mb-5"
    >
      {tours.length > 0 && (
        <p className="px-5 -mt-2 mb-3 text-xs text-muted-foreground">
          {tours.length} {tours.length === 1
            ? t('station.tags.tour', 'ronda')
            : t('station.tags.tours', 'rondas')}
        </p>
      )}

      {loading ? (
        <div className="px-5 pb-5"><SkeletonCards count={4} /></div>
      ) : error ? (
        <div className="px-5 pb-5 text-sm text-red-600">{error}</div>
      ) : tags.length === 0 ? (
        <div className="px-5 pb-5">
          <EmptyState
            icon={<Tag />}
            title={t('station.tags.empty', 'No hay etiquetas configuradas para este puesto.')}
          />
        </div>
      ) : (
        <FadeIn className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-foreground/70">
                  {t('station.tags.col.name', 'Etiqueta')}
                </th>
                <th className="px-6 py-3 text-left font-semibold text-foreground/70">
                  {t('station.tags.col.type', 'Tipo')}
                </th>
                <th className="px-6 py-3 text-left font-semibold text-foreground/70">
                  {t('station.tags.col.tour', 'Ronda')}
                </th>
                <th className="px-6 py-3 text-left font-semibold text-foreground/70">
                  {t('station.tags.col.location', 'Ubicación')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tags.map((tag: any, i: number) => {
                const name = tag.name || tag.tagName || tag.tagIdentifier || '-';
                const type = tag.tagType || tag.type || 'qr';
                const tourName = tag._tourName || tag.siteTour?.name || '-';
                const location = tag.location || tag.locationDescription || '-';
                return (
                  <tr key={tag.id || i} className="hover:bg-muted/30">
                    <td className="px-6 py-3 text-foreground font-medium">{name}</td>
                    <td className="px-6 py-3">
                      <StatusBadge tone="primary" dot={false} className="uppercase">{type}</StatusBadge>
                    </td>
                    <td className="px-6 py-3 text-foreground/70">{tourName}</td>
                    <td className="px-6 py-3 text-muted-foreground">{location}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </FadeIn>
      )}
    </Section>
  );
}
