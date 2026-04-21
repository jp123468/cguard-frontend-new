import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ApiService } from '@/services/api/apiService';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { RowActionsMenu, type RowAction } from '@/components/table/RowActionsMenu';
import { useTranslation } from 'react-i18next';
import useScrollToTopOnMount from '@/hooks/useScrollToTopOnMount';

export default function Inventory({ site }: { site?: any }) {
  const { t } = useTranslation();
  
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [mergedInventories, setMergedInventories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');
  const [openCreate, setOpenCreate] = useState(false);
  const [stations, setStations] = useState<any[]>([]);
  const [postsiteNames, setPostsiteNames] = useState<Record<string, string>>({});
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [name, setName] = useState('');
  // Inventory detailed fields
  const [radio, setRadio] = useState(false);
  const [radioType, setRadioType] = useState('');
  const [radioSerialNumber, setRadioSerialNumber] = useState('');
  const [gun, setGun] = useState(false);
  const [gunType, setGunType] = useState('');
  const [gunSerialNumber, setGunSerialNumber] = useState('');
  const [armor, setArmor] = useState(false);
  const [armorType, setArmorType] = useState('');
  const [armorSerialNumber, setArmorSerialNumber] = useState('');
  const allowedGunTypes = [
    'revolver',
    'pistola de fuego',
    'pistola de fogeo',
    'mossberg',
    'otra arma.'
  ];
  const [tolete, setTolete] = useState(false);
  const [pito, setPito] = useState(false);
  const [linterna, setLinterna] = useState(false);
  const [vitacora, setVitacora] = useState(false);
  const [cintoCompleto, setCintoCompleto] = useState(false);
  const [ponchoDeAguas, setPonchoDeAguas] = useState(false);
  const [detectorDeMetales, setDetectorDeMetales] = useState(false);
  const [caseta, setCaseta] = useState(false);
  const [observations, setObservations] = useState('');
  const [transportation, setTransportation] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailInv, setDetailInv] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState<any>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendItems, setSendItems] = useState<any[]>([]);
  const [sendPatrolId, setSendPatrolId] = useState<string>('');

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    const visible = filtered;
    const ids = visible.map((i: any) => i.id || i.inventoryId || (i.data && i.data.id)).filter(Boolean);
    if (ids.length === 0) return;
    if (selectedIds.length === ids.length) setSelectedIds([]);
    else setSelectedIds(ids as string[]);
  };

  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    if (qs.get('openCreate') === '1' || qs.get('openCreate') === 'true') setOpenCreate(true);
    else setOpenCreate(false);
  }, [location.search]);

  const tenantIdFromSite = () => (site && (site.tenantId || (site.tenant && site.tenant.id))) || localStorage.getItem('tenantId') || '';

  const loadMerged = async () => {
    try {
      setLoading(true);
      const tenantId = tenantIdFromSite();
      const postSiteId = site?.id || params.id || '';
      if (!postSiteId) return setMergedInventories([]);
      const res = await ApiService.get(`/tenant/${tenantId}/post-site/${encodeURIComponent(postSiteId)}/merged-inventory`);
      const rows = Array.isArray(res) ? res : (res && (res.inventories || res.rows)) ? (res.inventories || res.rows) : [];
      setMergedInventories(rows || []);
    } catch (e) {
      console.error('Failed loading merged inventories', e);
      setMergedInventories([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStations = async () => {
    try {
      const tenantId = tenantIdFromSite();
      const postSiteId = site?.id || params.id || '';
      if (!postSiteId) return setStations([]);
      const res = await ApiService.get(`/tenant/${tenantId}/station?postSiteId=${encodeURIComponent(postSiteId)}&limit=999`);
      const rows = Array.isArray(res) ? res : (res && res.rows) ? res.rows : [];
      const mapped = (rows || []).map((r: any) => ({
        id: r.id || r.stationId,
        label: r.name || r.stationName || r.station_name || String(r.id),
        // preserve possible postSite linkage from station record
        postSiteId: r.postSiteId || r.postsiteId || r.post_site_id || (r.postSite && (r.postSite.id || r.postSite.postSiteId)) || null,
        original: r,
      }));
      setStations(mapped || []);
    } catch (e) {
      setStations([]);
    }
  };

  useEffect(() => { loadMerged(); loadStations(); }, [site]);

  // Fetch missing postSite names for inventories that reference them by originId
  // Also include postSite ids referenced by stations so we can show the postSite name for station inventories
  useEffect(() => {
    const idsSet = new Set<string>();
    (mergedInventories || []).forEach((inv: any) => {
      // inventories may reference a postSite via originId OR belongsToId (when belongsToStation is null)
      const originIdCandidate = (inv && inv.originType === 'postSite' && inv.originId) ? String(inv.originId) : null;
      const belongsToIdCandidate = (inv && (inv.belongsToId || inv.data?.belongsToId || inv.belongsTo?.id)) ? String(inv.belongsToId || inv.data?.belongsToId || inv.belongsTo?.id) : null;
      if (originIdCandidate) idsSet.add(originIdCandidate);
      if (belongsToIdCandidate) idsSet.add(belongsToIdCandidate);
    });
    // include postSite ids referenced by stations
    (stations || []).forEach((s: any) => {
      const pst = s && (s.postSiteId || s.postsiteId || s.post_site_id || (s.postSite && (s.postSite.id || s.postSite.postSiteId)));
      if (pst) idsSet.add(String(pst));
    });
    const ids: string[] = Array.from(idsSet);
    // Always attempt to fetch names for ids not yet cached. Do not exclude the current `site` id,
    // because `site` prop may lack a readable name and we still need the server value.
    const toFetch = ids.filter((id) => !!id && !postsiteNames[id]);
    // (no-op) proceed to fetch uncached postSite ids
    if (toFetch.length === 0) return;
    let mounted = true;
    const tenantId = tenantIdFromSite();
    // proceed
    Promise.all(
      toFetch.map((id) =>
        ApiService.get(`/tenant/${tenantId}/post-site/${encodeURIComponent(id)}`)
          .then((res) => ({ id, res }))
          .catch((err) => ({ id, res: null, err }))
      )
    ).then((results) => {
      if (!mounted) return;
      // process fetched results
      const updates: Record<string, string> = {};
      results.forEach((r: any) => {
        if (r.res) {
          const obj = r.res || {};
          // handle many possible shapes: direct, wrapped in { data }, nested in data.rows, or in .postSite
          let candidate: any = null;
          if (obj && typeof obj === 'object') {
            if (obj.name || obj.businessName || obj.postSiteName || obj.postSite?.name || obj.businessInfo?.name || obj.post_site_name || obj.postSiteName) candidate = obj;
            else if (obj.data && typeof obj.data === 'object') candidate = obj.data;
            else if (Array.isArray(obj.rows) && obj.rows[0]) candidate = obj.rows[0];
            else if (obj.postSite && typeof obj.postSite === 'object') candidate = obj.postSite;
            else candidate = obj;
          }
          const nameFromObj = candidate?.name || candidate?.companyName || candidate?.businessName || candidate?.postSiteName || candidate?.clientAccountName || candidate?.post_site_name || candidate?.businessInfo?.name || null;
          if (nameFromObj) updates[r.id] = nameFromObj;
        } else {
          // ignore failed fetch for this id
        }
      });
      if (Object.keys(updates).length > 0) setPostsiteNames((prev) => ({ ...prev, ...updates }));
    }).catch((e) => {
      try { console.error('Error fetching postSites', e); } catch {}
    });
    return () => { mounted = false; };
  }, [mergedInventories, site, stations]);

  const filtered = (mergedInventories || []).filter((inv: any) => {
    if (!query) return true;
    const q = String(query).toLowerCase();
    const data = inv.data || inv || {};
    const name = String(data.name || inv.name || '').toLowerCase();

    // Resolve a station/postSite label for searching
    let stationLabel = '';
    const stationIdCandidate = (data && data.belongsToStation) || inv.belongsToId || inv.belongsTo?.id || null;
    if (stationIdCandidate) {
      const found = (stations || []).find((s: any) => String(s.id) === String(stationIdCandidate));
      if (found) stationLabel = String(found.label || postsiteNames[String(found.postSiteId)] || '');
    }
    if (!stationLabel) {
      stationLabel = String((inv.belongsTo && (inv.belongsTo.name || inv.belongsTo.stationName)) || postsiteNames[String(inv.originId || inv.belongsToId || '')] || '');
    }
    stationLabel = stationLabel.toLowerCase();

    return name.includes(q) || stationLabel.includes(q);
  });

  useScrollToTopOnMount(containerRef);

  const openCreateWindow = () => {
    const qs = new URLSearchParams(location.search);
    qs.set('openCreate', '1');
    navigate({ search: qs.toString() });
    setEditingId(null);
  };

  const closeCreateWindow = () => {
    const qs = new URLSearchParams(location.search);
    qs.delete('openCreate');
    navigate({ search: qs.toString() }, { replace: true });
    setOpenCreate(false);
    setEditingId(null);
  };

  const submitCreate = async () => {
    try {
      // Client-side validation: require name
      if (!String(name || '').trim()) {
        toast.error(t('postSites.inventories.nameRequired', 'El nombre es obligatorio'));
        return;
      }
      // If radio/gun/armor are checked, require their type fields
      if (radio && !String(radioType || '').trim()) {
        toast.error(t('postSites.inventories.radioTypeRequired', 'El tipo de radio es obligatorio'));
        return;
      }
      if (radio && !String(radioSerialNumber || '').trim()) {
        toast.error(t('postSites.inventories.radioSerialRequired', 'El número de serie (radio) es obligatorio'));
        return;
      }
      if (gun && !String(gunType || '').trim()) {
        toast.error(t('postSites.inventories.gunTypeRequired', 'El tipo de arma es obligatorio'));
        return;
      }
      if (gun && !allowedGunTypes.includes(String(gunType || '').trim())) {
        toast.error(t('postSites.inventories.gunTypeInvalid', 'El tipo de arma no es válido'));
        return;
      }
      if (gun && !String(gunSerialNumber || '').trim()) {
        toast.error(t('postSites.inventories.gunSerialRequired', 'El número de serie (arma) es obligatorio'));
        return;
      }
      if (armor && !String(armorType || '').trim()) {
        toast.error(t('postSites.inventories.armorTypeRequired', 'El tipo de armadura es obligatorio'));
        return;
      }
      if (armor && !String(armorSerialNumber || '').trim()) {
        toast.error(t('postSites.inventories.armorSerialRequired', 'El número de serie (armadura) es obligatorio'));
        return;
      }
      setCreating(true);
      const tenantId = tenantIdFromSite();
      const belongsTo = selectedStationId || site?.id || params.id || '';
      // Provide defaults for required model fields so backend validations pass
      const defaultTransportation = t('postSites.inventories.transportationDefault', 'Ninguno');
      const defaultObservations = t('postSites.inventories.observationsDefault', 'Sin observaciones');
      const payload = {
        data: {
          belongsTo,
          belongsToStation: selectedStationId || null,
          name: name || `Inventario ${belongsTo}`,
          radio,
          radioType: radioType || null,
          radioSerialNumber: radioSerialNumber || null,
          gun,
          gunType: gunType || null,
          gunSerialNumber: gunSerialNumber || null,
          armor,
          armorType: armorType || null,
          armorSerialNumber: armorSerialNumber || null,
          tolete,
          pito,
          linterna,
          vitacora,
          cintoCompleto,
          ponchoDeAguas,
          detectorDeMetales,
          caseta,
          observations: observations || defaultObservations,
          transportation: transportation || defaultTransportation,
        },
      };
      if (editingId) {
        await ApiService.put(`/tenant/${tenantId}/inventory/${encodeURIComponent(editingId)}`, payload);
        toast.success(t('postSites.inventories.updated', 'Inventario actualizado'));
      } else {
        await ApiService.post(`/tenant/${tenantId}/inventory`, payload);
        toast.success(t('postSites.inventories.created', 'Inventario creado'));
      }
      closeCreateWindow();
      setName(''); setSelectedStationId(null);
      // reset advanced fields
      setRadio(false); setRadioType(''); setRadioSerialNumber('');
      setGun(false); setGunType(''); setGunSerialNumber('');
      setArmor(false); setArmorType(''); setArmorSerialNumber('');
      setTolete(false); setPito(false); setLinterna(false); setVitacora(false);
      setCintoCompleto(false); setPonchoDeAguas(false); setDetectorDeMetales(false); setCaseta(false);
      setObservations(''); setTransportation('');
      await loadMerged();
    } catch (e: any) {
      console.error('Failed create inventory', e);
      toast.error(e?.message || (editingId ? 'No se pudo actualizar inventario' : 'No se pudo crear inventario'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div ref={containerRef} className="space-y-4 flex-1 min-h-0 flex flex-col">
      <div className="bg-white border rounded-lg p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="w-20" />

          <div className="flex-1 flex justify-center px-4">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('common.search', 'Buscar...')} className="px-3 py-2 border rounded text-sm w-full max-w-md" />
          </div>

          <div className="flex items-center">
            {selectedIds.length > 0 && (
              <button onClick={() => {
                // Build sendItems from selectedIds and open modal
                const items = selectedIds.map((sid) => {
                  const inv = mergedInventories.find((i: any) => String(i.id || i.inventoryId || (i.data && i.data.id)) === String(sid));
                  const snapshot = (inv && (inv.data || inv)) || {};
                  return {
                    inventoryId: sid,
                    snapshot,
                    isComplete: true,
                    observation: '',
                  };
                });
                setSendItems(items);
                setSendPatrolId('');
                setShowSendModal(true);
              }} className="px-4 py-2 mr-2 bg-blue-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2">
                {t('postSites.inventories.sendToPatrol', 'Enviar seleccion a patrulla')}
              </button>
            )}
            <button onClick={openCreateWindow} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2">
              <Plus size={16} /> {t('postSites.inventories.add', 'Crear inventario')}
            </button>
          </div>
        </div>

        <div className="w-full flex-1">
          {loading ? (
            <div>Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="min-h-[160px] flex items-center justify-center">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="w-40 h-40">
                  <svg viewBox="0 0 200 200" className="w-full h-full text-orange-100">
                    <rect x="50" y="80" width="100" height="80" fill="currentColor" rx="8" />
                    <circle cx="85" cy="100" r="8" fill="white" />
                    <circle cx="115" cy="100" r="8" fill="white" />
                    <path d="M 85 120 L 115 120" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-700">{t('noResultsTitle', 'No se encontraron resultados')}</h3>
                  <p className="text-sm text-gray-500 mt-1">{t('noResultsBody', 'No hay inventarios creados para este puesto.')}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full">
                <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 px-3 py-2 border-b">
                <div className="w-10 flex items-center"><input type="checkbox" onChange={toggleSelectAll} checked={filtered.length>0 && selectedIds.length===filtered.map((i:any)=>i.id||i.inventoryId||(i.data&&i.data.id)).filter(Boolean).length} /></div>
                <div className="flex-1 min-w-0 font-medium truncate">{t('postSites.inventories.listHeader.name','Nombre')}</div>
                <div className="w-48 min-w-0 truncate">{t('postSites.inventories.listHeader.station','Estación')}</div>
                <div className="w-56 min-w-0 text-center">{t('postSites.inventories.listHeader.radio','Radio')}</div>
                <div className="w-56 min-w-0 text-center">{t('postSites.inventories.listHeader.gun','Arma')}</div>
                <div className="w-56 min-w-0 text-center">{t('postSites.inventories.listHeader.armor','Chaleco')}</div>
                
                <div className="w-24 text-right">{t('actions.actions','Acciones')}</div>
              </div>

              <div className="flex flex-col">
                {filtered.map((inv: any) => {
                const id = inv.id || inv.inventoryId || (inv.data && inv.data.id) || '';
                const actions: RowAction[] = [
                  {
                    label: t('postSites.inventories.viewDetails', 'Ver detalles'),
                    onClick: () => {
                      setDetailInv(inv);
                      setDetailOpen(true);
                    },
                  },
                  {
                    label: t('actions.delete', 'Eliminar'),
                    destructive: true,
                    onClick: () => {
                      // open confirmation modal and pass the inventory object
                      setDeletePending(inv);
                    },
                  },
                ];

                const data = inv.data || inv || {};
                const createdAt = data.createdAt || inv.createdAt || '';
                const stationFromSiteProp = site && (
                  site.businessName || site.name || site.postSiteName || site.postsiteName || site.post_site_name || site.businessInfoName || (site.businessInfo && site.businessInfo.name) || (site.postSite && (site.postSite.name || site.postSite.postSiteName))
                );
                // Resolve a human-friendly station label. Prefer station name from `stations`, then belongsTo info,
                // then origin/postSite name. Never show raw ids — fall back to the post site name or '-' instead.
                let stationLabelFinal: string | null = null;
                const stationIdCandidate = (data && data.belongsToStation) || inv.belongsToId || inv.belongsTo?.id || null;
                const foundStation = (stations || []).find((s: any) => String(s.id) === String(stationIdCandidate));

                // 1) If we have an explicit station id, try to map it to loaded stations and prefer the station's name
                if (stationIdCandidate && foundStation) {
                  // prefer the station's own label (human-friendly name)
                  if (foundStation.label) {
                    stationLabelFinal = foundStation.label;
                  } else {
                    // fallback to postSite name referenced by station if available
                    const postId = foundStation.postSiteId || foundStation.postsiteId || foundStation.post_site_id || (foundStation.postSite && (foundStation.postSite.id || foundStation.postSite.postSiteId)) || null;
                    if (postId) {
                      const cached = postsiteNames[String(postId)];
                      if (cached) stationLabelFinal = cached;
                    }
                  }
                }

                // Determine if this inventory references a postSite explicitly
                // inventory may reference a postSite via originId, belongsToId, or nested origin object
                const invPostSiteId = inv && (inv.originId || (inv.origin && inv.origin.id) || inv.belongsToId || (data && data.belongsToId) || (data && data.originId));
                let invPostSiteName = (inv && (inv.originName || inv.origin?.name)) || (invPostSiteId ? postsiteNames[String(invPostSiteId)] : null) || null;

                // 2) If not resolved via station->postSite, check merged `belongsTo` readable name
                if (!stationLabelFinal) {
                  stationLabelFinal = (inv && inv.belongsTo && (inv.belongsTo.name || inv.belongsTo.stationName || inv.belongsTo.station_name || inv.belongsTo.businessName)) || null;
                }

                // Decide if inventory belongs to postSite (no station specified)
                const isBelongsToPostSite = !stationIdCandidate && !!invPostSiteId;

                // If inventory is linked to a postSite (and not to a specific station), prefer the postSite name
                if (isBelongsToPostSite) {
                  // prefer explicit postSite name (from inv or cache), otherwise fallback to site prop
                  stationLabelFinal = invPostSiteName || stationFromSiteProp || null;
                } else {
                  // 3) If still not present, prefer the post-site name referenced by inventory
                  if (!stationLabelFinal && invPostSiteName) {
                    stationLabelFinal = invPostSiteName;
                  }
                  // 4) Finally, prefer the `site` prop readable name
                  if (!stationLabelFinal) {
                    stationLabelFinal = stationFromSiteProp || null;
                  }
                }
                const badges: string[] = [];
                if (data.tolete) badges.push(t('postSites.inventories.tolete', 'Tolete'));
                if (data.pito) badges.push(t('postSites.inventories.pito', 'Pito'));
                if (data.linterna) badges.push(t('postSites.inventories.linterna', 'Linterna'));
                if (data.vitacora) badges.push(t('postSites.inventories.vitacora', 'Bitácora'));
                if (data.cintoCompleto) badges.push(t('postSites.inventories.cintoCompleto', 'Cinto completo'));
                if (data.ponchoDeAguas) badges.push(t('postSites.inventories.ponchoDeAguas', 'Poncho de aguas'));
                if (data.detectorDeMetales) badges.push(t('postSites.inventories.detectorDeMetales', 'Detector de metales'));
                if (data.caseta) badges.push(t('postSites.inventories.caseta', 'Caseta'));

                // Helper: normalize and dedupe words preserving first occurrence
                const normalizeWords = (s: any) => {
                  if (!s && s !== 0) return '';
                  const cleaned = String(s).replace(/[–—_]/g, ' ').replace(/\s*-\s*/g, ' ').replace(/\s+/g, ' ').trim();
                  const parts = cleaned.split(' ').filter(Boolean);
                  const seenLower: string[] = [];
                  const out: string[] = [];
                  parts.forEach((w) => {
                    const lw = w.toLowerCase();
                    if (!seenLower.includes(lw)) {
                      seenLower.push(lw);
                      out.push(w);
                    }
                  });
                  return out.join(' ');
                };

                // Precompute display and station normalized labels so JSX can use them
                const rawInvName = data.name || inv.name || null;
                const invName = rawInvName ? normalizeWords(rawInvName) : null;
                const rawStation = stationLabelFinal || null;
                const stationLabelNormalized = rawStation ? normalizeWords(rawStation) : '';
                // Name column must contain ONLY the inventory name (or 'Sin nombre')
                const displayName = invName || t('postSites.inventories.unnamed', 'Sin nombre');
                // Station column shows the station/postSite readable name (always as its own column)
                const stationDisplay = stationLabelNormalized || normalizeWords(stationFromSiteProp) || null;

                return (
                  <div key={id || JSON.stringify(inv)} className={`border-b last:border-b-0 py-3 px-3 flex items-center gap-2 ${selectedIds.includes(id) ? 'bg-orange-50' : ''}`}>
                    <div className="w-10 flex items-center"><input type="checkbox" checked={selectedIds.includes(id)} onChange={() => toggleSelect(id)} /></div>
                    <div className="flex-1 min-w-0 overflow-hidden pr-2">
                      <div className="font-medium truncate">{displayName}</div>
                    </div>
                    <div className="w-48 min-w-0 text-sm pr-2">
                      {stationDisplay ? (
                        <div className="truncate">{stationDisplay}</div>
                      ) : (
                        <div className="text-gray-400">-</div>
                      )}
                    </div>
                    <div className="w-56 min-w-0 text-sm flex items-center justify-center">
                      {data.radio ? (
                        <div className="truncate text-center">{`${data.radioType || '-'} · ${data.radioSerialNumber || '-'}`}</div>
                      ) : (
                        <div className="text-gray-400">-</div>
                      )}
                    </div>
                    <div className="w-56 min-w-0 text-sm flex items-center justify-center">
                      {data.gun ? (
                        <div className="truncate text-center">{`${data.gunType || '-'} · ${data.gunSerialNumber || '-'}`}</div>
                      ) : (
                        <div className="text-gray-400">-</div>
                      )}
                    </div>
                    <div className="w-56 min-w-0 text-sm flex items-center justify-center">
                      {data.armor ? (
                        <div className="truncate text-center">{`${data.armorType || '-'} · ${data.armorSerialNumber || '-'}`}</div>
                      ) : (
                        <div className="text-gray-400">-</div>
                      )}
                    </div>
                    <div className="w-24 flex justify-end"><RowActionsMenu actions={actions} /></div>
                  </div>
                );
              })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Details modal */}
      {detailOpen && detailInv && (
        <div className="fixed inset-0 z-60 flex items-center justify-center" onClick={() => setDetailOpen(false)}>
          <div className="absolute inset-0 bg-black/30 z-50" onClick={() => setDetailOpen(false)} />
          <div className="relative z-70 w-full sm:w-[640px] max-w-[96%] bg-white shadow-2xl overflow-y-auto rounded-md pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b relative">
              <h3 className="text-xl font-semibold absolute left-1/2 transform -translate-x-1/2">{(detailInv.data && (detailInv.data.name || detailInv.name)) || t('postSites.inventories.detailsTitle','Detalles de inventario')}</h3>
              <button onClick={() => setDetailOpen(false)} className="p-2 rounded-full hover:bg-gray-100">✕</button>
            </div>
            <div className="p-4 text-base">
              {(() => {
                const d = detailInv.data || detailInv || {};
                const stationLabel = (detailInv.belongsTo && (detailInv.belongsTo.name || detailInv.belongsTo.stationName)) || d.belongsToStation || postsiteNames[String(detailInv.originId || detailInv.belongsToId || '')] || '-';
                const radioLine = d.radio ? `${d.radioType || '-'} · ${d.radioSerialNumber || '-'}` : '-';
                const gunLine = d.gun ? `${d.gunType || '-'} · ${d.gunSerialNumber || '-'}` : '-';
                const armorLine = d.armor ? `${d.armorType || '-'} · ${d.armorSerialNumber || '-'}` : '-';
                const itemsList: string[] = [];
                if (d.tolete) itemsList.push(t('postSites.inventories.tolete','Tolete'));
                if (d.pito) itemsList.push(t('postSites.inventories.pito','Pito'));
                if (d.linterna) itemsList.push(t('postSites.inventories.linterna','Linterna'));
                if (d.vitacora) itemsList.push(t('postSites.inventories.vitacora','Bitácora'));
                if (d.cintoCompleto) itemsList.push(t('postSites.inventories.cintoCompleto','Cinto completo'));
                if (d.ponchoDeAguas) itemsList.push(t('postSites.inventories.ponchoDeAguas','Poncho de aguas'));
                if (d.detectorDeMetales) itemsList.push(t('postSites.inventories.detectorDeMetales','Detector de metales'));
                if (d.caseta) itemsList.push(t('postSites.inventories.caseta','Caseta'));

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base">
                      <div>
                        <div className="text-sm text-gray-500">{t('postSites.inventories.station','Estación')}</div>
                        <div className="text-base font-medium">{stationLabel}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">{t('postSites.inventories.transportation','Transporte')}</div>
                        <div className="text-base">{d.transportation || '-'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">{t('postSites.inventories.radio','Radio')}</div>
                        <div className="text-base">{radioLine}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">{t('postSites.inventories.gun','Arma')}</div>
                        <div className="text-base">{gunLine}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">{t('postSites.inventories.armor','Chaleco/armadura')}</div>
                        <div className="text-base">{armorLine}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">{t('postSites.inventories.createdAt','Creado')}</div>
                        <div className="text-base">{d.createdAt || detailInv.createdAt || '-'}</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-500">{t('postSites.inventories.items','Items')}</div>
                      {itemsList.length > 0 ? (
                        <ul className="list-disc list-inside text-base sm:columns-2 gap-4">
                          {itemsList.map((it, idx) => (
                            <li key={idx}>{it}</li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-base text-gray-400">-</div>
                      )}
                    </div>

                    <div>
                      <div className="text-sm text-gray-500">{t('postSites.inventories.observations','Observaciones')}</div>
                      <div className="text-base whitespace-pre-wrap">{d.observations || '-'}</div>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t bg-white rounded-b-md">
              <button onClick={() => {
                // Prefill create form with current inventory and switch to create/edit modal
                const d = detailInv.data || detailInv || {};
                setName(d.name || detailInv.name || '');
                setSelectedStationId((detailInv.belongsTo && (detailInv.belongsTo.id)) || d.belongsToStation || detailInv.belongsToId || null);
                // compute id for editing
                const eid = detailInv.id || detailInv.inventoryId || (detailInv.data && detailInv.data.id) || null;
                setEditingId(eid);
                setRadio(Boolean(d.radio)); setRadioType(d.radioType || ''); setRadioSerialNumber(d.radioSerialNumber || '');
                setGun(Boolean(d.gun)); setGunType(d.gunType || ''); setGunSerialNumber(d.gunSerialNumber || '');
                setArmor(Boolean(d.armor)); setArmorType(d.armorType || ''); setArmorSerialNumber(d.armorSerialNumber || '');
                setTolete(Boolean(d.tolete)); setPito(Boolean(d.pito)); setLinterna(Boolean(d.linterna)); setVitacora(Boolean(d.vitacora));
                setCintoCompleto(Boolean(d.cintoCompleto)); setPonchoDeAguas(Boolean(d.ponchoDeAguas)); setDetectorDeMetales(Boolean(d.detectorDeMetales)); setCaseta(Boolean(d.caseta));
                setObservations(d.observations || ''); setTransportation(d.transportation || '');
                setDetailOpen(false);
                setOpenCreate(true);
              }} className="px-4 py-2 bg-orange-600 text-white rounded-md">{t('common.edit','Editar')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Send to patrol modal */}
      {showSendModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center" onClick={() => setShowSendModal(false)}>
          <div className="absolute inset-0 bg-black/30 z-50" onClick={() => setShowSendModal(false)} />
          <div className="relative z-70 w-full sm:w-[720px] max-w-[96%] bg-white shadow-2xl overflow-y-auto rounded-md pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b bg-white rounded-t-md">
              <h2 className="text-lg font-semibold text-gray-800">{t('postSites.inventories.sendModalTitle','Enviar inventarios a patrulla')}</h2>
              <button onClick={() => setShowSendModal(false)} className="p-2 rounded-full hover:bg-gray-100">✕</button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">{t('postSites.inventories.patrolId','ID de la patrulla')}</label>
                <input value={sendPatrolId} onChange={(e) => setSendPatrolId(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
              </div>

              <div>
                <div className="text-sm text-gray-600 mb-2">{t('postSites.inventories.itemsToSend','Items a enviar')}</div>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {sendItems.map((it, idx) => (
                    <div key={it.inventoryId || idx} className="border rounded p-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{(it.snapshot && (it.snapshot.name || it.snapshot.stationName)) || it.inventoryId}</div>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={Boolean(it.isComplete)} onChange={(e) => {
                            const copy = [...sendItems]; copy[idx] = { ...copy[idx], isComplete: e.target.checked }; setSendItems(copy);
                          }} /> {t('postSites.inventories.isComplete','Completado')}
                        </label>
                      </div>
                      <div className="mt-2">
                        <label className="block text-xs text-gray-500">{t('postSites.inventories.observation','Observación')}</label>
                        <input className="w-full border rounded px-2 py-1 text-sm" value={it.observation || ''} onChange={(e) => { const copy = [...sendItems]; copy[idx] = { ...copy[idx], observation: e.target.value }; setSendItems(copy); }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t bg-white rounded-b-md">
              <button onClick={() => setShowSendModal(false)} className="px-4 py-2 rounded-md border text-sm">{t('common.cancel','Cancelar')}</button>
              <button onClick={async () => {
                try {
                  if (!sendPatrolId) { toast.error(t('postSites.inventories.patrolIdRequired','El ID de la patrulla es requerido')); return; }
                  setCreating(true);
                  const tenantId = tenantIdFromSite();
                  const inventories = sendItems.map((it) => ({
                    inventoryId: it.inventoryId,
                    inventoryCheckedDate: new Date().toISOString().slice(0,10),
                    isComplete: Boolean(it.isComplete),
                    observation: it.observation || undefined,
                    snapshot: it.snapshot || undefined,
                  }));
                  await ApiService.post(`/tenant/${tenantId}/patrols/${encodeURIComponent(sendPatrolId)}/inventory-history`, { data: { inventories } });
                  toast.success(t('postSites.inventories.sentToPatrol', 'Inventarios enviados a patrulla'));
                  setShowSendModal(false);
                  setSelectedIds([]);
                  await loadMerged();
                } catch (e: any) {
                  console.error('Failed to send inventories to patrol', e);
                  toast.error(e?.message || t('postSites.inventories.sendFailed', 'No se pudo enviar a patrulla'));
                } finally {
                  setCreating(false);
                }
              }} disabled={creating} className="px-6 py-2 bg-blue-600 text-white rounded-md">{creating ? t('common.sending','Enviando...') : t('postSites.inventories.send','Enviar')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deletePending && (
        <div className="fixed inset-0 z-60 flex items-center justify-center" onClick={() => setDeletePending(null)}>
          <div className="absolute inset-0 bg-black/30 z-50" onClick={() => setDeletePending(null)} />
          <div className="relative z-70 w-full sm:w-[520px] max-w-[96%] bg-white shadow-2xl overflow-y-auto rounded-md pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800">{t('postSites.inventories.deleteConfirmTitle','Confirmar eliminación')}</h3>
              <p className="text-sm text-gray-600 mt-2">{t('postSites.inventories.deleteConfirmBody','¿Estás seguro de que deseas eliminar este inventario? Esta acción no se puede deshacer.')}</p>
              <div className="mt-4">
                <div className="text-sm text-gray-700 font-medium">{(deletePending?.data && (deletePending.data.name || deletePending.name)) || deletePending?.name || t('postSites.inventories.unnamed','Sin nombre')}</div>
                <div className="text-xs text-gray-500 mt-1">{(deletePending?.belongsTo && (deletePending.belongsTo.name || deletePending.belongsTo.stationName)) || deletePending?.data?.belongsToStation || postsiteNames[String(deletePending?.originId || deletePending?.belongsToId || '')] || ''}</div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t bg-white rounded-b-md">
              <button onClick={() => setDeletePending(null)} className="px-4 py-2 rounded-md border text-sm">{t('common.cancel','Cancelar')}</button>
              <button onClick={async () => {
                try {
                  const tenantId = tenantIdFromSite();
                  const did = deletePending.id || deletePending.inventoryId || (deletePending.data && deletePending.data.id) || '';
                  if (!did) throw new Error('No inventory id');
                  await ApiService.delete(`/tenant/${tenantId}/inventory?ids=${encodeURIComponent(did)}`);
                  toast.success(t('postSites.inventories.deleted', 'Inventario eliminado'));
                  setDeletePending(null);
                  setSelectedIds((prev) => prev.filter((x) => x !== did));
                  await loadMerged();
                } catch (e: any) {
                  console.error('Failed to delete inventory', e);
                  toast.error(e?.message || t('postSites.inventories.deleteFailed', 'No se pudo eliminar inventario'));
                }
              }} className="px-6 py-2 bg-red-600 text-white rounded-md">{t('common.delete','Eliminar')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Create window modal style */}
      {openCreate && (
        <div className="fixed inset-0 z-60 flex items-center justify-center" onClick={closeCreateWindow}>
          <div className="absolute inset-0 bg-black/20 z-50" onClick={closeCreateWindow} />
          <div className="relative z-70 w-full sm:w-[720px] max-w-[96%] bg-white shadow-2xl overflow-y-auto rounded-md pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b bg-white rounded-t-md">
              <h2 className="text-lg font-semibold text-gray-800">{editingId ? t('postSites.inventories.editTitle','Editar Inventario') : t('postSites.inventories.createTitle', 'Crear Inventario')}</h2>
              <button onClick={closeCreateWindow} className="p-2 rounded-full hover:bg-gray-100">✕</button>
            </div>

                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">{t('postSites.inventories.selectStation', 'Seleccionar estación (opcional)')}</label>
                      <select value={selectedStationId || ''} onChange={(e) => setSelectedStationId(e.target.value || null)} className="w-full border rounded px-3 py-2 text-sm">
                        <option value="">{t('postSites.inventories.usePostsite', 'Usar puesto de seguridad (por defecto)')}</option>
                        {(stations || []).map((s: any) => (
                          <option key={s.id} value={s.id}>{s.label || (s.postSiteId ? postsiteNames[String(s.postSiteId)] : null) || t('postSites.inventories.unnamedStation','Sin nombre')}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        {t('postSites.inventories.name', 'Nombre de inventario')}
                        <span className="text-red-500">*</span>
                      </label>
                      <input aria-required={true} required className="w-full border rounded px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>

                    <div className="border rounded p-3">
                      <div className="text-sm font-medium mb-2">{t('postSites.inventories.advancedTitle', 'Detalles (opcional)')}</div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 text-sm w-48"><input type="checkbox" checked={radio} onChange={(e) => setRadio(e.target.checked)} /> {t('postSites.inventories.radio', 'Radio')}</label>
                          <input placeholder={t('postSites.inventories.radioType', 'Tipo de radio') + (radio ? ' *' : '')} value={radioType} onChange={(e) => setRadioType(e.target.value)} className="border rounded px-2 py-1 text-sm flex-1" required={radio} />
                          <input placeholder={t('postSites.inventories.radioSerialNumber', 'Nº de serie (radio)') + (radio ? ' *' : '')} value={radioSerialNumber} onChange={(e) => setRadioSerialNumber(e.target.value)} className="border rounded px-2 py-1 text-sm w-48" required={radio} />
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 text-sm w-48"><input type="checkbox" checked={gun} onChange={(e) => setGun(e.target.checked)} /> {t('postSites.inventories.gun', 'Arma')}</label>
                          <select value={gunType} onChange={(e) => setGunType(e.target.value)} className="border rounded px-2 py-1 text-sm flex-1" required={gun}>
                            <option value="">{t('postSites.inventories.gunTypeSelect', 'Seleccionar tipo de arma')}</option>
                            {allowedGunTypes.map((g) => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </select>
                          <input placeholder={t('postSites.inventories.gunSerialNumber', 'Nº de serie (arma)') + (gun ? ' *' : '')} value={gunSerialNumber} onChange={(e) => setGunSerialNumber(e.target.value)} className="border rounded px-2 py-1 text-sm w-48" required={gun} />
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 text-sm w-48"><input type="checkbox" checked={armor} onChange={(e) => setArmor(e.target.checked)} /> {t('postSites.inventories.armor', 'Chaleco/armadura')}</label>
                          <input placeholder={t('postSites.inventories.armorType', 'Tipo de armadura') + (armor ? ' *' : '')} value={armorType} onChange={(e) => setArmorType(e.target.value)} className="border rounded px-2 py-1 text-sm flex-1" required={armor} />
                          <input placeholder={t('postSites.inventories.armorSerialNumber', 'Nº de serie (armadura)') + (armor ? ' *' : '')} value={armorSerialNumber} onChange={(e) => setArmorSerialNumber(e.target.value)} className="border rounded px-2 py-1 text-sm w-48" required={armor} />
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={tolete} onChange={(e) => setTolete(e.target.checked)} /> {t('postSites.inventories.tolete', 'Tolete')}</label>
                          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pito} onChange={(e) => setPito(e.target.checked)} /> {t('postSites.inventories.pito', 'Pito')}</label>
                          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={linterna} onChange={(e) => setLinterna(e.target.checked)} /> {t('postSites.inventories.linterna', 'Linterna')}</label>
                          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={vitacora} onChange={(e) => setVitacora(e.target.checked)} /> {t('postSites.inventories.vitacora', 'Bitácora')}</label>
                          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cintoCompleto} onChange={(e) => setCintoCompleto(e.target.checked)} /> {t('postSites.inventories.cintoCompleto', 'Cinto completo')}</label>
                          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ponchoDeAguas} onChange={(e) => setPonchoDeAguas(e.target.checked)} /> {t('postSites.inventories.ponchoDeAguas', 'Poncho de aguas')}</label>
                          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={detectorDeMetales} onChange={(e) => setDetectorDeMetales(e.target.checked)} /> {t('postSites.inventories.detectorDeMetales', 'Detector de metales')}</label>
                          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={caseta} onChange={(e) => setCaseta(e.target.checked)} /> {t('postSites.inventories.caseta', 'Caseta')}</label>
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="block text-sm text-gray-700 mb-1">{t('postSites.inventories.transportation', 'Transporte')}</label>
                        <select value={transportation} onChange={(e) => setTransportation(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
                          <option value="">{t('postSites.inventories.transportationDefault', 'Ninguno')}</option>
                          <option value="Bicicleta">{t('postSites.inventories.transportOptions.bike','Bicicleta')}</option>
                          <option value="Moto">{t('postSites.inventories.transportOptions.motorbike','Moto')}</option>
                          <option value="Cuadrón">{t('postSites.inventories.transportOptions.utv','Cuadrón')}</option>
                          <option value="Segway">{t('postSites.inventories.transportOptions.segway','Segway')}</option>
                          <option value="Camioneta">{t('postSites.inventories.transportOptions.pickup','Camioneta')}</option>
                        </select>
                      </div>

                      <div className="mt-3">
                        <label className="block text-sm text-gray-700 mb-1">{t('postSites.inventories.observations', 'Observaciones')}</label>
                        <textarea value={observations} onChange={(e) => setObservations(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" rows={3} />
                      </div>
                    </div>
                  </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t bg-white rounded-b-md">
              <button onClick={closeCreateWindow} className="px-4 py-2 rounded-md border text-sm">{t('common.cancel', 'Cancelar')}</button>
              <button onClick={submitCreate} disabled={creating} className="px-6 py-2 bg-orange-600 text-white rounded-md">{creating ? t('common.creating','Creando...') : (editingId ? t('postSites.inventories.update','Guardar cambios') : t('postSites.inventories.create','Crear inventario'))}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
