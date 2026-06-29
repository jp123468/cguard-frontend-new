import React from 'react';
import { useParams } from 'react-router-dom';
import AppLayout from '@/layouts/app-layout';
import GuardsLayout from '@/layouts/GuardsLayout';
import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus, X, Trash2, MapPin, Building2, Briefcase } from 'lucide-react';
import securityGuardService from '@/lib/api/securityGuardService';
import api from '@/lib/api';
import { stationService } from '@/lib/api/stationService';
import { toast } from 'sonner';
import PostSiteMiniInfo from '@/components/post-sites/PostSiteMiniInfo';

const GOLD = '#C8860A';

// ── Safe label extraction ────────────────────────────────────────────────────
// The backend may return raw association OBJECTS (full Sequelize models) for
// client / postSite / station. Rendering an object directly as a JSX child
// throws React error #31 ("Objects are not valid as a React child"). This helper
// always returns a printable string, whether given a string, number, or object.
const labelOf = (val: any): string | null => {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') return val.trim() || null;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    const candidate =
      val.stationName ?? val.companyName ?? val.postSiteName ?? val.fullName ??
      val.name ?? val.label ?? val.clientName ?? val.clientFullName ??
      val.title ?? val.id ?? null;
    if (candidate === null || candidate === undefined) return null;
    return typeof candidate === 'string' ? (candidate.trim() || null) : String(candidate);
  }
  return String(val);
};

// ── Small presentational helper (matches GuardProfile reference) ─────────────
const Section = ({ title, icon, action, children }: { title: string; icon?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) => (
  <div className="bg-card border rounded-2xl p-5 shadow-sm">
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <h4 className="font-semibold text-sm tracking-tight">{title}</h4>
      </div>
      {action}
    </div>
    {children}
  </div>
);

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
            client: r.clientName ?? r.clientFullName ?? labelOf(r.client) ?? r.clientAccountName ?? labelOf(r.clientAccount) ?? null,
            // Keep businessInfo (post site) separate from station
            postSite: r.postSiteName ?? r.companyName ?? labelOf(r.businessInfo) ?? labelOf(r.postSite) ?? null,
            station: labelOf(r.station) ?? r.stationName ?? null,
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
            const post: any = await stationService.get(item.businessInfoId);
            const stationName = labelOf(post.station) ?? post.stationName ?? post.name ?? post.label ?? null;
            const postSiteName = post.companyName ?? post.postSiteName ?? post.name ?? null;
            let siteName = item.postSite ?? postSiteName ?? item.raw.postSiteName ?? '-';
            let clientName = item.client ?? labelOf(post.client) ?? labelOf(post.clientAccount) ?? post.clientAccountName ?? item.raw.clientName ?? null;

            // If clientName still null and post exposes a clientAccountId, fetch the client-account
            if (!clientName) {
              const clientId = post.clientAccountId || post.clientId || post.clientAccount?.id || null;
              if (clientId) {
                try {
                  const clientResp = await api.get(`/tenant/${tenantId}/client-account/${clientId}`);
                  const clientData = clientResp?.data ?? clientResp;
                  clientName = labelOf(clientData) ?? clientName;
                } catch (e) {
                  // ignore client fetch errors
                }
              }
            }

            return { ...item, postSite: labelOf(siteName) ?? '-', client: labelOf(clientName) ?? '-', station: labelOf(stationName) ?? labelOf(item.station) ?? null };
          } catch (e) {
            return { ...item, postSite: labelOf(item.postSite) ?? (item.raw.postSiteName ?? '-'), client: labelOf(item.client) ?? (item.raw.clientName ?? '-') };
          }
        }));

        // Ensure assignments table always shows station(s) when available.
        const enriched = await Promise.all(resolved.map(async (it: any) => {
          const post = labelOf(it.postSite) ?? '-';
          // prefer explicit stationName from item
          let stationVal: any = labelOf(it.station) ?? null;
          try {
            if (!stationVal && it.businessInfoId) {
              // If the raw row contains explicit station info, prefer that
              if (it.raw && (it.raw.stationName || it.raw.station || it.raw.stationId)) {
                if (it.raw.stationName) {
                  stationVal = labelOf(it.raw.stationName);
                } else if (it.raw.station && typeof it.raw.station === 'object' && (it.raw.station.stationName || it.raw.station.name)) {
                  // station object is already embedded in the shift response — use it directly
                  stationVal = it.raw.station.stationName || it.raw.station.name;
                } else if (typeof it.raw.station === 'string' && it.raw.station.trim()) {
                  stationVal = it.raw.station;
                } else {
                  const stationId = it.raw.stationId || (it.raw.station && it.raw.station.id) || null;
                  if (stationId) {
                    try {
                      const tenantId = localStorage.getItem('tenantId') || '';
                      const stResp = await api.get(`/tenant/${tenantId}/station/${stationId}`);
                      const stData = (stResp as any)?.data ?? stResp;
                      stationVal = labelOf(stData?.station) ?? stData?.stationName ?? stData?.name ?? stData?.label ?? null;
                    } catch (err) {
                      // ignore single station fetch errors
                    }
                  }
                }
              } else {
                // Treat businessInfoId as a postSite id and list its stations
                try {
                  const list = await stationService.list({ postSiteId: it.businessInfoId } as any, { limit: 50, offset: 0 });
                  const rows = (list.rows || [])
                    .map((r: any) => r.stationName || r.name || r.companyName || labelOf(r.company) || r.postSiteName || r.label || r.id)
                    .map((v: any) => labelOf(v))
                    .filter(Boolean);
                  if (rows.length) stationVal = rows.join(', ');
                } catch (e) {
                  // ignore station list errors
                }
              }
            }
          } catch (e) {
            // ignore station enrichment errors
          }
          const stationLabel = labelOf(stationVal);
          const stationDisplay = stationLabel && stationLabel.trim() ? stationLabel : '-';
          return { id: String(it.id ?? ''), client: labelOf(it.client) ?? '-', postSite: labelOf(post) ?? '-', station: stationDisplay, tenantUserId: it.tenantUserId, businessInfoId: it.businessInfoId, tags: it.tags ?? null, recorridos: it.recorridos ?? null };
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
                // Single source of truth: create an ad-hoc guardAssignment through
                // the assign-guard adapter (it resolves the guard's user id, picks a
                // station, and auto-generates the shift). No more raw /shift writes.
                const pad = (n: number) => String(n).padStart(2, '0');
                const sd = new Date(selectedStart);
                const ed = new Date(selectedEnd);
                const startDate = `${sd.getFullYear()}-${pad(sd.getMonth() + 1)}-${pad(sd.getDate())}`;
                const startTime = `${pad(sd.getHours())}:${pad(sd.getMinutes())}`;
                const endTime = `${pad(ed.getHours())}:${pad(ed.getMinutes())}`;
                const assignPayload = {
                  securityGuardId: securityGuardIdentifier,
                  ...(selectedStationAssign ? { stationId: selectedStationAssign } : {}),
                  startDate,
                  startTime,
                  endTime,
                } as any;
                const routeStationOrSite = selectedStationAssign || selectedPostSite;
                const { data } = await api.post(
                  `/tenant/${tenantId}/stations/${routeStationOrSite}/assign-guard`,
                  assignPayload,
                  { toast: { success: 'Assigned' } } as any,
                );
                mappingId = data?.id ?? mappingId;
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
          const given = typeof r.name === 'string' ? r.name : (typeof r.firstName === 'string' ? r.firstName : '');
          const family = typeof r.lastName === 'string' ? r.lastName : (typeof r.surname === 'string' ? r.surname : '');
          const display = (given || family) ? `${given}${family ? ' ' + family : ''}`.trim() : (labelOf(r) ?? String(r.id ?? ''));
          return { id: String(r.id ?? ''), name: labelOf(display) ?? String(r.id ?? '') };
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
        const items = (list.rows || []).map((r: any) => ({ id: String(r.id ?? ''), name: labelOf(r.companyName || r.postSiteName || r.name || r.stationName || r.label) ?? labelOf(r) ?? String(r.id ?? '') }));
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
        const mapped = rawRows.map((r: any) => ({ id: String(r.id ?? ''), name: labelOf(r.stationName || r.name || r.companyName || r.postSiteName || r.label) ?? labelOf(r) ?? String(r.id ?? '') }));
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

  const guardName = guard?.fullName || [guard?.firstName, guard?.lastName].filter(Boolean).join(' ') || (t('guards.assignSites.guardFallback') || 'Vigilante');
  const allSelected = mappings.length > 0 && selectedIds.length === mappings.length;

  return (
    <AppLayout>
      <GuardsLayout navKey="keep-safe" title="guards.nav.asignarSitios">
        {loading ? (
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="rounded-2xl border bg-card p-6 shadow-sm animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-muted" />
                <div className="space-y-2">
                  <div className="h-4 w-40 rounded bg-muted" />
                  <div className="h-3 w-24 rounded bg-muted/70" />
                </div>
              </div>
            </div>
            <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-muted/60 animate-pulse" />)}
            </div>
          </div>
        ) : guard ? (
          <div className="mx-auto max-w-5xl space-y-6">

            {/* ── HERO ─────────────────────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card to-muted/40 shadow-sm">
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-r from-primary/15 to-transparent" />
              <div className="relative p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0" style={{ background: GOLD }}>
                  <MapPin className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{t('guards.nav.asignarSitios') || 'Asignación de sitios'}</div>
                  <h1 className="text-xl font-bold tracking-tight truncate">{guardName}</h1>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-muted text-xs font-medium">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} />
                      {mappings.length} {t('guards.assignSites.assignedCount') || 'asignaciones'}
                    </span>
                  </div>
                </div>
                <button onClick={() => setAssignModalOpen(true)} className="inline-flex items-center justify-center gap-2 text-sm font-medium px-4 py-2 rounded-lg text-white shadow-sm hover:opacity-90 transition shrink-0" style={{ background: GOLD }}>
                  <Plus size={16} />
                  {t('guards.assignSites.assignButton', { defaultValue: 'Assign Post Sites' })}
                </button>
              </div>
            </div>

            {/* ── ASSIGNED SITES ───────────────────────────────────────────── */}
            <Section
              title={t('guards.assignSites.table.postSites', { defaultValue: 'Post Sites' })}
              icon={<Building2 className="w-4 h-4" />}
              action={
                <div className="flex items-center gap-2">
                  <div className="relative hidden sm:block">
                    <Search size={15} className="absolute left-2.5 top-2.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder={t('guards.assignSites.searchPlaceholder', { defaultValue: 'Search Post Sites' })}
                      value={''}
                      onChange={() => {}}
                      className="h-9 w-48 pl-8 pr-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div className="relative" ref={actionRef}>
                    <button
                      onClick={() => {
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
                      disabled={selectedIds.length === 0}
                      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border text-sm font-medium text-red-600 hover:bg-red-500/10 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={15} />
                      {t('guards.assignSites.actions.delete', { defaultValue: 'Delete' })}
                      {selectedIds.length > 0 && <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-red-500/15 text-[11px]">{selectedIds.length}</span>}
                    </button>
                  </div>
                </div>
              }
            >
              {mappings.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-12 rounded-xl border border-dashed">
                  <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                    <MapPin className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="text-sm font-medium">{t('guards.assignSites.empty') || 'Sin sitios asignados todavía'}</div>
                  <div className="text-xs text-muted-foreground mt-1">{t('guards.assignSites.emptyHint') || 'Asigna un puesto para empezar.'}</div>
                  <button onClick={() => setAssignModalOpen(true)} className="mt-4 inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg text-white shadow-sm hover:opacity-90 transition" style={{ background: GOLD }}>
                    <Plus size={16} />
                    {t('guards.assignSites.assignButton', { defaultValue: 'Assign Post Sites' })}
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <label className="flex items-center gap-2 px-1 text-[11px] uppercase tracking-wide text-muted-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      aria-label="select all"
                      checked={allSelected}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      className="h-4 w-4 rounded accent-primary"
                    />
                    {t('guards.assignSites.selectAll') || 'Seleccionar todo'}
                  </label>
                  {mappings.map((m) => {
                    const checked = selectedIds.includes(m.id);
                    // Defensive: never render a raw object as a JSX child (React #31)
                    const postSiteLabel = labelOf(m.postSite);
                    const clientLabel = labelOf(m.client);
                    const stationLabel = labelOf(m.station);
                    return (
                      <div
                        key={m.id}
                        className={`group flex items-center gap-3 rounded-xl border p-3.5 transition hover:shadow-sm ${checked ? 'border-primary/60 bg-primary/5' : 'hover:bg-muted/30'}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedIds((prev) => [...prev, m.id]); else setSelectedIds((prev) => prev.filter(id => id !== m.id));
                          }}
                          className="h-4 w-4 rounded accent-primary shrink-0"
                        />
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                          <Building2 className="w-4.5 h-4.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{postSiteLabel || '—'}</div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1 truncate"><Briefcase className="w-3 h-3 shrink-0" />{clientLabel || '—'}</span>
                            {stationLabel && stationLabel !== '-' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-foreground/70 font-medium truncate"><MapPin className="w-3 h-3 shrink-0" />{stationLabel}</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedIds([m.id]);
                            setActionSelection(t('guards.assignSites.actions.delete', { defaultValue: 'Delete' }));
                            setShowDeleteConfirm(true);
                          }}
                          title={t('guards.assignSites.actions.delete', { defaultValue: 'Delete' })}
                          className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-500/10 transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>
          </div>
        ) : (
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-col items-center justify-center text-center py-16 rounded-2xl border border-dashed bg-card">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                <X className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="text-sm font-medium text-muted-foreground">{t('guards.assignSites.loadError', { defaultValue: 'Could not load guard' })}</div>
            </div>
          </div>
        )}

        {/* Assign Modal/Drawer */}
        {assignModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]" onClick={() => setAssignModalOpen(false)}>
            <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card shadow-2xl flex flex-col rounded-l-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-card z-10">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: GOLD }}><MapPin className="w-4.5 h-4.5" /></span>
                  <h3 className="text-base font-semibold tracking-tight">{t('guards.assignSites.modal.title', { defaultValue: 'Assign Sites' })}</h3>
                </div>
                <button onClick={() => setAssignModalOpen(false)} className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition"><X size={18} /></button>
              </div>

              <div className="p-5 overflow-y-auto flex-1">
                <div className="space-y-5">
                  <div>
                    <label className="text-[11px] uppercase tracking-wide text-muted-foreground block mb-1.5">{t('guards.assignSites.form.client', { defaultValue: 'Client' })}<span className="text-red-500 ml-0.5">*</span></label>
                    <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} className="h-9 text-sm flex w-full rounded-md border border-input bg-background px-2">
                      <option value="">{t('guards.assignSites.form.selectClient', { defaultValue: 'Select client' })}</option>
                      {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] uppercase tracking-wide text-muted-foreground block mb-1.5">{t('guards.assignSites.form.postSite', { defaultValue: 'Post Site' })}<span className="text-red-500 ml-0.5">*</span></label>
                    <select value={selectedPostSite} onChange={(e) => setSelectedPostSite(e.target.value)} className="h-9 text-sm flex w-full rounded-md border border-input bg-background px-2 mb-2 disabled:opacity-60" disabled={!selectedClient}>
                      <option value="">{t('guards.assignSites.form.selectPostSite', { defaultValue: 'Select post site' })}</option>
                      {postSites.length === 0 && selectedClient && (
                        <option disabled value="">{t('guards.assignSites.noPostSites', { defaultValue: 'No post sites found' })}</option>
                      )}
                      {postSites.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    {/* Mostrar info y mapa del puesto seleccionado */}
                    {selectedPostSite && (
                      <div className="mt-2 rounded-xl border bg-muted/30 p-3">
                        <React.Suspense fallback={<div className="text-xs text-muted-foreground">{t('guards.assignSites.loadingPostSite') || 'Cargando información del puesto…'}</div>}>
                          <PostSiteMiniInfo postSiteId={selectedPostSite} />
                        </React.Suspense>
                      </div>
                    )}
                  </div>

                  {selectedPostSite && (
                    <div>
                      <label className="text-[11px] uppercase tracking-wide text-muted-foreground block mb-1.5">{t('guards.assignSites.form.station', { defaultValue: 'Station' })}</label>
                      <select value={selectedStationAssign} onChange={(e) => setSelectedStationAssign(e.target.value)} className="h-9 text-sm flex w-full rounded-md border border-input bg-background px-2">
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

              <div className="flex items-center justify-end gap-2 p-4 border-t bg-card">
                <button onClick={() => setAssignModalOpen(false)} className="text-sm px-4 py-2 rounded-lg border hover:bg-muted transition">{t('guards.assignSites.modal.cancel', { defaultValue: 'Cancel' })}</button>
                <button onClick={assignSite} className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg text-white shadow-sm hover:opacity-90 transition" style={{ background: GOLD }}>
                  <Plus size={16} />
                  {t('guards.assignSites.modal.assign', { defaultValue: 'Assign' })}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Delete confirmation modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px]" />
            <div className="relative w-full max-w-sm bg-card shadow-2xl rounded-2xl border" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 p-5 border-b">
                <span className="w-10 h-10 rounded-xl bg-red-500/15 text-red-600 flex items-center justify-center shrink-0"><Trash2 size={18} /></span>
                <h3 className="text-base font-semibold tracking-tight">{t('guards.assignSites.actions.confirmDeleteTitle', { defaultValue: 'Confirmar eliminación' })}</h3>
              </div>
              <div className="p-5">
                <p className="text-sm text-muted-foreground">{t('guards.assignSites.actions.confirmDeleteMessage', { defaultValue: '¿Estás seguro? Se eliminarán las asignaciones seleccionadas.' })}</p>
              </div>
              <div className="flex items-center justify-end gap-2 p-4 border-t">
                <button onClick={() => setShowDeleteConfirm(false)} className="text-sm px-4 py-2 rounded-lg border hover:bg-muted transition">{t('guards.assignSites.modal.cancel', { defaultValue: 'Cancel' })}</button>
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
                }} className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 bg-red-600 text-white rounded-lg shadow-sm hover:bg-red-700 transition"><Trash2 size={15} />{t('guards.assignSites.actions.deleteConfirm', { defaultValue: 'Eliminar' })}</button>
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
