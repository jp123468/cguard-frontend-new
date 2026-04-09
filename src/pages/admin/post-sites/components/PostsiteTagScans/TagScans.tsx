import React, { useEffect, useState } from 'react';
import { ApiService } from '@/services/api/apiService';

export default function TagScans({
  tourId,
  postSiteId,
  site,
}: {
  tourId?: string | null;
  postSiteId?: string | null;
  site?: any;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
        if (!tenantId) return setRows([]);
        const qsParts: string[] = [];
        if (tourId) qsParts.push(`tourId=${encodeURIComponent(String(tourId))}`);
        if (postSiteId) qsParts.push(`postSiteId=${encodeURIComponent(String(postSiteId))}`);
        qsParts.push('limit=1000');
        const qs = qsParts.length ? `?${qsParts.join('&')}` : '';
        const resp: any = await ApiService.get(`/tenant/${tenantId}/site-tour/tag-scans${qs}`);
        const list = resp && (resp.rows || resp.data) ? (resp.rows || resp.data) : (Array.isArray(resp) ? resp : []);
        if (!mounted) return;
        setRows(list || []);
      } catch (e: any) {
        console.error('Failed loading tag scans', e);
        // If ApiService threw an ApiError include status and data to help debugging
        if (e && e.status) {
          try {
            setError(`${e.message || 'Error'} (${e.status})` + (e.data ? ` - ${JSON.stringify(e.data)}` : ''));
          } catch (_) {
            setError(`${e.message || 'Error'} (${e.status})`);
          }
        } else {
          setError(e?.message || 'Error cargando registros');
        }
        setRows([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [tourId, postSiteId, site]);

  const downloadExport = async (format: 'pdf' | 'excel') => {
    try {
      const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
      if (!tenantId) return;
      const qsParts: string[] = [];
      if (tourId) qsParts.push(`tourId=${encodeURIComponent(String(tourId))}`);
      if (postSiteId) qsParts.push(`postSiteId=${encodeURIComponent(String(postSiteId))}`);
      const qs = qsParts.length ? `&${qsParts.join('&')}` : '';
      const url = `/tenant/${tenantId}/site-tour/tag-scans/export?format=${format}${qs}`;
      const blob: Blob = await ApiService.getBlob(url);
      const filename = `etiquetas-recorrido${tourId ? `-${tourId}` : ''}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e: any) {
      console.error('Export failed', e);
      if (e && e.status) {
        alert(`Error al exportar: ${e.message || 'Error'} (${e.status})`);
      } else {
        alert('Error al exportar');
      }
    }
  };

  return (
    <div className="bg-white border rounded-lg p-4 flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Etiquetas de recorrido</h3>
        <div className="flex items-center gap-2">
          <button onClick={() => downloadExport('pdf')} className="px-3 py-1 rounded bg-gray-100">Exportar a PDF</button>
          <button onClick={() => downloadExport('excel')} className="px-3 py-1 rounded bg-gray-100">Exportar a Excel</button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Cargando registros...</div>
      ) : error || rows.length === 0 ? (
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td colSpan={4} className="py-20">
                  <div className="flex flex-col items-center justify-center text-center">
                    <img
                      src="https://app.guardspro.com/assets/icons/custom/no-data-found.png"
                      alt="Sin datos"
                      className="h-36 mb-4"
                    />
                    <h3 className="text-lg font-semibold">No se encontraron resultados</h3>
                    <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                      {tourId || postSiteId
                        ? 'No hay etiquetas escaneadas para este recorrido o puesto.'
                        : 'No hay etiquetas escaneadas.'}
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left">Fecha y hora</th>
                <th className="px-4 py-2 text-left">Etiqueta / Datos</th>
                <th className="px-4 py-2 text-left">Estación</th>
                <th className="px-4 py-2 text-left">Guardia / Asignación</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any, i: number) => (
                <tr key={(r.id || r._id || i)} className="border-b">
                  <td className="px-4 py-2 align-top">{r.scannedAt ? new Date(r.scannedAt).toLocaleString() : (r.createdAt ? new Date(r.createdAt).toLocaleString() : '-')}</td>
                  <td className="px-4 py-2 align-top break-words">{r.scannedData || r.tagIdentifier || '-'}</td>
                  <td className="px-4 py-2 align-top">{r.stationId || (r.station && (r.station.stationName || r.station.name)) || '-'}</td>
                  <td className="px-4 py-2 align-top">{(r.tourAssignment && (r.tourAssignment.guardName || (r.tourAssignment.guard && (r.tourAssignment.guard.fullName || r.tourAssignment.guard.name)))) || (r.securityGuard && (r.securityGuard.fullName || r.securityGuard.name)) || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
