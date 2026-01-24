import { useMemo, useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";

import {
  EllipsisVertical,
  Filter as FilterIcon,
  FileDown,
  FileSpreadsheet,
  Printer,
  Mail,
  Search,
  Eye,
  Tag,
  Archive,
  ExternalLink,
  Link as LinkIcon,
  Edit,
  X,
  Trash,
} from "lucide-react";
import { toast } from "sonner";

// Validaciones (zod) y tipos
import {
  dispatcherFiltersSchema,
  type DispatcherFilters,
  defaultDispatcherFilters,
} from "@/lib/validators/dispatcher-filters";
import { clientService } from "@/lib/api/clientService";
import { postSiteService } from "@/lib/api/postSiteService";
import * as XLSX from 'xlsx';
import { ApiService } from "@/services/api/apiService";

export default function DispatcherPage() {
  const [openFilter, setOpenFilter] = useState(false);
  const navigate = useNavigate();

  // Estado local de filtros (validado con zod al aplicar)
  const [filters, setFilters] = useState<DispatcherFilters>(
    // default to show only 'abierto' tickets in the dispatcher view
    { ...defaultDispatcherFilters, status: 'abierto' }
  );

  // Tabla: datos cargados desde backend
  const [rows, setRows] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [postSites, setPostSites] = useState<any[]>([]);
  const [allClients, setAllClients] = useState<any[] | null>(null);
  const [allPostSites, setAllPostSites] = useState<any[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const searchTimeoutRef = useRef<any>(null);
  // Share modal state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareTargetId, setShareTargetId] = useState<string | null>(null);
  const [shareExpiry, setShareExpiry] = useState<'1h' | '24h' | '7d' | 'never'>('24h');
  const [shareLoading, setShareLoading] = useState(false);
  const shareDialogRef = useRef<HTMLDivElement | null>(null);

  // Send-email dialog state
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [emailFormat, setEmailFormat] = useState<'pdf' | 'xlsx'>('pdf');
  const [emailFrom, setEmailFrom] = useState('');
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('Dispatcher Report | Seguridad BAS');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  // close share dialog when clicking outside its content
  useEffect(() => {
    if (!shareDialogOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (shareDialogRef.current && !shareDialogRef.current.contains(e.target as Node)) {
        setShareDialogOpen(false);
        setShareTargetId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [shareDialogOpen]);


  useEffect(() => {
    // options (clients/postSites) will be derived from loaded `rows`

    const loadRows = async () => {
      setLoading(true);
      try {
        const tenantId = localStorage.getItem('tenantId');
        if (!tenantId) return;
        const api = (await import('@/lib/api')).default;
        // Send status filter when present (skip 'todo' which means all)
        let url = `/tenant/${tenantId}/request`;
        if (filters && filters.status && String(filters.status).toLowerCase() !== 'todo') {
          url += `?status=${encodeURIComponent(String(filters.status))}`;
        }
        const resp = await api.get(url);
        const payload = resp && resp.data ? resp.data : resp;

        let rowsData: any[] = [];
        let count = 0;

        if (payload && Array.isArray(payload.rows)) {
          rowsData = payload.rows;
          count = typeof payload.count === 'number' ? payload.count : payload.rows.length;
        } else if (Array.isArray(payload)) {
          rowsData = payload;
          count = payload.length;
        }

        setRows(rowsData);
        setTotalCount(count);
      } catch (e) {
        console.error('Error cargando despachos:', e);
        setRows([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    };

    loadRows();
  }, []);

  // Fetch all requests once (no status) to derive full list of clients/sites
  useEffect(() => {
    const loadAllOptions = async () => {
      // Prefer fetching full lists from dedicated services (client/postSite) for completeness.
      try {
        const [clientsResp, sitesResp] = await Promise.all([
          clientService.getClients(undefined, { limit: 1000, offset: 0 }),
          postSiteService.list({}, { limit: 1000, offset: 0 }),
        ]);

        if (clientsResp && Array.isArray((clientsResp as any).rows)) {
          setAllClients((clientsResp as any).rows);
        }
        if (sitesResp && Array.isArray((sitesResp as any).rows)) {
          setAllPostSites((sitesResp as any).rows);
        }

        return;
      } catch (e) {
        console.warn('No se pudieron obtener clientes/sitios desde servicios (fallback a requests):', e);
        // fallback to deriving from all requests
      }

      try {
        const tenantId = localStorage.getItem('tenantId');
        if (!tenantId) return;
        const api = (await import('@/lib/api')).default;
        const resp = await api.get(`/tenant/${tenantId}/request`);
        const payload = resp && resp.data ? resp.data : resp;

        let rowsData: any[] = [];
        if (payload && Array.isArray(payload.rows)) {
          rowsData = payload.rows;
        } else if (Array.isArray(payload)) {
          rowsData = payload;
        }

        const clientMap = new Map<string, { id: string; name: string }>();
        const siteMap = new Map<string, { id: string; name: string }>();

        for (const r of rowsData) {
          let cid: string | undefined;
          let cname: string | undefined;
          if (r.client && typeof r.client === 'object') {
            cid = r.client.id || r.client.clientId || r.clientId;
            cname = r.client.name || r.client.fullName || r.client.displayName;
          } else if (r.clientId) {
            cid = String(r.clientId);
            cname = r.client || undefined;
          } else if (r.client) {
            cid = String(r.client);
            cname = String(r.client);
          }

          if (cid) clientMap.set(cid, { id: cid, name: cname || cid });

          let sid: string | undefined;
          let sname: string | undefined;
          if (r.site && typeof r.site === 'object') {
            sid = r.site.id || r.site.siteId || r.siteId;
            sname = r.site.name || r.site.companyName || r.site.address;
          } else if (r.siteId) {
            sid = String(r.siteId);
            sname = r.site || undefined;
          } else if (r.site) {
            sid = String(r.site);
            sname = String(r.site);
          }

          if (sid) siteMap.set(sid, { id: sid, name: sname || sid });
        }

        setAllClients(Array.from(clientMap.values()));
        setAllPostSites(Array.from(siteMap.values()));
      } catch (e) {
        console.error('Error cargando todas las opciones de request:', e);
        setAllClients([]);
        setAllPostSites([]);
      }
    };

    loadAllOptions();
  }, []);

  // Derive distinct clients and post sites from the loaded requests
  useEffect(() => {
    try {
      const clientMap = new Map<string, { id: string; name: string }>();
      const siteMap = new Map<string, { id: string; name: string }>();

      for (const r of rows || []) {
        // client id/name can be in multiple shapes
        let cid: string | undefined;
        let cname: string | undefined;
        if (r.client && typeof r.client === 'object') {
          cid = r.client.id || r.client.clientId || r.clientId;
          cname = r.client.name || r.client.fullName || r.client.displayName;
        } else if (r.clientId) {
          cid = String(r.clientId);
          cname = r.client || undefined;
        } else if (r.client) {
          cid = String(r.client);
          cname = String(r.client);
        }

        if (cid) {
          clientMap.set(cid, { id: cid, name: cname || cid });
        }

        // site
        let sid: string | undefined;
        let sname: string | undefined;
        if (r.site && typeof r.site === 'object') {
          sid = r.site.id || r.site.siteId || r.siteId;
          sname = r.site.name || r.site.companyName || r.site.address;
        } else if (r.siteId) {
          sid = String(r.siteId);
          sname = r.site || undefined;
        } else if (r.site) {
          sid = String(r.site);
          sname = String(r.site);
        }

        if (sid) {
          siteMap.set(sid, { id: sid, name: sname || sid });
        }
      }

      setClients(Array.from(clientMap.values()));
      setPostSites(Array.from(siteMap.values()));
    } catch (e) {
      console.error('Error deriving clients/sites from requests', e);
      setClients([]);
      setPostSites([]);
    }
  }, [rows]);

  // Post sites to display depend on selected client. Prefer full list when available.
  const displayedPostSites = useMemo(() => {
    const list = (allPostSites && allPostSites.length > 0 ? allPostSites : postSites) || [];
    // Until a client is selected, do not show any post sites
    if (!filters || !filters.clientId) return [];
    const cid = String(filters.clientId);
    return list.filter((s: any) => {
      if (!s) return false;
      // support various shapes: s.clientId, s.client?.id, s.client?.clientId
      if (s.clientId && String(s.clientId) === cid) return true;
      if (s.client && typeof s.client === 'object') {
        if (s.client.id && String(s.client.id) === cid) return true;
        if ((s.client.clientId && String(s.client.clientId) === cid)) return true;
      }
      // also allow if site has a clientAccount or clientAccountId
      if ((s.clientAccountId && String(s.clientAccountId) === cid) || (s.clientAccount && s.clientAccount.id && String(s.clientAccount.id) === cid)) return true;
      return false;
    });
  }, [allPostSites, postSites, filters]);

  // Apply filters by fetching rows according to current `filters`
  const aplicarFiltros = async () => {
    // Validate with zod but allow fetching even when validation fails (log and warn)
    const parse = dispatcherFiltersSchema.safeParse(filters);
    if (!parse.success) {
      console.error('Errores de validación:', parse.error.flatten());
    }

    setOpenFilter(false);
    setLoading(true);
    try {
      const tenantId = localStorage.getItem('tenantId');
      if (!tenantId) return;
      const api = (await import('@/lib/api')).default;

      const params = new URLSearchParams();
      // status as top-level param (backend expects ?status=... as used elsewhere)
      if (filters && filters.status && String(filters.status).toLowerCase() !== 'todo') {
        params.append('status', String(filters.status));
      }
      if (filters && filters.clientId) {
        params.append('filter[clientId]', String(filters.clientId));
      }
      if (filters && filters.siteId) {
        params.append('filter[siteId]', String(filters.siteId));
      }
      // single-date filters -> convert to ranges backend expects
      if (filters && (filters as any).createdDate) {
        try {
          const d = (filters as any).createdDate;
          const start = new Date(`${d}T00:00:00`).toISOString();
          const end = new Date(`${d}T23:59:59`).toISOString();
          // append twice so backend receives an array: filter[createdAtRange]=start&filter[createdAtRange]=end
          params.append('filter[createdAtRange][]', start);
          params.append('filter[createdAtRange][]', end);
        } catch (e) {
          console.warn('Invalid createdDate format', (filters as any).createdDate);
        }
      }

      if (filters && (filters as any).incidentDate) {
        try {
          const d = (filters as any).incidentDate;
          const start = new Date(`${d}T00:00:00`).toISOString();
          const end = new Date(`${d}T23:59:59`).toISOString();
          // append twice so backend receives an array: filter[dateTimeRange]=start&filter[dateTimeRange]=end
          params.append('filter[dateTimeRange][]', start);
          params.append('filter[dateTimeRange][]', end);
        } catch (e) {
          console.warn('Invalid incidentDate format', (filters as any).incidentDate);
        }
      }

      let url = `/tenant/${tenantId}/request`;
      const qs = params.toString();
      if (qs) url += `?${qs}`;

      const resp = await api.get(url);
      const payload = resp && resp.data ? resp.data : resp;

      let rowsData: any[] = [];
      let count = 0;

      if (payload && Array.isArray(payload.rows)) {
        rowsData = payload.rows;
        count = typeof payload.count === 'number' ? payload.count : payload.rows.length;
      } else if (Array.isArray(payload)) {
        rowsData = payload;
        count = payload.length;
      }

      setRows(rowsData);
      setTotalCount(count);
      setPage(1);
    } catch (err) {
      console.error('Error aplicando filtros:', err);
    } finally {
      setLoading(false);
    }
  };

  // Clear filters to defaults (keep default status 'abierto') and reload
  const clearFilters = async () => {
    const newFilters: DispatcherFilters = { ...defaultDispatcherFilters, status: 'abierto' };
    setFilters(newFilters);
    setLoading(true);
    try {
      const tenantId = localStorage.getItem('tenantId');
      if (!tenantId) return;
      const api = (await import('@/lib/api')).default;

      let url = `/tenant/${tenantId}/request`;
      if (newFilters && newFilters.status && String(newFilters.status).toLowerCase() !== 'todo') {
        url += `?status=${encodeURIComponent(String(newFilters.status))}`;
      }

      const resp = await api.get(url);
      const payload = resp && resp.data ? resp.data : resp;

      let rowsData: any[] = [];
      let count = 0;

      if (payload && Array.isArray(payload.rows)) {
        rowsData = payload.rows;
        count = typeof payload.count === 'number' ? payload.count : payload.rows.length;
      } else if (Array.isArray(payload)) {
        rowsData = payload;
        count = payload.length;
      }

      setRows(rowsData);
      setTotalCount(count);
      setPage(1);
    } catch (err) {
      console.error('Error limpiando filtros:', err);
    } finally {
      setLoading(false);
    }
  };

  // Keep selection valid when rows change (remove ids that no longer exist)
  useEffect(() => {
    if (!rows || !rows.length) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds((prev) => prev.filter((id) => rows.some((r) => r.id === id)));
  }, [rows]);

  // remove automatic totalCount from rows; totalCount is set from API response

  const visibleRows = useMemo(() => {
    const start = (page - 1) * limit;
    return rows.slice(start, start + limit);
  }, [rows, page, limit]);

  // (Removed combined date-time range) separate created/incident dates used below



  const handleConfirmDelete = async () => {
    try {
      const tenantId = localStorage.getItem('tenantId');
      if (!tenantId) return;
      setShowDeleteConfirm(false);

      const api = (await import('@/lib/api')).default;

      for (const id of selectedIds) {
        try {
          await api.delete(`/tenant/${tenantId}/request/${id}`);
        } catch (err) {
          console.error('Error deleting id', id, err);
        }
      }

      setSelectedIds([]);

      // refresh rows using same logic as initial load
      try {
        const resp = await api.get(`/tenant/${tenantId}/request`);
        const payload = resp && resp.data ? resp.data : resp;

        let rowsData: any[] = [];
        let count = 0;

        if (payload && Array.isArray(payload.rows)) {
          rowsData = payload.rows;
          count = typeof payload.count === 'number' ? payload.count : payload.rows.length;
        } else if (Array.isArray(payload)) {
          rowsData = payload;
          count = payload.length;
        }

        setRows(rowsData);
        setTotalCount(count);
      } catch (e) {
        console.error('Error recargando despachos:', e);
      }

      window.alert('Despachos eliminados');
    } catch (e) {
      console.error('Error eliminando despachos:', e);
      window.alert('Error al eliminar despachos');
    }
  };

  // Create share with selected expiration
  const handleCreateShare = async () => {
    if (!shareTargetId) return;
    try {
      const tenantId = localStorage.getItem('tenantId');
      if (!tenantId) { toast.error('Tenant no disponible'); return; }
      setShareLoading(true);

      const api = (await import('@/lib/api')).default;

      const now = Date.now();
      let expiresAt: string | null = null;
      if (shareExpiry === '1h') expiresAt = new Date(now + 1 * 60 * 60 * 1000).toISOString();
      else if (shareExpiry === '24h') expiresAt = new Date(now + 24 * 60 * 60 * 1000).toISOString();
      else if (shareExpiry === '7d') expiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
      else expiresAt = null;

      // backend pattern in this file uses { data: { ... } }
      // Some backends may expect expiresAt at root instead of inside `data`.
      // Send both to maximize compatibility so the value reaches the server/db.
      const payloadBody: any = { data: {} };
      if (expiresAt) {
        (payloadBody.data as any).expiresAt = expiresAt;
        (payloadBody as any).expiresAt = expiresAt;
      }

      const resp = await api.post(`/tenant/${tenantId}/request/${shareTargetId}/share`, payloadBody);
      const payload = resp && resp.data ? resp.data : resp;

      const url = payload && payload.token
        ? `${window.location.origin}/public/dispatch/${payload.token}`
        : (payload && payload.url ? payload.url : null);

      if (url) {
        try { await navigator.clipboard.writeText(url); } catch (e) { }
        try { window.open(url, '_blank'); } catch (e) { }
        toast.success('Enlace compartible copiado');
        setShareDialogOpen(false);
        setShareTargetId(null);
      } else {
        toast.error('No se pudo generar el enlace');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error generando enlace compartible');
    } finally {
      setShareLoading(false);
    }
  };

    // Export selected dispatches to Excel (.xlsx)
    const handleExportExcel = async () => {
      try {
        if (!selectedIds || selectedIds.length === 0) {
          toast.error('Seleccione al menos un despacho para exportar');
          return;
        }

        const tenantId = localStorage.getItem('tenantId');
        if (!tenantId) { toast.error('Tenant no disponible'); return; }
        const api = (await import('@/lib/api')).default;

        // Fetch full details for each selected id to ensure all fields are present
        const promises = selectedIds.map((id) => api.get(`/tenant/${tenantId}/request/${id}`));
        const responses = await Promise.all(promises);
        const records = responses.map((r) => (r && (r as any).data ? (r as any).data : r));

        const rows = records.map((r: any) => ({
          'Client Name': r.client?.name || r.client || '',
          'Post Site': r.site?.name || r.site || '',
          'Caller Type': r.callerType || '',
          'Caller Name': r.callerName || (r.guardName && (r.guardName.fullName || r.guardName.name)) || '',
          'Incident Type': (r.incidentType && (r.incidentType.name || r.incidentType)) || r.incidentTypeId || '',
          'Incident Details': r.content || r.description || '',
          'Incident Location': r.location || '',
          'Notes': r.internalNotes || r.notes || '',
          'Priority': r.priority || '',
          'Dispatch Status': r.status || '',
        }));

        // json_to_sheet defaults to starting at A1; avoid passing unsupported 'origin' option
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Despachos');

        const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `despachos_${new Date().toISOString().slice(0,10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Export Excel error', err);
        toast.error('Error generando Excel');
      }
    };

    // Print selected dispatches as PDF without opening a new window/tab
    const handlePrintSelected = async () => {
      try {
        if (!selectedIds || selectedIds.length === 0) {
          toast.error('Seleccione al menos un despacho para imprimir');
          return;
        }

        const tenantId = localStorage.getItem('tenantId');
        if (!tenantId) { toast.error('Tenant no disponible'); return; }

        // Determine backend origin: prefer VITE_API_URL, fallback to localhost:3001
        let apiOrigin = 'http://localhost:3001';


        try {
          const configured = (import.meta as any).env?.VITE_API_URL as string | undefined;
          if (configured) apiOrigin = configured.replace(/\/$/, '');
        } catch (e) { }

        const apiPrefix = apiOrigin.endsWith('/api') ? '' : '/api';
        const id = selectedIds[0];
        const idsParam = selectedIds.join(',');
        const url = `${apiOrigin}${apiPrefix}/tenant/${tenantId}/request/${id}/export/pdf?ids=${encodeURIComponent(idsParam)}`;

        const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || localStorage.getItem('authToken') || localStorage.getItem('idToken');
        const headers: any = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const resp = await fetch(url, { method: 'GET', credentials: 'include', headers });
        if (!resp.ok) {
          const text = await resp.text().catch(() => null);
          console.error('Export PDF failed', text || resp.statusText);
          toast.error('No se pudo generar el PDF');
          return;
        }

        const contentType = resp.headers.get('content-type') || '';
        if (!contentType.includes('application/pdf')) {
          const text = await resp.text().catch(() => null);
          console.error('Expected PDF, got:', contentType, text);
          toast.error('Respuesta inválida del servidor al generar el PDF');
          return;
        }

        const blob = await resp.blob();
        const blobUrl = URL.createObjectURL(blob);

        // Create an off-screen iframe so the PDF can render, then call print()
        const iframe = document.createElement('iframe');
        // Use visibility + off-screen positioning so the PDF renderer has space to initialize
        iframe.style.visibility = 'hidden';
        iframe.style.position = 'fixed';
        iframe.style.left = '-10000px';
        iframe.style.top = '0';
        iframe.style.width = '1px';
        iframe.style.height = '1px';
        iframe.style.border = '0';
        iframe.src = blobUrl;
        document.body.appendChild(iframe);

        const cleanup = () => {
          try { if (iframe.parentNode) iframe.parentNode.removeChild(iframe); } catch (_) { }
          try { URL.revokeObjectURL(blobUrl); } catch (_) { }
        };

        // Wait for load then give the PDF renderer a short moment before printing.
        // Some browsers need a delay for the PDF plugin to render; keep iframe for longer.
        iframe.onload = () => {
          // delay to allow rendering (500-800ms tends to work reliably)
          setTimeout(() => {
            try {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
            } catch (e) {
              console.error('Print failed, opening blob in new tab as fallback', e);
              try { window.open(blobUrl, '_blank'); } catch (_) { }
            }
          }, 700);

          // Cleanup after a longer timeout to avoid closing the frame immediately
          setTimeout(cleanup, 15000);
        };
      } catch (err) {
        console.error('Print PDF error', err);
        toast.error('Error imprimiendo PDF');
      }
    };

    // Open send-email dialog to collect details and send via backend
    const handleSendEmail = async () => {
      if (!selectedIds || selectedIds.length === 0) {
        toast.error('Seleccione al menos un despacho para enviar');
        return;
      }
      // Optionally prefill from address from local storage or user info
      const storedFrom = localStorage.getItem('userEmail') || localStorage.getItem('email') || '';
      setEmailFrom(storedFrom);
      // default To empty
      setEmailTo('');
      setEmailSubject('Dispatcher Report | Seguridad BAS');
      setEmailMessage('');
      setSendDialogOpen(true);
    };

      // Perform sending email using backend API
      const performSend = async () => {
        if (!selectedIds || selectedIds.length === 0) {
          toast.error('Seleccione al menos un despacho para enviar');
          return;
        }

        setSendingEmail(true);
        try {
          const tenantId = localStorage.getItem('tenantId');
          if (!tenantId) { toast.error('Tenant no disponible'); return; }

          const api = (await import('@/lib/api')).default;

          const toList = emailTo ? emailTo.split(',').map((s) => s.trim()).filter(Boolean) : [];

          const payload: any = {
            data: {
              ids: selectedIds,
              format: emailFormat,
              from: emailFrom,
              to: toList,
              subject: emailSubject,
              message: emailMessage,
            },
          };

          await api.post(`/tenant/${tenantId}/request/email`, payload);

          toast.success('Correo enviado');
          setSendDialogOpen(false);
        } catch (err) {
          console.error('Error enviando correo:', err);
          toast.error('Error enviando correo');
        } finally {
          setSendingEmail(false);
        }
      };

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Lista de Despachos" },
        ]}
      />

      <section className="p-6">
        {/* Acciones superiores */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Acción (izquierda) */}
          <div className="flex items-center gap-2">
            <Select onValueChange={(v) => {
              if (v === 'eliminar') {
                if (!selectedIds || selectedIds.length === 0) {
                  // no items selected
                  toast.error('Seleccione al menos un despacho para eliminar');
                  return;
                }
                setShowDeleteConfirm(true);
                return;
              }
            }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Acción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eliminar">Eliminar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Derecha: buscador, nuevo, filtros, menú */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="w-72 pl-9"
                placeholder="Buscar por cliente o sitio de pub..."
                value={searchTerm}
                onChange={(e) => {
                  const v = e.target.value;
                  setSearchTerm(v);

                  // debounce search
                  if (searchTimeoutRef.current) {
                    clearTimeout(searchTimeoutRef.current);
                  }
                  searchTimeoutRef.current = setTimeout(async () => {
                    try {
                      const tenantId = localStorage.getItem('tenantId');
                      if (!tenantId) return;
                      setLoading(true);
                      const api = (await import('@/lib/api')).default;

                      const params = new URLSearchParams();
                      // main query
                      if (v) params.append('query', String(v));
                      // include active filters so search respects them
                      if (filters && filters.status && String(filters.status).toLowerCase() !== 'todo') {
                        params.append('status', String(filters.status));
                      }
                      if (filters && filters.clientId) {
                        params.append('filter[clientId]', String(filters.clientId));
                      }
                      if (filters && filters.siteId) {
                        params.append('filter[siteId]', String(filters.siteId));
                      }

                      if (filters && (filters as any).createdDate) {
                        try {
                          const d = (filters as any).createdDate;
                          const start = new Date(`${d}T00:00:00`).toISOString();
                          const end = new Date(`${d}T23:59:59`).toISOString();
                          params.append('filter[createdAtRange][]', start);
                          params.append('filter[createdAtRange][]', end);
                        } catch (e) {
                          console.warn('Invalid createdDate format', (filters as any).createdDate);
                        }
                      }

                      if (filters && (filters as any).incidentDate) {
                        try {
                          const d = (filters as any).incidentDate;
                          const start = new Date(`${d}T00:00:00`).toISOString();
                          const end = new Date(`${d}T23:59:59`).toISOString();
                          params.append('filter[dateTimeRange][]', start);
                          params.append('filter[dateTimeRange][]', end);
                        } catch (e) {
                          console.warn('Invalid incidentDate format', (filters as any).incidentDate);
                        }
                      }

                      // archived
                      if (filters && (filters as any).includeArchived) {
                        params.append('filter[archived]', 'true');
                      }

                      let url = `/tenant/${tenantId}/request`;
                      const qs = params.toString();
                      if (qs) url += `?${qs}`;

                      const resp = await api.get(url);
                      const payload = resp && resp.data ? resp.data : resp;

                      let rowsData: any[] = [];
                      let count = 0;

                      if (payload && Array.isArray(payload.rows)) {
                        rowsData = payload.rows;
                        count = typeof payload.count === 'number' ? payload.count : payload.rows.length;
                      } else if (Array.isArray(payload)) {
                        rowsData = payload;
                        count = payload.length;
                      }

                      setRows(rowsData);
                      setTotalCount(count);
                      setPage(1);
                    } catch (err) {
                      console.error('Error buscando despachos:', err);
                    } finally {
                      setLoading(false);
                    }
                  }, 300);
                }}
              />
            </div>

            <Button
              className="bg-orange-500 text-white hover:bg-orange-600"
              asChild
            >
              <Link to="/dispatch-tickets/new">Nuevo Despacho</Link>
            </Button>

            {/* Filtros */}
            <Sheet open={openFilter} onOpenChange={setOpenFilter}>
              <SheetTrigger asChild>
                <Button variant="outline" className="border-orange-200 text-orange-600">
                  <FilterIcon className="mr-2 h-4 w-4" />
                  Filtros
                </Button>
              </SheetTrigger>

              <SheetContent side="right" className="w-[400px] sm:w-[460px]">
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-5">
                  {/* Cliente */}
                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Select
                      value={filters.clientId ?? ""}
                      onValueChange={(v) =>
                        setFilters((s) => ({ ...s, clientId: v ? v : undefined, siteId: undefined }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Cargar clientes desde backend */}
                        {(allClients && allClients.length > 0 ? allClients : clients).length > 0 ? (
                          (allClients && allClients.length > 0 ? allClients : clients).map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name + (c.lastName ? ` ${c.lastName}` : "")}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="__no_clients" disabled>No hay clientes</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sitio de publicación */}
                  <div className="space-y-2">
                    <Label>Sitio de publicación</Label>
                    <Select
                      value={filters.siteId ?? ""}
                      onValueChange={(v) =>
                        setFilters((s) => ({ ...s, siteId: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar sitio" />
                      </SelectTrigger>
                      <SelectContent>
                        {displayedPostSites && displayedPostSites.length > 0 ? (
                          displayedPostSites.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name ?? s.companyName ?? s.address ?? s.id}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="__no_sites" disabled>No hay sitios</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Estado */}
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select
                      value={filters.status}
                      onValueChange={(v) =>
                        setFilters((s) => ({
                          ...s,
                          status: v as DispatcherFilters["status"],
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">Todos</SelectItem>
                        <SelectItem value="abierto">Abierto</SelectItem>
                        <SelectItem value="cerrado">Cerrado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Fechas separadas: fecha de creación y fecha del incidente */}
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-2">
                      <Label>Fecha de creación</Label>
                      <Input
                        type="date"
                        value={(filters as any).createdDate ?? ""}
                        onChange={(e) =>
                          setFilters((s) => ({ ...s, createdDate: e.target.value }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Fecha del incidente</Label>
                      <Input
                        type="date"
                        value={(filters as any).incidentDate ?? ""}
                        onChange={(e) =>
                          setFilters((s) => ({ ...s, incidentDate: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  {/* Detail sheet component */}
                  {/* Detail page navigation: removed inline Sheet */}

                  {/* Archivados */}
                  <div className="flex items-center gap-2 pt-1">
                    <Checkbox
                      id="archived"
                      checked={filters.includeArchived}
                      onCheckedChange={(v) =>
                        setFilters((s) => ({
                          ...s,
                          includeArchived: Boolean(v),
                        }))
                      }
                    />
                    <Label htmlFor="archived" className="cursor-pointer">
                      Mostrar datos archivados
                    </Label>
                  </div>

                  {/* Botón aplicar */}
                  <Button
                    className="w-full bg-orange-500 text-white hover:bg-orange-600"
                    onClick={aplicarFiltros}
                  >
                    Filtro
                  </Button>
                  <Button
                    className="w-full bg-white text-black border hover:bg-gray-100"
                    onClick={clearFilters}
                  >
                    Limpiar filtro
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            {/* Menú superior (exportar / imprimir / enviar) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Más acciones">
                  <EllipsisVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuItem onClick={async () => {
                  try {
                    // require exactly one selected id
                    if (!selectedIds || selectedIds.length === 0) {
                      toast.error('Seleccione al menos un despacho para exportar');
                      return;
                    }
                    // allow exporting multiple selected ids; backend will render one page per id
                    const id = selectedIds[0];
                    const idsParam = selectedIds.join(',');
                    const tenantId = localStorage.getItem('tenantId');
                    if (!tenantId) { toast.error('Tenant no disponible'); return; }

                    // Determine backend origin: prefer VITE_API_URL, fallback to localhost:3001
                    let apiOrigin = 'http://localhost:3001';
                    try {
                      const configured = (import.meta as any).env?.VITE_API_URL as string | undefined;
                      if (configured) apiOrigin = configured.replace(/\/$/, '');
                    } catch (e) {
                      // ignore and use default
                    }

                    // If `apiOrigin` already contains the `/api` prefix, avoid doubling it
                    const apiPrefix = apiOrigin.endsWith('/api') ? '' : '/api';
                    const url = `${apiOrigin}${apiPrefix}/tenant/${tenantId}/request/${id}/export/pdf?ids=${encodeURIComponent(idsParam)}`;

                    // Always fetch the PDF with credentials to ensure auth cookies or CORS credentials are sent.
                    // This avoids relying on `window.open(url)` which cannot attach Authorization headers.
                    // Try to attach an Authorization header if a token exists in localStorage
                    const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || localStorage.getItem('authToken') || localStorage.getItem('idToken');
                    const headers: any = {};
                    if (token) headers['Authorization'] = `Bearer ${token}`;

                    const resp = await fetch(url, { method: 'GET', credentials: 'include', headers });
                    if (!resp.ok) {
                      const text = await resp.text().catch(() => null);
                      console.error('Export PDF failed', text || resp.statusText);
                      toast.error('No se pudo generar el PDF');
                      return;
                    }

                    const contentType = resp.headers.get('content-type') || '';
                    if (!contentType.includes('application/pdf')) {
                      const text = await resp.text().catch(() => null);
                      console.error('Expected PDF, got:', contentType, text);
                      toast.error('Respuesta inválida del servidor al generar el PDF');
                      return;
                    }

                    const blob = await resp.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    // open in new tab
                    window.open(blobUrl, '_blank');
                    // revoke after a delay
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 60 * 1000);
                  } catch (err) {
                    console.error('Export PDF error', err);
                    toast.error('Error generando PDF');
                  }
                }}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Exportar como PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Exportar como Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePrintSelected}>
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSendEmail}>
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar Informe por Correo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tabla */}
        <div className="mt-4 overflow-hidden rounded-lg border">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-gray-50">
              <tr className="border-b">
                <th className="px-4 py-3">
                  <Checkbox
                    checked={visibleRows.length > 0 && visibleRows.every((r) => selectedIds.includes(r.id))}
                    onCheckedChange={(v) => {
                      const checked = Boolean(v);
                      if (checked) {
                        // add all visible row ids
                        setSelectedIds((prev) => {
                          const ids = new Set(prev);
                          visibleRows.forEach((r) => ids.add(r.id));
                          return Array.from(ids);
                        });
                      } else {
                        // remove visible row ids
                        setSelectedIds((prev) => prev.filter((id) => !visibleRows.some((r) => r.id === id)));
                      }
                    }}
                  />
                </th>
                <th className="px-4 py-3 font-semibold">ID de Ticket</th>
                <th className="px-4 py-3 font-semibold">Fecha/Hora</th>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Sitio de publicación</th>
                <th className="px-4 py-3 font-semibold">Tipo de Llamador</th>
                <th className="px-4 py-3 font-semibold">Tipo de Incidente</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-20">
                    <div className="flex flex-col items-center justify-center text-center">
                      <img
                        src="https://app.guardspro.com/assets/icons/custom/no-data-found.png"
                        alt="Sin datos"
                        className="mb-4 h-36"
                      />
                      <h3 className="text-lg font-semibold">No se encontraron resultados</h3>
                      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                        No pudimos encontrar ningún elemento que coincida con su búsqueda
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleRows.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedIds.includes(r.id)}
                        onCheckedChange={(v) => {
                          const checked = Boolean(v);
                          setSelectedIds((prev) => {
                            if (checked) {
                              if (prev.includes(r.id)) return prev;
                              return [...prev, r.id];
                            }
                            return prev.filter((id) => id !== r.id);
                          });
                        }}
                      />
                    </td>
                    <td className="px-4 py-3" title={r.id}>{r.id ? String(r.id).substring(0, 8) : '-'}</td>
                    <td className="px-4 py-3">
                      {
                        (() => {
                          const dateValue = r.dateTime || r.incidentAt;
                          return dateValue ? new Date(dateValue).toLocaleString() : '-';
                        })()
                      }
                    </td>
                    <td className="px-4 py-3">{r.client || r.clientId || '-'}</td>
                    <td className="px-4 py-3">{r.site || r.siteId || '-'}</td>
                    <td className="px-4 py-3">{r.callerType || r.guardName?.fullName || r.guardName?.name || '-'}</td>
                    <td className="px-4 py-3">{r.incidentType || r.incidentTypeId || '-'}</td>
                    <td className="px-4 py-3">
                      {
                        (() => {
                          const s = (r.status || '').toString().toLowerCase();
                          if (s === 'cerrado' || s === 'closed') {
                            return (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                Cerrado
                              </span>
                            );
                          }

                          if (s === 'abierto' || s === 'open') {
                            return (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium bg-red-100 text-red-800">
                                Abierto
                              </span>
                            );
                          }

                          // fallback: neutral badge with raw value or dash
                          return (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                              {r.status || '-'}
                            </span>
                          );
                        })()
                      }
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Más acciones">
                            <EllipsisVertical className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem onClick={() => navigate(`/dispatch-tickets/${r.id}`)}>
                            <div className="flex items-center w-full">
                              <Eye className="mr-2 h-4 w-4" />
                              Ver detalles
                            </div>
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => window.open(`${window.location.origin}/dispatch-tickets/${r.id}`, '_blank')}>
                            <div className="flex items-center">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Abrir en nueva pestaña
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e: any) => {
                            // open modal to choose expiry before creating share
                            try { e?.preventDefault(); e?.stopPropagation(); } catch (_) { }
                            setShareTargetId(r.id);
                            setShareExpiry('24h');
                            setShareDialogOpen(true);
                          }}>
                            <div className="flex items-center">
                              <LinkIcon className="mr-2 h-4 w-4" />
                              Generar enlace compartible
                            </div>
                          </DropdownMenuItem>

                          <DropdownMenuItem>
                            <Link to={`/dispatch-tickets/${r.id}/edit`} className="flex items-center w-full">
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </Link>
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={async () => {
                            try {
                              const tenantId = localStorage.getItem('tenantId');
                              if (!tenantId) return;
                              const api = (await import('@/lib/api')).default;
                              // Use PATCH for partial updates so unspecified fields are not nulled
                              await api.patch(`/tenant/${tenantId}/request/${r.id}`, { data: { status: 'cerrado' } });
                              toast.success('Ticket cerrado');

                              // Refresh the page so the UI state and any other views update
                              try {
                                // small delay so the success toast is visible before reload
                                setTimeout(() => window.location.reload(), 400);
                              } catch (e) {
                                console.warn('Reload failed:', e);
                              }
                            } catch (err) {
                              console.error('Error cerrando ticket:', err);
                              toast.error('No se pudo cerrar el ticket');
                            }
                          }}>
                            <div className="flex items-center">
                              <X className="mr-2 h-4 w-4" />
                              Cerrar ticket
                            </div>
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => {
                            // Reuse the shared delete modal: set the selected id and open the confirmation dialog
                            setSelectedIds([r.id]);
                            setShowDeleteConfirm(true);
                          }}>
                            <div className="flex items-center">
                              <Trash className="mr-2 h-4 w-4" />
                              Eliminar
                            </div>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
              {/* Aquí mapear filas cuando haya datos */}
            </tbody>
          </table>

          {/* Footer de tabla */}
          <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-600 bg-gray-50 border-x border-b rounded-b-lg">
            <div className="flex items-center gap-2">
              <span>Elementos por página</span>
              <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-8 w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              {totalCount === 0 ? 0 : ((page - 1) * limit + 1)} – {Math.min(page * limit, totalCount)} of {totalCount}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * limit >= totalCount || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </div>
        {/* Delete confirmation dialog */}
        {/* Send email dialog */}
        <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Enviar Informe por Correo</DialogTitle>
              <DialogDescription>Complete los datos para enviar el informe por correo.</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 mt-4">
              <div>
                <Label>Formato</Label>
                <Select value={emailFormat} onValueChange={(v) => setEmailFormat(v as any)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="xlsx">Excel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>From</Label>
                <Input value={emailFrom} onChange={(e) => setEmailFrom(e.target.value)} placeholder="from@example.com" />
              </div>

              <div>
                <Label>To</Label>
                <Input value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="to@example.com (comma separated)" />
              </div>

              <div>
                <Label>Subject</Label>
                <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
              </div>

              <div>
                <Label>Message</Label>
                <Textarea value={emailMessage} onChange={(e) => setEmailMessage(e.target.value)} />
              </div>
            </div>

            <DialogFooter className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSendDialogOpen(false)}>Cancelar</Button>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={performSend} disabled={sendingEmail}>{sendingEmail ? 'Enviando...' : 'Enviar'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Share expiration dialog */}
        <AlertDialog open={shareDialogOpen} onOpenChange={(v) => { setShareDialogOpen(v); if (!v) setShareTargetId(null); }}>
          <AlertDialogContent>
            <div ref={shareDialogRef} onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader className="text-center">
                <AlertDialogTitle className="text-center text-lg font-semibold">Generar enlace compartible</AlertDialogTitle>
                <AlertDialogDescription className="text-left">
                  Seleccione el período de validez del enlace compartible. "Nunca" dejará el enlace sin expiración.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="mt-4 space-y-3 px-4">
                <label className="flex items-center gap-2">
                  <input type="radio" name="shareExpiry" checked={shareExpiry === '1h'} onChange={() => setShareExpiry('1h')} />
                  <span>1 hora</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="shareExpiry" checked={shareExpiry === '24h'} onChange={() => setShareExpiry('24h')} />
                  <span>24 horas</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="shareExpiry" checked={shareExpiry === '7d'} onChange={() => setShareExpiry('7d')} />
                  <span>7 días</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="shareExpiry" checked={shareExpiry === 'never'} onChange={() => setShareExpiry('never')} />
                  <span>Nunca</span>
                </label>
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction className="bg-orange-500 text-white hover:bg-orange-600" onClick={handleCreateShare} disabled={shareLoading}>
                  {shareLoading ? 'Creando...' : 'Generar y copiar'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader className="text-center">
              <AlertDialogTitle className="text-center text-lg font-semibold">Confirmar eliminación</AlertDialogTitle>
              <AlertDialogDescription className="text-left">
                ¿Está seguro de eliminar {selectedIds.length} despacho(s)? Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700" onClick={handleConfirmDelete}>Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </AppLayout>
  );
}
