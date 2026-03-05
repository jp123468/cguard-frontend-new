import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, X, ChevronDown } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
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
    const [loadingTags, setLoadingTags] = useState(false);
    const [currentTourId, setCurrentTourId] = useState<string | null>(null);
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
            // Ensure we have a site tour to attach the tag to. Create a quick one if none.
            const tourPayload = { name: `Auto tour (${postSiteId || 'no-site'})`, postSiteId: postSiteId };
            const tourResp: any = await ApiService.post(`/tenant/${tenantId}/site-tour`, tourPayload);
            const tourId = tourResp && (tourResp.id || tourResp._id);
            if (!tourId) throw new Error('Failed to create or obtain tour id');

            const tagPayload: any = {
                name: form.name || `Tag ${Date.now()}`,
                tagType: form.tagType || '',
                tagIdentifier: form.tagId || undefined,
                location: form.coords || undefined,
                instructions: form.instructions || undefined,
                latitude: form.latitude || undefined,
                longitude: form.longitude || undefined,
                showGeoFence: form.showGeoFence || false,
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

    async function loadTagsForSite(filterTagType?: string) {
        const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
        if (!tenantId || !site?.id) return;
        setLoadingTags(true);
        try {
            // Query tags for the post site directly (covers all tours under the site)
            const q = filterTagType ? `?tagType=${encodeURIComponent(filterTagType)}` : '';
            const tagsResp: any = await ApiService.get(`/tenant/${tenantId}/post-site/${site.id}/site-tour-tags${q}`);
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
        }
    }, [showNewTag, activeTabKey]);

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
                                {actionOptionsMap[activeTabKey].map(opt => (
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
                                    tags.map((tag) => (
                                        <tr key={tag.id || (tag as any)._id || tag.tagIdentifier} className="border-t">
                                            <td className="px-4 py-3"><input type="checkbox" /></td>
                                            <td className="px-4 py-3">{tag.name}</td>
                                            <td className="px-4 py-3 break-words">{tag.tagIdentifier || tag.id || (tag as any)._id}</td>
                                            <td className="px-4 py-3 text-right">
                                                <button onClick={() => openQrFor(tag.tagIdentifier || tag.id || (tag as any)._id)} className="px-3 py-1 bg-orange-600 text-white rounded">QR</button>
                                            </td>
                                        </tr>
                                    ))
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

                    <aside className="relative w-full sm:ml-auto sm:max-w-md bg-white shadow-xl overflow-hidden rounded-t-lg sm:rounded-lg max-h-[90vh] flex flex-col">
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

                            {/*<div className="flex items-center gap-3">
                                <label className="flex items-center gap-2"><input type="checkbox" checked={form.showGeoFence} onChange={e => update('showGeoFence', e.target.checked)} /> {t('siteTourTag.form.showGeoFence')}</label>
                            </div>*/}

                            <div className="border rounded-md overflow-hidden">
                                <div style={{ height: 220 }}>
                                    <MapWrapper
                                        center={
                                            markerPos
                                                ? [markerPos.lat, markerPos.lng]
                                                : (!isNaN(parseFloat(String(form.latitude))) && !isNaN(parseFloat(String(form.longitude))))
                                                    ? [parseFloat(String(form.latitude)), parseFloat(String(form.longitude))]
                                                    : [-2.170998, -79.922359]
                                        }
                                        zoom={13}
                                        style={{ height: '100%', width: '100%' }}
                                        whenCreated={(map: any) => setMapInstance(map as L.Map)}
                                    >
                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                        {markerPos && <Marker position={[markerPos.lat, markerPos.lng]} icon={customDivIcon} />}
                                        <MapClickHandler />
                                    </MapWrapper>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t">
                            <div className="flex justify-between items-center">
                                <div>
                                    <button onClick={() => { setShowNewTag(false); }} className="px-4 py-2 rounded-full bg-gray-100 text-gray-700">Save As Draft</button>
                                </div>
                                <div>
                                    <button onClick={() => submitTag()} className="ml-2 inline-flex items-center justify-center px-4 py-2 bg-orange-600 text-white rounded-full shadow hover:bg-orange-700">
                                        <span className="text-sm font-semibold">Submit</span>
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
        </div>
    );
}
