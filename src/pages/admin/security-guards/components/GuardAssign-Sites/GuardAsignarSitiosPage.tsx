import React from 'react';
import { useParams } from 'react-router-dom';
import AppLayout from '@/layouts/app-layout';
import GuardsLayout from '@/layouts/GuardsLayout';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus, X, Trash2, MapPin, Building2, Briefcase, Clock } from 'lucide-react';
import securityGuardService from '@/lib/api/securityGuardService';
import api from '@/lib/api';
import { stationService } from '@/lib/api/stationService';
import { toast } from 'sonner';
import PostSiteMiniInfo from '@/components/post-sites/PostSiteMiniInfo';
import { Section, EmptyState, StatusBadge } from '@/components/kit';

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

// ── Shift-window formatting ──────────────────────────────────────────────────
const fmtDateTime = (v: any): string | null => {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};
const shiftWindow = (start: any, end: any): string | null => {
  const a = fmtDateTime(start);
  const b = fmtDateTime(end);
  if (a && b) return `${a} – ${b}`;
  return a || b || null;
};

type Assignment = {
  id: string; // REAL shift id — used for unassign (DELETE /shift?ids=<id>)
  client: string | null;
  postSite: string | null;
  station: string | null;
  startTime: any;
  endTime: any;
  businessInfoId?: string | null;
};

export default function GuardAsignarSitiosPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [mappings, setMappings] = useState<Assignment[]>([]);
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // ── Load the guard's real assignments (single source of truth) ──────────────
  const loadAssignments = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { rows } = await securityGuardService.getAssignments(String(id));
      const base: Assignment[] = (rows || []).map((r: any) => ({
        id: String(r.id ?? ''),
        client: labelOf(r.clientName),
        postSite: labelOf(r.postSiteName),
        station: labelOf(r.stationName),
        startTime: r.startTime ?? null,
        endTime: r.endTime ?? null,
        businessInfoId: r.businessInfoId ?? null,
      }));

      // Enrichment: resolve any missing station/post/client names from the
      // post-site (station) resource when the joined query left them blank.
      const enriched: Assignment[] = await Promise.all(
        base.map(async (item) => {
          if ((item.client && item.postSite && item.station) || !item.businessInfoId) return item;
          try {
            const post: any = await stationService.get(item.businessInfoId);
            return {
              ...item,
              station: item.station ?? labelOf(post.station) ?? labelOf(post.stationName) ?? labelOf(post.name),
              postSite: item.postSite ?? labelOf(post.companyName) ?? labelOf(post.postSiteName) ?? labelOf(post.name),
              client:
                item.client ??
                labelOf(post.client) ??
                labelOf(post.clientAccount) ??
                labelOf(post.clientAccountName),
            };
          } catch {
            return item;
          }
        }),
      );

      setMappings(enriched);
    } catch (err) {
      setMappings([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  // Reload when assignments change elsewhere in the app.
  useEffect(() => {
    const handler = () => loadAssignments();
    window.addEventListener('assignments:changed', handler as EventListener);
    return () => window.removeEventListener('assignments:changed', handler as EventListener);
  }, [loadAssignments]);

  // ── Assign modal state ──────────────────────────────────────────────────────
  const actionRef = useRef<HTMLDivElement | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [postSites, setPostSites] = useState<Array<{ id: string; name: string }>>([]);
  const [stationsForPostSite, setStationsForPostSite] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedStationAssign, setSelectedStationAssign] = useState<string>('');
  const [selectedStart, setSelectedStart] = useState<string>(() => new Date().toISOString().slice(0, 16));
  const [selectedEnd, setSelectedEnd] = useState<string>(() =>
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  );
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedPostSite, setSelectedPostSite] = useState('');
  const [assigning, setAssigning] = useState(false);

  // ── Search-filtered list ────────────────────────────────────────────────────
  const q = query.trim().toLowerCase();
  const filtered = q
    ? mappings.filter((m) =>
        [m.postSite, m.client, m.station, shiftWindow(m.startTime, m.endTime)]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
      )
    : mappings;

  const allSelected = filtered.length > 0 && filtered.every((m) => selectedIds.includes(m.id));
  const toggleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(filtered.map((m) => m.id));
    else setSelectedIds([]);
  };

  // ── Assign (keeps the working assign-guard adapter flow) ────────────────────
  const assignSite = () => {
    if (!selectedClient || !selectedPostSite) {
      toast.error(t('guards.assignSites.errors.selectClientSite', { defaultValue: 'Selecciona un cliente y un puesto' }));
      return;
    }
    if (!selectedStart || !selectedEnd) {
      toast.error(t('guards.assignSites.errors.selectTimes', { defaultValue: 'Selecciona hora de inicio y fin' }));
      return;
    }
    const s = new Date(selectedStart);
    const e = new Date(selectedEnd);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || s.getTime() >= e.getTime()) {
      toast.error(t('guards.assignSites.errors.timeOrder', { defaultValue: 'La hora de inicio debe ser anterior a la hora de fin' }));
      return;
    }

    (async () => {
      setAssigning(true);
      try {
        const tenantId = localStorage.getItem('tenantId');
        if (!tenantId) {
          toast.error(t('guards.assignSites.errors.noTenant', { defaultValue: 'No se pudo determinar la organización' }));
          return;
        }
        // Resolve the guard's user id (assign-guard adapter also resolves it,
        // but we send the best identifier we can).
        let guardUserId: string | null = null;
        try {
          const sg: any = await securityGuardService.get(String(id));
          const sgRec = sg && (sg.guard || sg) ? (sg.guard || sg) : sg;
          guardUserId = sgRec?.id || sgRec?.guardId || null;
        } catch {
          /* fall back to route id */
        }
        const securityGuardIdentifier = guardUserId || id;

        const pad = (n: number) => String(n).padStart(2, '0');
        const startDate = `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}`;
        const startTime = `${pad(s.getHours())}:${pad(s.getMinutes())}`;
        const endTime = `${pad(e.getHours())}:${pad(e.getMinutes())}`;

        const assignPayload = {
          securityGuardId: securityGuardIdentifier,
          ...(selectedStationAssign ? { stationId: selectedStationAssign } : {}),
          startDate,
          startTime,
          endTime,
        } as any;
        const routeStationOrSite = selectedStationAssign || selectedPostSite;

        await api.post(
          `/tenant/${tenantId}/stations/${routeStationOrSite}/assign-guard`,
          assignPayload,
          { toast: { success: t('guards.assignSites.assigned', { defaultValue: 'Vigilante asignado' }) } } as any,
        );

        setSelectedClient('');
        setSelectedPostSite('');
        setSelectedStationAssign('');
        setAssignModalOpen(false);
        try {
          window.dispatchEvent(new CustomEvent('assignments:changed', { detail: { action: 'assign' } }));
        } catch {
          /* noop */
        }
        await loadAssignments();
      } catch (err) {
        toast.error(t('guards.assignSites.errors.assignFailed', { defaultValue: 'No se pudo asignar el puesto' }));
      } finally {
        setAssigning(false);
      }
    })();
  };

  // ── Unassign (delete the real shift row) ────────────────────────────────────
  const confirmDelete = async () => {
    const tenantId = localStorage.getItem('tenantId');
    // Only allow delete when a REAL shift id exists.
    const idsToDelete = selectedIds.filter((v) => v && v.trim());
    if (!tenantId || idsToDelete.length === 0) {
      toast.error(t('guards.assignSites.errors.noneToDelete', { defaultValue: 'No hay asignaciones válidas para eliminar' }));
      setShowDeleteConfirm(false);
      return;
    }
    try {
      const queryStr = `ids=${idsToDelete.map(encodeURIComponent).join(',')}`;
      await api.delete(`/tenant/${tenantId}/shift?${queryStr}`);
      toast.success(t('guards.assignSites.actions.deleted', { defaultValue: 'Asignación eliminada' }));
      setSelectedIds([]);
      setShowDeleteConfirm(false);
      try {
        window.dispatchEvent(new CustomEvent('assignments:changed', { detail: { action: 'delete', ids: idsToDelete } }));
      } catch {
        /* noop */
      }
      await loadAssignments();
    } catch (err) {
      toast.error(t('guards.assignSites.actions.deleteFailed', { defaultValue: 'No se pudo eliminar la asignación' }));
      setShowDeleteConfirm(false);
    }
  };

  // Load clients when opening assign modal
  useEffect(() => {
    if (!assignModalOpen) return;
    let mounted = true;
    (async () => {
      try {
        const tenantId = localStorage.getItem('tenantId');
        if (!tenantId) return;
        const resp = await api.get(`/tenant/${tenantId}/client-account?limit=200&offset=0`);
        const data = (resp as any)?.data ?? resp;
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
        /* ignore — clients simply won't populate */
      }
    })();
    return () => { mounted = false; };
  }, [assignModalOpen]);

  // When a client is selected, load their post sites
  useEffect(() => {
    if (!selectedClient) { setPostSites([]); return; }
    let mounted = true;
    (async () => {
      try {
        const tenantId = localStorage.getItem('tenantId');
        if (!tenantId) return;
        const list = await stationService.list({ clientId: selectedClient } as any, { limit: 200, offset: 0 });
        const items = (list.rows || []).map((r: any) => ({
          id: String(r.id ?? ''),
          name: labelOf(r.companyName || r.postSiteName || r.name || r.stationName || r.label) ?? labelOf(r) ?? String(r.id ?? ''),
        }));
        if (!mounted) return;
        setPostSites(items);
      } catch (err) {
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
        const mapped = rawRows.map((r: any) => ({
          id: String(r.id ?? ''),
          name: labelOf(r.stationName || r.name || r.companyName || r.postSiteName || r.label) ?? labelOf(r) ?? String(r.id ?? ''),
        }));
        const deduped: Array<{ id: string; name: string }> = [];
        const seenIds = new Set<string>();
        const seenNames = new Set<string>();
        for (const it of mapped) {
          if (!it || !it.id) continue;
          if (it.id === selectedPostSite) continue; // don't show the postSite as a station
          if (seenIds.has(it.id)) continue;
          if (seenNames.has(String(it.name).toLowerCase())) continue;
          seenIds.add(it.id);
          seenNames.add(String(it.name).toLowerCase());
          deduped.push(it);
        }
        if (!mounted) return;
        setStationsForPostSite(deduped);
        if (deduped.length) setSelectedStationAssign(deduped[0].id);
      } catch (err) {
        if (mounted) { setStationsForPostSite([]); setSelectedStationAssign(''); }
      }
    })();
    return () => { mounted = false; };
  }, [selectedPostSite]);

  return (
    <AppLayout>
      <GuardsLayout navKey="keep-safe" title="guards.nav.asignarSitios">
        <div className="mx-auto max-w-5xl space-y-6">
          <Section
            title={t('guards.assignSites.table.postSites', { defaultValue: 'Puesto y estaciones' })}
            icon={<Building2 className="w-4 h-4" />}
            action={
              <div className="flex items-center gap-2">
                <div className="relative hidden sm:block">
                  <Search size={15} className="absolute left-2.5 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={t('guards.assignSites.searchPlaceholder', { defaultValue: 'Buscar puesto o estación' })}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="h-9 w-52 pl-8 pr-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="relative" ref={actionRef}>
                  <button
                    onClick={() => {
                      if (!selectedIds || selectedIds.length === 0) {
                        toast.error(t('guards.assignSites.actions.selectPair', { defaultValue: 'Selecciona al menos una asignación para eliminar' }));
                        return;
                      }
                      setShowDeleteConfirm(true);
                    }}
                    disabled={selectedIds.length === 0}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border text-sm font-medium text-red-600 hover:bg-red-500/10 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={15} />
                    {t('guards.assignSites.actions.delete', { defaultValue: 'Quitar' })}
                    {selectedIds.length > 0 && (
                      <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-red-500/15 text-[11px]">{selectedIds.length}</span>
                    )}
                  </button>
                </div>
                <button
                  onClick={() => setAssignModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 text-sm font-medium px-3.5 py-2 rounded-lg text-white shadow-sm hover:opacity-90 transition"
                  style={{ background: GOLD }}
                >
                  <Plus size={16} />
                  {t('guards.assignSites.assignButton', { defaultValue: 'Asignar puesto' })}
                </button>
              </div>
            }
          >
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-muted/60 animate-pulse" />)}
              </div>
            ) : mappings.length === 0 ? (
              <EmptyState
                icon={<MapPin />}
                title={t('guards.assignSites.empty', { defaultValue: 'Sin puestos asignados todavía' })}
                description={t('guards.assignSites.emptyHint', { defaultValue: 'Asigna un puesto para empezar.' })}
                action={
                  <button
                    onClick={() => setAssignModalOpen(true)}
                    className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg text-white shadow-sm hover:opacity-90 transition"
                    style={{ background: GOLD }}
                  >
                    <Plus size={16} />
                    {t('guards.assignSites.assignButton', { defaultValue: 'Asignar puesto' })}
                  </button>
                }
              />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={<Search />}
                title={t('guards.assignSites.noResults', { defaultValue: 'Sin resultados' })}
                description={t('guards.assignSites.noResultsHint', { defaultValue: 'Ninguna asignación coincide con la búsqueda.' })}
              />
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
                  {t('guards.assignSites.selectAll', { defaultValue: 'Seleccionar todo' })}
                </label>
                {filtered.map((m) => {
                  const checked = selectedIds.includes(m.id);
                  const postSiteLabel = labelOf(m.postSite);
                  const clientLabel = labelOf(m.client);
                  const stationLabel = labelOf(m.station);
                  const windowLabel = shiftWindow(m.startTime, m.endTime);
                  return (
                    <div
                      key={m.id}
                      className={`group flex items-center gap-3 rounded-xl border p-3.5 transition hover:shadow-sm ${checked ? 'border-primary/60 bg-primary/5' : 'hover:bg-muted/30'}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds((prev) => [...prev, m.id]);
                          else setSelectedIds((prev) => prev.filter((x) => x !== m.id));
                        }}
                        className="h-4 w-4 rounded accent-primary shrink-0"
                      />
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                        <Building2 className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{postSiteLabel || '—'}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1 truncate">
                            <Briefcase className="w-3 h-3 shrink-0" />
                            {clientLabel || '—'}
                          </span>
                          {stationLabel && stationLabel !== '-' && (
                            <StatusBadge tone="slate" dot={false}>
                              <MapPin className="w-3 h-3 shrink-0" />
                              {stationLabel}
                            </StatusBadge>
                          )}
                          {windowLabel && (
                            <StatusBadge tone="primary" dot={false}>
                              <Clock className="w-3 h-3 shrink-0" />
                              {windowLabel}
                            </StatusBadge>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedIds([m.id]);
                          setShowDeleteConfirm(true);
                        }}
                        title={t('guards.assignSites.actions.delete', { defaultValue: 'Quitar' })}
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

        {/* Assign Modal/Drawer */}
        {assignModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]" onClick={() => setAssignModalOpen(false)}>
            <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card shadow-2xl flex flex-col rounded-l-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-card z-10">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: GOLD }}><MapPin className="w-4.5 h-4.5" /></span>
                  <h3 className="text-base font-semibold tracking-tight">{t('guards.assignSites.modal.title', { defaultValue: 'Asignar puesto' })}</h3>
                </div>
                <button onClick={() => setAssignModalOpen(false)} className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition"><X size={18} /></button>
              </div>

              <div className="p-5 overflow-y-auto flex-1">
                <div className="space-y-5">
                  <div>
                    <label className="text-[11px] uppercase tracking-wide text-muted-foreground block mb-1.5">{t('guards.assignSites.form.client', { defaultValue: 'Cliente' })}<span className="text-red-500 ml-0.5">*</span></label>
                    <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} className="h-9 text-sm flex w-full rounded-md border border-input bg-background px-2">
                      <option value="">{t('guards.assignSites.form.selectClient', { defaultValue: 'Selecciona cliente' })}</option>
                      {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] uppercase tracking-wide text-muted-foreground block mb-1.5">{t('guards.assignSites.form.postSite', { defaultValue: 'Puesto' })}<span className="text-red-500 ml-0.5">*</span></label>
                    <select value={selectedPostSite} onChange={(e) => setSelectedPostSite(e.target.value)} className="h-9 text-sm flex w-full rounded-md border border-input bg-background px-2 mb-2 disabled:opacity-60" disabled={!selectedClient}>
                      <option value="">{t('guards.assignSites.form.selectPostSite', { defaultValue: 'Selecciona puesto' })}</option>
                      {postSites.length === 0 && selectedClient && (
                        <option disabled value="">{t('guards.assignSites.noPostSites', { defaultValue: 'No hay puestos disponibles' })}</option>
                      )}
                      {postSites.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    {selectedPostSite && (
                      <div className="mt-2 rounded-xl border bg-muted/30 p-3">
                        <React.Suspense fallback={<div className="text-xs text-muted-foreground">{t('guards.assignSites.loadingPostSite', { defaultValue: 'Cargando información del puesto…' })}</div>}>
                          <PostSiteMiniInfo postSiteId={selectedPostSite} />
                        </React.Suspense>
                      </div>
                    )}
                  </div>

                  {selectedPostSite && (
                    <div>
                      <label className="text-[11px] uppercase tracking-wide text-muted-foreground block mb-1.5">{t('guards.assignSites.form.station', { defaultValue: 'Estación' })}</label>
                      <select value={selectedStationAssign} onChange={(e) => setSelectedStationAssign(e.target.value)} className="h-9 text-sm flex w-full rounded-md border border-input bg-background px-2">
                        <option value="">{t('guards.assignSites.form.selectStation', { defaultValue: 'Selecciona estación' })}</option>
                        {stationsForPostSite.length === 0 && selectedPostSite && (
                          <option disabled value="">{t('guards.assignSites.noStations', { defaultValue: 'No hay estaciones disponibles' })}</option>
                        )}
                        {stationsForPostSite.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] uppercase tracking-wide text-muted-foreground block mb-1.5">{t('guards.assignSites.form.start', { defaultValue: 'Inicio' })}<span className="text-red-500 ml-0.5">*</span></label>
                      <input type="datetime-local" value={selectedStart} onChange={(e) => setSelectedStart(e.target.value)} className="h-9 text-sm flex w-full rounded-md border border-input bg-background px-2" />
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-wide text-muted-foreground block mb-1.5">{t('guards.assignSites.form.end', { defaultValue: 'Fin' })}<span className="text-red-500 ml-0.5">*</span></label>
                      <input type="datetime-local" value={selectedEnd} onChange={(e) => setSelectedEnd(e.target.value)} className="h-9 text-sm flex w-full rounded-md border border-input bg-background px-2" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 p-4 border-t bg-card">
                <button onClick={() => setAssignModalOpen(false)} className="text-sm px-4 py-2 rounded-lg border hover:bg-muted transition">{t('guards.assignSites.modal.cancel', { defaultValue: 'Cancelar' })}</button>
                <button onClick={assignSite} disabled={assigning} className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg text-white shadow-sm hover:opacity-90 transition disabled:opacity-60" style={{ background: GOLD }}>
                  <Plus size={16} />
                  {t('guards.assignSites.modal.assign', { defaultValue: 'Asignar' })}
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
                <p className="text-sm text-muted-foreground">{t('guards.assignSites.actions.confirmDeleteMessage', { defaultValue: '¿Seguro? Se quitarán las asignaciones seleccionadas del vigilante.' })}</p>
              </div>
              <div className="flex items-center justify-end gap-2 p-4 border-t">
                <button onClick={() => setShowDeleteConfirm(false)} className="text-sm px-4 py-2 rounded-lg border hover:bg-muted transition">{t('guards.assignSites.modal.cancel', { defaultValue: 'Cancelar' })}</button>
                <button onClick={confirmDelete} className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 bg-red-600 text-white rounded-lg shadow-sm hover:bg-red-700 transition"><Trash2 size={15} />{t('guards.assignSites.actions.deleteConfirm', { defaultValue: 'Quitar' })}</button>
              </div>
            </div>
          </div>
        )}
      </GuardsLayout>
    </AppLayout>
  );
}

// Helper: update a shift record (tries RESTful /shift/:id then falls back to /shift payload)
export async function updateShift(id: string, payload: any) {
  try {
    const tenantId = localStorage.getItem('tenantId');
    if (!tenantId) throw new Error('missing tenantId');
    try {
      return await api.put(`/tenant/${tenantId}/shift/${encodeURIComponent(String(id))}`, { data: payload } as any);
    } catch (e) {
      return await api.put(`/tenant/${tenantId}/shift`, { data: { id, ...payload } } as any);
    }
  } catch (err) {
    throw err;
  }
}
