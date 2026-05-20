import React from 'react';
import { useParams } from 'react-router-dom';
import AppLayout from '@/layouts/app-layout';
import GuardsLayout from '@/layouts/GuardsLayout';
import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ChevronDown, Plus, X } from 'lucide-react';
import securityGuardService from '@/lib/api/securityGuardService';
import api from '@/lib/api';
import { stationService } from '@/lib/api/stationService';
import MobileCardList from '@/components/responsive/MobileCardList';
import { toast } from 'sonner';
import PostSiteMiniInfo from '@/components/post-sites/PostSiteMiniInfo';

export default function GuardAsignarSitiosPage() {
  const { id } = useParams();
  const [guard, setGuard] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        console.debug('[GuardAsignarSitios] effect start', { id, reloadTrigger });
        // Resolve tenantId first so guard fetch can be tenant-scoped and avoid 304 cached responses.
        const tenantId = localStorage.getItem('tenantId');
        console.debug('[GuardAsignarSitios] tenantId', tenantId);
        if (!tenantId) {
          console.warn('[GuardAsignarSitios] missing tenantId in localStorage');
          if (mounted) setLoading(false);
          return;
        }

        // Resolve guard record using tenant-scoped API call with cache-buster to avoid 304 responses
        let resolvedGuardUserId: string | null = null;
        try {
          const sgResp = await api.get(`/tenant/${tenantId}/security-guard/${encodeURIComponent(String(id))}?_=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } } as any);
          const sgBody = sgResp?.data ?? sgResp;
          const sgRec = sgBody && (sgBody.guard || sgBody) ? (sgBody.guard || sgBody) : sgBody;
          const fullName = sgRec ? (sgRec.fullName ?? `${sgRec.firstName ?? ''} ${sgRec.lastName ?? ''}`.trim()) : null;
          if (mounted && sgRec) setGuard({ ...sgRec, fullName });
          resolvedGuardUserId = sgRec?.id || sgRec?.guardId || sgRec?.userId || null;
        } catch (e) {
          console.warn('[GuardAsignarSitios] securityGuard fetch failed, falling back to id', e);
          resolvedGuardUserId = id as string;
        }

        // Fetch shifts for this guard (preferred canonical source). Use filter[guard]=<userId>
        let rows: any[] = [];
        try {
          const guardFilter = resolvedGuardUserId ? `filter[guard]=${encodeURIComponent(String(resolvedGuardUserId))}` : `filter[guard]=${encodeURIComponent(String(id))}`;
          const shiftResp = await api.get(`/tenant/${tenantId}/shift?${guardFilter}&limit=200&_=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } });
          const shiftBody = shiftResp?.data ?? shiftResp;
          rows = Array.isArray(shiftBody?.rows) ? shiftBody.rows : (Array.isArray(shiftBody) ? shiftBody : []);
          if (rows && rows.length) console.log('[GuardAsignarSitios] loaded assignments from shifts count=', rows.length);
        } catch (e) {
          // if shifts endpoint fails, log and continue with empty rows
          console.warn('[GuardAsignarSitios] shifts fetch failed', e);
          rows = [];
        }

        if (!mounted) return;
        // TEMP LOG: dump raw assignments to help backend/frontend mapping
        // Print full JSON so objects don't appear collapsed in the browser console
        // Remove this log after confirming the response shape and updating mapping logic
        // eslint-disable-next-line no-console
        console.log('[GuardAsignarSitios] assignments raw response rows (object):', rows);
        // eslint-disable-next-line no-console
        console.log('[GuardAsignarSitios] assignments raw response rows (json):', JSON.stringify(rows, null, 2));
        // (resp may be scoped to fallback branch) -- prefer logging the resolved rows instead

        // Map rows, and when client/postSite/station names are missing try to fetch post-site (station)
        // Handle `shift` response shape which may include `postSiteId`, `station` object and clientAccount fields.
        const base = rows.map((r: any) => {
          const idVal = r.id || `${r.postSiteId || r.businessInfoId || r.stationId || ''}_${r.tenantUserId || ''}`;
          return {
            raw: r,
            id: idVal,
            client: r.clientName ?? r.clientFullName ?? r.client?.fullName ?? r.clientAccountName ?? null,
            // Keep businessInfo (post site) separate from station
            postSite: r.postSiteName ?? r.companyName ?? r.businessInfo?.companyName ?? null,
            station: (r.station && (r.station.stationName || r.station.name)) ?? r.stationName ?? null,
            tenantUserId: r.tenantUserId ?? r.guardId ?? null,
            businessInfoId: r.postSiteId ?? r.businessInfoId ?? r.stationId,
            // Carry through any tag/recorrido/siteTours/checklist info present on the shift
            tags: r.tags ?? r.labels ?? null,
            recorridos: r.siteTours ?? r.postOrders ?? r.checklists ?? null,
          } as any;
        });

        // For entries missing client or site (or when station name may be present on the
        // station resource), fetch the post-site/station by businessInfoId to enrich fields.
        const resolved = await Promise.all(base.map(async (item: any) => {
          if (!item.businessInfoId) return item;
          // If we already have a client and a site that is not just the postSiteName placeholder,
          // skip fetching. Otherwise attempt to enrich.
          const haveClient = !!item.client;
          const haveSite = !!item.postSite;
          const siteLooksLikePostSiteName = item.postSite && item.raw && item.raw.postSiteName && item.postSite === item.raw.postSiteName;
          if (haveClient && haveSite && !siteLooksLikePostSiteName) return item;
          try {
            const post = await stationService.get(item.businessInfoId);
            const stationName = post.stationName || post.name || post.label || null;
            const postSiteName = post.companyName || post.postSiteName || post.name || null;
            let siteName = item.postSite || postSiteName || item.raw.postSiteName || '-';
            let clientName = item.client || post.client?.fullName || post.client?.name || post.clientAccount?.fullName || post.clientAccount?.name || post.clientAccountName || item.raw.clientName || null;

            // If clientName still null and post exposes a clientAccountId, fetch the client-account
            if (!clientName) {
              const clientId = post.clientAccountId || post.clientId || post.clientAccount?.id || null;
              if (clientId) {
                try {
                  const clientResp = await api.get(`/tenant/${tenantId}/client-account/${clientId}`);
                  const clientData = clientResp?.data ?? clientResp;
                  clientName = clientData?.name ?? clientData?.fullName ?? clientData?.label ?? clientName;
                } catch (e) {
                  // ignore client fetch errors
                }
              }
            }

            return { ...item, postSite: siteName ?? '-', client: clientName ?? '-', station: stationName ?? item.station ?? null };
          } catch (e) {
            return { ...item, postSite: item.postSite ?? (item.raw.postSiteName ?? '-'), client: item.client ?? (item.raw.clientName ?? '-') };
          }
        }));

        // Ensure assignments table always shows station(s) when available.
        const enriched = await Promise.all(resolved.map(async (it: any) => {
          const post = it.postSite ?? '-';
          // prefer explicit stationName from item
          let stationVal = it.station ?? null;
          try {
            if (!stationVal && it.businessInfoId) {
              // If the raw row contains explicit station info, prefer that
              if (it.raw && (it.raw.stationName || it.raw.station || it.raw.stationId)) {
                if (it.raw.stationName) {
                  stationVal = it.raw.stationName;
                } else if (it.raw.station && (it.raw.station.stationName || it.raw.station.name)) {
                  // station object is already embedded in the shift response — use it directly
                  stationVal = it.raw.station.stationName || it.raw.station.name;
                } else {
                  const stationId = it.raw.stationId || (it.raw.station && it.raw.station.id) || null;
                  if (stationId) {
                    try {
                      const tenantId = localStorage.getItem('tenantId') || '';
                      const stResp = await api.get(`/tenant/${tenantId}/station/${stationId}`);
                      const stData = (stResp as any)?.data ?? stResp;
                      stationVal = stData?.stationName || stData?.name || stData?.label || null;
                    } catch (err) {
                      // ignore single station fetch errors
                    }
                  }
                }
              } else {
                // Treat businessInfoId as a postSite id and list its stations
                try {
                  const list = await stationService.list({ postSiteId: it.businessInfoId } as any, { limit: 50, offset: 0 });
                  const rows = (list.rows || []).map((r: any) => r.stationName || r.name || r.companyName || (r.company && (r.company.name || r.company.companyName)) || r.postSiteName || r.label || r.id).filter(Boolean);
                  if (rows.length) stationVal = rows.join(', ');
                } catch (e) {
                  // ignore station list errors
                }
              }
            }
          } catch (e) {
            // ignore station enrichment errors
          }
          const stationDisplay = stationVal && String(stationVal).trim() ? String(stationVal) : '-';
          return { id: it.id, client: it.client ?? '-', postSite: post, station: stationDisplay, tenantUserId: it.tenantUserId, businessInfoId: it.businessInfoId, tags: it.tags ?? null, recorridos: it.recorridos ?? null };
        }));
        // Deduplicate by businessInfoId + station so we don't show repeated rows
        const dedup = new Map<string, any>();
        for (const e of enriched) {
          const key = `${e.businessInfoId || ''}::${(e.station || '').toString().trim()}`;
          if (!dedup.has(key)) dedup.set(key, e);
        }
        setMappings(Array.from(dedup.values()));
      } catch (err) {
        console.error('Failed to load assigned sites for guard', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id, reloadTrigger]);

  const actionRef = useRef<HTMLDivElement | null>(null);
  const [actionOpen, setActionOpen] = useState(false);
  const [actionSelection, setActionSelection] = useState<string>(() => t('guards.assignSites.action.default', { defaultValue: 'Action' }));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionMessage, setActionMessage] = useState<string>('');

  // Listen for assignments changes from other views and reload
  useEffect(() => {
    const handler = () => setReloadTrigger((r) => r + 1);
    window.addEventListener('assignments:changed', handler as EventListener);
    return () => window.removeEventListener('assignments:changed', handler as EventListener);
  }, []);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [postSites, setPostSites] = useState<Array<{ id: string; name: string }>>([]);
  const [stationsForPostSite, setStationsForPostSite] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedStationAssign, setSelectedStationAssign] = useState<string>('');
  const [selectedStart, setSelectedStart] = useState<string>(() => new Date().toISOString().slice(0,16));
  const [selectedEnd, setSelectedEnd] = useState<string>(() => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0,16));

  const [mappings, setMappings] = useState<Array<{ id: string; client: string; postSite: string; station?: string; tenantUserId?: string; businessInfoId?: string }>>([
    { id: 'm1', client: 'Jose Pasante', postSite: 'josePasante', station: 'josePasante' },
  ]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [selectedClient, setSelectedClient] = useState('');
  const [selectedPostSite, setSelectedPostSite] = useState('');

  const toggleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(mappings.map((m) => m.id)); else setSelectedIds([]);
  };

  const assignSite = () => {
    if (!selectedClient || !selectedPostSite) {
      toast.error('Please select client and post site');
      return;
    }
    // require start/end times
    if (!selectedStart || !selectedEnd) {
      toast.error('Please select start and end times');
      return;
    }
    // validate times
    try {
      const s = new Date(selectedStart);
      const e = new Date(selectedEnd);
      if (isNaN(s.getTime()) || isNaN(e.getTime()) || s.getTime() >= e.getTime()) {
        toast.error('Start time must be before end time');
        return;
      }
    } catch (err) {
      toast.error('Invalid start or end time');
      return;
    }
    const clientName = clients.find((c) => c.id === selectedClient)?.name ?? selectedClient;
    const siteName = postSites.find((p) => p.id === selectedPostSite)?.name ?? selectedPostSite;

    // Try to persist to backend pivot table first
    (async () => {
      try {
        const tenantId = localStorage.getItem('tenantId');
        let mappingId = Date.now().toString();
          if (tenantId) {
          // Determine a guard user identifier to send (prefer underlying user id).
          // If we only have the securityGuard record id (route param), attempt to fetch the record to obtain the user id.
          let guardUserId = guard?.guard?.id ?? guard?.guardId ?? guard?.userId ?? guard?.id ?? null;
          if (!guardUserId && id) {
            try {
              const sg = await securityGuardService.get(id as string);
              const sgRec = sg && (sg.guard || sg) ? (sg.guard || sg) : sg;
              guardUserId = sgRec?.id || sgRec?.guardId || null;
            } catch (e) {
              // ignore — we'll fallback to using `id` if needed
            }
          }
          const securityGuardIdentifier = guardUserId || id;
                // Build shift payload to persist assignment in `shifts` table (preferred)
                const payload = {
                  startTime: new Date(selectedStart).toISOString(),
                  endTime: new Date(selectedEnd).toISOString(),
                  // Explicitly include postSiteId so backend stores the post/site reference on the shift
                  postSiteId: selectedPostSite,
                  // If a specific station was selected, include its id (backend may populate station relation)
                  ...(selectedStationAssign ? { stationId: selectedStationAssign } : {}),
                  // Keep `station` for backwards compatibility (some backends accept station name/id here)
                  station: selectedStationAssign || selectedPostSite,
                  guard: securityGuardIdentifier,
                } as any;

                // If a client was selected, keep clientAccountId for pivot creation if backend supports it
                if (selectedClient) payload.clientAccountId = selectedClient;

                // Create a shift record (preferred persistence)
                try {
                  const respShift = await api.post(`/tenant/${tenantId}/shift`, { data: payload }, { toast: { success: 'Assigned' } } as any);
                  const d = respShift?.data ?? respShift;
                  mappingId = d?.id ?? mappingId;
                } catch (e) {
                  // Fallback to older assign endpoint if shift create fails
                  const fallbackPayload = {
                    securityGuardId: securityGuardIdentifier,
                    clientAccountId: selectedClient,
                    ...(selectedStationAssign ? { stationId: selectedStationAssign } : {}),
                  } as any;
                  const { data } = await api.post(`/tenant/${tenantId}/stations/${selectedPostSite}/assign-guard`, fallbackPayload, { toast: { success: 'Assigned' } } as any);
                  mappingId = data?.id ?? mappingId;
                }
        }
        const newMapping = { id: mappingId, client: clientName, postSite: siteName, station: siteName, tenantUserId: id, businessInfoId: selectedPostSite };
        // If a specific station was selected, prefer its display name
        const selectedStationName = stationsForPostSite.find(s => s.id === selectedStationAssign)?.name;
        newMapping.station = selectedStationName ?? newMapping.station;
        setMappings((prev) => [newMapping, ...prev]);
        setSelectedClient('');
        setSelectedPostSite('');
        setAssignModalOpen(false);
        // notify other views that assignments changed
        try { window.dispatchEvent(new CustomEvent('assignments:changed', { detail: { action: 'assign', id: mappingId } })); } catch (e) {}
      } catch (err) {
        console.error('Assign failed', err);
        toast.error('Assign failed');
      }
    })();
  };

  // Load clients when opening assign modal
  useEffect(() => {
    if (!assignModalOpen) return;
    let mounted = true;
    (async () => {
      try {
        const tenantId = localStorage.getItem('tenantId');
        if (!tenantId) return;
        // Use full list endpoint so we receive name + lastName fields
        const resp = await api.get(`/tenant/${tenantId}/client-account?limit=200&offset=0`);
        const data = resp?.data ?? resp;
        const rows = Array.isArray(data?.rows) ? data.rows : (Array.isArray(data) ? data : []);
        if (!mounted) return;
        const items = rows.map((r: any) => {
          const given = r.name ?? r.firstName ?? '';
          const family = r.lastName ?? r.surname ?? '';
          const display = (given || family) ? `${given}${family ? ' ' + family : ''}`.trim() : (r.fullName ?? r.label ?? r.id);
          return { id: r.id, name: display };
        });
        setClients(items);
      } catch (err) {
        console.error('Failed to load clients for assign modal', err);
      }
    })();
    return () => { mounted = false; };
  }, [assignModalOpen]);

  // When a client is selected, load their post sites
  useEffect(() => {
    if (!selectedClient) {
      setPostSites([]);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const tenantId = localStorage.getItem('tenantId');
        if (!tenantId) return;
        // Prefer specific client post-sites endpoint
        const list = await stationService.list({ clientId: selectedClient } as any, { limit: 200, offset: 0 });
        const items = (list.rows || []).map((r: any) => ({ id: r.id, name: r.companyName || r.postSiteName || r.name || r.stationName || r.label || r.id }));
        if (!mounted) return;
        setPostSites(items);
      } catch (err) {
        console.error('Failed to load post sites for client', err);
        setPostSites([]);
      }
    })();
    return () => { mounted = false; };
  }, [selectedClient]);

  // When a postSite is selected in the assign modal, load its stations
  useEffect(() => {
    if (!selectedPostSite) { setStationsForPostSite([]); setSelectedStationAssign(''); return; }
    let mounted = true;
    (async () => {
      try {
        const tenantId = localStorage.getItem('tenantId');
        if (!tenantId) return;
        const list = await stationService.list({ postSiteId: selectedPostSite } as any, { limit: 200, offset: 0 });
        const rawRows = (list.rows || []);
        const mapped = rawRows.map((r: any) => ({ id: r.id, name: r.stationName || r.name || r.companyName || r.postSiteName || r.label || r.id }));
        // Filter out the postSite itself (sometimes returned) and dedupe by id+name
        const deduped: Array<{ id: string; name: string }> = [];
        const seenIds = new Set<string>();
        const seenNames = new Set<string>();
        for (const it of mapped) {
          if (!it || !it.id) continue;
          if (it.id === selectedPostSite) continue; // don't show the postSite as a station
          if (seenIds.has(it.id)) continue;
          // avoid showing repeated display names
          if (seenNames.has(String(it.name).toLowerCase())) continue;
          seenIds.add(it.id);
          seenNames.add(String(it.name).toLowerCase());
          deduped.push(it);
        }
        if (!mounted) return;
        setStationsForPostSite(deduped);
        if (deduped.length) setSelectedStationAssign(deduped[0].id);
      } catch (err) {
        console.error('Failed to load stations for postSite', err);
        if (mounted) { setStationsForPostSite([]); setSelectedStationAssign(''); }
      }
    })();
    return () => { mounted = false; };
  }, [selectedPostSite]);

  return (
    <AppLayout>
      <GuardsLayout navKey="keep-safe" title="guards.nav.asignarSitios">
        {loading ? (
          <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground">{t('guards.assignSites.loading', { defaultValue: 'Loading...' })}</div>
          </div>
        ) : guard ? (
          <div className="space-y-4">
            <div className="bg-card border rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div className="relative" ref={actionRef}>
                  <button
                    onClick={() => setActionOpen(!actionOpen)}
                    className="px-3 py-2 border rounded-md bg-card text-foreground text-sm font-medium flex items-center gap-2 hover:bg-muted/30 min-w-[100px]"
                  >
                    {actionSelection}
                    <ChevronDown size={16} />
                  </button>
                  {actionOpen && (
                    <div className="absolute left-0 mt-1 bg-card border rounded-md shadow-lg z-10 w-full">
                      <button
                        onClick={() => {
                          setActionOpen(false);
                          // require at least one selected mapping to delete
                          if (!selectedIds || selectedIds.length === 0) {
                            const msg = t('guards.assignSites.actions.selectPair', { defaultValue: 'Debe seleccionar al menos un par para eliminar' });
                            setActionMessage(msg);
                            try { toast.error(msg); } catch (e) {}
                            return;
                          }
                          setActionSelection(t('guards.assignSites.actions.delete', { defaultValue: 'Delete' }));
                          setShowDeleteConfirm(true);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-muted"
                      >
                        {t('guards.assignSites.actions.delete', { defaultValue: 'Delete' })}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder={t('guards.assignSites.searchPlaceholder', { defaultValue: 'Search Post Sites' })}
                      value={''}
                      onChange={() => {}}
                      className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#C8860A]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={() => setAssignModalOpen(true)} className="px-4 py-2 bg-[#C8860A] text-white rounded-full text-sm font-semibold flex items-center gap-2 hover:bg-[#B37809]">
                    <Plus size={14} />
                    {t('guards.assignSites.assignButton', { defaultValue: 'Assign Post Sites' })}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                        <input
                          type="checkbox"
                          aria-label="select all"
                          checked={mappings.length > 0 && selectedIds.length === mappings.length}
                          onChange={(e) => toggleSelectAll(e.target.checked)}
                          className="h-4 w-4"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{t('guards.assignSites.table.client', { defaultValue: 'Client' })}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{t('guards.assignSites.table.postSites', { defaultValue: 'Post Sites' })}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{t('guards.assignSites.table.station', { defaultValue: 'Station' })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappings.map((m) => (
                      <tr key={m.id} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={selectedIds.includes(m.id)} onChange={(e) => {
                            if (e.target.checked) setSelectedIds((prev) => [...prev, m.id]); else setSelectedIds((prev) => prev.filter(id => id !== m.id));
                          }} className="h-4 w-4" />
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">{m.client}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{m.postSite}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{m.station}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">{t('guards.assignSites.loadError', { defaultValue: 'Could not load guard' })}</div>
          </div>
        )}

        {/* Assign Modal/Drawer */}
        {assignModalOpen && (
          <div className="fixed inset-0 z-50" onClick={() => setAssignModalOpen(false)}>
            <div className="fixed right-0 top-0 bottom-0 w-96 bg-card shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-card z-10">
                <h3 className="text-lg font-semibold">{t('guards.assignSites.modal.title', { defaultValue: 'Assign Sites' })}</h3>
                <button onClick={() => setAssignModalOpen(false)} className="text-muted-foreground hover:text-foreground/70"><X /></button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-foreground/70 block mb-2">{t('guards.assignSites.form.client', { defaultValue: 'Client' })}<span className="text-red-500">*</span></label>
                    <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm">
                      <option value="">{t('guards.assignSites.form.selectClient', { defaultValue: 'Select client' })}</option>
                      {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-foreground/70 block mb-2">{t('guards.assignSites.form.postSite', { defaultValue: 'Post Site' })}<span className="text-red-500">*</span></label>
                    <select value={selectedPostSite} onChange={(e) => setSelectedPostSite(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm mb-2">
                      <option value="">{t('guards.assignSites.form.selectPostSite', { defaultValue: 'Select post site' })}</option>
                      {postSites.length === 0 && selectedClient && (
                        <option disabled value="">{t('guards.assignSites.noPostSites', { defaultValue: 'No post sites found' })}</option>
                      )}
                      {postSites.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    {/* Mostrar info y mapa del puesto seleccionado */}
                    {selectedPostSite && (
                      <React.Suspense fallback={<div className="text-xs text-muted-foreground">Cargando información del puesto...</div>}>
                        <PostSiteMiniInfo postSiteId={selectedPostSite} />
                      </React.Suspense>
                    )}
                  </div>

                  {selectedPostSite && (
                    <div>
                      <label className="text-sm text-foreground/70 block mb-2">{t('guards.assignSites.form.station', { defaultValue: 'Station' })}</label>
                      <select value={selectedStationAssign} onChange={(e) => setSelectedStationAssign(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm">
                        <option value="">{t('guards.assignSites.form.selectStation', { defaultValue: 'Select station' })}</option>
                        {stationsForPostSite.length === 0 && selectedPostSite && (
                          <option disabled value="">{t('guards.assignSites.noStations', { defaultValue: 'No stations found' })}</option>
                        )}
                        {stationsForPostSite.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              </div>

                <div className="flex items-center justify-end gap-3 p-4 border-t bg-card">
                <button onClick={() => setAssignModalOpen(false)} className="px-4 py-2 text-foreground border rounded-md hover:bg-muted/30">{t('guards.assignSites.modal.cancel', { defaultValue: 'Cancel' })}</button>
                <button onClick={assignSite} className="px-4 py-2 bg-[#C8860A] text-white rounded-md">{t('guards.assignSites.modal.assign', { defaultValue: 'Assign' })}</button>
              </div>
            </div>
          </div>
        )}
        {/* Delete confirmation modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50" onClick={() => setShowDeleteConfirm(false)}>
            <div className="fixed inset-0 bg-black opacity-30" />
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-96 bg-card shadow-2xl rounded-md" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold">{t('guards.assignSites.actions.confirmDeleteTitle', { defaultValue: 'Confirmar eliminación' })}</h3>
              </div>
              <div className="p-4">
                <p className="text-sm text-foreground">{t('guards.assignSites.actions.confirmDeleteMessage', { defaultValue: '¿Estás seguro? Se eliminarán las asignaciones seleccionadas.' })}</p>
              </div>
              <div className="flex items-center justify-end gap-3 p-4 border-t">
                <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-foreground border rounded-md hover:bg-muted/30">{t('guards.assignSites.modal.cancel', { defaultValue: 'Cancel' })}</button>
                <button onClick={async () => {
                  try { 
                    const tenantId = localStorage.getItem('tenantId');
                    // Optimistic UI: remove selected mappings locally
                    setMappings((prev) => prev.filter(m => !selectedIds.includes(m.id)));
                    // Capture ids to delete
                    const idsToDelete = selectedIds.slice();
                    // Clear selection
                    setSelectedIds([]);
                    setShowDeleteConfirm(false);
                    try { toast.success(t('guards.assignSites.actions.deleted', { defaultValue: 'Deleted' })); } catch (e) {}
                    // notify other views that assignments changed (optimistic)
                    try { window.dispatchEvent(new CustomEvent('assignments:changed', { detail: { action: 'delete', ids: idsToDelete } })); } catch (e) {}
                    // Send delete request to shifts endpoint; if it fails, show error but UI already updated optimistically
                    try {
                      if (tenantId && idsToDelete && idsToDelete.length) {
                        const query = `ids=${idsToDelete.map(encodeURIComponent).join(',')}`;
                        await api.delete(`/tenant/${tenantId}/shift?${query}`);
                      }
                    } catch (err) {
                      console.error('Delete shifts failed', err);
                      try { toast.error(t('guards.assignSites.actions.deleteFailed', { defaultValue: 'Delete failed' })); } catch (e) {}
                    }
                  } catch (err) {
                    console.error('Delete failed', err);
                    toast.error(t('guards.assignSites.actions.deleteFailed', { defaultValue: 'Delete failed' }));
                  }
                }} className="px-4 py-2 bg-red-600 text-white rounded-md">{t('guards.assignSites.actions.deleteConfirm', { defaultValue: 'Eliminar' })}</button>
              </div>
            </div>
          </div>
        )}
      </GuardsLayout>
    </AppLayout>
  )

}

// Helper: update a shift record (tries RESTful /shift/:id then falls back to /shift payload)
export async function updateShift(id: string, payload: any) {
  try {
    const tenantId = localStorage.getItem('tenantId');
    if (!tenantId) throw new Error('missing tenantId');
    // Try standard RESTful update first
    try {
      return await api.put(`/tenant/${tenantId}/shift/${encodeURIComponent(String(id))}`, { data: payload } as any);
    } catch (e) {
      // Fallback: some backends accept PUT to /shift with id in payload
      return await api.put(`/tenant/${tenantId}/shift`, { data: { id, ...payload } } as any);
    }
  } catch (err) {
    console.error('[GuardAsignarSitios] updateShift failed', err);
    throw err;
  }
}
