import React, { useEffect, useState } from 'react';
import IncidentMap from '@/components/IncidentMap/IncidentMap';
import { stationService } from '@/lib/api/stationService';

export default function PostSiteMiniInfo({ postSiteId }: { postSiteId: string }) {
  const [site, setSite] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postSiteId) return;
    let mounted = true;
    setLoading(true);
    stationService.get(postSiteId)
      .then((data) => { if (mounted) setSite(data); })
      .catch((e) => { if (mounted) setError('No se pudo cargar el puesto'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [postSiteId]);

  if (loading) return <div className="text-xs text-gray-400">Cargando puesto...</div>;
  if (error) return <div className="text-xs text-red-400">{error}</div>;
  if (!site) return null;

  return (
    <div className="border rounded p-3 bg-gray-50 mb-2">
      <div className="font-semibold text-sm mb-1">{site.companyName || site.name}</div>
      <div className="text-xs text-gray-600 mb-1">{site.address}</div>
      {site.latitud && site.longitud && (
        <IncidentMap lat={parseFloat(site.latitud)} lng={parseFloat(site.longitud)} label={site.companyName || site.name} />
      )}
      <div className="text-xs text-gray-500">{site.city}, {site.country}</div>

      <div className="mt-2 flex items-center gap-2">
        <div className="px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-800">Guards: {site.guardsCount ?? (Array.isArray(site.assignedGuards) ? site.assignedGuards.length : site.numberOfGuardsInStation ?? 0)}</div>
        {site.stationSchedule && (
          <div className="px-2 py-1 text-xs rounded-full bg-yellow-50 text-yellow-800">Horario: {site.stationSchedule}</div>
        )}
        {site.latitud && site.longitud && (
          <div className="px-2 py-1 text-xs rounded-full bg-gray-50 text-gray-700">{parseFloat(site.latitud).toFixed(4)}, {parseFloat(site.longitud).toFixed(4)}</div>
        )}
      </div>
    </div>
  );
}
