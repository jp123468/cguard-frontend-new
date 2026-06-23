import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, X, ChevronDown } from 'lucide-react';
import { getTenantTimezone } from '@/utils/tenantLocation';
import { loadGoogleMaps } from '@/utils/loadGoogleMaps';

import { ApiService, ApiError } from '@/services/api/apiService';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import MobileCardList from '@/components/responsive/MobileCardList';
import useScrollToTopOnMount from '@/hooks/useScrollToTopOnMount';

export default function PostSiteTourTags({ site }: { site?: any }) {
    const { t } = useTranslation();
    const tabOptions = [
        { key: 'qr', label: t('siteTourTag.tabs.qr') },
        // { key: 'nfc', label: t('siteTourTag.tabs.nfc') },
        // { key: 'virtual', label: t('siteTourTag.tabs.virtual') },
        // { key: 'ble', label: t('siteTourTag.tabs.ble') },
    ];
    const [activeTabKey, setActiveTabKey] = useState<string>(tabOptions[0].key);
    const activeTabLabel = tabOptions.find(ti => ti.key === activeTabKey)?.label || tabOptions[0].label;
    const [showNewTag, setShowNewTag] = useState(false);
    const [form, setForm] = useState<any>({
        tagType: tabOptions[0].key,
        name: '',
        tagId: '',
        location: '',
        instructions: '',
        askQuestions: false,
        latitude: '',
        longitude: '',
        coords: '',
        showGeoFence: false,
    });

    const [mapQuery, setMapQuery] = useState<string>('Guayaquil');
    const [mapError, setMapError] = useState<string | null>(null);
    const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number } | null>(null);
    // Google Maps refs
    const gMapRef = useRef<HTMLDivElement | null>(null);
    const gMapInstanceRef = useRef<any>(null);
    const gMainMarkerRef = useRef<any>(null);
    const gStationMarkersRef = useRef<any[]>([]);
    const [tags, setTags] = useState<any[]>([]);
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
    const headerCheckboxRef = useRef<HTMLInputElement | null>(null);

    function getTagId(tag: any, idx: number) {
        return String(tag?.id || tag?._id || tag?.tagIdentifier || idx);
    }

    function toggleTagSelection(id: string) {
        setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
    }
    const [tours, setTours] = useState<any[]>([]);
    const [shifts, setShifts] = useState<any[]>([]);
    const [stations, setStations] = useState<any[]>([]);
    const [loadingStations, setLoadingStations] = useState(false);
    const [loadingTags, setLoadingTags] = useState(false);
    const [currentTourId, setCurrentTourId] = useState<string | null>(null);
    const [loadingTours, setLoadingTours] = useState(false);
    const [showCreateTourModal, setShowCreateTourModal] = useState(false);
    const [tourForm, setTourForm] = useState<any>({ name: '', stationId: '' });
    const [localGuards, setLocalGuards] = useState<any[]>([]);
    const [loadingGuards, setLoadingGuards] = useState(false);
    const [guardLoadError, setGuardLoadError] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    function getGuardNameFromShift(sh: any) {
        if (!sh) return null;
        const g = sh.guard || {};
        const candidates: string[] = [];
        // common variations
        if (g.firstName || g.first_name) candidates.push(g.firstName || g.first_name);
        if (g.lastName || g.last_name) candidates.push(g.lastName || g.last_name);
        if (sh.firstName || sh.first_name) candidates.push(sh.firstName || sh.first_name);
        if (sh.lastName || sh.last_name) candidates.push(sh.lastName || sh.last_name);
        if (g.name || g.fullName || g.full_name) candidates.push(g.name || g.fullName || g.full_name);
        if (sh.guardName || sh.guard_name) candidates.push(sh.guardName || sh.guard_name);
        const joined = candidates.filter(Boolean).join(' ').trim();
        if (joined) return joined;
        if (g.username) return g.username;
        if ((g as any).displayName) return (g as any).displayName;
        return null;
    }

    useScrollToTopOnMount(containerRef);

    // Ajusta el zoom inicial a 18 para acercar dos niveles más la vista
    const DEFAULT_MAP_ZOOM = 18;
    function update(k: string, v: any) {
        setForm((s: any) => ({ ...s, [k]: v }));
    }

    function handleLocateInMap() {
        setMapError(null);
        // Prefer marker position if set, otherwise use current map center
        let lat: number | null = null;
        let lng: number | null = null;
        if (markerPos) {
            lat = markerPos.lat;
            lng = markerPos.lng;
        } else if (gMapInstanceRef.current) {
            try {
                const center = gMapInstanceRef.current.getCenter();
                if (center) { lat = center.lat(); lng = center.lng(); }
            } catch (e) { /* ignore */ }
        }

        if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
            setMapError('No hay coordenadas disponibles en el mapa');
            return;
        }

        setMapQuery(`${lat},${lng}`);
        setMarkerPos({ lat, lng });
        update('coords', `${lat}, ${lng}`);
        update('latitude', lat.toString());
        update('longitude', lng.toString());
    }

    useEffect(() => {
        // keep marker in sync when user types lat/lng
        const lat = parseFloat(String(form.latitude));
        const lng = parseFloat(String(form.longitude));
        if (!isNaN(lat) && !isNaN(lng)) {
            setMarkerPos({ lat, lng });
            update('coords', `${lat}, ${lng}`);
        }
    }, [form.latitude, form.longitude]);

    // When marker position changes, pan the Google Map and update the marker
    useEffect(() => {
        if (!markerPos || !gMapInstanceRef.current) return;
        const google = (window as any).google;
        if (!google?.maps) return;
        try { gMapInstanceRef.current.panTo({ lat: markerPos.lat, lng: markerPos.lng }); } catch (e) { /* ignore */ }
        if (gMainMarkerRef.current) {
            try { gMainMarkerRef.current.position = { lat: markerPos.lat, lng: markerPos.lng }; } catch (e) { /* ignore */ }
        } else {
            gMainMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
                position: { lat: markerPos.lat, lng: markerPos.lng },
                map: gMapInstanceRef.current,
            });
        }
    }, [markerPos]);

    const [searchQuery, setSearchQuery] = useState<Record<string, string>>({});
    const actionOptionsMap: Record<string, string[]> = {
        qr: ['delete', 'print', 'download'],
        nfc: ['delete'],
        virtual: ['delete'],
        ble: ['delete'],
    };

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    function handleActionChange(tabKey: string, opt: string) {
        if (opt === 'delete') {
            setShowDeleteConfirm(true);
            return;
        }
        if (opt === 'print') return bulkPrintSelectedTags();
        if (opt === 'download') return bulkDownloadSelectedTags();
        toast(opt);
    }

    // Build a print-ready labeled QR PNG (checkpoint name + code) and download it.
    async function downloadLabeledQr(name: string, identifier: string) {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=12&data=${encodeURIComponent(identifier)}`;
        const resp = await fetch(qrUrl, { cache: 'no-store' });
        const blob = await resp.blob();
        const img: HTMLImageElement = await new Promise((resolve, reject) => {
            const url = URL.createObjectURL(blob);
            const i = new Image();
            i.onload = () => { URL.revokeObjectURL(url); resolve(i); };
            i.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
            i.src = url;
        });
        const W = 700, H = 830, QR = 600;
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#111111'; ctx.font = 'bold 38px Arial, sans-serif';
        const title = (name || 'Punto de control').slice(0, 26);
        ctx.fillText(title, W / 2, 64);
        ctx.drawImage(img, (W - QR) / 2, 92, QR, QR);
        ctx.fillStyle = '#555555'; ctx.font = '24px monospace';
        ctx.fillText(identifier.slice(0, 40), W / 2, 740);
        ctx.fillStyle = '#999999'; ctx.font = '18px Arial, sans-serif';
        ctx.fillText('Escanear con la app de vigilante · CGuardPro', W / 2, 786);

        const safe = (s: string) => s.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 40);
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `QR-${safe(title)}-${safe(identifier)}.png`;
        document.body.appendChild(a); a.click(); a.remove();
    }

    async function bulkDownloadSelectedTags() {
        const ids = (selectedTagIds && selectedTagIds.length)
            ? selectedTagIds
            : (tags || []).map((t: any, i: number) => getTagId(t, i)); // none selected → all
        const items: { name: string; identifier: string }[] = [];
        for (const sid of ids) {
            const found = (tags || []).map((t: any, i: number) => ({ t, i })).find(({ t, i }) => getTagId(t, i) === sid);
            if (!found) continue;
            const tag = found.t;
            const identifier = String(tag.tagIdentifier || tag.id || tag._id || getTagId(tag, found.i));
            if (identifier) items.push({ name: tag.name || 'Punto de control', identifier });
        }
        if (!items.length) { toast.error('No hay puntos para descargar'); return; }
        toast(`Generando ${items.length} código(s) QR…`);
        for (const it of items) {
            try { await downloadLabeledQr(it.name, it.identifier); }
            catch (e) { console.error('QR download failed', it, e); }
            await new Promise((r) => setTimeout(r, 250)); // stagger browser downloads
        }
        toast.success(`${items.length} código(s) QR descargado(s)`);
    }

    async function bulkDeleteSelectedTags() {
        if (!selectedTagIds || selectedTagIds.length === 0) {
            toast.error(t('siteTourTag.errors.selectAtLeastOne','Seleccione al menos una etiqueta'));
            return;
        }
        const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
        if (!tenantId) { toast.error('Missing tenantId'); return; }
        const toDelete = selectedTagIds.slice();
        const results: {id: string, ok: boolean, err?: any}[] = [];
        for (const sid of toDelete) {
            const found = (tags || []).map((t: any, i: number) => ({ t, i })).find(({t,i}) => getTagId(t, i) === sid);
            if (!found) { results.push({ id: sid, ok: false, err: 'Not found' }); continue; }
            const tag = found.t;
            const tagId = tag.id || tag._id || tag.tagIdentifier;
            const tourId = tag.siteTourId || tag.siteTour || currentTourId;
            if (!tourId || !tagId) { results.push({ id: sid, ok: false, err: 'Missing tour or tag id' }); continue; }
            try {
                await ApiService.delete(`/tenant/${tenantId}/site-tour/${encodeURIComponent(tourId)}/tag/${encodeURIComponent(tagId)}`);
                results.push({ id: sid, ok: true });
            } catch (e) {
                console.error('Failed deleting tag', tag, e);
                results.push({ id: sid, ok: false, err: e });
            }
        }
        const failed = results.filter(r => !r.ok);
        if (failed.length === 0) {
            toast.success(t('siteTourTag.success.deleted','Etiquetas eliminadas'));
            setSelectedTagIds([]);
        } else {
            toast.error(t('siteTourTag.errors.deleteFailedCount', { count: failed.length, defaultValue: `Fallo al eliminar ${failed.length} etiquetas` }));
        }
        try { await loadTagsForSite(activeTabKey); } catch (e) {}
    }

    async function bulkPrintSelectedTags() {
        if (!selectedTagIds || selectedTagIds.length === 0) {
            toast.error('Seleccione al menos una etiqueta');
            return;
        }
        // Resolve printable values for each selected id
        const values: string[] = [];
        for (const sid of selectedTagIds) {
            const found = (tags || []).map((t: any, i: number) => ({ t, i })).find(({t,i}) => getTagId(t, i) === sid);
            if (!found) continue;
            const tag = found.t;
            const val = tag.tagIdentifier || tag.id || tag._id || getTagId(tag, found.i);
            if (val) values.push(String(val));
        }
        if (values.length === 0) { toast.error('No hay valores imprimibles'); return; }

        try {
            const dataUrls = await Promise.all(values.map(async (v) => {
                const url = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(v)}`;
                try {
                    const resp = await fetch(url, { cache: 'no-store' });
                    const blob = await resp.blob();
                    return await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(String(reader.result));
                        reader.onerror = () => reject('read-failed');
                        reader.readAsDataURL(blob);
                    });
                } catch (e) {
                    console.error('Failed fetching QR', e);
                    return null as any;
                }
            }));

            const imgs = dataUrls.filter(Boolean);
            if (imgs.length === 0) { toast.error('No se pudieron generar los QR'); return; }
            const w = window.open('', '_blank');
            if (!w) { toast.error('No se pudo abrir la ventana de impresión'); return; }
            const html = `<!doctype html><html><head><meta charset="utf-8"><title>QR</title><style>body{margin:0;padding:8mm;display:flex;flex-direction:column;align-items:center} .qr{page-break-after:always;margin-bottom:8mm} img{max-width:320px;width:100%;height:auto;display:block}</style></head><body>${imgs.map((d:any,idx:number)=>`<div class="qr"><img src="${d}" alt="QR ${idx+1}"/></div>`).join('')}<script>window.focus();setTimeout(()=>{try{window.print();setTimeout(()=>window.close(),500)}catch(e){console.error(e)}},300);</script></body></html>`;
            w.document.write(html);
            w.document.close();
        } catch (e) {
            console.error('bulk print failed', e);
            toast.error('Error al imprimir');
        }
    }

    // Filter tags according to the search field for the active tab
    const filteredTags = useMemo(() => {
        const q = String((searchQuery[activeTabKey] || '')).trim().toLowerCase();
        if (!q) return tags || [];
        return (tags || []).filter((t: any) => {
            const name = String(t?.name || '').toLowerCase();
            const id = String(t?.tagIdentifier || t?.id || t?._id || '').toLowerCase();
            return name.includes(q) || id.includes(q);
        });
    }, [tags, searchQuery, activeTabKey]);

    const [actionOpen, setActionOpen] = useState(false);
    const actionRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        function onDocClick(e: MouseEvent) {
            if (!actionRef.current) return;
            if (!actionRef.current.contains(e.target as Node)) setActionOpen(false);
        }
        document.addEventListener('click', onDocClick);
        return () => document.removeEventListener('click', onDocClick);
    }, []);

    async function submitTag() {
        const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
        const postSiteId = site?.id || null;
        if (!tenantId) {
            toast.error('Missing tenantId');
            return;
        }
        try {
            // Require an existing site tour to attach the tag to
            const tourId = form.siteTourId || currentTourId || null;
            if (!tourId) {
                toast.error('Seleccione una estación o crea una primero');
                return;
            }

            const tagPayload: any = {
                name: form.name || `Tag ${Date.now()}`,
                tagType: form.tagType || '',
                tagIdentifier: form.tagId || undefined,
                location: form.coords || undefined,
                instructions: form.instructions || undefined,
                latitude: form.latitude || undefined,
                longitude: form.longitude || undefined,
                showGeoFence: form.showGeoFence || false,
                stationId: form.stationId || undefined,
                // Optionally link the tag to a shift record
                // shiftId eliminado
            };

            const created = await ApiService.post(`/tenant/${tenantId}/site-tour/${tourId}/tag`, tagPayload);
            toast.success('Etiqueta guardada');
            // Show QR for the created tag so the guard can print/use it
            const value = created && (created.tagIdentifier || created.id || created._id);
            if (value) {
                setQrValue(value);
                setShowQrModal(true);
            }
            // refresh tags list if modal remains open in future
            try { await loadTagsForSite(activeTabKey); } catch (e) {}
            setShowNewTag(false);
        } catch (err: any) {
            console.error('Failed to create tag', err);
            const msg = err?.message || err?.data?.message || 'Error guardando etiqueta';
            toast.error(msg);
        }
    }

    async function loadToursForSite() {
        const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
        const postSiteId = site?.id || '';
        if (!tenantId || !postSiteId) return;
        setLoadingTours(true);
        try {
            const res: any = await ApiService.get(`/tenant/${tenantId}/site-tour?postSiteId=${encodeURIComponent(postSiteId)}&limit=999`);
            const rows = Array.isArray(res) ? res : (res && res.rows) ? res.rows : [];
            setTours(rows || []);
        } catch (e) {
            console.error('Failed loading tours for site', e);
            setTours([]);
        } finally {
            setLoadingTours(false);
        }
    }

    async function loadShiftsForSite() {
        const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
        const postSiteId = site?.id || '';
        if (!tenantId || !postSiteId) return;
        try {
            const res: any = await ApiService.get(`/tenant/${tenantId}/shift?postSiteId=${encodeURIComponent(postSiteId)}&limit=999`);
            const rows = Array.isArray(res) ? res : (res && res.rows) ? res.rows : [];
            setShifts(rows || []);
        } catch (e) {
            console.error('Failed loading shifts for site', e);
            setShifts([]);
        }
    }

    async function createTourAndTag() {
        const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
        const postSiteId = site?.id || null;
        if (!tenantId) {
            toast.error('Missing tenantId');
            return;
        }
        if (!tourForm.name) {
            toast.error('Ingrese un nombre para el recorrido');
            return;
        }
        try {
            const payload: any = { name: tourForm.name, postSiteId };
            if (tourForm.stationId) payload.stationId = tourForm.stationId;
            // Eliminado: no se asigna vigilante al crear recorrido
            const tourResp: any = await ApiService.post(`/tenant/${tenantId}/site-tour`, payload);
            const tourId = tourResp && (tourResp.id || tourResp._id);
            if (!tourId) throw new Error('No se obtuvo id del recorrido');
                // Eliminado: no se crea asignación de vigilante

            // Now create the tag attached to this tour using current form values
            const tagPayload: any = {
                name: form.name || `Tag ${Date.now()}`,
                tagType: form.tagType || '',
                tagIdentifier: form.tagId || undefined,
                location: form.coords || undefined,
                instructions: form.instructions || undefined,
                latitude: form.latitude || undefined,
                longitude: form.longitude || undefined,
                showGeoFence: form.showGeoFence || false,
                stationId: form.stationId || tourForm.stationId || undefined,
                // Optionally link the tag to a shift record
                ...(form.shiftId ? { shiftId: form.shiftId } : {}),
            };

            const created = await ApiService.post(`/tenant/${tenantId}/site-tour/${tourId}/tag`, tagPayload);
            toast.success('Recorrido y etiqueta creados');
            // refresh lists
            await loadToursForSite();
            await loadTagsForSite(activeTabKey);
            setShowCreateTourModal(false);
            setShowNewTag(false);
        } catch (err: any) {
            console.error('Failed creating tour+tag', err);
            const msg = err?.message || err?.data?.message || 'Error creando recorrido o etiqueta';
            toast.error(msg);
        }
    }

    // Load guards for the selected station (or fallback to post-site guards)
    useEffect(() => {
        if (!showCreateTourModal) return;
        let mounted = true;
        (async () => {
            setLoadingGuards(true);
            setGuardLoadError(null);
            const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
            const postSiteId = site?.id || '';
            const stationId = tourForm.stationId || '';
            if (!tenantId || !postSiteId) {
                setLocalGuards([]);
                setLoadingGuards(false);
                return;
            }
                try {
                let data: any = null;
                const ts = Date.now();
                // try station guards with cache-buster + no-cache header
                if (stationId) {
                    try {
                        data = await ApiService.get(`/tenant/${tenantId}/station/${encodeURIComponent(stationId)}/guards?_=${ts}`, { headers: { 'Cache-Control': 'no-cache' } } as any);
                    } catch (e) {
                        data = null;
                    }
                }
                // fallback: query `station` for the postSite and extract embedded guards
                if ((!data || (Array.isArray(data) && data.length === 0) || (data && data.rows && data.rows.length === 0)) && postSiteId) {
                    try {
                        const stationsRes: any = await ApiService.get(`/tenant/${tenantId}/station?postSiteId=${encodeURIComponent(postSiteId)}&_=${ts}`, { headers: { 'Cache-Control': 'no-cache' } } as any);
                        const stationsRows = Array.isArray(stationsRes) ? stationsRes : (stationsRes && (stationsRes.rows || stationsRes.data)) ? (stationsRes.rows || stationsRes.data) : [];
                        let guardsList: any[] = [];
                        if (stationId) {
                            const st = (stationsRows || []).find((s: any) => String(s.id) === String(stationId) || String(s.stationId) === String(stationId));
                            if (st) guardsList = st.assignedGuards || st.guards || st.securityGuards || [];
                        } else {
                            (stationsRows || []).forEach((s: any) => {
                                const g = s.assignedGuards || s.guards || s.securityGuards;
                                if (Array.isArray(g) && g.length) guardsList.push(...g);
                            });
                        }
                        data = guardsList;
                    } catch (e) {
                        data = null;
                    }
                }
                // fallback: if station endpoint returned nothing, try inspecting shifts for guard objects (preferred canonical source)
                if ((!data || (Array.isArray(data) && data.length === 0) || (data && data.rows && data.rows.length === 0)) && stationId) {
                    try {
                        const shiftsQs = `stationId=${encodeURIComponent(stationId)}${postSiteId ? `&postSiteId=${encodeURIComponent(postSiteId)}` : ''}&_=${ts}`;
                        const shiftsResp: any = await ApiService.get(`/tenant/${tenantId}/shift?${shiftsQs}`, { headers: { 'Cache-Control': 'no-cache' } } as any);
                        const shiftRows = Array.isArray(shiftsResp) ? shiftsResp : (shiftsResp && (shiftsResp.rows || shiftsResp.data)) ? (shiftsResp.rows || shiftsResp.data) : [];
                        if (shiftRows && shiftRows.length) {
                            const guardsFromShifts: any[] = [];

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

                            shiftRows.forEach((sh: any) => {
                                const g = extractGuardFromShift(sh);
                                if (g) {
                                    const guardObj = (typeof g === 'object') ? { ...g } : { id: g };
                                    guardObj.stationId = guardObj.stationId || guardObj.station_id || sh.stationId || sh.station_id || stationId;
                                    guardsFromShifts.push(guardObj);
                                }
                            });

                            // Deduplicate guards
                            const seen = new Map<string, any>();
                            guardsFromShifts.forEach((g: any) => {
                                const key = (g && (g.id || g.email || g.username || g._id)) ? String(g.id || g._id || g.email || g.username) : JSON.stringify(g);
                                if (!seen.has(key)) {
                                    const copy = { ...(g || {}) };
                                    const sid = copy.stationId || copy.station_id || null;
                                    if (sid) copy.stations = [String(sid)];
                                    seen.set(key, copy);
                                } else {
                                    const existing = seen.get(key);
                                    const sid = (g && (g.stationId || g.station_id)) ? String(g.stationId || g.station_id) : null;
                                    if (sid) {
                                        existing.stations = Array.isArray(existing.stations) ? existing.stations : (existing.stationId ? [String(existing.stationId)] : []);
                                        if (!existing.stations.includes(sid)) existing.stations.push(sid);
                                        seen.set(key, existing);
                                    }
                                }
                            });

                            if (seen.size) data = Array.from(seen.values());
                        }
                    } catch (e) {
                        // ignore and fallthrough to tenant-level guard lookup
                        data = null;
                    }
                }

                // fallback: tenant security-guard filtered by station
                if ((!data || (Array.isArray(data) && data.length === 0) || (data && data.rows && data.rows.length === 0)) && stationId) {
                    try {
                        data = await ApiService.get(`/tenant/${tenantId}/security-guard?filter[station]=${encodeURIComponent(stationId)}&_=${ts}`, { headers: { 'Cache-Control': 'no-cache' } } as any);
                    } catch (e) {
                        data = null;
                    }
                }
                // last fallback: security-guard by postSiteId
                if ((!data || (Array.isArray(data) && data.length === 0) || (data && data.rows && data.rows.length === 0)) && postSiteId) {
                    try {
                        data = await ApiService.get(`/tenant/${tenantId}/security-guard?postSiteId=${encodeURIComponent(postSiteId)}&_=${ts}`, { headers: { 'Cache-Control': 'no-cache' } } as any);
                    } catch (e) {
                        data = null;
                    }
                }
                // fallback: sometimes station endpoint returns the station list with assignedGuards embedded
                if ((!data || (Array.isArray(data) && data.length === 0) || (data && data.rows && data.rows.length === 0)) && postSiteId) {
                    try {
                        const stationsResp: any = await ApiService.get(`/tenant/${tenantId}/station?postSiteId=${encodeURIComponent(postSiteId)}&limit=999&_=${ts}`, { headers: { 'Cache-Control': 'no-cache' } } as any);
                        const stationsRows = Array.isArray(stationsResp) ? stationsResp : (stationsResp && (stationsResp.rows || stationsResp.data)) ? (stationsResp.rows || stationsResp.data) : [];
                        if (stationId) {
                            const found = (stationsRows || []).find((s: any) => String(s.id) === String(stationId) || String(s.stationId) === String(stationId));
                            if (found) {
                                data = found.assignedGuards || found.guards || [];
                            }
                        }
                        // if still no stationId match, try to collect assignedGuards across stations
                        if ((!data || (Array.isArray(data) && data.length === 0)) && Array.isArray(stationsRows) && stationsRows.length) {
                            const collected: any[] = [];
                            stationsRows.forEach((s: any) => {
                                const arr = s.assignedGuards || s.guards || [];
                                if (Array.isArray(arr) && arr.length) collected.push(...arr);
                            });
                            if (collected.length) data = collected;
                        }
                    } catch (e) {
                        // ignore
                    }
                }
                const list = Array.isArray(data) ? data : (data && (data.rows || data.data)) ? (data.rows || data.data) : [];
                if (mounted) setLocalGuards(list || []);
            } catch (err) {
                console.error('Failed to load guards for station/postsite', err);
                if (mounted) setLocalGuards([]);
                if (mounted) setGuardLoadError('Error loading guards');
            } finally {
                if (mounted) setLoadingGuards(false);
            }
        })();
        return () => { mounted = false; };
    }, [tourForm.stationId, showCreateTourModal, site]);

    async function loadTagsForSite(filterTagType?: string) {
        const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
        if (!tenantId || !site?.id) return;
        setLoadingTags(true);
        try {
            // Query tags for the post site using several possible endpoints (some backends differ)
            const q = filterTagType ? `?tagType=${encodeURIComponent(filterTagType)}` : '';
            const ts = Date.now();
            // 1) Preferred: post-site aggregated endpoint (backend implements this)
            try {
                const sep = q.startsWith('?') ? '&' : (q ? '?' : '?');
                const tagsResp: any = await ApiService.get(`/tenant/${tenantId}/post-site/${encodeURIComponent(site.id)}/site-tour-tags${q}${sep}_=${ts}`);
                const rows = tagsResp && (tagsResp.rows || tagsResp) || [];
                if (rows && rows.length) {
                    setTags(rows);
                    setCurrentTourId(rows[0].siteTourId || rows[0].siteTour || null);
                    return;
                }
            } catch (err) {
                // ignore and try fallbacks (including station-scoped endpoint)
            }

            // 2) Tenant-level aggregated endpoint (postSiteId in path)
            try {
                const qs2 = filterTagType ? `?tagType=${encodeURIComponent(filterTagType)}&_=${ts}` : `?_=${ts}`;
                const tagsResp2: any = await ApiService.get(`/tenant/${tenantId}/post-site/${encodeURIComponent(site.id)}/site-tour-tags${qs2}`);
                const rows2 = tagsResp2 && (tagsResp2.rows || tagsResp2) || [];
                if (rows2 && rows2.length) {
                    setTags(rows2);
                    setCurrentTourId(rows2[0].siteTourId || rows2[0].siteTour || null);
                    return;
                }
            } catch (err) {
                // ignore and try other fallbacks
            }

            // 3) Fallback: fetch tours for the postSite and query tags per tour (some APIs expose tags under each tour)
            try {
                const toursResp: any = await ApiService.get(`/tenant/${tenantId}/site-tour?postSiteId=${encodeURIComponent(site.id)}&limit=999`);
                const toursRows = Array.isArray(toursResp) ? toursResp : (toursResp && toursResp.rows) ? toursResp.rows : [];
                const collected: any[] = [];
                for (const tr of (toursRows || [])) {
                    const tid = tr && (tr.id || tr._id);
                    if (!tid) continue;
                        try {
                        const sep2 = q.startsWith('?') ? '&' : (q ? '?' : '?');
                        const perResp: any = await ApiService.get(`/tenant/${tenantId}/site-tour/${encodeURIComponent(tid)}/tags${q}${sep2}_=${ts}`);
                        const perRows = perResp && (perResp.rows || perResp) || [];
                        if (perRows && perRows.length) collected.push(...perRows);
                        continue;
                    } catch (e1) {
                        // try alternate singular path
                    }
                    try {
                        const sep3 = q.startsWith('?') ? '&' : (q ? '?' : '?');
                        const perResp2: any = await ApiService.get(`/tenant/${tenantId}/site-tour/${encodeURIComponent(tid)}/tag${q}${sep3}_=${ts}`);
                        const perRows2 = perResp2 && (perResp2.rows || perResp2) || [];
                        if (perRows2 && perRows2.length) collected.push(...perRows2);
                    } catch (e2) {
                        // ignore per-tour failures
                    }
                }
                if (collected.length) {
                    // dedupe by id or tagIdentifier
                    const seen = new Map<string, any>();
                    for (const it of collected) {
                        const key = String(it.id || it._id || it.tagIdentifier || JSON.stringify(it));
                        if (!seen.has(key)) seen.set(key, it);
                    }
                    const rowsFinal = Array.from(seen.values());
                    setTags(rowsFinal);
                    setCurrentTourId(rowsFinal[0]?.siteTourId || rowsFinal[0]?.siteTour || null);
                    return;
                }
            } catch (err) {
                // ignore
            }

            // nothing found — clear
            setTags([]);
            setCurrentTourId(null);
        } catch (e: any) {
            // Suppress noisy 404 when tag endpoints are legitimately absent; treat as empty list.
            if (e instanceof ApiError && e.status === 404) {
                setTags([]);
            } else {
                console.error('Failed loading tags', e);
                setTags([]);
            }
        } finally {
            setLoadingTags(false);
        }
    }

    // keep selected ids in sync when tags list changes
    useEffect(() => {
        setSelectedTagIds((prev) => {
            const available = (tags || []).map((t: any, idx: number) => String(t.id || t._id || t.tagIdentifier || idx));
            return prev.filter(id => available.includes(id));
        });
    }, [tags]);

    // keep header checkbox indeterminate state in sync with selections (relative to visible rows)
    useEffect(() => {
        try {
            const total = (filteredTags || []).length;
            const selected = (selectedTagIds || []).length;
            if (headerCheckboxRef.current) {
                headerCheckboxRef.current.indeterminate = selected > 0 && selected < total;
            }
        } catch (e) {
            // ignore
        }
    }, [selectedTagIds, filteredTags]);

    // QR modal state and helpers
    const [showQrModal, setShowQrModal] = useState(false);
    const [qrValue, setQrValue] = useState<string>('');

    useEffect(() => {
        if (showNewTag) {
            loadTagsForSite(activeTabKey);
            loadToursForSite();
            loadShiftsForSite();
            // Initialize map and coord fields from the post-site if available
            try {
                const siteLat = parseFloat(String(site?.latitude || site?.latitud || site?.lat || (site?.coords && site.coords.lat) || ''));
                const siteLng = parseFloat(String(site?.longitude || site?.longitud || site?.lng || (site?.coords && site.coords.lng) || ''));
                if (!isNaN(siteLat) && !isNaN(siteLng)) {
                    update('coords', `${siteLat}, ${siteLng}`);
                    update('latitude', siteLat.toString());
                    update('longitude', siteLng.toString());
                    setMarkerPos({ lat: siteLat, lng: siteLng });
                }
            } catch (e) {
                // ignore malformed values
            }
        }
    }, [showNewTag, activeTabKey]);

    // Initialize Google Map when the create-tag modal opens
    useEffect(() => {
        if (!showNewTag) return;
        let mounted = true;

        const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
        if (!apiKey) return;

        const timer = setTimeout(async () => {
            if (!mounted || !gMapRef.current) return;

            try {
                await loadGoogleMaps();
            } catch (e) {
                console.warn('Google Maps failed to load', e);
                return;
            }

            if (!mounted || !gMapRef.current) return;
            const google = (window as any).google;
            if (!google?.maps) return;

            // Compute initial center from site data (not from potentially-stale markerPos)
            const siteLat = parseFloat(String(site?.latitude || site?.latitud || site?.lat || ''));
            const siteLng = parseFloat(String(site?.longitude || site?.longitud || site?.lng || ''));
            const hasValidCoords = !isNaN(siteLat) && !isNaN(siteLng);
            const center = hasValidCoords
                ? { lat: siteLat, lng: siteLng }
                : { lat: -2.170998, lng: -79.922359 };

            if (gMapInstanceRef.current) {
                // Re-use existing map instance — just pan and trigger resize
                gMapInstanceRef.current.panTo(center);
                try { google.maps.event.trigger(gMapInstanceRef.current, 'resize'); } catch (e) { /* ignore */ }
            } else {
                const map = new google.maps.Map(gMapRef.current, {
                    center,
                    zoom: DEFAULT_MAP_ZOOM,
                    mapTypeId: 'roadmap',
                    mapId: 'DEMO_MAP_ID',
                });
                gMapInstanceRef.current = map;

                map.addListener('click', (e: any) => {
                    if (!mounted) return;
                    const lat = e.latLng.lat();
                    const lng = e.latLng.lng();
                    setMarkerPos({ lat, lng });
                    setForm((s: any) => ({
                        ...s,
                        latitude: lat.toString(),
                        longitude: lng.toString(),
                        coords: `${lat}, ${lng}`,
                    }));
                    setMapError(null);
                    // Update/create marker imperatively
                    if (gMainMarkerRef.current) {
                        try { gMainMarkerRef.current.setPosition({ lat, lng }); } catch (_) {
                            try { gMainMarkerRef.current.position = { lat, lng }; } catch (_2) { /* ignore */ }
                        }
                    } else {
                        gMainMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({ position: { lat, lng }, map });
                    }
                });

                // Place initial marker at site position
                if (hasValidCoords) {
                    gMainMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({ position: center, map });
                }
            }

            // Add station markers
            if (gStationMarkersRef.current.length === 0) {
                const stCoords: { lat: number; lng: number; name?: string }[] = (stations || []).map((s: any) => {
                    const lat = parseFloat(String(s.latitude || s.latitud || s.lat || ''));
                    const lng = parseFloat(String(s.longitude || s.longitud || s.lng || ''));
                    return (!isNaN(lat) && !isNaN(lng)) ? { lat, lng, name: s.stationName || s.name } : null as any;
                }).filter(Boolean);
                gStationMarkersRef.current = stCoords.map((sc: any) =>
                    new google.maps.marker.AdvancedMarkerElement({ position: { lat: sc.lat, lng: sc.lng }, map: gMapInstanceRef.current, title: sc.name || 'Station' })
                );
            }
        }, 150);

        return () => { mounted = false; clearTimeout(timer); };
    }, [showNewTag]);

    useEffect(() => {
        // load stations for quick mapping (quick solution)
        let mounted = true;
        (async () => {
            const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
            const postSiteId = site?.id || '';
            if (!tenantId || !postSiteId) return;
            try {
                setLoadingStations(true);
                const res: any = await ApiService.get(`/tenant/${tenantId}/station?postSiteId=${encodeURIComponent(postSiteId)}&limit=999`);
                const rows = Array.isArray(res) ? res : (res && res.rows) ? res.rows : [];
                if (mounted) setStations(rows || []);
            } catch (e) {
                console.error('Failed loading stations for site', e);
                if (mounted) setStations([]);
            } finally {
                if (mounted) setLoadingStations(false);
            }
        })();
        return () => { mounted = false; };
    }, [site]);

    // Load tags when component mounts or when site changes
    useEffect(() => {
        loadTagsForSite(activeTabKey);
    }, [site, activeTabKey]);

    function openQrFor(value: string) {
        setQrValue(value);
        setShowQrModal(true);
    }

    async function printQr() {
        if (!qrValue) return;
        const url = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrValue)}`;
        try {
            const resp = await fetch(url, { cache: 'no-store' });
            const blob = await resp.blob();
            const dataUrl: string = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });

            const w = window.open('', '_blank');
            if (!w) {
                toast.error('No se pudo abrir la ventana de impresión');
                return;
            }

            const html = `<!doctype html><html><head><meta charset="utf-8"><title>QR</title><style>html,body{height:100%;}body{display:flex;align-items:center;justify-content:center;height:100vh;margin:0}img{max-width:90%;height:auto;display:block}</style></head><body><img src="${dataUrl}" alt="QR"/></body></html>`;
            w.document.write(html);
            w.document.close();
            // wait for image to load inside new window then print
            const tryPrint = () => {
                try {
                    w.focus();
                    w.print();
                    setTimeout(() => w.close(), 500);
                } catch (e) {
                    console.error('Print failed', e);
                    try { w.close(); } catch (_) {}
                }
            };

            // If the image hasn't loaded yet, set a short timeout to allow rendering
            setTimeout(tryPrint, 200);
        } catch (err) {
            console.error('Failed fetching QR image', err);
            // fallback: open the image URL directly and attempt to print (may be blocked by CORS)
            const w = window.open('', '_blank');
            if (!w) { toast.error('No se pudo abrir la ventana de impresión'); return; }
            w.document.write(`<!doctype html><html><head><title>QR</title></head><body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><img src="${url}" style="max-width:100%;height:auto;"/></body></html>`);
            w.document.close();
            w.focus();
            setTimeout(() => {
                try { w.print(); setTimeout(() => w.close(), 500); } catch (e) { console.error(e); }
            }, 500);
        }
    }

    // Google Maps implementation is used instead of Leaflet.

    return (
        <div ref={containerRef} className="space-y-4">
            <div className="bg-card border rounded-lg p-4">
                <div className="mb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <div className="border-b">
                                <nav className="flex">
                                    {tabOptions.map((ti) => (
                                        <button
                                            key={ti.key}
                                            onClick={() => { setActiveTabKey(ti.key); update('tagType', ti.key); }}
                                            className={`flex-1 text-center py-4 border-b-2 ${activeTabKey === ti.key ? 'border-violet-600 text-violet-600' : 'border-transparent text-foreground/70'}`}
                                        >
                                            {ti.label}
                                        </button>
                                    ))}
                                </nav>
                            </div>
                        </div>

                        <div className="flex-shrink-0 ml-4">
                            <button onClick={() => setShowNewTag(true)} className="inline-flex items-center gap-3 bg-[#C8860A] text-white px-4 py-2 rounded-full hover:bg-[#B37809]">
                                <span className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center">
                                    <Plus size={14} />
                                </span>
                                <span className="text-sm font-medium">{t('siteTourTag.newTagButton', 'New Tag')}</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-4 mb-4">
                    <div ref={actionRef} className="relative">
                        <button
                            onClick={() => setActionOpen(v => !v)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border bg-card"
                        >
                            <span className="text-sm">{t('siteTourTag.action')}</span>
                            <ChevronDown size={14} />
                        </button>

                        {actionOpen && (
                            <div className="absolute left-0 mt-2 w-40 bg-card border rounded-md shadow-lg z-20">
                                {(actionOptionsMap[activeTabKey] || []).map((opt: string) => {
                                    const disabled = !(selectedTagIds && selectedTagIds.length > 0);
                                    return (
                                        <button
                                            key={opt}
                                            onClick={() => {
                                                if (disabled) return;
                                                handleActionChange(activeTabKey, opt);
                                                setActionOpen(false);
                                            }}
                                            disabled={disabled}
                                            className={`block w-full text-left px-4 py-2 text-sm hover:bg-muted/30 ${disabled ? 'text-muted-foreground cursor-not-allowed' : ''}`}
                                        >
                                            {t(`siteTourTag.actions.${opt}`)}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* action buttons removed — use dropdown actions */}

                    <div className="w-1/3">
                        <input
                            value={searchQuery[activeTabKey] || ''}
                            onChange={(e) => setSearchQuery((s) => ({ ...s, [activeTabKey]: e.target.value }))}
                            placeholder={t('siteTourTag.searchPlaceholder')}
                            className="w-full border rounded-full px-4 py-2"
                        />
                    </div>
                </div>

                <div className="mt-6">
                    <div className="md:block hidden overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted/30">
                                    <tr>
                                        <th className="px-4 py-3 w-12 text-center">
                                            <div className="flex items-center justify-center">
                                                <input
                                                    ref={headerCheckboxRef}
                                                    type="checkbox"
                                                    className="h-4 w-4"
                                                    checked={(filteredTags || []).length > 0 && selectedTagIds.length === (filteredTags || []).length}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedTagIds((filteredTags || []).map((t: any, i: number) => getTagId(t, i)));
                                                        } else {
                                                            setSelectedTagIds([]);
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 text-left">{t('siteTourTag.table.name')}</th>
                                        <th className="px-4 py-3 text-left">{activeTabKey === 'virtual' ? t('siteTourTag.table.geofenceRadius') : t('siteTourTag.table.tagId')}</th>
                                        <th className="px-4 py-3 text-right">&nbsp;</th>
                                    </tr>
                            </thead>
                            <tbody>
                                {filteredTags && filteredTags.length > 0 ? (
                                    filteredTags.map((tag, idx) => {
                                        // Resolve associated shift (if any) loaded into `shifts` state
                                        const shiftId = tag.shiftId || tag.shift?.id || tag.siteTourShiftId || null;
                                        const shift = shiftId ? (shifts || []).find((s: any) => String(s.id) === String(shiftId)) : null;
                                        const guardName = shift ? getGuardNameFromShift(shift) : null;
                                        const stationName = shift && (shift.station?.stationName || shift.station?.name) ? (shift.station.stationName || shift.station.name) : (shift && shift.stationName) ? shift.stationName : null;
                                        const start = shift && shift.startTime ? new Date(shift.startTime).toLocaleString('es', { timeZone: getTenantTimezone() }) : null;
                                        const shiftLabel = shift ? `${guardName ?? 'Guard'}${stationName ? ' — ' + stationName : ''}${start ? ' (' + start + ')' : ''}` : null;

                                        return (
                                            <tr key={tag.id || (tag as any)._id || tag.tagIdentifier || idx} className="border-t">
                                                <td className="px-4 py-3 text-center w-12">
                                                    <div className="flex items-center justify-center">
                                                        {(() => {
                                                            const rowId = getTagId(tag, idx);
                                                            return (
                                                                <input
                                                                    type="checkbox"
                                                                    className="h-4 w-4"
                                                                    checked={selectedTagIds.includes(rowId)}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) toggleTagSelection(rowId);
                                                                        else toggleTagSelection(rowId);
                                                                    }}
                                                                />
                                                            );
                                                        })()}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <div className="font-medium">{tag.name}</div>
                                                        {shiftLabel && <div className="text-xs text-muted-foreground">{shiftLabel}</div>}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 break-words">{tag.tagIdentifier || tag.id || (tag as any)._id}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <button onClick={() => openQrFor(tag.tagIdentifier || tag.id || (tag as any)._id)} className="px-3 py-1 bg-[#C8860A] text-white rounded">{t('siteTourTag.qrButton', 'QR')}</button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-12">
                                            <div className="flex flex-col items-center justify-center gap-4">
                                                <div className="w-40 h-40">
                                                    <svg viewBox="0 0 200 200" className="w-full h-full text-[#C8860A]/10">
                                                        <rect x="40" y="48" width="120" height="84" fill="currentColor" rx="10" />
                                                        <path d="M60 78 L140 78" stroke="white" strokeWidth="3" strokeLinecap="round" />
                                                        <circle cx="90" cy="100" r="6" fill="white" />
                                                        <circle cx="110" cy="100" r="6" fill="white" />
                                                    </svg>
                                                </div>
                                                <div className="text-center">
                                                    <h3 className="text-lg font-semibold text-foreground">{t('siteTourTag.empty.title')}</h3>
                                                    <p className="text-sm text-muted-foreground mt-1">{t('siteTourTag.empty.message')}</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="md:hidden">
                        <MobileCardList items={[]} renderCard={(it: any) => (
                            <div className="p-4 bg-card border rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-semibold">{it.name || t('siteTourTag.placeholders.tagName')}</div>
                                        <div className="text-xs text-muted-foreground">{it.tagId || it.id || '-'}</div>
                                    </div>
                                </div>
                            </div>
                        )} />
                    </div>
                </div>
            </div>

            {showNewTag && (
                <div className="fixed inset-0 z-50 flex items-stretch">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowNewTag(false)} />

                    <aside className="relative w-full sm:ml-auto sm:max-w-sm h-screen bg-card shadow-xl overflow-hidden rounded-none sm:rounded-lg flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="text-lg font-semibold">{t('siteTourTag.modal.title')}</h3>
                            <button onClick={() => setShowNewTag(false)} className="p-2 text-muted-foreground hover:text-foreground">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            <div>
                                <input value={form.tagType} readOnly className="w-full border rounded-lg h-12 px-3" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">{t('siteTourTag.form.siteTour') || 'Recorrido'}</label>
                                <div className="flex flex-col gap-2 min-w-0 overflow-hidden">
                                        <select value={form.siteTourId || ''} onChange={(e) => update('siteTourId', e.target.value)} className="w-full px-3 py-2 h-12 border rounded-md">
                                            <option value="">{loadingTours ? t('siteTourTag.form.loadingTours', 'Cargando recorridos...') : (t('siteTourTag.form.selectTour') || 'Seleccione una recorrido')}</option>
                                            {tours.map((tr: any) => (
                                                <option key={tr.id || tr._id} value={tr.id || tr._id}>{tr.name || tr.title || `Recorrido ${tr.id || tr._id}`}</option>
                                            ))}
                                        </select>



                                    <div className="mt-1">
                                        <button onClick={() => { setShowCreateTourModal(true); setTourForm({ name: '', stationId: form.stationId || '' }); }} className="w-full px-3 py-2 bg-violet-600 text-white rounded-md">{t('siteTourTag.form.createTourAndTag') || 'Crear recorrido y etiqueta'}</button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder={t('siteTourTag.form.name')} className="w-full border rounded-lg h-12 px-3" />
                                <input value={form.tagId} onChange={(e) => update('tagId', e.target.value)} placeholder={t('siteTourTag.form.tagId')} className="w-full border rounded-lg h-12 px-3" />
                            </div>

                            {/* location field removed to avoid duplicate coordinate inputs; use `coords` instead */}

                            <div>
                                <textarea value={form.instructions} onChange={(e) => update('instructions', e.target.value)} placeholder={t('siteTourTag.form.instructions')} className="w-full border rounded-lg px-3 py-3 min-h-[120px]" />
                            </div>

                            {/*<div className="flex items-center gap-3">
                                <label className="flex items-center gap-2"><input type="checkbox" checked={form.askQuestions} onChange={e => update('askQuestions', e.target.checked)} /> {t('siteTourTag.form.askQuestionsLabel')}</label>
                            </div>
                            */}
                            { !form.stationId ? (
                                <>


                                    {/* Solo se muestra el error del mapa si existe, pero no los campos lat/lng ni el botón de ubicar */}
                                    {mapError && (
                                        <div className="text-sm text-red-600 mt-2">{mapError}</div>
                                    )}

                                    <div className="border rounded-md overflow-hidden">
                                        <div style={{ height: '60vh', minHeight: 220 }}>
                                            <div ref={gMapRef} style={{ height: '100%', width: '100%' }} />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">{t('siteTourTag.form.mapToStationLabel', 'Map to station (quick)')}</label>
                                    <select value={form.stationId || ''} onChange={e => update('stationId', e.target.value)} className="w-full px-3 py-2 h-12 border rounded-md text-sm text-foreground">
                                        <option value="">{loadingStations ? t('siteTourTag.form.loadingStations', 'Loading stations...') : t('siteTourTag.form.selectStationOptional', 'Select station (optional)')}</option>
                                        {stations.map((s: any) => (
                                            <option key={s.id || s.stationId} value={s.id || s.stationId}>{s.stationName || s.name || s.station_name || s.stationId || s.id}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/*<div className="flex items-center gap-3">
                                <label className="flex items-center gap-2"><input type="checkbox" checked={form.showGeoFence} onChange={e => update('showGeoFence', e.target.checked)} /> {t('siteTourTag.form.showGeoFence')}</label>
                            </div>*/}

                            {/* duplicated map removed (single map above handles both markerPos and stations) */}
                        </div>

                        <div className="p-4 border-t">
                            <div className="flex justify-between items-center">
                                <div>
                                    <button onClick={() => { setShowNewTag(false); }} className="px-4 py-2 rounded-full bg-muted text-foreground">Save As Draft</button>
                                </div>
                                <div>
                                        <button
                                            onClick={() => submitTag()}
                                            disabled={!(form.siteTourId || currentTourId)}
                                            className={`ml-2 inline-flex items-center justify-center px-4 py-2 rounded-full shadow ${!(form.siteTourId || currentTourId) ? 'bg-gray-300 text-foreground/70 cursor-not-allowed' : 'bg-[#C8860A] text-white hover:bg-[#B37809]'}`}
                                        >
                                            <span className="text-sm font-semibold">{t('siteTourTag.modal.submit') || 'Submit'}</span>
                                        </button>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            )}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-60 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowDeleteConfirm(false)} />

                    <div className="relative bg-card rounded-lg p-6 max-w-lg w-full">
                        <div className="flex justify-between items-start">
                            <h3 className="text-lg font-semibold">{t('siteTourTag.confirm.deleteTitle','Confirmar eliminación')}</h3>
                            <button onClick={() => setShowDeleteConfirm(false)} className="p-2 text-muted-foreground hover:text-foreground">
                                <X size={18} />
                            </button>
                        </div>
                        <p className="mt-3 text-sm text-foreground/70">{t('siteTourTag.confirm.deleteMessage','¿Eliminar las etiquetas seleccionadas? Esta acción no se puede deshacer.')}</p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 rounded border bg-card text-sm">{t('siteTourTag.confirm.cancel','Cancelar')}</button>
                            <button onClick={async () => { setShowDeleteConfirm(false); await bulkDeleteSelectedTags(); }} className="px-4 py-2 rounded bg-red-600 text-white text-sm">{t('siteTourTag.confirm.confirm','Eliminar')}</button>
                        </div>
                    </div>
                </div>
            )}
            {showQrModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowQrModal(false)} />

                    <div className="relative bg-card rounded-lg p-4 max-w-sm w-full">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">{t('siteTourTag.qrModal.title', 'QR')}</h3>
                            <button onClick={() => setShowQrModal(false)} className="p-2 text-muted-foreground hover:text-foreground">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex flex-col items-center gap-4">
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrValue)}`}
                                alt="QR code"
                                className="max-w-full"
                            />
                            <div className="text-sm text-foreground break-words">{qrValue}</div>

                            <div className="flex gap-2">
                                <button onClick={printQr} className="px-4 py-2 bg-[#C8860A] text-white rounded">{t('siteTourTag.qrModal.print', 'Print')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {showCreateTourModal && (
                <div className="fixed inset-0 z-60 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreateTourModal(false)} />

                    <div className="relative bg-card rounded-lg p-4 max-w-sm w-full">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">{t('siteTour.form.createTitle') || 'Crear recorrido'}</h3>
                            <button onClick={() => setShowCreateTourModal(false)} className="p-2 text-muted-foreground hover:text-foreground">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <input value={tourForm.name} onChange={(e) => setTourForm((s: any) => ({ ...s, name: e.target.value }))} placeholder={t('siteTour.form.name') || 'Nombre del recorrido'} className="w-full border rounded-lg h-12 px-3" />

                            <div>
                                <label className="block text-sm text-foreground mb-2">{t('siteTour.form.station') || 'Estación (opcional)'}</label>
                                <select value={tourForm.stationId || ''} onChange={(e) => setTourForm((s: any) => ({ ...s, stationId: e.target.value }))} className="w-full px-3 py-2 h-12 border rounded-md text-sm">
                                    <option value="">{loadingStations ? 'Cargando estaciones...' : (t('siteTour.form.selectStation') || 'Sin estación')}</option>
                                    {stations.map((s: any) => (
                                        <option key={s.id || s.stationId} value={s.id || s.stationId}>{s.stationName || s.name || s.station_name || s.id}</option>
                                    ))}
                                </select>
                            </div>


                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            <button onClick={() => setShowCreateTourModal(false)} className="px-4 py-2 border rounded-md h-12 flex items-center">{t('common.cancel') || 'Cancelar'}</button>
                            <button onClick={() => createTourAndTag()} className="px-4 py-2 bg-violet-600 text-white rounded-md whitespace-nowrap h-12 flex items-center">{t('siteTour.form.createAndAttach') || 'Crear recorrido y etiqueta'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
