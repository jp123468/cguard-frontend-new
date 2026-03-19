import React, { useEffect, useState } from 'react';
import { ApiService } from '@/services/api/apiService';

export default function Incidents({ site }: { site?: any }) {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
        const postSiteId = site?.id || '';
        if (!postSiteId) return;
        setLoading(true);
        const res = await ApiService.get(`/tenant/${tenantId}/incident?postSiteId=${encodeURIComponent(postSiteId)}&limit=50`);
        const rows = Array.isArray(res) ? res : (res && res.rows) ? res.rows : [];
        if (mounted) setIncidents(rows);
      } catch (err) {
        console.error('Failed to load incidents', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [site]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Incidents</h3>
      <div className="bg-white border rounded-lg p-4">
        {loading ? (
          <div>Loading...</div>
        ) : incidents.length === 0 ? (
          <div className="text-sm text-gray-500">No incidents found for this post site.</div>
        ) : (
          <ul className="space-y-3">
            {incidents.map((it) => (
              <li key={it.id} className="border rounded p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{it.title || it.type || 'Incident'}</div>
                    <div className="text-xs text-gray-500">{it.description || it.notes || ''}</div>
                  </div>
                  <div className="text-xs text-gray-400">{new Date(it.createdAt || it.created_at || Date.now()).toLocaleString()}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
