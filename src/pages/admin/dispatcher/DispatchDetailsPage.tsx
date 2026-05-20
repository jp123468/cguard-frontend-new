import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AppLayout from '@/layouts/app-layout';
import Breadcrumb from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { clientService } from '@/lib/api/clientService';
import { postSiteService } from '@/lib/api/postSiteService';
import IncidentTypesService from '@/services/incident-types.service';
import IncidentMap from '@/components/IncidentMap/IncidentMap';
import { toast } from 'sonner';

import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

type ResourceType = 'request' | 'incident';

export function DispatchDetailsContent({ requestId, resourceTypeProp }: { requestId?: string | null; resourceTypeProp?: ResourceType }) {
  const [clients, setClients] = useState<any[]>([]);
  const [postSites, setPostSites] = useState<any[]>([]);
  const [incidentTypes, setIncidentTypes] = useState<any[]>([]);
  const [clientId, setClientId] = useState<string | undefined>(undefined);
  const [siteId, setSiteId] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string>('abierto');
  const [createdDate, setCreatedDate] = useState<string | undefined>(undefined);
  const [incidentDate, setIncidentDate] = useState<string | undefined>(undefined);
  const [includeArchived, setIncludeArchived] = useState<boolean>(false);
  const [requestPayload, setRequestPayload] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileUploading, setFileUploading] = useState(false);

  const location = useLocation();
  const search = new URLSearchParams(location.search || '');
  const resourceFromQuery = (search.get('resource') as ResourceType) || undefined;
  const resourceType: ResourceType = (resourceTypeProp as ResourceType) || (location && (location.state as any)?.resource) || resourceFromQuery || 'request';

  const { t } = useTranslation();

  // Handler extracted to avoid large inline JSX function
  const handleAddComment = async () => {
    if (!newComment || newComment.trim() === '') { toast.error('Escribe un comentario'); return; }
    try {
      const tenantId = localStorage.getItem('tenantId');
      if (!tenantId) { toast.error('Tenant no disponible'); return; }
      setCommentsLoading(true);
      const api = (await import('@/lib/api')).default;

      let attachment: any = null;
      if (selectedFile) {
        try {
          setFileUploading(true);
          const credsResp = await api.get(`/tenant/${tenantId}/file/credentials?filename=${encodeURIComponent(selectedFile.name)}&storageId=localhost`);
          const creds = credsResp && (credsResp.data || credsResp) ? (credsResp.data || credsResp) : credsResp;
          const uploadUrl = creds?.uploadCredentials?.url || creds?.url || (creds?.uploadCredentials && creds.uploadCredentials.url);
          if (!uploadUrl) throw new Error('No upload URL');

          const form = new FormData();
          form.append('filename', selectedFile.name);
          form.append('file', selectedFile);

          const uploadResp = await fetch(uploadUrl, { method: 'POST', body: form });
          let downloadUrl: any = null;
          try {
            const json = await uploadResp.json();
            downloadUrl = json?.downloadUrl || json?.url || json;
          } catch (e) {
            downloadUrl = await uploadResp.text();
          }
          if (typeof downloadUrl === 'object' && downloadUrl !== null) downloadUrl = JSON.stringify(downloadUrl);
          attachment = { url: downloadUrl, name: selectedFile.name };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          toast.error(`File upload failed${msg ? `: ${msg}` : ''}`);
        } finally {
          setFileUploading(false);
        }
      }

      let author: any = null;
      try {
        const possibleKeys = ['currentUser', 'user', 'me', 'profile', 'authUser'];
        for (const k of possibleKeys) {
          const raw = localStorage.getItem(k);
          if (!raw) continue;
          try {
            const obj = JSON.parse(raw);
            if (obj && (obj.id || obj._id || obj.name || obj.fullName || obj.username || obj.email)) {
              author = { id: obj.id || obj._id || obj.userId || undefined, name: obj.name || obj.fullName || obj.username || obj.email || undefined };
              break;
            }
          } catch (e) {
            if (raw && raw.length > 0) {
              author = { id: undefined, name: raw };
              break;
            }
          }
        }
        if (!author) {
          const uid = localStorage.getItem('userId') || localStorage.getItem('uid');
          const uname = localStorage.getItem('userName') || localStorage.getItem('username') || localStorage.getItem('name');
          if (uid || uname) author = { id: uid || undefined, name: uname || undefined };
        }
      } catch (err) {
        // ignore
      }

      const body: any = { data: { text: newComment } };
      if (attachment) body.data.attachment = attachment;
      if (author) body.data.author = author;
      try {
        const resp = await api.post(`/tenant/${tenantId}/${resourceType}/${requestId}/comments`, body);
        const p = resp && resp.data ? resp.data : resp;
        const created = p && (p.comment || p.data || p) || { text: newComment };
        setComments((c) => [...c, { id: Date.now(), text: created.text || newComment, createdAt: created.createdAt || new Date().toISOString(), author: created.author || author || { name: 'Tú' }, attachment: created.attachment || attachment }]);
        setNewComment('');
        setSelectedFile(null);
        setShowCommentModal(false);
        toast.success('Comentario agregado');
      } catch (e) {
        setComments((c) => [...c, { id: Date.now(), text: newComment, createdAt: new Date().toISOString(), author: (typeof author !== 'undefined' && author) ? author : { name: 'Tú' }, attachment }]);
        setNewComment('');
        setSelectedFile(null);
        setShowCommentModal(false);
        toast.success('Comentario agregado (local)');
      } 

    } catch (err) {
      toast.error('No se pudo agregar comentario');
    } finally {
      setCommentsLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [clientsResp, sitesResp] = await Promise.all([
          clientService.getClients(undefined, { limit: 1000, offset: 0 }),
          postSiteService.list({}, { limit: 1000, offset: 0 }),
        ]);

        if (clientsResp && Array.isArray((clientsResp as any).rows)) {
          setClients((clientsResp as any).rows);
        }
        if (sitesResp && Array.isArray((sitesResp as any).rows)) {
          setPostSites((sitesResp as any).rows);
        }
        try {
          const itResp: any = await IncidentTypesService.list('', 1, 1000);
          if (itResp && Array.isArray(itResp.rows)) setIncidentTypes(itResp.rows);
        } catch (e) {
          // ignore
        }
      } catch (e) {
        // ignore failures for demo
      }
    };

    load();
  }, []);

  useEffect(() => {
    const loadDetails = async () => {
      if (!requestId) return;
      try {
        const tenantId = localStorage.getItem('tenantId');
        if (!tenantId) return;
        const api = (await import('@/lib/api')).default;
        const resp = await api.get(`/tenant/${tenantId}/${resourceType}/${requestId}`);
        const payload = resp && resp.data ? resp.data : resp;
        if (!payload) return;
        // debug log to inspect payload shape
        // eslint-disable-next-line no-console
        setRequestPayload(payload);
        setClientId(payload.clientId || (payload.client && payload.client.id) || undefined);
        setSiteId(payload.siteId || (payload.site && payload.site.id) || undefined);
        setStatus(payload.status || 'todo');
        if (payload.createdAt) setCreatedDate(new Date(payload.createdAt).toISOString().slice(0, 10));
        if (payload.dateTime) setIncidentDate(new Date(payload.dateTime).toISOString().slice(0, 10));
        // initialize comments: prefer payload.comments if present
        if (payload.comments && Array.isArray(payload.comments)) {
          setComments(payload.comments);
        } else {
          // No comments provided by payload — start empty to avoid backend fallback requests
          setComments([]);
        }
      } catch (e) {
        // sonner toast does not have `warn`; use `error` and keep console warning for diagnostics
        // eslint-disable-next-line no-console
        console.warn('Failed to load dispatch details', e);
        toast.error('No se pudieron cargar detalles del Incidente');
      }
    };

    loadDetails();
  }, [requestId]);

  // prepare guard rows to avoid complex nested JSX/ternary
  const guardRows: JSX.Element[] = [];
  if (requestPayload) {
    if (requestPayload.guardName) {
      guardRows.push(
        <tr key="guard-main" className="border-t">
          <td className="py-2 px-3">{requestPayload.guardName.fullName || requestPayload.guardName.name || '-'}</td>
          <td className="py-2 px-3">{requestPayload.dateTime ? new Date(requestPayload.dateTime).toLocaleString() : (requestPayload.createdAt ? new Date(requestPayload.createdAt).toLocaleString() : '-')}</td>
        </tr>
      );
    } else if ((requestPayload.guards && requestPayload.guards.length > 0) || (requestPayload.assignedGuards && requestPayload.assignedGuards.length > 0)) {
      const list = requestPayload.guards || requestPayload.assignedGuards;
      list.forEach((g: any, i: number) => {
        guardRows.push(
          <tr key={i} className="border-t">
            <td className="py-2 px-3">{(g && (g.name || g.fullName)) || g || '-'}</td>
            <td className="py-2 px-3">{g && (g.dateTime || g.assignedAt) ? new Date(g.dateTime || g.assignedAt).toLocaleString() : '-'}</td>
          </tr>
        );
      });
    }
  }

  // computed display values
  const ticketShort = (() => {
    const full = (requestPayload && (requestPayload.ticketId || requestPayload.id)) || '';
    if (!full) return '';
    const idx = full.indexOf('-');
    return idx > 0 ? full.slice(0, idx) : full;
  })();

  const coords = (() => {
    if (!requestPayload) return null;
    // common patterns: latitude/longitude, lat/lng, locationLat/locationLng, geo: { lat, lng }
    const maybe = (k: string) => (requestPayload[k] !== undefined ? requestPayload[k] : null);
    const lat = maybe('latitude') || maybe('lat') || maybe('locationLat') || (requestPayload.geo && requestPayload.geo.lat) || null;
    const lng = maybe('longitude') || maybe('lng') || maybe('locationLng') || (requestPayload.geo && requestPayload.geo.lng) || null;
    if (lat && lng) return { lat: Number(lat), lng: Number(lng) };
    // Prefer client coordinates when available (better location accuracy)
    try {
      const clientId = requestPayload.clientId || requestPayload.client?.id;
      if (clientId && clients && clients.length > 0) {
        const client = clients.find((c) => c.id === clientId || c._id === clientId || c.id === String(clientId));
        if (client) {
          const cLat = client.latitude || client.lat || client.coords?.lat || null;
          const cLng = client.longitude || client.lng || client.coords?.lng || null;
          if (cLat && cLng) return { lat: Number(cLat), lng: Number(cLng) };
        }
      }
    } catch (e) {
      // ignore
    }
    // also handle array forms like locationCoords: [lat, lng]
    if (Array.isArray(requestPayload.locationCoords) && requestPayload.locationCoords.length >= 2) {
      const [a, b] = requestPayload.locationCoords;
      if (!isNaN(Number(a)) && !isNaN(Number(b))) return { lat: Number(a), lng: Number(b) };
    }
    // fallback: if `location` is a string like "12.34,56.78"
    if (requestPayload.location && typeof requestPayload.location === 'string') {
      const m = requestPayload.location.split(',').map((s: string) => s.trim());
      if (m.length === 2 && !isNaN(Number(m[0])) && !isNaN(Number(m[1]))) return { lat: Number(m[0]), lng: Number(m[1]) };
    }
    // fallback: try to find coordinates from related postSite
    try {
      const siteId = requestPayload.siteId || requestPayload.postSiteId || requestPayload.site?.id;
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
    // fallback: try client coordinates
    try {
      const clientId = requestPayload.clientId || requestPayload.client?.id;
      if (clientId && clients && clients.length > 0) {
        const client = clients.find((c) => c.id === clientId || c._id === clientId || c.id === String(clientId));
        if (client) {
          const cLat = client.latitude || client.lat || client.coords?.lat || null;
          const cLng = client.longitude || client.lng || client.coords?.lng || null;
          if (cLat && cLng) return { lat: Number(cLat), lng: Number(cLng) };
        }
      }
    } catch (e) {
      // ignore
    }
    return null;
  })();

  const incidentTypeDisplay = (() => {
    if (!requestPayload) return '-';
    // If incidentType is an object with a name
    if (requestPayload.incidentType && typeof requestPayload.incidentType === 'object') return requestPayload.incidentType.name || '-';
    // Try to resolve by id using loaded incident types
    const idString = (typeof requestPayload.incidentType === 'string' && requestPayload.incidentType) || requestPayload.incidentTypeId || null;
    if (idString) {
      const found = incidentTypes.find((t) => t.id === idString);
      if (found) return found.name || idString;
      return idString; // fallback to id if name not found
    }
    return '-';
  })();

  // normalize status display from different payload shapes
  const statusDisplay = (() => {
    if (!requestPayload) return '';
    const s = requestPayload.status || requestPayload.estado || requestPayload.state || requestPayload.statusName || requestPayload.status_label || '';
    if (!s) return '';
    return String(s);
  })();

  const statusIsOpen = (() => {
    const s = (statusDisplay || '').toLowerCase();
    return s === 'open' || s === 'abierto' || s.startsWith('open') || s.startsWith('abierto');
  })();

  return (
    <div className="mt-6 space-y-5">
      {/* Basic Details card */}
      {requestPayload && (
        <div>
          {/* Map (if coordinates found) */}
          {coords && (
            <div className="mb-4">
              <IncidentMap lat={coords.lat} lng={coords.lng} label={ticketShort || undefined} />
            </div>
          )}
          <div className="bg-card border rounded-md overflow-hidden">
            <div className="bg-muted px-4 py-2 text-sm font-semibold flex items-center justify-between">
                <div>{t('dispatcher.basic_details')}</div>
                <div className="flex items-center gap-2">
                  <Button className="bg-card border text-black text-sm" asChild>
                    <Link to={`/dispatch-tickets/${requestId}/edit`}>{t('dispatcher.edit')}</Link>
                  </Button>

                </div>
              </div>
            <div className="p-0 text-sm">
              <table className="w-full text-sm border-collapse">
                <tbody>
                  <tr className="border-b">
                    <td className="py-3 px-4 text-xs font-medium text-muted-foreground">{t('dispatcher.ticket_id')}</td>
                    <td className="py-3 px-4 text-sm text-foreground">{ticketShort} <span className={`inline-block text-xs ml-2 px-2 py-0.5 rounded-full ${statusIsOpen ? 'bg-red-500/15 text-red-700' : 'bg-green-100 text-green-700'}`}>{statusDisplay || ''}</span></td>
                    <td className="py-3 px-4 text-xs font-medium text-muted-foreground">{t('dispatcher.date_time')}</td>
                    <td className="py-3 px-4 text-sm text-foreground">{requestPayload.createdAt ? new Date(requestPayload.createdAt).toLocaleString() : '-'}</td>
                  </tr>

                  <tr className="border-b">
                    <td className="py-3 px-4 text-xs font-medium text-muted-foreground">{t('dispatcher.client_name')}</td>
                    <td className="py-3 px-4 text-sm text-foreground">{((requestPayload.client && (requestPayload.client.name || requestPayload.client.fullName)) || clients.find((c) => c.id === requestPayload.clientId)?.name || clients.find((c) => c.id === requestPayload.clientId)?.fullName || '-')}</td>
                    <td className="py-3 px-4 text-xs font-medium text-muted-foreground">{t('dispatcher.post_site')}</td>
                    <td className="py-3 px-4 text-sm text-foreground">{((requestPayload.site && (requestPayload.site.name || requestPayload.site.companyName)) || postSites.find((s) => s.id === requestPayload.siteId)?.name || '-')}</td>
                  </tr>

                  <tr className="border-b">
                    <td className="py-3 px-4 text-xs font-medium text-muted-foreground">{t('dispatcher.caller_type')}</td>
                    <td className="py-3 px-4 text-sm text-foreground">{requestPayload.callerType || '-'}</td>
                    <td className="py-3 px-4 text-xs font-medium text-muted-foreground">{t('dispatcher.caller_name')}</td>
                    <td className="py-3 px-4 text-sm text-foreground">{requestPayload.callerName || '-'}</td>
                  </tr>

                  <tr className="border-b">
                    <td className="py-3 px-4 text-xs font-medium text-muted-foreground">{t('dispatcher.incident_type')}</td>
                    <td className="py-3 px-4 text-sm text-foreground">{incidentTypeDisplay}</td>
                    <td className="py-3 px-4 text-xs font-medium text-muted-foreground">{t('dispatcher.incident_datetime')}</td>
                    <td className="py-3 px-4 text-sm text-foreground">{(requestPayload.incidentAt || requestPayload.dateTime) ? new Date(requestPayload.incidentAt || requestPayload.dateTime).toLocaleString() : '-'}</td>
                  </tr>

                  <tr className="border-b">
                    <td className="py-3 px-4 text-xs font-medium text-muted-foreground">{t('dispatcher.incident_location')}</td>
                    <td className="py-3 px-4 text-sm text-foreground">{requestPayload.location || requestPayload.incidentLocation || '-'}</td>
                    <td className="py-3 px-4 text-xs font-medium text-muted-foreground">{t('dispatcher.dispatcher')}</td>
                    <td className="py-3 px-4 text-sm text-foreground">{(requestPayload.guardName && (requestPayload.guardName.fullName || requestPayload.guardName.name)) || requestPayload.guardName || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Comment input box (toggle) */}
      {/* Comment modal (opens on Add) */}
      {showCommentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black opacity-40" onClick={() => { setShowCommentModal(false); setNewComment(''); }} />
          <div className="bg-card rounded-md shadow-lg w-full max-w-lg mx-4 z-10">
            <div className="flex items-center justify-between px-4 py-2 border-b">
                <div className="text-sm font-medium">{t('dispatcher.comment.new_comment_title')}</div>
                <button className="p-1 rounded-full hover:bg-muted" onClick={() => { setShowCommentModal(false); setNewComment(''); }}>&times;</button>
              </div>
            <div className="p-4">
              <label className="text-sm font-medium">{t('dispatcher.comment.note')}</label>
              <textarea className="w-full border rounded p-2 text-sm mt-2" rows={6} value={newComment} onChange={(e) => setNewComment(e.target.value)} />
              <div className="mt-3">
                <div className="border rounded px-3 py-2 bg-muted/30">
                  <div className="text-xs text-muted-foreground mb-2">{t('dispatcher.comment.attach_file_optional')}</div>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      className="flex-1"
                      onChange={(e) => { setSelectedFile(e.target.files && e.target.files[0] ? e.target.files[0] : null); }}
                    />
                    {selectedFile ? (
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setSelectedFile(null)}
                        aria-label={t('dispatcher.comment.remove_file')}
                      >
                        {t('dispatcher.comment.remove_file')}
                      </button>
                    ) : null}
                  </div>
                  <div className="text-xs text-foreground mt-2 truncate">{selectedFile ? selectedFile.name : t('dispatcher.comment.no_files_selected', { defaultValue: 'Sin archivos seleccionados' })}</div>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setNewComment(''); setSelectedFile(null); setShowCommentModal(false); }}>{t('dispatcher.cancel', { defaultValue: 'Cancelar' })}</Button>
                <Button className="bg-[#C8860A] text-white" onClick={handleAddComment}>{t('dispatcher.comment.add')}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Additional detail sections */}
      <div className="mt-4 space-y-4">
        <div className="bg-card border rounded-md overflow-hidden">
          <div className="bg-muted px-4 py-2 text-sm font-semibold">{t('dispatcher.incident_details')}</div>
          <div className="p-4 text-sm">{requestPayload?.content || requestPayload?.incidentDetails || requestPayload?.details || '-'}</div>
        </div>

        <div className="bg-card border rounded-md overflow-hidden">
          <div className="bg-muted px-4 py-2 text-sm font-semibold">{t('dispatcher.action_taken')}</div>
          <div className="p-4 text-sm">{requestPayload?.actionsTaken || requestPayload?.actionTaken || requestPayload?.action || '-'}</div>
        </div>

        <div className="bg-card border rounded-md overflow-hidden">
          <div className="bg-muted px-4 py-2 text-sm font-semibold">{t('dispatcher.internal_notes')}</div>
          <div className="p-4 text-sm whitespace-pre-wrap">{requestPayload?.internalNotes || requestPayload?.notes || '-'}</div>
        </div>

        <div className="bg-card border rounded-md overflow-hidden">
          <div className="bg-muted px-4 py-2 text-sm font-semibold">{t('dispatcher.files')}</div>
          <div className="p-4 text-sm">
            {requestPayload?.requestDocumentPDF && requestPayload.requestDocumentPDF.length > 0 ? (
              <ul className="list-disc pl-5">
                {requestPayload.requestDocumentPDF.map((f: any, i: number) => (
                  <li key={i} className="truncate">{f.name || f.fileName || f}</li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-muted-foreground">-</div>
            )}
            {/* Debug: show raw payload when ?debugPayload=1 is present */}
            {typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debugPayload') && requestPayload && (
              <div className="bg-muted/30 border rounded-md p-4 text-xs whitespace-pre-wrap overflow-auto mt-3">
                <pre className="text-xs">{JSON.stringify(requestPayload, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>

        <div className="bg-card border rounded-md overflow-hidden">
          <div className="bg-muted px-4 py-2 text-sm font-semibold">{t('dispatcher.guard_assigned')}</div>
          <div className="p-4 text-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed border-collapse">
                <thead>
                  <tr className="bg-muted/30 text-left">
                    <th className="py-2 px-3 text-xs font-medium text-muted-foreground">{t('dispatcher.guard')}</th>
                    <th className="py-2 px-3 text-xs font-medium text-muted-foreground">{t('dispatcher.date_time')}</th>
                  </tr>
                </thead>
                <tbody>
                  {guardRows.length > 0 ? (
                    guardRows
                  ) : (
                    <tr>
                      <td className="py-2 px-3" colSpan={2}>-</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Comments list (bottom) */}
      <div className="mt-6 max-w-4xl mx-auto">
        <div className="bg-card border rounded-md overflow-hidden">
          <div className="bg-muted px-4 py-2 text-sm font-semibold">{t('dispatcher.ticket_summary')}</div>
          <div className="p-4">
            {comments.length === 0 ? (
              <div className="text-sm text-muted-foreground">No hay comentarios aún</div>
            ) : (
              <div className="space-y-4">
                {comments.map((c) => (
                  <div key={c.id || c.createdAt} className="flex items-start gap-3">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-foreground">{(c.author && (c.author.name || c.author.fullName || c.author.username) ? String((c.author.name || c.author.fullName || c.author.username)).charAt(0).toUpperCase() : 'U')}</div>
                    <div className="flex-1">
                      <div className="text-xs text-foreground/70">{(c.author && (c.author.name || c.author.fullName || c.author.username)) || 'Usuario'} · {c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}</div>
                      <div className="mt-1 text-sm text-foreground whitespace-pre-wrap">{c.text || c.body || c.message}</div>
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
      <Button className="bg-[#C8860A] text-white text-sm" onClick={() => setShowCommentModal((s) => !s)}>
        {showCommentModal ? t('dispatcher.close') : t('dispatcher.add_comment_button')}
      </Button>
    </div>
  );
}

export default function DispatchDetailsPage() {
  const { id } = useParams();

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: 'Panel de control', path: '/dashboard' },
          { label: 'Detalle Incidente' },
        ]}
      />

      <section className="p-6">
        <div className="max-w-4xl mx-auto">
          <DispatchDetailsContent requestId={id ?? null} />
        </div>
      </section>
    </AppLayout>
  );
}
