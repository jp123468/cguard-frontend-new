import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, X, ChevronDown } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, useMapEvents, Popup } from 'react-leaflet';
// Use an embedded SVG data URL for the marker icon to avoid asset resolution issues in Vite
const svgMarker = `
<svg xmlns='http://www.w3.org/2000/svg' width='28' height='41' viewBox='0 0 28 41'>
    <defs>
        <filter id='s' x='-50%' y='-50%' width='200%' height='200%'>
            <feDropShadow dx='0' dy='1' stdDeviation='1' flood-color='#000' flood-opacity='0.25'/>
        </filter>
    </defs>
    <path filter='url(#s)' d='M14 0 C8 0 2.5 5.5 2.5 11.7 C2.5 20.3 14 41 14 41 C14 41 25.5 20.3 25.5 11.7 C25.5 5.5 20 0 14 0 Z' fill='#FF5722'/>
    <circle cx='14' cy='12' r='5.5' fill='white'/>
    <circle cx='14' cy='12' r='3' fill='#FF5722'/>
</svg>`;

// We'll use a div icon per-marker to ensure the SVG renders fully
import { ApiService } from '@/services/api/apiService';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import MobileCardList from '@/components/responsive/MobileCardList';

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
    const customDivIcon = useMemo(() => L.divIcon({
        html: svgMarker,
        className: 'custom-marker',
        iconSize: [28, 41],
        iconAnchor: [14, 41],
    }), []);
    const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
    const [tags, setTags] = useState<any[]>([]);
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
    const stationsCoords = useMemo<{ lat: number; lng: number; name?: string }[]>(() => {
        return (stations || []).map((s: any) => {
            const lat = parseFloat(String(s.latitude || s.latitud || s.lat || (s.coords && s.coords.lat) || ''));
            const lng = parseFloat(String(s.longitude || s.longitud || s.lng || (s.coords && s.coords.lng) || ''));
            if (!isNaN(lat) && !isNaN(lng)) return { lat, lng, name: s.stationName || s.name || s.station_name };
            return null as any;
        }).filter((x: any) => x) as { lat: number; lng: number; name?: string }[];
    }, [stations]);

    const initialCenter = useMemo(() => {
        if (markerPos) return [markerPos.lat, markerPos.lng];
        if (stationsCoords && stationsCoords.length > 0) return [stationsCoords[0].lat, stationsCoords[0].lng];
        if (!isNaN(parseFloat(String(form.latitude))) && !isNaN(parseFloat(String(form.longitude)))) return [parseFloat(String(form.latitude)), parseFloat(String(form.longitude))];
        return [-2.170998, -79.922359];
    }, [markerPos, stationsCoords, form.latitude, form.longitude]);
    // Small wrapper to avoid strict react-leaflet prop typing in this file
    const MapWrapper: any = (props: any) => <MapContainer {...props} />;
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
        } else if (mapInstance && typeof mapInstance.getCenter === 'function') {
            const center = mapInstance.getCenter();
            lat = center.lat;
            lng = center.lng;
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
        // Center the map to the chosen coordinates
        if (mapInstance && typeof mapInstance.flyTo === 'function') {
            try {
                mapInstance.flyTo([lat, lng], 16);
            } catch (e) {
                // fallback to setView if flyTo isn't available
                if (typeof mapInstance.setView === 'function') mapInstance.setView([lat, lng], 16);
            }
        }
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

    // When marker position changes, center the map there
    useEffect(() => {
        if (markerPos && mapInstance) {
            const zoom = typeof mapInstance.getZoom === 'function' ? mapInstance.getZoom() : 16;
            if (typeof mapInstance.flyTo === 'function') {
                mapInstance.flyTo([markerPos.lat, markerPos.lng], zoom);
            } else if (typeof mapInstance.setView === 'function') {
                mapInstance.setView([markerPos.lat, markerPos.lng], zoom);
            }
        }
    }, [markerPos, mapInstance]);

    function MapClickHandler() {
        useMapEvents({
            click(e) {
                const lat = e.latlng.lat;
                const lng = e.latlng.lng;
                setMarkerPos({ lat, lng });
                update('latitude', lat.toString());
                update('longitude', lng.toString());
                update('coords', `${lat}, ${lng}`);
                setMapError(null);
            },
        });
        return null;
    }

    const [searchQuery, setSearchQuery] = useState<Record<string, string>>({});
    const actionOptionsMap: Record<string, string[]> = {
        qr: ['delete', 'print'],
        nfc: ['delete'],
        virtual: ['delete'],
        ble: ['delete'],
    };

    function handleActionChange(tabKey: string, opt: string) {
        if (opt === 'delete') {
            toast('Delete action not implemented');
            return;
        }
        if (opt === 'print') {
            toast('Print action not implemented');
            return;
        }
        toast(opt);
    }

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
                toast.error('Seleccione un recorrido o crea uno primero');
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
                ...(form.shiftId ? { shiftId: form.shiftId } : {}),
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
            // include assigned guard if selected
            if (tourForm.securityGuardId) payload.securityGuardId = tourForm.securityGuardId;
            const tourResp: any = await ApiService.post(`/tenant/${tenantId}/site-tour`, payload);
            const tourId = tourResp && (tourResp.id || tourResp._id);
            if (!tourId) throw new Error('No se obtuvo id del recorrido');
                // Persist assignment with richer data so QR/tag flows can read it later
                async function createAssignment(tourId: string, guardId?: string | null, stationId?: string | null) {
                    const tId = site?.tenantId || localStorage.getItem('tenantId') || '';
                    if (!tId || !tourId || !guardId) return null;
                    try {
                        // No explicit start/end provided here; set status and importHash
                        const body: any = {
                            securityGuardId: guardId,
                            stationId: stationId || null,
                            postSiteId: postSiteId || null,
                            startAt: null,
                            endAt: null,
                            status: 'assigned',
                            importHash: `ui-${Date.now()}`,
                        };
                        const resp = await ApiService.post(`/tenant/${tId}/site-tour/${tourId}/assign`, body);
                        return resp;
                    } catch (e) {
                        console.error('Failed creating assignment', e);
                        return null;
                    }
                }

                if (tourForm.securityGuardId) {
                    try { await createAssignment(tourId, tourForm.securityGuardId, tourForm.stationId || null); } catch (e) { /* ignore */ }
                }

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
            // Query tags for the post site directly (covers all tours under the site)
            const q = filterTagType ? `?tagType=${encodeURIComponent(filterTagType)}` : '';
            const tagsResp: any = await ApiService.get(`/tenant/${tenantId}/stations/${site.id}/site-tour-tags${q}`);
            // eslint-disable-next-line no-console
            console.debug('loadTagsForSite: tagsResp', tagsResp);
            const rows = tagsResp && (tagsResp.rows || tagsResp) || [];
            setTags(rows);
            // infer a currentTourId if present on first row
            if (rows && rows.length > 0) {
                setCurrentTourId(rows[0].siteTourId || rows[0].siteTour || null);
            } else {
                setCurrentTourId(null);
            }
        } catch (e) {
            console.error('Failed loading tags', e);
            setTags([]);
        } finally {
            setLoadingTags(false);
        }
    }

    // QR modal state and helpers
    const [showQrModal, setShowQrModal] = useState(false);
    const [qrValue, setQrValue] = useState<string>('');

    useEffect(() => {
        if (showNewTag) {
            loadTagsForSite(activeTabKey);
            loadToursForSite();
            loadShiftsForSite();
        }
    }, [showNewTag, activeTabKey]);

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

    function printQr() {
        if (!qrValue) return;
        const url = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrValue)}`;
        const w = window.open('', '_blank');
        if (!w) {
            toast.error('No se pudo abrir la ventana de impresión');
            return;
        }
        w.document.write(`<!doctype html><html><head><title>QR</title></head><body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><img src="${url}" style="max-width:100%;height:auto;"/></body></html>`);
        w.document.close();
        w.focus();
        // give the image a moment to load before printing
        setTimeout(() => {
            try {
                w.print();
                // optionally close after print
                setTimeout(() => w.close(), 500);
            } catch (e) {
                console.error(e);
            }
        }, 250);
    }

    // Google Maps implementation is used instead of Leaflet.

    return (
        <div className="space-y-4">
            <div className="bg-white border rounded-lg p-4">
                <div className="mb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <div className="border-b">
                                <nav className="flex">
                                    {tabOptions.map((ti) => (
                                        <button
                                            key={ti.key}
                                            onClick={() => { setActiveTabKey(ti.key); update('tagType', ti.key); }}
                                            className={`flex-1 text-center py-4 border-b-2 ${activeTabKey === ti.key ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-600'}`}
                                        >
                                            {ti.label}
                                        </button>
                                    ))}
                                </nav>
                            </div>
                        </div>

                        <div className="flex-shrink-0 ml-4">
                            <button onClick={() => setShowNewTag(true)} className="inline-flex items-center gap-3 bg-orange-600 text-white px-4 py-2 rounded-full hover:bg-orange-700">
                                <span className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center">
                                    <Plus size={14} />
                                </span>
                                <span className="text-sm font-medium">New Tag</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-4 mb-4">
                    <div ref={actionRef} className="relative">
                        <button
                            onClick={() => setActionOpen(v => !v)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border bg-white"
                        >
                            <span className="text-sm">{t('siteTourTag.action')}</span>
                            <ChevronDown size={14} />
                        </button>

                        {actionOpen && (
                            <div className="absolute left-0 mt-2 w-40 bg-white border rounded-md shadow-lg z-20">
                                {(actionOptionsMap[activeTabKey] || []).map((opt: string) => (
                                    <button
                                        key={opt}
                                        onClick={() => { handleActionChange(activeTabKey, opt); setActionOpen(false); }}
                                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                                    >
                                        {t(`siteTourTag.actions.${opt}`)}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

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
                            <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3"><input type="checkbox" /></th>
                                        <th className="px-4 py-3 text-left">{t('siteTourTag.table.name')}</th>
                                        <th className="px-4 py-3 text-left">{activeTabKey === 'virtual' ? t('siteTourTag.table.geofenceRadius') : t('siteTourTag.table.tagId')}</th>
                                        <th className="px-4 py-3 text-right">&nbsp;</th>
                                    </tr>
                            </thead>
                            <tbody>
                                {tags && tags.length > 0 ? (
                                    tags.map((tag) => {
                                        // Resolve associated shift (if any) loaded into `shifts` state
                                        const shiftId = tag.shiftId || tag.shift?.id || tag.siteTourShiftId || null;
                                        const shift = shiftId ? (shifts || []).find((s: any) => String(s.id) === String(shiftId)) : null;
                                        const guardName = shift ? getGuardNameFromShift(shift) : null;
                                        const stationName = shift && (shift.station?.stationName || shift.station?.name) ? (shift.station.stationName || shift.station.name) : (shift && shift.stationName) ? shift.stationName : null;
                                        const start = shift && shift.startTime ? new Date(shift.startTime).toLocaleString() : null;
                                        const shiftLabel = shift ? `${guardName ?? 'Guard'}${stationName ? ' — ' + stationName : ''}${start ? ' (' + start + ')' : ''}` : null;

                                        return (
                                            <tr key={tag.id || (tag as any)._id || tag.tagIdentifier} className="border-t">
                                                <td className="px-4 py-3"><input type="checkbox" /></td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <div className="font-medium">{tag.name}</div>
                                                        {shiftLabel && <div className="text-xs text-gray-500">{shiftLabel}</div>}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 break-words">{tag.tagIdentifier || tag.id || (tag as any)._id}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <button onClick={() => openQrFor(tag.tagIdentifier || tag.id || (tag as any)._id)} className="px-3 py-1 bg-orange-600 text-white rounded">QR</button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-12">
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
                                                    <h3 className="text-lg font-semibold text-gray-700">{t('siteTourTag.empty.title')}</h3>
                                                    <p className="text-sm text-gray-500 mt-1">{t('siteTourTag.empty.message')}</p>
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
                            <div className="p-4 bg-white border rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-semibold">{it.name || t('siteTourTag.placeholders.tagName')}</div>
                                        <div className="text-xs text-gray-500">{it.tagId || it.id || '-'}</div>
                                    </div>
                                </div>
                            </div>
                        )} />
                    </div>
                </div>
            </div>

            {showNewTag && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowNewTag(false)} />

                    <aside className="relative w-full sm:ml-auto sm:max-w-sm bg-white shadow-xl overflow-hidden rounded-t-lg sm:rounded-lg max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="text-lg font-semibold">{t('siteTourTag.modal.title')}</h3>
                            <button onClick={() => setShowNewTag(false)} className="p-2 text-gray-500 hover:text-gray-700">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            <div>
                                <div className="mb-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-semibold">{t('siteTourTag.modal.title') || 'Existing tags'}</h4>
                                        <button onClick={() => loadTagsForSite(activeTabKey)} className="text-sm px-2 py-1 border rounded">{t('siteTourTag.modal.refresh') || 'Refresh'}</button>
                                    </div>
                                    <div className="mt-3">
                                        {loadingTags ? <div className="text-sm text-gray-500">Cargando...</div> : (
                                            tags.length === 0 ? <div className="text-sm text-gray-500">No hay etiquetas</div> : (
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="text-left">
                                                            <th className="px-2 py-1">{t('siteTourTag.table.name')}</th>
                                                            <th className="px-2 py-1">{t('siteTourTag.table.tagId')}</th>
                                                            <th className="px-2 py-1" />
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {tags.map(tag => (
                                                            <tr key={tag.id} className="border-t">
                                                                <td className="px-2 py-2">{tag.name}</td>
                                                                <td className="px-2 py-2 break-words">{tag.tagIdentifier || tag.id}</td>
                                                                <td className="px-2 py-2 text-right">
                                                                    <button onClick={() => openQrFor(tag.tagIdentifier || tag.id)} className="px-3 py-1 bg-orange-600 text-white rounded">QR</button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <input value={form.tagType} readOnly className="w-full border rounded-lg h-12 px-3" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('siteTourTag.form.siteTour') || 'Recorrido'}</label>
                                <div className="flex gap-2">
                                        <select value={form.siteTourId || ''} onChange={(e) => update('siteTourId', e.target.value)} className="flex-1 px-3 py-2 border rounded-md">
                                            <option value="">{loadingTours ? 'Cargando recorridos...' : (t('siteTourTag.form.selectTour') || 'Seleccione un recorrido')}</option>
                                            {tours.map((tr: any) => (
                                                <option key={tr.id || tr._id} value={tr.id || tr._id}>{tr.name || tr.title || `Recorrido ${tr.id || tr._id}`}</option>
                                            ))}
                                        </select>
                                        <select value={form.shiftId || ''} onChange={(e) => update('shiftId', e.target.value)} className="px-3 py-2 border rounded-md">
                                            <option value="">{shifts && shifts.length ? 'Attach to shift (optional)' : 'No shifts'}</option>
                                            {shifts.map((sh: any) => {
                                                const guardName = getGuardNameFromShift(sh) || 'Guard';
                                                const stationName = (sh.station && (sh.station.stationName || sh.station.name)) || sh.stationName || '';
                                                const start = sh.startTime ? new Date(sh.startTime).toLocaleString() : '';
                                                const label = `${guardName}${stationName ? ' - ' + stationName : ''}${start ? ' (' + start + ')' : ''}`;
                                                return <option key={sh.id} value={sh.id}>{label}</option>;
                                            })}
                                        </select>
                                        <button onClick={() => { setShowCreateTourModal(true); setTourForm({ name: '', stationId: form.stationId || '' }); }} className="px-3 py-2 bg-violet-600 text-white rounded-md">{t('siteTourTag.form.createTourAndTag') || 'Crear recorrido y etiqueta'}</button>
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
                                    <div className="grid grid-cols-3 gap-4 items-center">
                                        <input value={form.coords} onChange={(e) => {
                                            update('coords', e.target.value);
                                            const parts = String(e.target.value).split(',').map(p => p.trim());
                                            if (parts.length >= 2) {
                                                const lat = parseFloat(parts[0]);
                                                const lng = parseFloat(parts[1]);
                                                if (!isNaN(lat) && !isNaN(lng)) {
                                                    update('latitude', lat.toString());
                                                    update('longitude', lng.toString());
                                                    setMarkerPos({ lat, lng });
                                                }
                                            }
                                        }} placeholder="Lat, Lng" className="col-span-2 w-full border rounded-lg h-12 px-3" />

                                        <div className="col-span-1">
                                            <button onClick={handleLocateInMap} className="w-full px-4 py-2 border rounded-md">{t('siteTourTag.form.mapLocation')}</button>
                                        </div>
                                    </div>

                                    {mapError && (
                                        <div className="text-sm text-red-600 mt-2">{mapError}</div>
                                    )}

                                    {/* Only show the textual Lat/Lng if the single 'coords' input is empty to avoid duplicate display */}
                                    {!form.coords && (
                                        <div className="text-sm text-gray-600 mt-2">{form.latitude && form.longitude ? `Lat: ${form.latitude} | Lng: ${form.longitude}` : 'No coordinates selected'}</div>
                                    )}

                                    <div className="border rounded-md overflow-hidden">
                                        <div style={{ height: 220 }}>
                                            <MapWrapper
                                                center={initialCenter}
                                                zoom={13}
                                                style={{ height: '100%', width: '100%' }}
                                                whenCreated={(map: any) => setMapInstance(map as L.Map)}
                                            >
                                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                                {markerPos ? (
                                                    <Marker position={[markerPos.lat, markerPos.lng]} icon={customDivIcon}>
                                                        <Popup>{`Selected: ${markerPos.lat.toFixed(6)}, ${markerPos.lng.toFixed(6)}`}</Popup>
                                                    </Marker>
                                                ) : null}
                                                {/* render station markers */}
                                                {stationsCoords.map((sc: any, idx: number) => (
                                                    <Marker key={`st-${idx}`} position={[sc.lat, sc.lng]}>
                                                        <Popup>{sc.name || 'Station'}</Popup>
                                                    </Marker>
                                                ))}
                                                <MapClickHandler />
                                            </MapWrapper>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Map to station (quick)</label>
                                    <select value={form.stationId || ''} onChange={e => update('stationId', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm text-gray-700">
                                        <option value="">{loadingStations ? 'Loading stations...' : 'Select station (optional)'}</option>
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
                                    <button onClick={() => { setShowNewTag(false); }} className="px-4 py-2 rounded-full bg-gray-100 text-gray-700">Save As Draft</button>
                                </div>
                                <div>
                                        <button
                                            onClick={() => submitTag()}
                                            disabled={!(form.siteTourId || currentTourId)}
                                            className={`ml-2 inline-flex items-center justify-center px-4 py-2 rounded-full shadow ${!(form.siteTourId || currentTourId) ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-orange-600 text-white hover:bg-orange-700'}`}
                                        >
                                            <span className="text-sm font-semibold">{t('siteTourTag.modal.submit') || 'Submit'}</span>
                                        </button>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            )}
            {showQrModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowQrModal(false)} />

                    <div className="relative bg-white rounded-lg p-4 max-w-sm w-full">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">QR</h3>
                            <button onClick={() => setShowQrModal(false)} className="p-2 text-gray-500 hover:text-gray-700">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex flex-col items-center gap-4">
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrValue)}`}
                                alt="QR code"
                                className="max-w-full"
                            />
                            <div className="text-sm text-gray-700 break-words">{qrValue}</div>

                            <div className="flex gap-2">
                                <button onClick={printQr} className="px-4 py-2 bg-orange-600 text-white rounded">Print</button>
                                <button onClick={() => { navigator.clipboard?.writeText(qrValue); toast.success('Copiado'); }} className="px-4 py-2 border rounded">Copiar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {showCreateTourModal && (
                <div className="fixed inset-0 z-60 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreateTourModal(false)} />

                    <div className="relative bg-white rounded-lg p-4 max-w-sm w-full">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">{t('siteTour.form.createTitle') || 'Crear recorrido'}</h3>
                            <button onClick={() => setShowCreateTourModal(false)} className="p-2 text-gray-500 hover:text-gray-700">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <input value={tourForm.name} onChange={(e) => setTourForm((s: any) => ({ ...s, name: e.target.value }))} placeholder={t('siteTour.form.name') || 'Nombre del recorrido'} className="w-full border rounded-lg h-12 px-3" />

                            <div>
                                <label className="block text-sm text-gray-700 mb-2">{t('siteTour.form.station') || 'Estación (opcional)'}</label>
                                <select value={tourForm.stationId || ''} onChange={(e) => setTourForm((s: any) => ({ ...s, stationId: e.target.value }))} className="w-full px-3 py-2 border rounded-md text-sm">
                                    <option value="">{loadingStations ? 'Cargando estaciones...' : (t('siteTour.form.selectStation') || 'Sin estación')}</option>
                                    {stations.map((s: any) => (
                                        <option key={s.id || s.stationId} value={s.id || s.stationId}>{s.stationName || s.name || s.station_name || s.id}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-700 mb-2">{t('siteTour.form.assignGuard') || 'Asignar Guardia'}</label>
                                <select value={tourForm.securityGuardId || ''} onChange={(e) => setTourForm((s: any) => ({ ...s, securityGuardId: e.target.value }))} className="w-full px-3 py-2 border rounded-md text-sm">
                                    <option value="">{loadingGuards ? 'Cargando guardias...' : (localGuards && localGuards.length ? (t('siteTour.form.selectGuard') || 'Seleccione guardia') : 'No guards found')}</option>
                                    {localGuards.map((g: any) => {
                                        const name = (g.guard && (g.guard.firstName || g.guard.lastName)) ? `${g.guard.firstName || ''} ${g.guard.lastName || ''}`.trim() : (g.firstName || g.lastName) ? `${g.firstName || ''} ${g.lastName || ''}`.trim() : (g.name || g.fullName || g.label) || '';
                                        return <option key={g.id || g.guardId || g.securityGuardId} value={g.id || g.guardId || g.securityGuardId}>{name}</option>;
                                    })}
                                </select>
                                {guardLoadError && <div className="text-xs text-red-600 mt-1">{guardLoadError}</div>}
                            </div>
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            <button onClick={() => setShowCreateTourModal(false)} className="px-4 py-2 border rounded-md">{t('common.cancel') || 'Cancelar'}</button>
                            <button onClick={() => createTourAndTag()} className="px-4 py-2 bg-orange-600 text-white rounded-md">{t('siteTour.form.createAndAttach') || 'Crear recorrido y etiqueta'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
