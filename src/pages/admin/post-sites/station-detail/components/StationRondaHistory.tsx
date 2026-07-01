import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Route, ChevronRight, MapPin, MapPinOff, HelpCircle,
  User, Clock, CheckCircle2, Flag, Building2, XCircle, X,
} from 'lucide-react';
import { ApiService } from '@/services/api/apiService';
import { Section, EmptyState, SkeletonCards, StatusBadge, Modal } from '@/components/kit';
import { fileUrlFromPrivate } from '@/lib/fileUrl';

type Props = { station: any; stationId: string; postSiteId: string };

interface Scan {
  id: string;
  checkpoint: string;
  scannedAt: string;
  validLocation: boolean | null;
  distanceMeters: number | null;
}
interface Ronda {
  id: string;
  rondaName: string;
  guardName: string;
  startAt: string | null;
  endAt: string | null;
  status: string;
  totalTags: number;
  scannedCount: number;
  validCount: number;
  outCount: number;
  scans: Scan[];
}

// ── Detail types (GET /site-tour/ronda/:assignmentId) ───────────────────────
interface DetailScan {
  id: string;
  scannedAt: string | null;
  validLocation: boolean | null;
  distanceMeters: number | null;
  scannedData: any;
}
interface DetailCheckpoint {
  id: string;
  name: string;
  instructions: string | null;
  latitude: number | null;
  longitude: number | null;
  scanned: boolean;
  scan: DetailScan | null;
}
interface OrphanScan {
  id: string;
  siteTourTagId: string | null;
  scannedAt: string | null;
  validLocation: boolean | null;
  distanceMeters: number | null;
  scannedData: any;
}
interface RondaDetail {
  assignment: { id: string; status: string; startAt: string | null; endAt: string | null; createdAt: string | null };
  tour: { id: string; name: string; description: string | null } | null;
  guard: { id: string; name: string } | null;
  station: { id: string; name: string } | null;
  checkpoints: DetailCheckpoint[];
  orphanScans: OrphanScan[];
  scanCount: number;
  totalCheckpoints: number;
}

const fmt = (v: any) => {
  if (!v) return '—';
  try { return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(v)); }
  catch { return String(v); }
};
const fmtTime = (v: any) => {
  if (!v) return '—';
  try { return new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(new Date(v)); }
  catch { return String(v); }
};

/**
 * The checkpoint photo a guard captured at scan time is stored inside scannedData
 * (token preferred, raw privateUrl as legacy fallback). It can sit at the top level
 * or under `.extra` depending on the app version — probe both. Returns a viewable URL.
 * (Mirrors TagScans.tsx `scanPhotoUrl`.)
 */
function scanPhotoUrl(scannedData: any): string | null {
  const sd = scannedData || {};
  const ex = sd.extra && typeof sd.extra === 'object' ? sd.extra : {};
  const token = ex.photoFileToken || sd.photoFileToken;
  if (token) {
    const base = String(import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api').replace(/\/+$/, '');
    return `${base}/file/download?fileToken=${encodeURIComponent(String(token))}`;
  }
  const priv =
    ex.photoPrivateUrl || sd.photoPrivateUrl || ex.photoUrl || sd.photoUrl || ex.photo || sd.photo;
  return priv ? fileUrlFromPrivate(String(priv)) : null;
}

/** The worker app stores the note as `notes` (plural); keep note/message as fallbacks. */
function scanNote(scannedData: any): string | null {
  const sd = scannedData || {};
  const ex = sd.extra && typeof sd.extra === 'object' ? sd.extra : {};
  return sd.notes ?? ex.note ?? ex.message ?? ex.notes ?? sd.note ?? sd.message ?? null;
}

function statusBadge(status: string) {
  const s = (status || '').toLowerCase();
  if (s === 'completed') return <StatusBadge tone="green" dot={false}><CheckCircle2 size={12} /> Completada</StatusBadge>;
  if (s === 'assigned' || s === 'in_progress' || s === 'started') return <StatusBadge tone="orange" dot={false}>En progreso</StatusBadge>;
  return <StatusBadge tone="slate" dot={false}>{status || '—'}</StatusBadge>;
}

function locationBadge(s: Scan) {
  if (s.validLocation === true) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700"><MapPin size={11} /> En ubicación{s.distanceMeters != null ? ` · ${Math.round(s.distanceMeters)} m` : ''}</span>;
  }
  if (s.validLocation === false) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-700"><MapPinOff size={11} /> Fuera de rango{s.distanceMeters != null ? ` · ${Math.round(s.distanceMeters)} m` : ''}</span>;
  }
  return <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"><HelpCircle size={11} /> Sin verificar</span>;
}

// Geo verdict badge from raw validLocation/distance (detail view).
function geoBadge(validLocation: boolean | null, distanceMeters: number | null) {
  if (validLocation === true) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700"><MapPin size={11} /> Ubicación válida{distanceMeters != null ? ` · ${Math.round(distanceMeters)} m` : ''}</span>;
  }
  if (validLocation === false) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-700"><MapPinOff size={11} /> Fuera de rango{distanceMeters != null ? ` · ${Math.round(distanceMeters)} m` : ''}</span>;
  }
  return <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"><HelpCircle size={11} /> Sin verificar</span>;
}

// ── Detail modal ────────────────────────────────────────────────────────────
function RondaDetailModal({ open, onOpenChange, tenantId, assignmentId, fallbackName }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tenantId: string;
  assignmentId: string | null;
  fallbackName?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<RondaDetail | null>(null);
  const [photo, setPhoto] = useState<string | null>(null); // lightbox

  useEffect(() => {
    if (!open || !assignmentId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      setDetail(null);
      try {
        const res: any = await ApiService.get(`/tenant/${tenantId}/site-tour/ronda/${encodeURIComponent(assignmentId)}?_=${Date.now()}`);
        const data = res && (res.data !== undefined ? res.data : res);
        if (mounted) setDetail(data as RondaDetail);
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Error al cargar el detalle de la ronda');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [open, assignmentId, tenantId]);

  const routeName = detail?.tour?.name || fallbackName || 'Ronda';
  const scanCount = detail?.scanCount ?? 0;
  const total = detail?.totalCheckpoints ?? 0;
  const pct = total > 0 ? Math.round((scanCount / total) * 100) : 0;

  return (
    <>
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        size="lg"
        icon={<Route />}
        title={routeName}
        description={detail?.tour?.description || undefined}
      >
        {loading ? (
          <SkeletonCards count={4} />
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : !detail ? (
          <EmptyState icon={<Route />} title="Sin datos de la ronda" />
        ) : (
          <div className="space-y-4">
            {/* Header meta */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
              {statusBadge(detail.assignment.status)}
              <span className="inline-flex items-center gap-1"><User size={12} />{detail.guard?.name || '—'}</span>
              <span className="inline-flex items-center gap-1"><Building2 size={12} />{detail.station?.name || '—'}</span>
              <span className="inline-flex items-center gap-1"><Clock size={12} />{fmt(detail.assignment.startAt)}{detail.assignment.endAt ? ` → ${fmtTime(detail.assignment.endAt)}` : ''}</span>
            </div>

            {/* Progress */}
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">Progreso</span>
                <span className="text-muted-foreground">{scanCount}/{total || '—'} puntos ({pct}%)</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
            </div>

            {/* Checkpoints */}
            {detail.checkpoints.length === 0 ? (
              <EmptyState icon={<Flag />} title="Esta ronda no tiene puntos de control." />
            ) : (
              <ul className="space-y-2">
                {detail.checkpoints.map((c) => {
                  const url = c.scan ? scanPhotoUrl(c.scan.scannedData) : null;
                  const note = c.scan ? scanNote(c.scan.scannedData) : null;
                  return (
                    <li
                      key={c.id}
                      className={`rounded-xl border p-3 ${c.scanned ? 'border-border bg-background' : 'border-rose-200/70 bg-rose-500/5'}`}
                    >
                      <div className="flex items-start gap-3">
                        {c.scanned
                          ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                          : <XCircle size={18} className="mt-0.5 shrink-0 text-rose-500" />}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-foreground">{c.name}</span>
                            {c.scanned
                              ? <span className="text-xs text-muted-foreground">{fmt(c.scan?.scannedAt)}</span>
                              : <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-700">No escaneado</span>}
                          </div>
                          {c.instructions && (
                            <p className="mt-0.5 text-xs text-muted-foreground">{c.instructions}</p>
                          )}
                          {c.scanned && c.scan && (
                            <div className="mt-2 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                {geoBadge(c.scan.validLocation, c.scan.distanceMeters)}
                              </div>
                              {note && (
                                <p className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-foreground">{note}</p>
                              )}
                              {url && (
                                <button
                                  type="button"
                                  data-photo-block
                                  onClick={() => setPhoto(url)}
                                  className="block overflow-hidden rounded-lg border bg-muted"
                                >
                                  <img
                                    src={url}
                                    alt={`Foto de ${c.name}`}
                                    className="h-28 w-40 object-cover"
                                    onError={(e) => {
                                      const b = e.currentTarget.closest('[data-photo-block]') as HTMLElement | null;
                                      if (b) b.style.display = 'none';
                                    }}
                                  />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Orphan scans */}
            {detail.orphanScans.length > 0 && (
              <div>
                <div className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Escaneos sin punto de control ({detail.orphanScans.length})
                </div>
                <ul className="space-y-2">
                  {detail.orphanScans.map((o) => {
                    const url = scanPhotoUrl(o.scannedData);
                    const note = scanNote(o.scannedData);
                    return (
                      <li key={o.id} className="rounded-xl border border-border bg-background p-3">
                        <div className="flex items-start gap-3">
                          <Flag size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-foreground">Escaneo</span>
                              <span className="text-xs text-muted-foreground">{fmt(o.scannedAt)}</span>
                              {geoBadge(o.validLocation, o.distanceMeters)}
                            </div>
                            {note && <p className="mt-2 rounded-lg bg-muted/40 px-3 py-2 text-sm text-foreground">{note}</p>}
                            {url && (
                              <button
                                type="button"
                                data-photo-block
                                onClick={() => setPhoto(url)}
                                className="mt-2 block overflow-hidden rounded-lg border bg-muted"
                              >
                                <img
                                  src={url}
                                  alt="Foto del escaneo"
                                  className="h-28 w-40 object-cover"
                                  onError={(e) => {
                                    const b = e.currentTarget.closest('[data-photo-block]') as HTMLElement | null;
                                    if (b) b.style.display = 'none';
                                  }}
                                />
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Photo lightbox */}
      {photo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setPhoto(null)}>
          <div className="absolute inset-0 bg-black/70" />
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setPhoto(null)}
          >
            <X size={20} />
          </button>
          <img
            src={photo}
            alt="Foto de la ronda"
            className="relative z-10 max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

export default function StationRondaHistory({ station, stationId }: Props) {
  const { t } = useTranslation();
  const tenantId = (station?.tenantId || localStorage.getItem('tenantId') || '') as string;
  const [rows, setRows] = useState<Ronda[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailFor, setDetailFor] = useState<Ronda | null>(null);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    setError(null);
    try {
      const res: any = await ApiService.get(`/tenant/${tenantId}/station/${encodeURIComponent(stationId)}/ronda-history?limit=100&_=${Date.now()}`);
      setRows(Array.isArray(res) ? res : (res?.rows ?? []));
    } catch (e: any) {
      setError(e?.message || t('station.rondaHistory.loadError', 'Error al cargar el historial de rondas'));
    } finally {
      setLoading(false);
    }
  }, [stationId, tenantId, t]);

  useEffect(() => { load(); }, [load]);

  return (
    <Section
      icon={<Route />}
      title={
        <span>
          {t('station.rondaHistory.title', 'Historial de Rondas')}
          {rows.length > 0 && <span className="ml-2 text-sm font-normal text-muted-foreground">({rows.length})</span>}
        </span>
      }
      contentClassName="-mx-5 -mb-5"
    >
      <p className="px-6 -mt-2 mb-3 text-xs text-muted-foreground">
        {t('station.rondaHistory.hint', 'Todas las rondas realizadas en este puesto. Toca una ronda para ver cada punto de control, con foto, nota y ubicación.')}
      </p>

      {loading ? (
        <div className="px-5 pb-5"><SkeletonCards count={3} /></div>
      ) : error ? (
        <div className="px-6 pb-6 text-sm text-red-600">{error}</div>
      ) : rows.length === 0 ? (
        <div className="px-5 pb-5">
          <EmptyState
            icon={<Route />}
            title={t('station.rondaHistory.empty', 'No hay rondas registradas en este puesto.')}
          />
        </div>
      ) : (
        <ul className="divide-y border-t">
          {rows.map((r) => {
            const pct = r.totalTags > 0 ? Math.round((r.scannedCount / r.totalTags) * 100) : 0;
            return (
              <li key={r.id}>
                <button onClick={() => setDetailFor(r)} className="flex w-full items-center gap-3 px-6 py-3 text-left hover:bg-muted/20">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary"><Route size={16} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">{r.rondaName}</span>
                      {statusBadge(r.status)}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><User size={12} />{r.guardName}</span>
                      <span className="inline-flex items-center gap-1"><Clock size={12} />{fmt(r.startAt)}{r.endAt ? ` → ${fmtTime(r.endAt)}` : ''}</span>
                    </div>
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    <div className="text-sm font-semibold text-foreground">{r.scannedCount}/{r.totalTags || '—'} <span className="font-normal text-muted-foreground">puntos</span></div>
                    <div className="mt-0.5 flex items-center justify-end gap-2 text-[11px]">
                      {r.validCount > 0 && <span className="text-emerald-700">{r.validCount} en ubicación</span>}
                      {r.outCount > 0 && <span className="text-rose-700">{r.outCount} fuera</span>}
                    </div>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
                </button>

                {/* progress bar */}
                <div className="px-6 pb-3">
                  <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <RondaDetailModal
        open={!!detailFor}
        onOpenChange={(o) => { if (!o) setDetailFor(null); }}
        tenantId={tenantId}
        assignmentId={detailFor?.id ?? null}
        fallbackName={detailFor?.rondaName}
      />
    </Section>
  );
}
