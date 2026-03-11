import React, { useEffect, useState } from 'react';
import IncidentMap from '@/components/IncidentMap/IncidentMap';
import { postSiteService } from '@/lib/api/postSiteService';

export default function PostSiteMiniInfo({ postSiteId }: { postSiteId: string }) {
  const [site, setSite] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postSiteId) return;
    let mounted = true;
    setLoading(true);
    postSiteService.get(postSiteId)
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
    </div>
  );
}
