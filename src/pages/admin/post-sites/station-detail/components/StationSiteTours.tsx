import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Loader2, Settings, X, Plus, Trash2, ChevronDown, ChevronRight, MapPin, QrCode, Crosshair,
} from 'lucide-react';
import { toast } from 'sonner';
import { confirmDialog } from '@/components/ui/confirmDialog';
import { ApiService } from '@/services/api/apiService';
import RondaSettingsForm from '@/pages/admin/Configuration/rondas-settings/RondaSettingsForm';
import CheckpointLocationPicker from '@/components/maps/CheckpointLocationPicker';

type Props = { station: any; stationId: string; postSiteId: string };

interface Checkpoint {
  id: string;
  name: string;
  tagIdentifier: string;
  latitude: number | null;
  longitude: number | null;
  radius: number | null;
}

const num = (v: any): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const genIdentifier = () =>
  `QR-${Math.random().toString(36).slice(2, 6).toUpperCase()}${Date.now().toString(36).slice(-4).toUpperCase()}`;

export default function StationSiteTours({ station, stationId, postSiteId }: Props) {
  const { t } = useTranslation();
  const tenantId = (station?.tenantId || localStorage.getItem('tenantId') || '') as string;
  const stationLat = num(station?.latitud ?? station?.latitude);
  const stationLng = num(station?.longitud ?? station?.longitude);

  const [tours, setTours] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Create-ronda modal
  const [showNewTour, setShowNewTour] = useState(false);
  const [tourName, setTourName] = useState('');
  const [tourDesc, setTourDesc] = useState('');
  const [savingTour, setSavingTour] = useState(false);

  // Per-tour checkpoint state
  const [expanded, setExpanded] = useState<string | null>(null);
  const [cps, setCps] = useState<Record<string, Checkpoint[]>>({});
  const [cpLoading, setCpLoading] = useState<string | null>(null);
  // inline "add checkpoint" form (per tour)
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [cpName, setCpName] = useState('');
  const [cpLat, setCpLat] = useState<number | null>(null);
  const [cpLng, setCpLng] = useState<number | null>(null);
  const stationRadius = num(station?.geofenceRadius) ?? 75;
  const [cpRadius, setCpRadius] = useState<number>(stationRadius);
  const [savingCp, setSavingCp] = useState(false);

  const loadTours = useCallback(async () => {
    if (!stationId) return;
    setLoading(true); setError(null);
    try {
      const res: any = await ApiService.get(`/tenant/${tenantId}/site-tour?stationId=${encodeURIComponent(stationId)}&limit=999&_=${Date.now()}`);
      setTours(Array.isArray(res) ? res : (res?.rows ?? []));
    } catch (e: any) {
      setError(e?.message || t('station.siteTours.loadError', 'Error al cargar rondas'));
    } finally { setLoading(false); }
  }, [stationId, tenantId, t]);

  useEffect(() => { loadTours(); }, [loadTours]);

  const loadCheckpoints = useCallback(async (tourId: string) => {
    setCpLoading(tourId);
    try {
      const res: any = await ApiService.get(`/tenant/${tenantId}/site-tour/${encodeURIComponent(tourId)}/tags?_=${Date.now()}`);
      const rows = Array.isArray(res) ? res : (res?.rows ?? []);
      setCps((m) => ({ ...m, [tourId]: rows.map((r: any) => ({
        id: String(r.id), name: r.name || r.tagIdentifier || '—', tagIdentifier: r.tagIdentifier || String(r.id),
        latitude: num(r.latitude ?? r.latitud), longitude: num(r.longitude ?? r.longitud), radius: num(r.geofenceRadius),
      })) }));
    } catch {
      setCps((m) => ({ ...m, [tourId]: [] }));
    } finally { setCpLoading(null); }
  }, [tenantId]);

  const toggleExpand = (tourId: string) => {
    if (expanded === tourId) { setExpanded(null); return; }
    setExpanded(tourId);
    setAddingFor(null);
    if (!cps[tourId]) loadCheckpoints(tourId);
  };

  const createTour = async () => {
    if (!tourName.trim()) { toast.error(t('station.siteTours.nameRequired', 'Escribe un nombre')); return; }
    setSavingTour(true);
    try {
      await ApiService.post(`/tenant/${tenantId}/site-tour`, {
        name: tourName.trim(), description: tourDesc.trim() || undefined,
        stationId, postSiteId: postSiteId || undefined, active: true,
      });
      toast.success(t('station.siteTours.created', 'Ronda creada'));
      setShowNewTour(false); setTourName(''); setTourDesc('');
      loadTours();
    } catch (e: any) {
      toast.error(e?.message || t('station.siteTours.createFailed', 'No se pudo crear la ronda'));
    } finally { setSavingTour(false); }
  };

  const deleteTour = async (tourId: string) => {
    if (!(await confirmDialog({ title: 'Eliminar ronda', message: t('station.siteTours.confirmDelete', '¿Eliminar esta ronda y sus puntos de control?'), confirmText: 'Eliminar', tone: 'danger' }))) return;
    try {
      await ApiService.delete(`/tenant/${tenantId}/site-tour/${encodeURIComponent(tourId)}`);
      toast.success(t('station.siteTours.deleted', 'Ronda eliminada'));
      setTours((ts) => ts.filter((x) => String(x.id) !== tourId));
    } catch (e: any) {
      toast.error(e?.message || t('station.siteTours.deleteFailed', 'No se pudo eliminar'));
    }
  };

  const openAddCheckpoint = (tourId: string) => {
    setAddingFor(tourId);
    setCpName('');
    setCpLat(stationLat);
    setCpLng(stationLng);
    setCpRadius(stationRadius);
  };

  const createCheckpoint = async (tourId: string) => {
    if (!cpName.trim()) { toast.error(t('station.siteTours.cpNameRequired', 'Escribe un nombre para el punto')); return; }
    if (cpLat == null || cpLng == null) { toast.error(t('station.siteTours.cpLocRequired', 'Marca la ubicación del punto en el mapa')); return; }
    setSavingCp(true);
    try {
      await ApiService.post(`/tenant/${tenantId}/site-tour/${encodeURIComponent(tourId)}/tag`, {
        name: cpName.trim(), tagType: 'qr', tagIdentifier: genIdentifier(),
        latitude: cpLat, longitude: cpLng, geofenceRadius: cpRadius, stationId, showGeoFence: true,
      });
      toast.success(t('station.siteTours.cpCreated', 'Punto de control creado'));
      setAddingFor(null); setCpName('');
      loadCheckpoints(tourId);
    } catch (e: any) {
      toast.error(e?.message || t('station.siteTours.cpCreateFailed', 'No se pudo crear el punto'));
    } finally { setSavingCp(false); }
  };

  const deleteCheckpoint = async (tourId: string, tagId: string) => {
    if (!(await confirmDialog({ title: 'Eliminar punto de control', message: t('station.siteTours.confirmDeleteCp', '¿Eliminar este punto de control?'), confirmText: 'Eliminar', tone: 'danger' }))) return;
    try {
      await ApiService.delete(`/tenant/${tenantId}/site-tour/${encodeURIComponent(tourId)}/tag/${encodeURIComponent(tagId)}`);
      setCps((m) => ({ ...m, [tourId]: (m[tourId] || []).filter((c) => c.id !== tagId) }));
    } catch (e: any) {
      toast.error(e?.message || t('station.siteTours.deleteFailed', 'No se pudo eliminar'));
    }
  };

  const inputCls = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8860A]';

  return (
    <>
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="flex flex-col gap-3 border-b px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              {t('station.siteTours.title', 'Rondas de Seguridad')}
              {tours.length > 0 && <span className="ml-2 text-sm font-normal text-muted-foreground">({tours.length})</span>}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('station.siteTours.hint', 'Crea rondas y sus puntos de control. Luego genera los QR en la pestaña "Generar QR de Rondas".')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowNewTour(true)} className="inline-flex items-center gap-2 rounded-full bg-[#C8860A] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#B37809]">
              <Plus size={16} /> {t('station.siteTours.new', 'Nueva ronda')}
            </button>
            <button onClick={() => setShowSettings(true)} className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm text-foreground hover:bg-muted/30">
              <Settings size={15} /> {t('station.siteTours.settings', 'Configuraciones')}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="animate-spin text-[#C8860A]" /></div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : tours.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
            <QrCode className="h-8 w-8 opacity-50" />
            <p className="text-sm">{t('station.siteTours.empty', 'Aún no hay rondas. Crea la primera con "Nueva ronda".')}</p>
          </div>
        ) : (
          <ul className="divide-y">
            {tours.map((r: any) => {
              const id = String(r.id);
              const name = r.name || r.tourName || r.description || '—';
              const active = r.active !== false;
              const list = cps[id] || [];
              const isOpen = expanded === id;
              return (
                <li key={id}>
                  <div className="flex items-center gap-3 px-6 py-3 hover:bg-muted/20">
                    <button onClick={() => toggleExpand(id)} className="flex flex-1 items-center gap-3 text-left">
                      {isOpen ? <ChevronDown size={18} className="text-muted-foreground" /> : <ChevronRight size={18} className="text-muted-foreground" />}
                      <span className="font-medium text-foreground">{name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                        {active ? t('station.siteTours.active', 'Activa') : t('station.siteTours.inactive', 'Inactiva')}
                      </span>
                      {cps[id] && (
                        <span className="text-xs text-muted-foreground">
                          {list.length} {list.length === 1 ? t('station.siteTours.point', 'punto') : t('station.siteTours.points', 'puntos')}
                        </span>
                      )}
                    </button>
                    <button onClick={() => deleteTour(id)} className="rounded p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600" title={t('common.delete', 'Eliminar')}>
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {isOpen && (
                    <div className="border-t bg-muted/10 px-6 py-4">
                      {cpLoading === id ? (
                        <div className="flex justify-center py-4"><Loader2 className="animate-spin text-[#C8860A]" size={18} /></div>
                      ) : (
                        <>
                          {list.length === 0 ? (
                            <p className="text-sm text-muted-foreground">{t('station.siteTours.noPoints', 'Sin puntos de control todavía.')}</p>
                          ) : (
                            <ul className="space-y-2">
                              {list.map((c) => (
                                <li key={c.id} className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-foreground">{c.name}</span>
                                      <span className="font-mono text-xs text-muted-foreground">{c.tagIdentifier}</span>
                                    </div>
                                    <div className="mt-0.5 text-xs">
                                      {c.latitude != null && c.longitude != null ? (
                                        <span className="inline-flex items-center gap-1 text-emerald-700">
                                          <MapPin size={12} />{c.latitude.toFixed(5)}, {c.longitude.toFixed(5)}
                                          <span className="ml-1 text-muted-foreground">· ±{c.radius ?? stationRadius} m</span>
                                        </span>
                                      ) : (
                                        <span className="text-amber-700">{t('station.siteTours.cpNoLoc', 'Sin ubicación — la verificación no funcionará')}</span>
                                      )}
                                    </div>
                                  </div>
                                  <button onClick={() => deleteCheckpoint(id, c.id)} className="rounded p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600">
                                    <Trash2 size={15} />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}

                          {addingFor === id ? (
                            <div className="mt-3 space-y-3 rounded-md border border-border bg-background p-3">
                              <div>
                                <label className="mb-1 block text-xs font-medium text-foreground">{t('station.siteTours.cpName', 'Nombre del punto')}</label>
                                <input className={inputCls} value={cpName} onChange={(e) => setCpName(e.target.value)} placeholder={t('station.siteTours.cpPlaceholder', 'Ej. Entrada principal') as string} autoFocus />
                              </div>
                              <CheckpointLocationPicker
                                lat={cpLat}
                                lng={cpLng}
                                radius={cpRadius}
                                onChange={(la, ln, r) => { setCpLat(la); setCpLng(ln); setCpRadius(r); }}
                              />
                              {stationLat != null && stationLng != null && (
                                <button onClick={() => { setCpLat(stationLat); setCpLng(stationLng); }} className="inline-flex items-center gap-1.5 text-xs text-[#C8860A] hover:underline">
                                  <Crosshair size={13} /> {t('station.siteTours.useStationLoc', 'Usar ubicación del puesto')}
                                </button>
                              )}
                              <div className="flex justify-end gap-2 pt-1">
                                <button onClick={() => setAddingFor(null)} className="rounded-md border px-3 py-1.5 text-sm">{t('common.cancel', 'Cancelar')}</button>
                                <button onClick={() => createCheckpoint(id)} disabled={savingCp || !cpName.trim()} className="inline-flex items-center gap-1.5 rounded-md bg-[#C8860A] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#B37809] disabled:opacity-50">
                                  {savingCp && <Loader2 className="animate-spin" size={14} />} {t('common.save', 'Guardar')}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => openAddCheckpoint(id)} className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-dashed border-[#C8860A]/50 px-3 py-1.5 text-sm font-medium text-[#C8860A] hover:bg-[#C8860A]/5">
                              <Plus size={15} /> {t('station.siteTours.addPoint', 'Agregar punto de control')}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Create ronda modal */}
      {showNewTour && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowNewTour(false)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-background" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold text-foreground">{t('station.siteTours.newTitle', 'Nueva ronda')}</h2>
              <button onClick={() => setShowNewTour(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">{t('station.siteTours.name', 'Nombre')} *</label>
                <input className={inputCls} value={tourName} onChange={(e) => setTourName(e.target.value)} placeholder={t('station.siteTours.namePlaceholder', 'Ej. Ronda nocturna') as string} autoFocus />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">{t('station.siteTours.desc', 'Descripción')}</label>
                <textarea className={`${inputCls} resize-none`} rows={3} value={tourDesc} onChange={(e) => setTourDesc(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
              <button onClick={() => setShowNewTour(false)} className="rounded-md border px-4 py-2 text-sm">{t('common.cancel', 'Cancelar')}</button>
              <button onClick={createTour} disabled={savingTour || !tourName.trim()} className="inline-flex items-center gap-1.5 rounded-md bg-[#C8860A] px-5 py-2 text-sm font-semibold text-white hover:bg-[#B37809] disabled:opacity-50">
                {savingTour && <Loader2 className="animate-spin" size={14} />} {t('station.siteTours.create', 'Crear ronda')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowSettings(false)}>
          <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-background" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold text-foreground">{t('station.siteTours.settingsTitle', 'Configuraciones de Rondas')}</h2>
              <button onClick={() => setShowSettings(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto p-5">
              <RondaSettingsForm postSiteId={postSiteId} onSaved={() => setShowSettings(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
