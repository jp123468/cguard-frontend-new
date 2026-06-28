import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Loader2, Route, ChevronDown, ChevronRight, MapPin, MapPinOff, HelpCircle,
  User, Clock, CheckCircle2, Flag,
} from 'lucide-react';
import { ApiService } from '@/services/api/apiService';

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

function statusBadge(status: string) {
  const s = (status || '').toLowerCase();
  if (s === 'completed') return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700"><CheckCircle2 size={12} /> Completada</span>;
  if (s === 'assigned' || s === 'in_progress' || s === 'started') return <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700">En progreso</span>;
  return <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{status || '—'}</span>;
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

export default function StationRondaHistory({ station, stationId }: Props) {
  const { t } = useTranslation();
  const tenantId = (station?.tenantId || localStorage.getItem('tenantId') || '') as string;
  const [rows, setRows] = useState<Ronda[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

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
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            {t('station.rondaHistory.title', 'Historial de Rondas')}
            {rows.length > 0 && <span className="ml-2 text-sm font-normal text-muted-foreground">({rows.length})</span>}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('station.rondaHistory.hint', 'Todas las rondas realizadas en este puesto, con sus puntos de control y ubicación.')}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
      ) : error ? (
        <div className="p-6 text-sm text-red-600">{error}</div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
          <Route className="h-8 w-8 opacity-50" />
          <p className="text-sm">{t('station.rondaHistory.empty', 'No hay rondas registradas en este puesto.')}</p>
        </div>
      ) : (
        <ul className="divide-y">
          {rows.map((r) => {
            const isOpen = expanded === r.id;
            const pct = r.totalTags > 0 ? Math.round((r.scannedCount / r.totalTags) * 100) : 0;
            return (
              <li key={r.id}>
                <button onClick={() => setExpanded(isOpen ? null : r.id)} className="flex w-full items-center gap-3 px-6 py-3 text-left hover:bg-muted/20">
                  {isOpen ? <ChevronDown size={18} className="shrink-0 text-muted-foreground" /> : <ChevronRight size={18} className="shrink-0 text-muted-foreground" />}
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
                </button>

                {/* progress bar */}
                <div className="px-6 pb-2">
                  <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t bg-muted/10 px-6 py-3">
                    {r.scans.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t('station.rondaHistory.noScans', 'Sin escaneos registrados en esta ronda.')}</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {r.scans.map((s) => (
                          <li key={s.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Flag size={13} className="shrink-0 text-primary" />
                              <span className="truncate text-sm font-medium text-foreground">{s.checkpoint}</span>
                              <span className="text-xs text-muted-foreground">{fmt(s.scannedAt)}</span>
                            </div>
                            {locationBadge(s)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
