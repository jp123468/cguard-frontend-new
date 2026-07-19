import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Clock, Loader2, MapPin, Pencil, Trash2, User, X } from 'lucide-react';
import { ApiService } from '@/services/api/apiService';
import { toast } from 'sonner';
import { confirmDialog } from '@/components/ui/confirmDialog';
import ContextMenu, { CtxMenuState } from './ContextMenu';
import type { Station, ShiftRecord, GuardOption } from '@/types';

/**
 * Semana/Día timeline for Programador › Horario, Google-Calendar style with a
 * PUESTO sub-axis: DAYS are the top-level COLUMNS and inside each day there is
 * one SUB-COLUMN per estación (the "subclasificación"). HOURS run vertically
 * down the frozen left gutter (tenant wall-clock). Drag on a sub-column to
 * DRAW a work block for THAT estación — you can drag diagonally into the next
 * day (07:00 → 07:00 = 24h turno); overnight blocks split at midnight.
 * Right-click a block for Editar / Duplicar / Eliminar. Blocks are real
 * ad-hoc `shift` rows (same backend as the station "Turno único").
 */

// ─── Types ──────────────────────────────────────────────────────────────────

interface Props {
  tenantId: string;
  view: 'week' | 'day';
  days: Date[]; // visible calendar days (tenant wall). Day view passes 2 (hoy + siguiente).
  stations: Station[];
  shifts: ShiftRecord[];
  guardsPool: GuardOption[];
  guardColorMap: Record<string, string>;
  tz?: string;
  todayStr: string;
  onChanged: () => void; // silent refetch upstream
}

// ─── Tenant-timezone wall-clock helpers ─────────────────────────────────────

const DAY_MS = 86400000;
const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const pad2 = (n: number) => String(n).padStart(2, '0');

const fmtDate = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const addDays = (d: Date, n: number): Date => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

/** Milliseconds to ADD to a UTC instant to get the tz's wall-clock. */
function tzOffsetMs(date: Date, tz?: string): number {
  if (!tz) return -date.getTimezoneOffset() * 60000;
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    const p: Record<string, string> = {};
    for (const { type, value } of dtf.formatToParts(date)) p[type] = value;
    const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, p.hour === '24' ? 0 : +p.hour, +p.minute, +p.second);
    return asUTC - date.getTime();
  } catch {
    return -date.getTimezoneOffset() * 60000;
  }
}

/** Interpret a wall-clock (calendar day + minutes) IN the tenant tz → real instant. */
export function wallToDate(y: number, mo: number, d: number, minutes: number, tz?: string): Date {
  if (!tz) return new Date(y, mo - 1, d, 0, minutes);
  const utcGuess = Date.UTC(y, mo - 1, d, 0, minutes);
  // Two-pass offset correction (handles DST edges; trivial for fixed-offset zones).
  let off = tzOffsetMs(new Date(utcGuess), tz);
  off = tzOffsetMs(new Date(utcGuess - off), tz);
  return new Date(utcGuess - off);
}

/** A real instant → tenant wall-clock {calendar day, minutes into the day}. */
export function dateToWall(date: Date, tz?: string): { dateStr: string; minutes: number } {
  if (!tz) return { dateStr: fmtDate(date), minutes: date.getHours() * 60 + date.getMinutes() };
  const shifted = new Date(date.getTime() + tzOffsetMs(date, tz));
  return { dateStr: shifted.toISOString().slice(0, 10), minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes() };
}

const wallStrToDate = (s: string, tz?: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(s);
  if (!m) return null;
  return wallToDate(+m[1], +m[2], +m[3], +m[4] * 60 + +m[5], tz);
};

const shiftWallStr = (iso: string, tz?: string): string => {
  const w = dateToWall(new Date(iso), tz);
  return `${w.dateStr}T${pad2(Math.floor(w.minutes / 60))}:${pad2(w.minutes % 60)}`;
};

const addDaysToWallStr = (s: string, n: number): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(.+)$/.exec(s);
  if (!m) return s;
  const d = new Date(+m[1], +m[2] - 1, +m[3] + n);
  return `${fmtDate(d)}T${m[4]}`;
};

const minLabel = (abs: number) => `${pad2(Math.floor((((abs % 1440) + 1440) % 1440) / 60))}:${pad2(abs % 60)}`;

/** Middle-button (rueda) drag-to-pan for a scroll container. */
export const startPan = (e: React.MouseEvent, el: HTMLElement | null) => {
  if (e.button !== 1 || !el) return;
  e.preventDefault(); // suppress the browser's middle-click autoscroll/paste
  const sx = e.clientX, sy = e.clientY, sl = el.scrollLeft, st = el.scrollTop;
  const move = (ev: MouseEvent) => {
    el.scrollLeft = sl - (ev.clientX - sx);
    el.scrollTop = st - (ev.clientY - sy);
  };
  const up = () => {
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', up);
    document.body.style.cursor = '';
  };
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
  document.body.style.cursor = 'grabbing';
};

// A shift (or the draw preview) split into per-day segments.
interface Segment {
  dayIdx: number;
  top: number;    // minutes into that day
  bottom: number; // minutes into that day
  first: boolean;
  last: boolean;
}

const segmentize = (aAbs: number, bAbs: number, dayCount: number): Segment[] => {
  const segs: Segment[] = [];
  const a = Math.max(0, aAbs);
  const b = Math.min(dayCount * 1440, bAbs);
  if (b <= a) return segs;
  for (let di = Math.floor(a / 1440); di * 1440 < b && di < dayCount; di++) {
    const top = Math.max(a - di * 1440, 0);
    const bottom = Math.min(b - di * 1440, 1440);
    if (bottom <= top) continue;
    segs.push({ dayIdx: di, top, bottom, first: segs.length === 0, last: false });
  }
  if (segs.length) segs[segs.length - 1].last = true;
  return segs;
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function ScheduleTimeline({
  tenantId, view, days, stations, shifts, guardsPool, guardColorMap, tz, todayStr, onChanged,
}: Props) {
  const hourH = 36; // px per hour, vertical
  const pxPerMin = hourH / 60;
  const snapStep = 30;
  const dayCount = days.length;
  const totalMin = dayCount * 1440;
  const bodyH = 24 * hourH;
  const GUTTER_W = 56;
  const stationCount = Math.max(1, stations.length);
  // Sub-column per estación inside each day (the puesto sub-axis).
  const SUBCOL_W = view === 'day' ? 170 : 120;
  const dayW = stationCount * SUBCOL_W;
  const canvasW = dayCount * dayW;
  const HEADER_H = 46;
  const firstDayStr = fmtDate(days[0]);

  const stationIndexById = useMemo(() => {
    const m = new Map<string, number>();
    stations.forEach((s, i) => m.set(s.id, i));
    return m;
  }, [stations]);

  const stationById = useMemo(() => {
    const m = new Map<string, Station>();
    for (const s of stations) m.set(s.id, s);
    return m;
  }, [stations]);

  const absOfWall = useCallback((w: { dateStr: string; minutes: number }): number => {
    const dd = (Date.parse(w.dateStr + 'T00:00:00Z') - Date.parse(firstDayStr + 'T00:00:00Z')) / DAY_MS;
    return dd * 1440 + w.minutes;
  }, [firstDayStr]);

  // Shift segments per (day, station) cell-column + greedy lane packing inside each.
  const cells = useMemo(() => {
    const m = new Map<string, { items: { seg: Segment; shift: ShiftRecord; lane: number }[]; lanes: number }>();
    for (const s of shifts) {
      if (!s.startTime || !s.endTime) continue;
      const si = stationIndexById.get(s.stationId);
      if (si == null) continue;
      const a = absOfWall(dateToWall(new Date(s.startTime), tz));
      const b = absOfWall(dateToWall(new Date(s.endTime), tz));
      for (const seg of segmentize(a, b, dayCount)) {
        const key = `${seg.dayIdx}:${si}`;
        if (!m.has(key)) m.set(key, { items: [], lanes: 1 });
        m.get(key)!.items.push({ seg, shift: s, lane: 0 });
      }
    }
    for (const cell of m.values()) {
      cell.items.sort((x, y) => x.seg.top - y.seg.top || x.seg.bottom - y.seg.bottom);
      const laneEnds: number[] = [];
      for (const item of cell.items) {
        let lane = laneEnds.findIndex(end => end <= item.seg.top);
        if (lane === -1) { lane = laneEnds.length; laneEnds.push(0); }
        laneEnds[lane] = item.seg.bottom;
        item.lane = lane;
      }
      cell.lanes = Math.max(1, laneEnds.length);
    }
    return m;
  }, [shifts, stationIndexById, absOfWall, tz, dayCount]);

  // "Now" marker (only inside today's day band).
  const now = useMemo(() => {
    const w = dateToWall(new Date(), tz);
    const di = days.findIndex(d => fmtDate(d) === w.dateStr);
    return di >= 0 ? { dayIdx: di, minutes: w.minutes } : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, tz, shifts]); // shifts changes ~= a refresh tick

  // ─── Drag-to-draw (station comes from the anchor's sub-column) ──────────

  const [draft, setDraft] = useState<{ stationId: string; anchor: number; head: number } | null>(null);
  const draftRectRef = useRef<DOMRect | null>(null);
  const draftStateRef = useRef(draft);
  draftStateRef.current = draft;

  const pointTo = useCallback((clientX: number, clientY: number, rect: DOMRect): { abs: number; stationIdx: number } => {
    const xIn = Math.max(0, Math.min(canvasW - 1, clientX - rect.left));
    const di = Math.max(0, Math.min(dayCount - 1, Math.floor(xIn / dayW)));
    const si = Math.max(0, Math.min(stationCount - 1, Math.floor((xIn - di * dayW) / SUBCOL_W)));
    const rawMin = (clientY - rect.top) / pxPerMin;
    const min = Math.max(0, Math.min(1440, Math.round(rawMin / snapStep) * snapStep));
    return { abs: di * 1440 + min, stationIdx: si };
  }, [canvasW, dayCount, dayW, stationCount, SUBCOL_W, pxPerMin, snapStep]);

  const beginDraw = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    draftRectRef.current = rect;
    const { abs, stationIdx } = pointTo(e.clientX, e.clientY, rect);
    const st = stations[stationIdx];
    if (!st) return;
    setDraft({ stationId: st.id, anchor: abs, head: abs });
  };

  useEffect(() => {
    if (!draft) return;
    const onMove = (e: MouseEvent) => {
      const rect = draftRectRef.current;
      if (!rect) return;
      setDraft(prev => {
        if (!prev) return prev;
        let head = pointTo(e.clientX, e.clientY, rect).abs;
        // A shift can't exceed 24h (backend rule) — clamp the draw live.
        head = Math.max(prev.anchor - 1440, Math.min(prev.anchor + 1440, head));
        return { ...prev, head };
      });
    };
    const onUp = () => {
      const prev = draftStateRef.current;
      setDraft(null);
      if (prev) {
        const a = Math.min(prev.anchor, prev.head);
        const b = Math.max(prev.anchor, prev.head);
        if (b - a >= 30) openBlockModal(a, b, '', prev.stationId);
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft !== null, pointTo]);

  // ─── Create / edit block modal ───────────────────────────────────────────

  const [blockModal, setBlockModal] = useState<{ stationId: string; startStr: string; endStr: string; guardId: string; editingId?: string } | null>(null);
  const [blockSaving, setBlockSaving] = useState(false);

  const absToWallStr = useCallback((abs: number): string => {
    const dayDate = addDays(days[0], Math.floor(abs / 1440));
    const m = ((abs % 1440) + 1440) % 1440;
    return `${fmtDate(dayDate)}T${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
  }, [days]);

  const openBlockModal = (aAbs: number, bAbs: number, guardId: string, stationId: string) => {
    setBlockModal({
      stationId: stationId || (stations.length === 1 ? stations[0].id : ''),
      startStr: absToWallStr(aAbs),
      endStr: absToWallStr(bAbs),
      guardId,
    });
  };

  const openEditModal = (s: ShiftRecord) => {
    setBlockModal({
      stationId: s.stationId,
      startStr: shiftWallStr(s.startTime, tz),
      endStr: shiftWallStr(s.endTime, tz),
      guardId: s.guardId,
      editingId: s.id,
    });
  };

  const openDuplicateModal = (s: ShiftRecord) => {
    // Same station/guard/hours, next day — adjust anything in the modal.
    setBlockModal({
      stationId: s.stationId,
      startStr: addDaysToWallStr(shiftWallStr(s.startTime, tz), 1),
      endStr: addDaysToWallStr(shiftWallStr(s.endTime, tz), 1),
      guardId: s.guardId,
    });
  };

  const saveBlock = async () => {
    if (!blockModal) return;
    if (!blockModal.stationId) { toast.error('Seleccione una estación'); return; }
    if (!blockModal.guardId) { toast.error('Seleccione un vigilante'); return; }
    const start = wallStrToDate(blockModal.startStr, tz);
    const end = wallStrToDate(blockModal.endStr, tz);
    if (!start || !end) { toast.error('Fechas inválidas'); return; }
    if (end <= start) { toast.error('El fin debe ser posterior al inicio'); return; }
    if (end.getTime() - start.getTime() > 24 * 3600000) { toast.error('Un turno no puede durar más de 24 horas'); return; }
    const station = stationById.get(blockModal.stationId);
    setBlockSaving(true);
    try {
      if (blockModal.editingId) {
        await ApiService.put(`/tenant/${tenantId}/shift/${blockModal.editingId}`, {
          data: {
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            station: blockModal.stationId,
            guard: blockModal.guardId,
            postSiteId: station?.postSiteId,
          },
        });
        toast.success('Turno actualizado');
      } else {
        // Same semantics as the station "Turno único": clear this guard's
        // overlapping shifts first so the drawn block replaces, not duplicates.
        const overlapping = shifts.filter(s =>
          s.guardId === blockModal.guardId &&
          new Date(s.startTime) < end && new Date(s.endTime) > start,
        );
        if (overlapping.length) {
          await ApiService.delete(`/tenant/${tenantId}/shift?ids=${overlapping.map(s => s.id).join(',')}`).catch(() => {});
        }
        await ApiService.post(`/tenant/${tenantId}/shift`, {
          data: {
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            station: blockModal.stationId,
            guard: blockModal.guardId,
            postSiteId: station?.postSiteId,
          },
        });
        toast.success(overlapping.length ? 'Turno creado (reemplazó turnos solapados)' : 'Turno creado');
      }
      setBlockModal(null);
      onChanged();
    } catch (e: any) {
      toast.error(e?.data?.message || e?.message || 'Error al guardar el turno');
    } finally {
      setBlockSaving(false);
    }
  };

  // ─── Block detail / delete / context menu ────────────────────────────────

  const [detail, setDetail] = useState<ShiftRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);

  const deleteShift = async (target: ShiftRecord) => {
    const isEngine = !!target.positionId;
    const ok = await confirmDialog({
      title: 'Eliminar turno',
      message: isEngine
        ? 'Este turno fue generado por la rotación de la estación. Puedes eliminarlo, pero puede regenerarse al reoptimizar o reasignar. ¿Eliminar?'
        : '¿Eliminar este turno?',
      confirmText: 'Eliminar',
      tone: 'danger',
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await ApiService.delete(`/tenant/${tenantId}/shift/${target.id}`);
      toast.success('Turno eliminado');
      setDetail(null);
      onChanged();
    } catch (e: any) {
      toast.error(e?.data?.message || e?.message || 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  const openBlockCtx = (e: React.MouseEvent, s: ShiftRecord) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: 'Editar turno…', onClick: () => openEditModal(s) },
        { label: 'Duplicar (día siguiente)…', onClick: () => openDuplicateModal(s) },
        { label: 'Ver detalle', onClick: () => setDetail(s) },
        { label: '—' },
        { label: 'Eliminar turno', danger: true, onClick: () => void deleteShift(s) },
      ],
    });
  };

  // Drop a guard chip (from the side panel) onto a sub-column → prefilled block.
  const onCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const guardId = e.dataTransfer.getData('guardId');
    if (!guardId) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const { abs, stationIdx } = pointTo(e.clientX, e.clientY, rect);
    openBlockModal(abs, Math.min(totalMin, abs + 12 * 60), guardId, stations[stationIdx]?.id || '');
  };

  // ─── Render helpers ──────────────────────────────────────────────────────

  const guardLabelOf = (s: ShiftRecord) =>
    s.guard ? `${s.guard.firstName || ''} ${s.guard.lastName || ''}`.trim() : (guardsPool.find(g => g.id === s.guardId)?.label || '?');

  const dayTint = (day: Date): string | null => {
    if (fmtDate(day) === todayStr) return 'rgba(200,134,10,0.07)';
    if (day.getDay() === 0) return 'rgba(239,68,68,0.04)';
    return null;
  };

  const draftSegs = useMemo(() => {
    if (!draft) return [];
    const a = Math.min(draft.anchor, draft.head);
    const b = Math.max(draft.anchor, draft.head);
    return b > a ? segmentize(a, b, dayCount) : [];
  }, [draft, dayCount]);

  const draftStationIdx = draft ? (stationIndexById.get(draft.stationId) ?? 0) : 0;

  const inputCls = 'w-full rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20';

  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div
        ref={scrollRef}
        className="flex-1 min-w-0 overflow-auto select-none bg-card border border-border/40 rounded-xl shadow-sm"
        onMouseDown={e => startPan(e, scrollRef.current)}
      >
        <div style={{ minWidth: GUTTER_W + canvasW }}>
          {/* ─── Frozen header: days row + estación sub-columns row ─── */}
          <div className="sticky top-0 z-30 border-b border-border/30 bg-card">
            <div className="flex" style={{ height: HEADER_H }}>
              <div className="sticky left-0 z-40 shrink-0 bg-card border-r border-border/20 flex items-center justify-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wide" style={{ width: GUTTER_W }}>
                Hora
              </div>
              <div className="relative" style={{ width: canvasW }}>
                {days.map((day, di) => {
                  const isToday = fmtDate(day) === todayStr;
                  return (
                    <div key={di} className={`absolute top-0 bottom-0 border-r border-border/30 ${isToday ? 'bg-primary/5' : ''}`} style={{ left: di * dayW, width: dayW }}>
                      <div className={`px-2 pt-0.5 text-[11px] font-semibold truncate ${isToday ? 'text-primary' : 'text-foreground'}`}>
                        {DAYS_ES[day.getDay()]} {day.getDate()} <span className="font-normal text-muted-foreground">{day.toLocaleDateString('es', { month: 'short' })}</span>
                        {view === 'day' && di === 1 && <span className="ml-1 text-[9px] font-normal text-muted-foreground">(siguiente)</span>}
                      </div>
                      {/* Estación sub-columns */}
                      <div className="absolute left-0 right-0 bottom-0 flex" style={{ height: 22 }}>
                        {stations.map(st => (
                          <div key={st.id} className="shrink-0 border-r border-border/15 last:border-r-0 px-1.5 flex items-center overflow-hidden" style={{ width: SUBCOL_W }} title={st.stationName}>
                            <span className="text-[9px] font-medium text-muted-foreground truncate">{st.stationName}</span>
                          </div>
                        ))}
                      </div>
                      {isToday && <div className="absolute left-0 right-0 bottom-0 h-[2px] bg-primary" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ─── Body: hour gutter (frozen left) + canvas ─── */}
          <div className="flex">
            {/* Hour axis */}
            <div className="sticky left-0 z-20 shrink-0 bg-card border-r border-border/20 relative" style={{ width: GUTTER_W, height: bodyH }}>
              {Array.from({ length: 24 }, (_, h) => h).map(h => (
                <span
                  key={h}
                  className="absolute right-1.5 text-[9px] text-muted-foreground -translate-y-1/2"
                  style={{ top: h * hourH || 6 }}
                >
                  {pad2(h)}:00
                </span>
              ))}
              {now && (
                <div className="absolute left-0 right-0 h-px bg-primary z-10" style={{ top: now.minutes * pxPerMin }} />
              )}
            </div>

            {/* Canvas */}
            <div
              className="relative cursor-crosshair"
              style={{
                width: canvasW,
                height: bodyH,
                backgroundImage: `repeating-linear-gradient(to bottom, rgba(128,128,128,0.10) 0, rgba(128,128,128,0.10) 1px, transparent 1px, transparent ${hourH}px)`,
              }}
              onMouseDown={beginDraw}
              onDragOver={e => e.preventDefault()}
              onDrop={onCanvasDrop}
            >
              {/* Day bands (tint + today bars) and estación sub-column separators */}
              {days.map((day, di) => {
                const tint = dayTint(day);
                const isToday = fmtDate(day) === todayStr;
                return (
                  <div key={di} className="pointer-events-none">
                    <div
                      className="absolute top-0 bottom-0 border-r border-border/40"
                      style={{ left: di * dayW, width: dayW, backgroundColor: tint || undefined }}
                    />
                    {stations.slice(0, -1).map((st, si) => (
                      <div key={st.id} className="absolute top-0 bottom-0 border-r border-border/15" style={{ left: di * dayW + (si + 1) * SUBCOL_W, width: 0 }} />
                    ))}
                    {isToday && (
                      <>
                        <div className="absolute top-0 bottom-0 w-[3px] bg-primary/70 rounded-full" style={{ left: di * dayW }} />
                        <div className="absolute top-0 bottom-0 w-[3px] bg-primary/70 rounded-full" style={{ left: (di + 1) * dayW - 3 }} />
                      </>
                    )}
                  </div>
                );
              })}

              {/* Now line (today's band only) */}
              {now && (
                <div
                  className="absolute h-[2px] bg-primary/80 pointer-events-none z-10"
                  style={{ top: now.minutes * pxPerMin, left: now.dayIdx * dayW, width: dayW }}
                />
              )}

              {/* Shift block segments, per (day, estación) cell-column */}
              {Array.from(cells.entries()).map(([key, cell]) => {
                const [diStr, siStr] = key.split(':');
                const di = Number(diStr), si = Number(siStr);
                const laneW = (SUBCOL_W - 8) / cell.lanes;
                return cell.items.map(({ seg, shift: s, lane }) => {
                  const color = guardColorMap[s.guardId] || '#888';
                  const isEngine = !!s.positionId;
                  const h = (seg.bottom - seg.top) * pxPerMin;
                  const name = guardLabelOf(s);
                  const startW = dateToWall(new Date(s.startTime), tz);
                  const endW = dateToWall(new Date(s.endTime), tz);
                  const timeLbl = `${minLabel(startW.minutes)}–${minLabel(endW.minutes)}`;
                  return (
                    <div
                      key={`${s.id}-${seg.dayIdx}`}
                      className={`absolute px-1.5 py-0.5 overflow-hidden cursor-pointer transition-all hover:brightness-110 ${isEngine ? 'border border-dashed' : 'border'} ${seg.first ? 'rounded-t-md' : ''} ${seg.last ? 'rounded-b-md' : ''}`}
                      style={{
                        top: seg.top * pxPerMin,
                        height: Math.max(8, h - 1),
                        left: di * dayW + si * SUBCOL_W + 4 + lane * laneW,
                        width: laneW - 2,
                        backgroundColor: `${color}${isEngine ? '14' : '26'}`,
                        borderColor: `${color}66`,
                        ...(seg.first ? { borderTop: `3px solid ${color}` } : {}),
                      }}
                      title={`${name} · ${timeLbl}${isEngine ? ' · generado por rotación' : ' · turno manual'} — clic: detalle · clic derecho: opciones`}
                      onMouseDown={e => { if (e.button === 0) e.stopPropagation(); }}
                      onClick={() => setDetail(s)}
                      onContextMenu={e => openBlockCtx(e, s)}
                    >
                      {seg.first && h > 20 && (
                        <span className="block text-[9px] font-semibold truncate" style={{ color }}>
                          {name.split(' ')[0]}
                        </span>
                      )}
                      {seg.first && h > 38 && (
                        <span className="block text-[8px] text-muted-foreground truncate">{timeLbl}</span>
                      )}
                    </div>
                  );
                });
              })}

              {/* Draw preview (in the anchor's estación sub-column) */}
              {draftSegs.map(seg => (
                <div
                  key={`draft-${seg.dayIdx}`}
                  className={`absolute bg-primary/20 border-2 border-primary/60 pointer-events-none flex items-start justify-center ${seg.first ? 'rounded-t-md' : ''} ${seg.last ? 'rounded-b-md' : ''}`}
                  style={{
                    top: seg.top * pxPerMin,
                    height: (seg.bottom - seg.top) * pxPerMin,
                    left: seg.dayIdx * dayW + draftStationIdx * SUBCOL_W + 3,
                    width: SUBCOL_W - 6,
                  }}
                >
                  {seg.first && draft && (
                    <span className="text-[9px] font-bold text-primary whitespace-nowrap px-1 pt-0.5">
                      {minLabel(Math.min(draft.anchor, draft.head))} – {minLabel(Math.max(draft.anchor, draft.head))} · {((Math.max(draft.anchor, draft.head) - Math.min(draft.anchor, draft.head)) / 60).toFixed(1).replace('.0', '')}h
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {ctxMenu && <ContextMenu menu={ctxMenu} onClose={() => setCtxMenu(null)} />}

      {/* ─── Create / edit block modal ─── */}
      {blockModal && (() => {
        const start = wallStrToDate(blockModal.startStr, tz);
        const end = wallStrToDate(blockModal.endStr, tz);
        const hours = start && end && end > start ? (end.getTime() - start.getTime()) / 3600000 : 0;
        const editing = !!blockModal.editingId;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setBlockModal(null)}>
            <div className="bg-card border border-border/30 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="px-5 py-4 border-b border-border/20 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">{editing ? 'Editar turno' : 'Nuevo bloque de trabajo'}</h4>
                <button onClick={() => setBlockModal(null)} className="p-1.5 rounded-lg hover:bg-muted/30 text-muted-foreground"><X size={15} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Estación</label>
                  <select
                    value={blockModal.stationId}
                    onChange={e => setBlockModal(m => m ? { ...m, stationId: e.target.value } : m)}
                    className={inputCls}
                  >
                    <option value="">Seleccionar estación...</option>
                    {stations.map(s => <option key={s.id} value={s.id}>{s.stationName}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Inicio</label>
                    <input
                      type="datetime-local"
                      value={blockModal.startStr}
                      onChange={e => setBlockModal(m => m ? { ...m, startStr: e.target.value } : m)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Fin</label>
                    <input
                      type="datetime-local"
                      value={blockModal.endStr}
                      onChange={e => setBlockModal(m => m ? { ...m, endStr: e.target.value } : m)}
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Clock size={12} />
                  {hours > 0
                    ? <span>Duración: <b className="text-foreground">{hours % 1 === 0 ? hours : hours.toFixed(1)}h</b>{hours === 24 ? ' (turno completo)' : ''} · hora de la empresa</span>
                    : <span className="text-red-500">El fin debe ser posterior al inicio</span>}
                  {hours > 24 && <span className="text-red-500">· máximo 24h</span>}
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Vigilante</label>
                  <select
                    value={blockModal.guardId}
                    onChange={e => setBlockModal(m => m ? { ...m, guardId: e.target.value } : m)}
                    className={inputCls}
                  >
                    <option value="">Seleccionar vigilante...</option>
                    {guardsPool.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                  </select>
                  {!editing && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Si el vigilante tiene turnos que se solapan con este bloque, se reemplazan.
                    </p>
                  )}
                </div>
              </div>
              <div className="px-5 py-3 border-t border-border/20 flex items-center justify-end gap-2">
                <button onClick={() => setBlockModal(null)} className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-all">Cancelar</button>
                <button
                  onClick={saveBlock}
                  disabled={blockSaving || !blockModal.guardId || !blockModal.stationId || hours <= 0 || hours > 24}
                  className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 transition-all shadow-sm"
                >
                  {blockSaving ? <Loader2 size={14} className="animate-spin" /> : (editing ? 'Guardar cambios' : 'Crear turno')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── Block detail modal ─── */}
      {detail && (() => {
        const station = stationById.get(detail.stationId);
        const sw = dateToWall(new Date(detail.startTime), tz);
        const ew = dateToWall(new Date(detail.endTime), tz);
        const sameDay = sw.dateStr === ew.dateStr;
        const isEngine = !!detail.positionId;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDetail(null)}>
            <div className="bg-card border border-border/30 rounded-2xl shadow-2xl w-full max-w-xs mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="px-5 py-4 border-b border-border/20 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">Turno</h4>
                <button onClick={() => setDetail(null)} className="p-1.5 rounded-lg hover:bg-muted/30 text-muted-foreground"><X size={15} /></button>
              </div>
              <div className="p-5 space-y-2.5 text-sm">
                <div className="flex items-center gap-2 text-foreground">
                  <User size={14} className="text-muted-foreground" />
                  <span className="font-medium">{guardLabelOf(detail)}</span>
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <MapPin size={14} className="text-muted-foreground" />
                  <span>{station?.stationName || 'Estación'}</span>
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <Clock size={14} className="text-muted-foreground" />
                  <span>
                    {sw.dateStr} {minLabel(sw.minutes)} → {sameDay ? '' : `${ew.dateStr} `}{minLabel(ew.minutes)}
                  </span>
                </div>
                <div className={`text-[11px] px-2.5 py-1.5 rounded-lg ${isEngine ? 'bg-amber-500/10 text-amber-700' : 'bg-emerald-500/10 text-emerald-600'}`}>
                  {isEngine ? 'Generado por la rotación de la estación (puede regenerarse si lo eliminas).' : 'Turno manual (bloque dibujado o turno único).'}
                </div>
              </div>
              <div className="px-5 py-3 border-t border-border/20 flex items-center justify-between gap-2">
                <button
                  onClick={() => void deleteShift(detail)}
                  disabled={deleting}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-500/10 disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Eliminar
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setDetail(null); openEditModal(detail); }}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-primary hover:bg-primary/10 transition-all flex items-center gap-1.5"
                  >
                    <Pencil size={13} /> Editar
                  </button>
                  <button onClick={() => setDetail(null)} className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-all">Cerrar</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
