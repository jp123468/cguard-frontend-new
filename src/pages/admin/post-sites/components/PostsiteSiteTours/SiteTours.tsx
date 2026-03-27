import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Plus, X, Clock, EllipsisVertical, Eye, Edit, Trash } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import MobileCardList from '@/components/responsive/MobileCardList';
import { ApiService } from '@/services/api/apiService';
import { toast } from 'sonner';

export default function PostSiteTours({ site, guards = [] }: { site?: any; guards?: any[] }) {
  const { t } = useTranslation();
  // Helper: determine whether a guard object is assigned to a given station id
  function guardMatchesStation(g: any, stationId: string) {
    if (!g || !stationId) return false;
    const sid = String(stationId);
    // direct fields
    if (g.stationId && String(g.stationId) === sid) return true;
    if (g.station_id && String(g.station_id) === sid) return true;
    if (g.assignedStationId && String(g.assignedStationId) === sid) return true;
    if (g.postSiteId && String(g.postSiteId) === sid) return true;
    if (g.post_site_id && String(g.post_site_id) === sid) return true;
    // common single nested object
    if (g.station && (String(g.station.id) === sid || String(g.station.stationId) === sid || String(g.station.station_id) === sid)) return true;
    // arrays of stations
    const arrCandidates = g.stations || g.assignedStations || g.stationList || g.stationIds || g.assignedStationsIds || [];
    if (Array.isArray(arrCandidates)) {
      for (const item of arrCandidates) {
        if (!item) continue;
        if (typeof item === 'string' || typeof item === 'number') {
          if (String(item) === sid) return true;
        } else if (item.id && String(item.id) === sid) return true;
        else if (item.stationId && String(item.stationId) === sid) return true;
        else if (item.station_id && String(item.station_id) === sid) return true;
      }
    }
    return false;
  }
  const [actionOpen, setActionOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [showNewTourModal, setShowNewTourModal] = useState(false);

  const [tourName, setTourName] = useState('');
  const [tourDesc, setTourDesc] = useState('');
  const [scheduledDays, setScheduledDays] = useState('');
  const [continuous, setContinuous] = useState(false);
  const [timeMode, setTimeMode] = useState('specific');
  const [selectTime, setSelectTime] = useState('');
  const [maxDuration, setMaxDuration] = useState('');
  const [stationId, setStationId] = useState('');
  const [assignGuard, setAssignGuard] = useState('');
  const [enableNotes, setEnableNotes] = useState(false);
  const [forceMedia, setForceMedia] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const isFormValid = Boolean(tourName.trim() && scheduledDays && assignGuard && stationId);

  const [stations, setStations] = useState<any[]>([]);
  const [loadingStations, setLoadingStations] = useState(false);
  const [stationsMap, setStationsMap] = useState<Record<string, string>>({});

  const [localGuards, setLocalGuards] = useState<any[]>(guards || []);
  const [loadingGuards, setLoadingGuards] = useState(false);
  const [guardLoadError, setGuardLoadError] = useState<string | null>(null);
  const [guardsFromShifts, setGuardsFromShifts] = useState(false);
  const [tours, setTours] = useState<any[]>([]);
  const [loadingTours, setLoadingTours] = useState(false);
  const [toursError, setToursError] = useState<string | null>(null);
  const [selectedTourIds, setSelectedTourIds] = useState<string[]>([]);
  const [showConfirmArchive, setShowConfirmArchive] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [rowActionOpenId, setRowActionOpenId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailTour, setDetailTour] = useState<any | null>(null);
  const [detailShifts, setDetailShifts] = useState<any[]>([]);
  const [loadingDetailShifts, setLoadingDetailShifts] = useState(false);
  const [detailAssignments, setDetailAssignments] = useState<any[]>([]);
  const [loadingDetailAssignments, setLoadingDetailAssignments] = useState(false);
  const [editingTourId, setEditingTourId] = useState<string | null>(null);
  const timeInputRef = useRef<HTMLInputElement | null>(null);
  const translateTimeMode = (mode?: string) => {
    if (!mode) return '-';
    return t(`siteTour.form.timeMode.${mode}`, mode);
  };

  const loadAssignments = async (tourId: string) => {
    const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
    if (!tenantId || !tourId) return [];
    setLoadingDetailAssignments(true);
    try {
      const resp: any = await ApiService.get(`/tenant/${tenantId}/site-tour/${encodeURIComponent(tourId)}/assignments`);
      const rows = resp && (resp.rows || resp) ? (resp.rows || resp) : [];
      return rows || [];
    } catch (e) {
      console.error('Failed loading assignments for tour', e);
      return [];
    } finally {
      setLoadingDetailAssignments(false);
    }
  };
  

  useEffect(() => {
    // Solo cargar guardias asignados a este post site cuando se abre el modal
    // Load stations for this post site when opening modal
    if (showNewTourModal && stations.length === 0) {
      (async () => {
        try {
          setLoadingStations(true);
          const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
          const postSiteId = site?.id || '';
          if (!tenantId || !postSiteId) return;
          const res: any = await ApiService.get(`/tenant/${tenantId}/station?postSiteId=${encodeURIComponent(postSiteId)}&limit=999`);
          const rows = Array.isArray(res) ? res : (res && res.rows) ? res.rows : [];
          setStations(rows || []);
        } catch (e) {
          console.error('Failed loading stations for site', e);
          setStations([]);
        } finally {
          setLoadingStations(false);
        }
      })();
    }
  }, [showNewTourModal, site, t]);

  // Load stations for the current post site proactively so we can display station names in the table
  useEffect(() => {
    const loadStationsForSite = async () => {
      const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
      const postSiteId = site?.id || '';
      if (!tenantId || !postSiteId) {
        setStations([]);
        setStationsMap({});
        return;
      }
      try {
        setLoadingStations(true);
        const res: any = await ApiService.get(`/tenant/${tenantId}/station?postSiteId=${encodeURIComponent(postSiteId)}&limit=999`);
        const rows = Array.isArray(res) ? res : (res && res.rows) ? res.rows : [];
        setStations(rows || []);
        const map: Record<string, string> = {};
        (rows || []).forEach((s: any) => {
          const id = s.id || s.stationId || s.station_id;
          const name = s.stationName || s.name || s.station_name || id;
          if (id) map[String(id)] = name;
        });
        setStationsMap(map);
      } catch (e) {
        console.error('Failed loading stations for site (table)', e);
        setStations([]);
        setStationsMap({});
      } finally {
        setLoadingStations(false);
      }
    };
    loadStationsForSite();
  }, [site]);

  // Load guards for selected station when stationId changes (or when opening modal after choosing default)
  useEffect(() => {
    if (!showNewTourModal) return;
    const loadGuards = async () => {
      setLoadingGuards(true);
      setGuardsFromShifts(false);
      setGuardLoadError(null);
      const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
      const postSiteId = site?.id || '';
      try {
        let guardsList: any[] = [];
        let guardsFromShiftsFlag = false;

        // Helper to extract a guard object from a shift/guard-shift row. Reused for station endpoint and shifts fallback.
        const extractGuardFromShift = (sh: any) => {
          if (!sh) return null;
          const candidates = [
            sh.guard,
            sh.securityGuard,
            sh.security_guard,
            sh.guardObject,
            sh.user,
            sh.assignedGuard,
            sh.guardInfo,
          ];
          for (const c of candidates) {
            if (c && typeof c === 'object') return c;
          }

          const idFields = ['guardId', 'securityGuardId', 'security_guard_id', 'guard_id', 'securityGuard_id'];
          for (const f of idFields) {
            if (sh[f]) return { id: sh[f] };
          }

          for (const k of Object.keys(sh || {})) {
            if (/guard/i.test(k)) {
              const v = (sh as any)[k];
              if (!v) continue;
              if (typeof v === 'object') return v;
              if (typeof v === 'string' || typeof v === 'number') return { id: v };
            }
          }

          return null;
        };

        // If a station is selected: prefer station-scoped assigned-guards endpoint, then fall back to shifts, then tenant security-guard filter.
        // Note: perform station-scoped lookups even when `postSiteId` is not available.
        if (stationId) {
          try {
            const ts = Date.now();
            // First try the station-assigned guards endpoint which performs the correct join on server-side
            try {
              const resp: any = await ApiService.get(`/tenant/${tenantId}/stations/${encodeURIComponent(stationId)}/guards?limit=999&_=${ts}`, { headers: { 'Cache-Control': 'no-cache' } } as any);
              const items = Array.isArray(resp) ? resp : (resp && (resp.rows || resp.data)) ? (resp.rows || resp.data) : [];
              console.debug('[SiteTours] station-assigned guards response', { stationId, count: (items || []).length, raw: resp });
              // Items may be: assigned-guard rows with nested guard, OR raw shift rows. Try to extract guard objects in either case.
              const extracted = (items || []).flatMap((r: any) => {
                // If r itself looks like a guard object (has firstName/fullName/displayName/email/id), keep it and attach stationId if missing.
                if (r && (r.fullName || r.firstName || r.lastName || r.displayName || r.email || r.id || r._id)) {
                  const guardObj = { ...(r || {}) };
                  guardObj.stationId = guardObj.stationId || guardObj.station_id || r.stationId || r.station_id || stationId;
                  return [guardObj];
                }
                // If nested guard object present, attach stationId from outer row
                const nested = r && (r.guard || r.guardObject || r.securityGuard || r.user);
                if (nested && typeof nested === 'object') {
                  const guardObj = { ...(nested || {}) };
                  guardObj.stationId = guardObj.stationId || guardObj.station_id || r.stationId || r.station_id || stationId;
                  return [guardObj];
                }

                // Otherwise try to extract from shift-like row
                const g = extractGuardFromShift(r);
                if (g) {
                  const guardObj = (typeof g === 'object') ? { ...g } : { id: g };
                  guardObj.stationId = guardObj.stationId || guardObj.station_id || r.stationId || r.station_id || stationId;
                  return [guardObj];
                }
                return [];
              });

              // Deduplicate by id/email/username
              const dedupedMap = (extracted || []).reduce((acc: Record<string, any>, g: any) => {
                const key = (g && (g.id || g._id || g.email || g.username)) ? String(g.id || g._id || g.email || g.username) : JSON.stringify(g || {});
                if (!acc[key]) {
                  // normalize station list
                  const copy = { ...(g || {}) };
                  const sid = copy.stationId || copy.station_id || null;
                  if (sid) copy.stations = Array.isArray(copy.stations) ? Array.from(new Set([...(copy.stations || []), String(sid)])) : [String(sid)];
                  acc[key] = copy;
                } else {
                  // merge station ids from duplicate rows
                  const existing = acc[key];
                  const sid = (g && (g.stationId || g.station_id)) ? String(g.stationId || g.station_id) : null;
                  if (sid) {
                    existing.stations = Array.isArray(existing.stations) ? existing.stations : (existing.stationId ? [String(existing.stationId)] : []);
                    if (!existing.stations.includes(sid)) existing.stations.push(sid);
                    acc[key] = existing;
                  }
                }
                return acc;
              }, {} as Record<string, any>);
              const deduped = Object.values(dedupedMap);
              if (deduped.length) {
                guardsList = deduped;
                guardsFromShiftsFlag = false;
              }
            } catch (err) {
              // ignore and try shifts below
            }

            // If station endpoint returned nothing, fall back to inspecting shifts for guard objects
            if (!guardsFromShiftsFlag) {
              // Request shifts filtered by station; include postSiteId only when present.
              const shiftsQs = `stationId=${encodeURIComponent(stationId)}${postSiteId ? `&postSiteId=${encodeURIComponent(postSiteId)}` : ''}&_=${ts}`;
              const shiftsResp: any = await ApiService.get(`/tenant/${tenantId}/shift?${shiftsQs}`, { headers: { 'Cache-Control': 'no-cache' } } as any);
              const shiftRows = Array.isArray(shiftsResp) ? shiftsResp : (shiftsResp && (shiftsResp.rows || shiftsResp.data)) ? (shiftsResp.rows || shiftsResp.data) : [];
              console.debug('[SiteTours] shifts response for station', { stationId, postSiteId, count: (shiftRows || []).length });
              if (shiftRows && shiftRows.length) {
                const guardsFromShifts: any[] = [];

                const extractGuardFromShift = (sh: any) => {
                  if (!sh) return null;
                  // Common direct object fields
                  const candidates = [
                    sh.guard,
                    sh.securityGuard,
                    sh.security_guard,
                    sh.guardObject,
                    sh.user,
                    sh.assignedGuard,
                    sh.guardInfo,
                  ];
                  for (const c of candidates) {
                    if (c && typeof c === 'object') return c;
                  }

                  // Common id fields
                  const idFields = ['guardId', 'securityGuardId', 'security_guard_id', 'guard_id', 'securityGuard_id'];
                  for (const f of idFields) {
                    if (sh[f]) return { id: sh[f] };
                  }

                  // Fall back: inspect any property containing "guard" (object or primitive)
                  for (const k of Object.keys(sh)) {
                    if (/guard/i.test(k)) {
                      const v = sh[k];
                      if (!v) continue;
                      if (typeof v === 'object') return v;
                      if (typeof v === 'string' || typeof v === 'number') return { id: v };
                    }
                  }

                  return null;
                };

                shiftRows.forEach((sh: any) => {
                  const g = extractGuardFromShift(sh);
                  if (g) {
                    // normalize to object with id and optional name and attach stationId from the shift row
                    const guardObj = (typeof g === 'object') ? { ...g } : { id: g };
                    guardObj.stationId = guardObj.stationId || guardObj.station_id || sh.stationId || sh.station_id || stationId;
                    guardsFromShifts.push(guardObj);
                  }
                });
                // dedupe
                const seen = new Map<string, any>();
                guardsFromShifts.forEach((g: any) => {
                  const key = (g && (g.id || g.email || g.username || g._id)) ? String(g.id || g._id || g.email || g.username) : JSON.stringify(g);
                  if (!seen.has(key)) {
                    // ensure station list
                    const copy = { ...(g || {}) };
                    const sid = copy.stationId || copy.station_id || null;
                    if (sid) copy.stations = [String(sid)];
                    seen.set(key, copy);
                  } else {
                    // merge station id into existing
                    const existing = seen.get(key);
                    const sid = (g && (g.stationId || g.station_id)) ? String(g.stationId || g.station_id) : null;
                    if (sid) {
                      existing.stations = Array.isArray(existing.stations) ? existing.stations : (existing.stationId ? [String(existing.stationId)] : []);
                      if (!existing.stations.includes(sid)) existing.stations.push(sid);
                      seen.set(key, existing);
                    }
                  }
                });
                if (seen.size) guardsList = Array.from(seen.values());
                guardsFromShiftsFlag = guardsList.length > 0;
              }
            }
          } catch (e) {
            // ignore and fallback below
          }

          // If shifts didn't return guards, try tenant-level security-guard filtered by station
          if (guardsList.length === 0) {
            try {
              const ts = Date.now();
              const resp: any = await ApiService.get(`/tenant/${tenantId}/security-guard?filter[station]=${encodeURIComponent(stationId)}&_=${ts}`, { headers: { 'Cache-Control': 'no-cache' } } as any);
              const rows = Array.isArray(resp) ? resp : (resp && resp.rows) ? resp.rows : [];
              console.debug('[SiteTours] tenant security-guard response filtered by station', { stationId, count: (rows || []).length });
              guardsList = rows || [];
            } catch (e) {
              // ignore
            }
          }
          // Do NOT merge postSite-level guards when a station is selected: we must show only guards linked to the station
          // If no guards were found from shifts/security-guard by station, we intentionally leave guardsList empty so UX shows "No guards found"
        } else {
          // No station selected: list all guards for the postSite (or tenant) using security-guard endpoint
          try {
            const ts = Date.now();
            const qs = postSiteId ? `?postSiteId=${encodeURIComponent(postSiteId)}&_=${ts}` : `?_=${ts}`;
            const resp: any = await ApiService.get(`/tenant/${tenantId}/security-guard${qs}`, { headers: { 'Cache-Control': 'no-cache' } } as any);
            const rows = Array.isArray(resp) ? resp : (resp && resp.rows) ? resp.rows : [];
            guardsList = rows || [];
          } catch (e) {
            // ignore
          }
        }

        // Record whether guards were obtained from shift rows. If they were, trust that list directly.
        setGuardsFromShifts(Boolean(guardsFromShiftsFlag));

        // If guards were NOT obtained from shifts and a station is selected, filter tenant-level guard results defensively.
        if (!guardsFromShiftsFlag && stationId) {
          guardsList = (guardsList || []).filter((g: any) => guardMatchesStation(g, stationId));
        }

        setLocalGuards(guardsList || []);
      } catch (err) {
        console.error('Failed to load guards for station/postsite', err);
        setGuardLoadError(t('siteTour.form.errorLoadingGuards', 'Error loading guards'));
        setLocalGuards([]);
      } finally {
        setLoadingGuards(false);
      }
    };
    loadGuards();
  }, [stationId, showNewTourModal, site, t, stations]);

  // When detail modal opens, load assignments for the tour
  useEffect(() => {
    if (!showDetailModal || !detailTour) return;
    (async () => {
      try {
        const rows = await loadAssignments(String(detailTour.id || detailTour._id || detailTour));
        setDetailAssignments(rows || []);
      } catch (e) {
        console.error('Failed loading detail assignments', e);
        setDetailAssignments([]);
      }
    })();
  }, [showDetailModal, detailTour]);

  // When editing a tour, prefill assignment fields from existing active assignment (if any)
  useEffect(() => {
    if (!showNewTourModal || !editingTourId) return;
    (async () => {
      try {
        const rows = await loadAssignments(String(editingTourId));
        if (rows && rows.length) {
          // prefer active assignment, otherwise most recent
          const active = rows.find((r: any) => r.status === 'assigned') || rows[0];
          if (active) {
            setAssignGuard(active.securityGuardId || active.guardId || '');
            setStationId(active.stationId || '');
            if (active.startAt) {
              try {
                const dt = new Date(active.startAt);
                const hh = String(dt.getHours()).padStart(2, '0');
                const mm = String(dt.getMinutes()).padStart(2, '0');
                setSelectTime(`${hh}:${mm}`);
              } catch (e) {
                // ignore
              }
            }
            if (active.endAt && active.maxDuration) {
              setMaxDuration(active.maxDuration || '');
            }
          }
        }
      } catch (e) {
        console.error('Failed to prefill assignment for edit', e);
      }
    })();
  }, [showNewTourModal, editingTourId]);

  // Load tenant site tours (tenant-scoped)
  const fetchTours = async () => {
    const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
    if (!tenantId) return;
    setLoadingTours(true);
    setToursError(null);
    try {
      const postSiteId = site?.id || '';
      const qs = postSiteId ? `?postSiteId=${encodeURIComponent(postSiteId)}` : '';
      const resp: any = await ApiService.get(`/tenant/${tenantId}/site-tour${qs}`);
      const rows = resp && resp.rows ? resp.rows : (Array.isArray(resp) ? resp : []);
      setTours(rows || []);
    } catch (err: any) {
      console.error('Failed to load site tours', err);
      setToursError(t('siteTour.form.errorLoadingTours', 'Error loading site tours'));
    } finally {
      setLoadingTours(false);
    }
  };

  useEffect(() => { fetchTours(); }, [site]);

  // Derived filtered list based on search query (filter by tour name)
  const q = (query || '').trim().toLowerCase();
  const filteredTours = q ? (tours || []).filter((t: any) => {
    const name = (t?.name || t?.title || '') + '';
    return name.toLowerCase().includes(q);
  }) : tours || [];



  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-white border rounded-lg p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-4 mb-4 sticky top-0 bg-white z-10">
            <div className="relative">
            <button onClick={() => setActionOpen(v => !v)} className="px-3 py-2 border rounded-full bg-white text-sm inline-flex items-center gap-2">
              {t('siteTour.menu.action', 'Action')}
              <ChevronDown size={14} />
            </button>
            {actionOpen && (
              <div className="absolute mt-2 bg-white border rounded-md shadow-lg z-10 w-48">
                <button
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                  onClick={() => {
                    setActionOpen(false);
                    if (!selectedTourIds || selectedTourIds.length === 0) {
                      toast.error(t('siteTour.actions.noSelection', 'No items selected'));
                      return;
                    }
                    setShowConfirmArchive(true);
                  }}
                >
                  {t('siteTour.menu.archive', 'Archivar')}
                </button>

                <button
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                  onClick={() => {
                    setActionOpen(false);
                    if (!selectedTourIds || selectedTourIds.length === 0) {
                      toast.error(t('siteTour.actions.noSelection', 'No items selected'));
                      return;
                    }
                    setShowConfirmDelete(true);
                  }}
                >
                  {t('siteTour.menu.delete', 'Eliminar')}
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 flex justify-center">
            <div className="relative w-full max-w-xl">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                <Search size={16} />
              </span>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('siteTour.searchPlaceholder')} className="w-full h-10 rounded-full border pl-10 pr-4" />
            </div>
          </div>

          <div className="flex-shrink-0">
            <button onClick={() => { setEditingTourId(null); setTourName(''); setTourDesc(''); setScheduledDays(''); setContinuous(false); setTimeMode('specific'); setSelectTime(''); setMaxDuration(''); setAssignGuard(''); setStationId(''); setShowNewTourModal(true); }} className="inline-flex items-center gap-3 bg-orange-600 text-white px-4 py-2 rounded-full hover:bg-orange-700">
              <span className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center">
                <Plus size={14} />
              </span>
              <span className="text-sm font-medium">{t('siteTour.newTour')}</span>
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="md:block hidden overflow-auto flex-1">
            <table className="w-full text-sm md:text-base">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 align-middle">
                    <div className="flex items-center h-full">
                      <input
                        type="checkbox"
                        className="align-middle"
                        aria-label={t('siteTour.list.selectAllAria', 'Select all')}
                        checked={Boolean(filteredTours && filteredTours.length > 0 && selectedTourIds.length === filteredTours.length)}
                        onChange={(e) => {
                            if (e.target.checked) {
                              const ids = (filteredTours || []).map((t: any) => String(t.id || t._id || '')).filter(Boolean);
                              setSelectedTourIds(ids);
                          } else {
                            setSelectedTourIds([]);
                          }
                        }}
                      />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left">{t('siteTour.table.name')}</th>
                  <th className="px-6 py-4 text-left">{t('siteTour.table.station', 'Station')}</th>
                  <th className="px-6 py-4 text-left">{t('siteTour.table.duration')}</th>
                  <th className="px-6 py-4 text-left">{t('siteTour.table.type')}</th>
                  <th className="px-6 py-4 text-left">&nbsp;</th>
                </tr>
              </thead>
              <tbody>
                {loadingTours ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center text-sm text-gray-500">{t('siteTour.loading', 'Loading...')}</td>
                  </tr>
                ) : filteredTours.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-16">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <div className="w-40 h-40">
                          <svg viewBox="0 0 200 200" className="w-full h-full text-orange-100">
                            <rect x="40" y="48" width="120" height="84" fill="currentColor" rx="10" />
                            <path d="M60 78 L140 78" stroke="white" strokeWidth="3" strokeLinecap="round" />
                            <circle cx="90" cy="100" r="6" fill="white" />
                            <circle cx="110" cy="100" r="6" fill="white" />
                          </svg>
                        </div>
                        <div className="text-center">
                          <h3 className="text-lg font-semibold text-gray-700">{t('siteTour.empty.title')}</h3>
                          <p className="text-sm text-gray-500 mt-1">{t('siteTour.empty.message')}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTours.map((tour: any, _idx: number) => {
                    const tid = String(tour.id || tour._id || _idx);
                    const checked = selectedTourIds.includes(tid);
                    return (
                      <tr key={tid} className="border-b">
                        <td className="px-6 py-4 align-middle">
                          <div className="flex items-center h-full">
                            <input
                              type="checkbox"
                              className="align-middle"
                              aria-label={t('siteTour.list.selectAria', 'Select')}
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTourIds(s => Array.from(new Set([...s, tid])));
                                } else {
                                  setSelectedTourIds(s => s.filter(id => id !== tid));
                                }
                              }}
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-left">{tour.name || '-'}</td>
                        <td className="px-6 py-4 text-left">{stationsMap[String(tour.stationId || tour.station_id || tour.station)] || tour.stationName || tour.station_id || tour.stationId || '-'}</td>
                        <td className="px-6 py-4 text-left">{tour.maxDuration || '-'}</td>
                        <td className="px-6 py-4 text-left">{translateTimeMode(tour.timeMode)}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="relative inline-block">
                            <button onClick={() => setRowActionOpenId(rowActionOpenId === tid ? null : tid)} className="p-2 rounded-full hover:bg-gray-100">
                              <EllipsisVertical size={16} />
                            </button>
                            {rowActionOpenId === tid && (
                              <div className="absolute right-0 mt-2 bg-white border rounded-md shadow-lg z-20 w-40">
                                <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50" onClick={async () => {
                                  setRowActionOpenId(null);
                                  // view details
                                  try {
                                    const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
                                    if (!tenantId) { toast.error(t('siteTour.actions.missingTenant')); return; }
                                    const resp: any = await ApiService.get(`/tenant/${tenantId}/site-tour/${encodeURIComponent(tid)}`);
                                    setDetailTour(resp);
                                    setShowDetailModal(true);

                                    // fetch related shifts for this tour (match by siteTours/json or fallback fields)
                                    try {
                                      setLoadingDetailShifts(true);
                                      const postSiteId = site?.id || '';
                                      const shiftsResp: any = await ApiService.get(`/tenant/${tenantId}/shift?postSiteId=${encodeURIComponent(postSiteId)}&limit=999`, { headers: { 'Cache-Control': 'no-cache' } } as any);
                                      const shiftRows = Array.isArray(shiftsResp) ? shiftsResp : (shiftsResp && (shiftsResp.rows || shiftsResp.data)) ? (shiftsResp.rows || shiftsResp.data) : [];
                                      const matched = (shiftRows || []).filter((sh: any) => {
                                        const siteToursField = sh.siteTours || sh.site_tours || sh.siteTour || sh.site_tour || [];
                                        if (Array.isArray(siteToursField) && siteToursField.length) {
                                          if (siteToursField.some((x: any) => String(x) === String(tid) || (x && (x.id || x.siteTourId) && String(x.id || x.siteTourId) === String(tid)))) return true;
                                        }
                                        // fallback common fields
                                        if (String(sh.siteTourId || sh.siteTour || sh.tourId || '') === String(tid)) return true;
                                        return false;
                                      });
                                      setDetailShifts(matched || []);
                                    } catch (e) {
                                      console.error('Failed loading detail shifts', e);
                                      setDetailShifts([]);
                                    } finally {
                                      setLoadingDetailShifts(false);
                                    }
                                  } catch (e) {
                                    toast.error(t('siteTour.actions.deleteError', 'Error loading details'));
                                  }
                                }}>
                                  <div className="flex items-center gap-2"><Eye size={14} /> <span>{t('siteTour.actions.view', 'Ver detalles')}</span></div>
                                </button>

                                <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50" onClick={() => {
                                  setRowActionOpenId(null);
                                  // open edit modal prefilled
                                  setEditingTourId(tid);
                                  setShowNewTourModal(true);
                                  // populate fields from tour
                                  setTourName(tour.name || '');
                                  setTourDesc(tour.description || '');
                                  setScheduledDays(tour.scheduledDays || '');
                                  setContinuous(Boolean(tour.continuous));
                                  setTimeMode(tour.timeMode || 'specific');
                                  setSelectTime(tour.selectTime || '');
                                  setMaxDuration(tour.maxDuration || '');
                                  setStationId(tour.stationId || tour.station_id || '');
                                  setAssignGuard(tour.securityGuardId || tour.security_guard_id || tour.guardId || '');
                                }}>
                                  <div className="flex items-center gap-2"><Edit size={14} /> <span>{t('siteTour.actions.edit', 'Editar')}</span></div>
                                </button>

                                <button className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50" onClick={() => {
                                  setRowActionOpenId(null);
                                  setSelectedTourIds([tid]);
                                  setShowConfirmDelete(true);
                                }}>
                                  <div className="flex items-center gap-2"><Trash size={14} /> <span>{t('siteTour.actions.delete', 'Eliminar')}</span></div>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Confirm archive modal */}
          {showConfirmArchive && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/40" onClick={() => setShowConfirmArchive(false)} />
              <div className="bg-white rounded-lg shadow-lg z-50 max-w-lg w-full p-6">
                <h3 className="text-lg font-semibold mb-4">{t('siteTour.actions.confirmArchiveTitle', 'Confirm archive')}</h3>
                <p className="text-sm text-gray-600 mb-4">{t('siteTour.actions.confirmArchiveMessage', 'Are you sure you want to archive the selected tours? This action can be undone by editing the tour.')}</p>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowConfirmArchive(false)} className="px-4 py-2 rounded-full bg-gray-100 text-gray-700">{t('siteTour.buttons.cancel', 'Cancel')}</button>
                  <button
                    onClick={async () => {
                      try {
                        const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
                        if (!tenantId) {
                          toast.error(t('siteTour.actions.missingTenant', 'Missing tenant'));
                          return;
                        }
                        // patch each tour to set active=false
                        await Promise.all((selectedTourIds || []).map(id => ApiService.patch(`/tenant/${tenantId}/site-tour/${encodeURIComponent(id)}`, { active: false })));
                        toast.success(t('siteTour.actions.archived', 'Selected tours archived'));
                        setShowConfirmArchive(false);
                        setSelectedTourIds([]);
                        try { await fetchTours(); } catch (e) { /* ignore */ }
                      } catch (err: any) {
                        console.error('Archive selected failed', err);
                        const msg = err?.response?.data?.message || err?.message || t('siteTour.actions.archiveError', 'Error archiving selected tours');
                        toast.error(msg);
                      }
                    }}
                    className="px-4 py-2 rounded-full bg-orange-600 text-white hover:bg-orange-700"
                  >
                    {t('siteTour.actions.archive', 'Archive')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Confirm delete modal */}
          {showConfirmDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/40" onClick={() => setShowConfirmDelete(false)} />
              <div className="bg-white rounded-lg shadow-lg z-50 max-w-lg w-full p-6">
                <h3 className="text-lg font-semibold mb-4">{t('siteTour.actions.confirmDeleteTitle', 'Confirm delete')}</h3>
                <p className="text-sm text-gray-600 mb-4">{t('siteTour.actions.confirmDeleteMessage', 'Are you sure you want to permanently delete the selected tours? This action cannot be undone and will remove all associated data.')}</p>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowConfirmDelete(false)} className="px-4 py-2 rounded-full bg-gray-100 text-gray-700">{t('siteTour.buttons.cancel', 'Cancel')}</button>
                  <button
                    onClick={async () => {
                      try {
                        const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
                        if (!tenantId) {
                          toast.error(t('siteTour.actions.missingTenant', 'Missing tenant'));
                          return;
                        }
                        // perform delete for each selected tour
                        await Promise.all((selectedTourIds || []).map(id => ApiService.delete(`/tenant/${tenantId}/site-tour/${encodeURIComponent(id)}`)));
                        toast.success(t('siteTour.actions.deleted', 'Selected tours deleted'));
                        setShowConfirmDelete(false);
                        setSelectedTourIds([]);
                        try { await fetchTours(); } catch (e) { /* ignore */ }
                      } catch (err: any) {
                        console.error('Delete selected failed', err);
                        const msg = err?.response?.data?.message || err?.message || t('siteTour.actions.deleteError', 'Error deleting selected tours');
                        toast.error(msg);
                      }
                    }}
                    className="px-4 py-2 rounded-full bg-red-600 text-white hover:bg-red-700"
                  >
                    {t('siteTour.actions.delete', 'Delete')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Detail modal */}
          {showDetailModal && detailTour && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/40" onClick={() => setShowDetailModal(false)} />
              <div className="bg-white rounded-lg shadow-lg z-50 max-w-2xl w-full p-8">
                <h3 className="text-2xl font-semibold mb-3">{detailTour.name || t('siteTour.placeholders.tourNameFallback')}</h3>
                <p className="text-base text-gray-700 mb-6">{detailTour.description || '-'}</p>

                <div className="grid grid-cols-2 gap-4">
                  <div><strong>{t('siteTour.table.duration')}</strong><div className="mt-1">{detailTour.maxDuration || '-'}</div></div>
                  <div><strong>{t('siteTour.table.type')}</strong><div className="mt-1">{translateTimeMode(detailTour.timeMode)}</div></div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded">
                  <div>
                    <div className="text-xs text-gray-500">{t('siteTour.table.scheduledDays', 'Scheduled Days')}</div>
                    <div className="mt-1 text-sm">{detailTour.scheduledDays || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">{t('siteTour.table.continuous', 'Continuous')}</div>
                    <div className="mt-1 text-sm">{detailTour.continuous ? t('siteTour.yes', 'Yes') : t('siteTour.no', 'No')}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">{t('siteTour.form.selectTime', 'Select Time')}</div>
                    <div className="mt-1 text-sm">{detailTour.selectTime || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">{t('siteTour.table.active', 'Active')}</div>
                    <div className="mt-1 text-sm">{detailTour.active ? t('siteTour.yes', 'Yes') : t('siteTour.no', 'No')}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">{t('siteTour.table.importHash', 'Import Hash')}</div>
                    <div className="mt-1 text-sm">{detailTour.importHash || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">{t('siteTour.table.securityGuard', 'Assigned Guard ID')}</div>
                    <div className="mt-1 text-sm">{detailTour.securityGuardId || detailTour.security_guard_id || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">{t('siteTour.table.postSiteId', 'Post Site')}</div>
                    <div className="mt-1 text-sm">{detailTour.postSiteId || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">{t('siteTour.table.station', 'Station')}</div>
                    <div className="mt-1 text-sm">{stationsMap[String(detailTour.stationId || detailTour.station_id || detailTour.station)] || detailTour.stationName || detailTour.station_id || detailTour.stationId || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">{t('siteTour.table.tenantId', 'Tenant')}</div>
                    <div className="mt-1 text-sm">{detailTour.tenantId || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">{t('siteTour.table.createdBy', 'Created By')}</div>
                    <div className="mt-1 text-sm">{detailTour.createdById || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">{t('siteTour.table.updatedBy', 'Updated By')}</div>
                    <div className="mt-1 text-sm">{detailTour.updatedById || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">{t('siteTour.table.createdAt', 'Created At')}</div>
                    <div className="mt-1 text-sm">{detailTour.createdAt ? new Date(detailTour.createdAt).toLocaleString() : '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">{t('siteTour.table.updatedAt', 'Updated At')}</div>
                    <div className="mt-1 text-sm">{detailTour.updatedAt ? new Date(detailTour.updatedAt).toLocaleString() : '-'}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-gray-500">{t('siteTour.table.deletedAt', 'Deleted At')}</div>
                    <div className="mt-1 text-sm">{detailTour.deletedAt ? new Date(detailTour.deletedAt).toLocaleString() : '-'}</div>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-lg font-medium mb-2">{t('siteTour.details.shiftsTitle', 'Related shifts')}</h4>
                  {loadingDetailShifts ? (
                    <div className="text-sm text-gray-500">{t('siteTour.loading', 'Loading...')}</div>
                  ) : detailShifts && detailShifts.length ? (
                    <div className="space-y-3">
                      {detailShifts.map((sh: any) => {
                        const guardName = sh.guard && (sh.guard.fullName || `${sh.guard.firstName || ''} ${sh.guard.lastName || ''}`.trim()) || sh.guardName || sh.guard_name || sh.user && (sh.user.fullName || `${sh.user.firstName || ''} ${sh.user.lastName || ''}`.trim()) || '-';
                        const start = sh.startTime || sh.start || sh.shiftStart || sh.startAt || sh.start_time || null;
                        const end = sh.endTime || sh.end || sh.shiftEnd || sh.endAt || sh.end_time || null;
                        const station = (sh.station && (sh.station.stationName || sh.station.name)) || sh.stationName || sh.station_name || '-';
                        return (
                          <div key={sh.id || sh._id || (sh.startTime + Math.random())} className="p-3 border rounded-md">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{guardName}</div>
                              <div className="text-sm text-gray-500">{station}</div>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              <div>{start ? new Date(start).toLocaleString() : '-' } — {end ? new Date(end).toLocaleString() : '-'}</div>
                              {sh.schedule && <div className="text-xs text-gray-400 mt-1">{JSON.stringify(sh.schedule)}</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">{t('siteTour.details.noShifts', 'No related shifts found')}</div>
                  )}
                </div>

                <div className="mt-6">
                  <h4 className="text-lg font-medium mb-2">{t('siteTour.details.assignmentsTitle', 'Assignments')}</h4>
                  {loadingDetailAssignments ? (
                    <div className="text-sm text-gray-500">{t('siteTour.loading', 'Loading...')}</div>
                  ) : detailAssignments && detailAssignments.length ? (
                    <div className="space-y-3">
                      {detailAssignments.map((a: any) => {
                        const guardName = a.guard && (a.guard.fullName || `${a.guard.firstName || ''} ${a.guard.lastName || ''}`.trim()) || a.guardName || a.guard_name || a.securityGuardName || a.security_guard_name || a.securityGuardId || '-';
                        const start = a.startAt ? (new Date(a.startAt)).toLocaleString() : '-';
                        const end = a.endAt ? (new Date(a.endAt)).toLocaleString() : '-';
                        const station = a.station && (a.station.stationName || a.station.name) || a.stationName || a.station_name || a.stationId || '-';
                        return (
                          <div key={a.id || a._id || `${a.startAt}-${Math.random()}`} className="p-3 border rounded-md">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{guardName}</div>
                              <div className="text-sm text-gray-600">{a.status || '-'}</div>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">{station} • {start} — {end}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">{t('siteTour.details.noAssignments', 'No assignments found')}</div>
                  )}
                </div>

                <div className="mt-4 flex justify-end">
                  <button onClick={() => setShowDetailModal(false)} className="px-4 py-2 rounded-full bg-gray-100 text-gray-700">{t('siteTour.buttons.cancel')}</button>
                </div>
              </div>
            </div>
          )}

          <div className="md:hidden">
            <MobileCardList
              items={filteredTours}
              renderCard={(tour: any) => (
                <div className="p-4 bg-white border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">{tour.name || t('siteTour.placeholders.tourNameFallback')}</div>
                      <div className="text-xs text-gray-500">{translateTimeMode(tour.timeMode)}</div>
                    </div>
                    <div className="text-sm text-gray-600">{tour.maxDuration || '-'}</div>
                  </div>
                </div>
              )}
            />
          </div>
        </div>
      </div>

      {showNewTourModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-end p-4 sm:p-0">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowNewTourModal(false)} />

          <aside className="relative w-full sm:ml-auto sm:max-w-md lg:max-w-xl bg-white shadow-xl overflow-hidden rounded-lg flex flex-col h-screen">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{t('siteTour.modal.title')}</h3>
              <button onClick={() => { setShowNewTourModal(false); setEditingTourId(null); }} className="p-2 text-gray-500 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[90vh] space-y-4">
              <div>
                <input value={tourName} onChange={e => setTourName(e.target.value)} placeholder={t('siteTour.form.tourName')} className="w-full border rounded-lg h-12 px-3" />
                {submitAttempted && !tourName.trim() && (
                  <div className="text-sm text-red-600 mt-1">{t('siteTour.form.validation.tourNameRequired', 'Tour name is required')}</div>
                )}
              </div>

              <div>
                <textarea value={tourDesc} onChange={e => setTourDesc(e.target.value)} placeholder={t('siteTour.form.tourDescription')} className="w-full border rounded-lg px-3 py-3 min-h-[120px]" />
              </div>

              <div>
                <select value={scheduledDays} onChange={e => setScheduledDays(e.target.value)} className="w-full border rounded-lg h-12 px-3">
                  <option value="">{t('siteTour.form.scheduledDays')}</option>
                  <option value="mon">{t('siteTour.options.monFri')}</option>
                  <option value="sat">{t('siteTour.options.weekend')}</option>
                </select>
                {submitAttempted && !scheduledDays && (
                  <div className="text-sm text-red-600 mt-1">{t('siteTour.form.validation.scheduledDaysRequired', 'Scheduled days is required')}</div>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">{t('siteTour.form.continuous')}</label>
                  <input type="checkbox" checked={continuous} onChange={e => setContinuous(e.target.checked)} className="h-5 w-8" />
                </div>

                <div className="flex-1">
                  <select
                    value={timeMode}
                    onChange={e => {
                      const v = e.target.value;
                      setTimeMode(v);
                      if (v !== 'specific') setSelectTime('');
                    }}
                    className="w-full border rounded-lg h-12 px-3"
                  >
                    <option value="specific">{t('siteTour.form.timeMode.specific')}</option>
                    <option value="any">{t('siteTour.form.timeMode.any')}</option>
                  </select>
                </div>
              </div>

              {timeMode === 'specific' && (
                <div
                  className="relative"
                  onClick={() => {
                    if (timeInputRef.current) {
                      try {
                        // Prefer showPicker if available (Chrome/Edge)
                        if (typeof (timeInputRef.current as any).showPicker === 'function') {
                          (timeInputRef.current as any).showPicker();
                        } else {
                          timeInputRef.current.focus();
                        }
                      } catch (e) {
                        timeInputRef.current.focus();
                      }
                    }
                  }}
                >
                  <input
                    ref={timeInputRef}
                    type="time"
                    value={selectTime}
                    onChange={e => setSelectTime(e.target.value)}
                    className="w-full border rounded-lg h-12 px-3"
                    placeholder={t('siteTour.form.selectTime')}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (timeInputRef.current) {
                        if (typeof (timeInputRef.current as any).showPicker === 'function') {
                          (timeInputRef.current as any).showPicker();
                        } else {
                          timeInputRef.current.focus();
                        }
                      }
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500"
                    aria-label={t('siteTour.form.openTimePicker', 'Open time picker')}
                  >
                    <Clock size={18} />
                  </button>
                </div>
              )}

              <div>
                <select value={maxDuration} onChange={e => setMaxDuration(e.target.value)} className="w-full border rounded-lg h-12 px-3">
                  <option value="">{t('siteTour.form.maxDuration.placeholder')}</option>
                  <option value="15">{t('siteTour.form.maxDuration.15')}</option>
                  <option value="30">{t('siteTour.form.maxDuration.30')}</option>
                </select>
              </div>

              <div>
                <select value={stationId} onChange={e => setStationId(e.target.value)} className="w-full border rounded-lg h-12 px-3">
                  <option value="">{loadingStations ? 'Loading stations...' : t('siteTour.form.selectStation', 'Select station')}</option>
                  {stations.map((s: any) => (
                    <option key={s.id || s.stationId} value={s.id || s.stationId}>{s.stationName || s.name || s.station_name || s.stationId || s.id}</option>
                  ))}
                </select>
                {submitAttempted && !stationId && (
                  <div className="text-sm text-red-600 mt-1">{t('siteTour.form.validation.stationRequired', 'Station is required')}</div>
                )}
              </div>

              <div>
                <select
                  value={assignGuard}
                  onChange={e => setAssignGuard(e.target.value)}
                  className="w-full border rounded-lg h-12 px-3"
                  disabled={!stationId}
                >
                  <option value="">{t('siteTour.form.assignGuard')}</option>
                  {!stationId ? (
                    <option disabled value="">{t('siteTour.form.selectStationFirst', 'Select a station first')}</option>
                  ) : loadingGuards ? (
                    <option disabled value="">{t('siteTour.form.loadingGuards', 'Loading guards...')}</option>
                  ) : guardLoadError ? (
                    <option disabled value="">{guardLoadError}</option>
                  ) : (() => {
                    // When a station is selected, prefer shift-derived guard lists when available (they are canonical).
                    // Always restrict visible guards to those matching the selected station when a station is chosen.
                    // This prevents showing postSite-level guards when a specific station is expected.
                    const visibleGuards = stationId
                      ? (localGuards || []).filter((g: any) => guardMatchesStation(g, stationId))
                      : (localGuards || []);

                    if (!visibleGuards || visibleGuards.length === 0) {
                      return <option disabled value="">{stationId ? t('siteTour.form.noGuardsForStation', 'No guards found for this station') : t('siteTour.form.noGuardsFound', 'No guards found')}</option>;
                    }
                    return visibleGuards.map((g: any) => {
                      const display = g.fullName || (g.firstName || g.lastName ? `${g.firstName || ''} ${g.lastName || ''}`.trim() : (g.displayName || g.name || g.email || g.id || ''));
                      return (
                        <option key={g.id || display} value={g.id}>{display || String(g.id)}</option>
                      );
                    });
                  })()}
                </select>
                {submitAttempted && !assignGuard && (
                  <div className="text-sm text-red-600 mt-1">{t('siteTour.form.validation.assignGuardRequired', 'Assigning a guard is required')}</div>
                )}
              </div>

              {/*<div className="space-y-2">
                <label className="flex items-center gap-2"><input type="checkbox" checked={enableNotes} onChange={e => setEnableNotes(e.target.checked)} /> {t('siteTour.form.enableNotes')}</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={forceMedia} onChange={e => setForceMedia(e.target.checked)} /> {t('siteTour.form.forceMedia')}</label>
              </div>*/}
            </div>

            <div className="p-4 border-t">
              <div className="flex justify-between items-center">
                <div>
                  <button onClick={() => { /* save as draft */ setShowNewTourModal(false); setEditingTourId(null); }} className="px-4 py-2 rounded-full bg-gray-100 text-gray-700">{t('siteTour.buttons.saveDraft')}</button>
                </div>
                <div>
                  <button
                    disabled={!isFormValid}
                    aria-disabled={!isFormValid}
                    onClick={async () => {
                      // submit new site tour
                      setSubmitAttempted(true);
                      if (!isFormValid) {
                        toast.error(t('siteTour.form.validation.fillRequired', 'Please fill required fields'));
                        return;
                      }
                      try {
                        const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
                        if (!tenantId || !site?.id) {
                          toast.error(t('siteTour.form.noPostSiteId', 'No post site selected'));
                          return;
                        }

                        const payload: any = {
                          name: tourName,
                          description: tourDesc,
                          postSiteId: site?.id || null,
                          stationId: stationId || null,
                          scheduledDays,
                          continuous,
                          timeMode,
                          selectTime,
                          maxDuration,
                          // include selected guard id when provided so backend can create assignment
                          securityGuardId: assignGuard || null,
                          active: true,
                        };

                        let createdId: string | null = null;
                        if (editingTourId) {
                          await ApiService.patch(`/tenant/${tenantId}/site-tour/${encodeURIComponent(editingTourId)}`, payload);
                          toast.success(t('siteTour.notifications.updated', 'Site tour updated'));
                          createdId = editingTourId;
                        } else {
                          const resp: any = await ApiService.post(`/tenant/${tenantId}/site-tour`, payload);
                          const newId = resp && (resp.id || resp._id);
                          createdId = newId || null;
                          toast.success(t('siteTour.notifications.created', 'Site tour created'));
                        }

                        // Persist assignment details (station/postSite/start/end/status/importHash) if a guard was selected
                        try {
                          if (createdId && assignGuard) {
                            // compute startAt/endAt where possible
                            let startAt: string | null = null;
                            let endAt: string | null = null;
                            if (selectTime) {
                              try {
                                const d = new Date(selectTime as any);
                                if (!isNaN(d.getTime())) startAt = d.toISOString();
                                // if maxDuration provided (minutes), compute endAt
                                const dur = Number(maxDuration);
                                if (!isNaN(dur) && startAt) {
                                  endAt = new Date(d.getTime() + dur * 60000).toISOString();
                                }
                              } catch (e) {
                                // ignore parsing errors
                              }
                            }

                            const assignBody: any = {
                              securityGuardId: assignGuard,
                              stationId: stationId || null,
                              postSiteId: site?.id || null,
                              startAt: startAt,
                              endAt: endAt,
                              status: 'assigned',
                              importHash: `ui-${Date.now()}`,
                            };

                            await ApiService.post(`/tenant/${tenantId}/site-tour/${encodeURIComponent(createdId)}/assign`, assignBody);
                          }
                        } catch (e) {
                          console.error('Failed to persist assignment after save', e);
                        }
                        // refresh list
                        try { await fetchTours(); } catch (e) { /* ignore */ }
                        // reset and close
                        setTourName('');
                        setTourDesc('');
                        setScheduledDays('');
                        setContinuous(false);
                        setTimeMode('specific');
                        setSelectTime('');
                        setMaxDuration('');
                        setAssignGuard('');
                        setShowNewTourModal(false);
                        setEditingTourId(null);
                      } catch (err: any) {
                        console.error('Create site tour failed', err);
                        const msg = err?.response?.data?.message || err?.message || t('siteTour.form.errorCreating', 'Error creating site tour');
                        toast.error(msg);
                      }
                    }}
                    className={"ml-2 inline-flex items-center justify-center px-4 py-2 rounded-full shadow-lg " + (isFormValid ? "bg-orange-600 text-white hover:bg-orange-700" : "bg-gray-200 text-gray-500 cursor-not-allowed")}
                  >
                    <span className="text-sm font-semibold">{t('siteTour.buttons.submit')}</span>
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
