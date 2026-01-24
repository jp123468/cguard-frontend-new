import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import IncidentMap from '@/components/IncidentMap/IncidentMap';
import { clientService } from '@/lib/api/clientService';
import { postSiteService } from '@/lib/api/postSiteService';
import IncidentTypesService from '@/services/incident-types.service';

export default function DispatchPublicView() {
  const { token } = useParams();
  const [payload, setPayload] = useState<any | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [postSites, setPostSites] = useState<any[]>([]);
  const [incidentTypes, setIncidentTypes] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        const configured = (import.meta as any).env?.VITE_API_URL as string | undefined;
        let backendOrigin = 'http://localhost:3001';
        try {
          if (configured) {
            const u = new URL(configured);
            backendOrigin = u.origin;
          }
        } catch (e) {
          // ignore
        }

        const url = `${backendOrigin}/public/dispatch/${token}`;
        const resp = await fetch(url, { method: 'GET' });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const p = await resp.json();
        setPayload(p);
      } catch (e) {
        setPayload(null);
      }
    };
    load();
  }, [token]);

  useEffect(() => {
    const loadAux = async () => {
      try {
        const [clientsResp, sitesResp] = await Promise.all([
          clientService.getClients(undefined, { limit: 1000, offset: 0 }).catch(() => null),
          postSiteService.list({}, { limit: 1000, offset: 0 }).catch(() => null),
        ]);
        if (clientsResp && Array.isArray((clientsResp as any).rows)) setClients((clientsResp as any).rows);
        if (sitesResp && Array.isArray((sitesResp as any).rows)) setPostSites((sitesResp as any).rows);
        try {
          const itResp: any = await IncidentTypesService.list('', 1, 1000);
          if (itResp && Array.isArray(itResp.rows)) setIncidentTypes(itResp.rows);
        } catch (e) {
          // ignore
        }
      } catch (e) {
        // ignore
      }
    };
    loadAux();
  }, []);

  // Compute coordinates based on payload and auxiliary data
  const coords = (() => {
    if (!payload) return null;
    const maybe = (k: string) => (payload[k] !== undefined ? payload[k] : null);
    const lat = maybe('latitude') || maybe('lat') || maybe('locationLat') || (payload.geo && payload.geo.lat) || null;
    const lng = maybe('longitude') || maybe('lng') || maybe('locationLng') || (payload.geo && payload.geo.lng) || null;
    if (lat && lng) return { lat: Number(lat), lng: Number(lng) };
    // try resolve from post site
    try {
      const siteId = payload.siteId || payload.postSiteId || payload.site?.id;
      if (siteId && postSites && postSites.length > 0) {
        const site = postSites.find((s) => s.id === siteId || s._id === siteId || s.id === String(siteId));
        if (site) {
          const sLat = site.latitude || site.lat || site.locationLat || site.coords?.lat || null;
          const sLng = site.longitude || site.lng || site.locationLng || site.coords?.lng || null;
          if (sLat && sLng) return { lat: Number(sLat), lng: Number(sLng) };
          if (site.location && typeof site.location === 'string') {
            const parts = site.location.split(',').map((s: string) => s.trim());
            if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) return { lat: Number(parts[0]), lng: Number(parts[1]) };
          }
        }
      }
    } catch (e) {
      // ignore
    }
    // fallback: string location
    if (payload.location && typeof payload.location === 'string') {
      const m = payload.location.split(',').map((s: string) => s.trim());
      if (m.length === 2 && !isNaN(Number(m[0])) && !isNaN(Number(m[1]))) return { lat: Number(m[0]), lng: Number(m[1]) };
    }
    return null;
  })();

  if (!payload) return (<div style={{ padding: 24 }}>No disponible o enlace expirado.</div>);

  // prepare guard rows for display
  const guardRows: JSX.Element[] = [];
  if (payload) {
    if (payload.guardName) {
      guardRows.push(
        <tr key="guard-main" className="border-t">
          <td className="py-2 px-3">{payload.guardName.fullName || payload.guardName.name || '-'}</td>
          <td className="py-2 px-3">-</td>
          <td className="py-2 px-3">{payload.dateTime ? new Date(payload.dateTime).toLocaleString() : (payload.createdAt ? new Date(payload.createdAt).toLocaleString() : '-')}</td>
        </tr>
      );
    } else if ((payload.guards && payload.guards.length > 0) || (payload.assignedGuards && payload.assignedGuards.length > 0)) {
      const list = payload.guards || payload.assignedGuards;
      list.forEach((g: any, i: number) => {
        guardRows.push(
          <tr key={i} className="border-t">
            <td className="py-2 px-3">{(g && (g.name || g.fullName)) || g || '-'}</td>
            <td className="py-2 px-3">{g && (g.status || g.guardStatus) || '-'}</td>
            <td className="py-2 px-3">{g && (g.dateTime || g.assignedAt) ? new Date(g.dateTime || g.assignedAt).toLocaleString() : '-'}</td>
          </tr>
        );
      });
    }
  }

  const ticketShort = (() => {
    const full = (payload && (payload.ticketId || payload.id)) || '';
    if (!full) return '';
    const idx = full.indexOf('-');
    return idx > 0 ? full.slice(0, idx) : full;
  })();

  const incidentTypeDisplay = (() => {
    if (!payload) return '-';
    if (payload.incidentType && typeof payload.incidentType === 'object') return payload.incidentType.name || '-';
    const idString = (typeof payload.incidentType === 'string' && payload.incidentType) || payload.incidentTypeId || null;
    if (idString) {
      const found = incidentTypes.find((t) => t.id === idString);
      if (found) return found.name || idString;
      return idString;
    }
    return '-';
  })();

  return (
    <div className="p-6 bg-gray-50 min-h-screen" style={{ fontFamily: 'Inter, Arial, sans-serif' }}>
      <div className="max-w-4xl mx-auto">
        {/* Logo + Map header */}
        <div className="flex flex-col items-center mb-4">
          <img src="/assets/logo/logo.png" alt="Logo" className="h-25 mb-4" style={{ objectFit: 'contain' }} />
          {coords && <div className="w-full mb-2"><IncidentMap lat={coords.lat} lng={coords.lng} label={payload?.ticketId || payload?.id} /></div>}
        </div>

        <div className="bg-white border rounded-md overflow-hidden">
          <div className="bg-gray-100 px-4 py-2 text-sm font-semibold flex items-center justify-between">
            <div>Basic Details</div>
          </div>
          <div className="p-0 text-sm">
            <table className="w-full text-sm border-collapse">
              <tbody>
                <tr className="border-b">
                  <td className="py-3 px-4 text-xs font-medium text-gray-500">Ticket ID</td>
                  <td className="py-3 px-4 text-sm text-gray-800">{ticketShort} <span className={`inline-block text-xs ml-2 px-2 py-0.5 rounded-full ${payload.status === 'open' || payload.status === 'abierto' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{payload.status ?? ''}</span></td>
                  <td className="py-3 px-4 text-xs font-medium text-gray-500">Date/Time</td>
                  <td className="py-3 px-4 text-sm text-gray-800">{payload.createdAt ? new Date(payload.createdAt).toLocaleString() : '-'}</td>
                </tr>

                <tr className="border-b">
                  <td className="py-3 px-4 text-xs font-medium text-gray-500">Client Name</td>
                  <td className="py-3 px-4 text-sm text-gray-800">{((payload.client && (payload.client.name || payload.client.fullName)) || clients.find((c) => c.id === payload.clientId)?.name || clients.find((c) => c.id === payload.clientId)?.fullName || '-')}</td>
                  <td className="py-3 px-4 text-xs font-medium text-gray-500">Post Site</td>
                  <td className="py-3 px-4 text-sm text-gray-800">{((payload.site && (payload.site.name || payload.site.companyName)) || postSites.find((s) => s.id === payload.siteId)?.name || '-')}</td>
                </tr>

                <tr className="border-b">
                  <td className="py-3 px-4 text-xs font-medium text-gray-500">Caller Type</td>
                  <td className="py-3 px-4 text-sm text-gray-800">{payload.callerType || '-'}</td>
                  <td className="py-3 px-4 text-xs font-medium text-gray-500">Caller Name</td>
                  <td className="py-3 px-4 text-sm text-gray-800">{payload.callerName || '-'}</td>
                </tr>

                <tr className="border-b">
                  <td className="py-3 px-4 text-xs font-medium text-gray-500">Incident Type</td>
                  <td className="py-3 px-4 text-sm text-gray-800">{incidentTypeDisplay}</td>
                  <td className="py-3 px-4 text-xs font-medium text-gray-500">Incident Date/Time</td>
                  <td className="py-3 px-4 text-sm text-gray-800">{(payload.incidentAt || payload.dateTime) ? new Date(payload.incidentAt || payload.dateTime).toLocaleString() : '-'}</td>
                </tr>

                <tr className="border-b">
                  <td className="py-3 px-4 text-xs font-medium text-gray-500">Incident Location</td>
                  <td className="py-3 px-4 text-sm text-gray-800">{payload.location || payload.incidentLocation || '-'}</td>
                  <td className="py-3 px-4 text-xs font-medium text-gray-500">Dispatcher</td>
                  <td className="py-3 px-4 text-sm text-gray-800">{(payload.guardName && (payload.guardName.fullName || payload.guardName.name)) || payload.guardName || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <div className="bg-white border rounded-md overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 text-sm font-semibold">Incident Details</div>
            <div className="p-4 text-sm">{payload?.content || payload?.incidentDetails || payload?.details || '-'}</div>
          </div>

          <div className="bg-white border rounded-md overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 text-sm font-semibold">Action Taken</div>
            <div className="p-4 text-sm">{payload?.actionsTaken || payload?.actionTaken || payload?.action || '-'}</div>
          </div>

          <div className="bg-white border rounded-md overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 text-sm font-semibold">Internal Notes</div>
            <div className="p-4 text-sm whitespace-pre-wrap">{payload?.internalNotes || payload?.notes || '-'}</div>
          </div>

          <div className="bg-white border rounded-md overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 text-sm font-semibold">Files</div>
            <div className="p-4 text-sm">
              {payload?.requestDocumentPDF && payload.requestDocumentPDF.length > 0 ? (
                <ul className="list-disc pl-5">
                  {payload.requestDocumentPDF.map((f: any, i: number) => (
                    <li key={i} className="truncate">{f.name || f.fileName || f}</li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-gray-500">-</div>
              )}
              {typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debugPayload') && payload && (
                <div className="bg-gray-50 border rounded-md p-4 text-xs whitespace-pre-wrap overflow-auto mt-3">
                  <pre className="text-xs">{JSON.stringify(payload, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border rounded-md overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 text-sm font-semibold">Guard Assigned</div>
            <div className="p-4 text-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm table-fixed border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="py-2 px-3 text-xs font-medium text-gray-500">Guard</th>
                      <th className="py-2 px-3 text-xs font-medium text-gray-500">Status</th>
                      <th className="py-2 px-3 text-xs font-medium text-gray-500">Date/Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guardRows.length > 0 ? (
                      guardRows
                    ) : (
                      <tr>
                        <td className="py-2 px-3" colSpan={3}>-</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 max-w-4xl mx-auto">
          <div className="bg-white border rounded-md overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 text-sm font-semibold">Ticket Summary</div>
            <div className="p-4">
              {payload?.comments && payload.comments.length === 0 ? (
                <div className="text-sm text-gray-500">No hay comentarios aún</div>
              ) : (
                <div className="space-y-4">
                  {payload.comments && payload.comments.map((c: any) => (
                    <div key={c.id || c.createdAt} className="flex items-start gap-3">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-700">{(c.author && (c.author.name || c.author.fullName || c.author.username) ? String((c.author.name || c.author.fullName || c.author.username)).charAt(0).toUpperCase() : 'U')}</div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-600">{(c.author && (c.author.name || c.author.fullName || c.author.username)) || 'Usuario'} · {c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}</div>
                        <div className="mt-1 text-sm text-gray-800 whitespace-pre-wrap">{c.text || c.body || c.message}</div>
                        {c.attachment && c.attachment.url && (
                          <div className="mt-2">
                            <a className="text-xs text-blue-600 underline" href={c.attachment.url} target="_blank" rel="noreferrer">Adjunto: {c.attachment.name || c.attachment.url}</a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
