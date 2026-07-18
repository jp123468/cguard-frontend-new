import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Clock, Loader2, MapPin, Trash2, User, X } from 'lucide-react';
import { ApiService } from '@/services/api/apiService';
import { toast } from 'sonner';
import { confirmDialog } from '@/components/ui/confirmDialog';

/**
 * Semana/Día timeline for Programador › Horario, calendar-style: the TIME axis
 * runs VERTICALLY on the left (hours going down, tenant wall-clock) and each
 * estación is a COLUMN. Drag vertically on an empty area of a column to DRAW a
 * work block (turno) of any shape — e.g. 07:00 of one day down to 07:00 of the
 * next — then pick the vigilante in the modal. Creates a real ad-hoc `shift`
 * (same backend as the station "Turno único"), so it coexists with the
 * rotation engine and shows everywhere.
 */

// ─── Types (structural copies of Schedule.tsx shapes) ───────────────────────

interface Station {
  id: string;
  stationName: string;
  scheduleType?: string;
  postSiteId?: string;
}

interface ShiftRecord {
  id: string;
  guardId: string;
  stationId: string;
  positionId?: string;
  startTime: string;
  endTime: string;
  guard?: { id: string; firstName: string; lastName: string };
}

interface GuardOption {
  id: string;
  label: string;
}

interface Props {
  tenantId: string;
  view: 'week' | 'day';
  days: Date[]; // visible calendar days (tenant wall). Day view passes 2 days (48h canvas).
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
function wallToDate(y: number, mo: number, d: number, minutes: number, tz?: string): Date {
  if (!tz) return new Date(y, mo - 1, d, 0, minutes);
  const utcGuess = Date.UTC(y, mo - 1, d, 0, minutes);
  // Two-pass offset correction (handles DST edges; trivial for fixed-offset zones).
  let off = tzOffsetMs(new Date(utcGuess), tz);
  off = tzOffsetMs(new Date(utcGuess - off), tz);
  return new Date(utcGuess - off);
}

/** A real instant → tenant wall-clock {calendar day, minutes into the day}. */
function dateToWall(date: Date, tz?: string): { dateStr: string; minutes: number } {
  if (!tz) return { dateStr: fmtDate(date), minutes: date.getHours() * 60 + date.getMinutes() };
  const shifted = new Date(date.getTime() + tzOffsetMs(date, tz));
  return { dateStr: shifted.toISOString().slice(0, 10), minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes() };
}

const wallStrToDate = (s: string, tz?: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(s);
  if (!m) return null;
  return wallToDate(+m[1], +m[2], +m[3], +m[4] * 60 + +m[5], tz);
};

const minLabel = (abs: number) => `${pad2(Math.floor((((abs % 1440) + 1440) % 1440) / 60))}:${pad2(abs % 60)}`;

// ─── Component ──────────────────────────────────────────────────────────────

export default function ScheduleTimeline({
  tenantId, view, days, stations, shifts, guardsPool, guardColorMap, tz, todayStr, onChanged,
}: Props) {
  // Vertical scale: px per HOUR going down.
  const hourH = view === 'day' ? 40 : 8;
  const pxPerMin = hourH / 60;
  const snapStep = view === 'day' ? 30 : 60;
  const totalMin = days.length * 1440;
  const totalH = totalMin * pxPerMin;
  const GUTTER_W = 64;   // left time axis
  const COL_W = 168;     // one column per estación
  const HEADER_H = 44;
  const firstDayStr = fmtDate(days[0]);

  const absOfWall = useCallback((w: { dateStr: string; minutes: number }): number => {
    const dd = (Date.parse(w.dateStr + 'T00:00:00Z') - Date.parse(firstDayStr + 'T00:00:00Z')) / DAY_MS;
    return dd * 1440 + w.minutes;
  }, [firstDayStr]);

  // Blocks per station with greedy lane packing (overlaps sit side-by-side).
  const colsByStation = useMemo(() => {
    const m = new Map<string, { blocks: { shift: ShiftRecord; a: number; b: number; lane: number }[]; lanes: number }>();
    for (const st of stations) m.set(st.id, { blocks: [], lanes: 1 });
    for (const s of shifts) {
      const entry = m.get(s.stationId);
      if (!entry || !s.startTime || !s.endTime) continue;
      const a = absOfWall(dateToWall(new Date(s.startTime), tz));
      const b = absOfWall(dateToWall(new Date(s.endTime), tz));
      if (b <= 0 || a >= totalMin || b <= a) continue;
      entry.blocks.push({ shift: s, a: Math.max(0, a), b: Math.min(totalMin, b), lane: 0 });
    }
    for (const entry of m.values()) {
      entry.blocks.sort((x, y) => x.a - y.a || x.b - y.b);
      const laneEnds: number[] = [];
      for (const blk of entry.blocks) {
        let lane = laneEnds.findIndex(end => end <= blk.a);
        if (lane === -1) { lane = laneEnds.length; laneEnds.push(0); }
        laneEnds[lane] = blk.b;
        blk.lane = lane;
      }
      entry.lanes = Math.max(1, laneEnds.length);
    }
    return m;
  }, [stations, shifts, absOfWall, tz, totalMin]);

  // "Now" marker in tenant wall-clock.
  const nowAbs = useMemo(() => {
    const abs = absOfWall(dateToWall(new Date(), tz));
    return abs >= 0 && abs <= totalMin ? abs : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [absOfWall, tz, totalMin, shifts]); // shifts changes ~= a refresh tick

  // Hour tick marks down the gutter (skip 0h — the day label sits there).
  const tickHours = useMemo(() => {
    if (view === 'day') return Array.from({ length: 23 }, (_, i) => i + 1);
    return [6, 12, 18];
  }, [view]);

  // ─── Drag-to-draw (vertical) ─────────────────────────────────────────────

  const [draft, setDraft] = useState<{ stationId: string; anchor: number; head: number } | null>(null);
  const draftRectRef = useRef<DOMRect | null>(null);
  // Render-time mirror so mouseup can read the final draft OUTSIDE a state
  // updater (side effects inside updaters double-fire under StrictMode).
  const draftStateRef = useRef(draft);
  draftStateRef.current = draft;

  const snap = useCallback((rawMin: number) => {
    const clamped = Math.max(0, Math.min(totalMin, rawMin));
    return Math.round(clamped / snapStep) * snapStep;
  }, [totalMin, snapStep]);

  const beginDraw = (e: React.MouseEvent, stationId: string) => {
    if (e.button !== 0) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    draftRectRef.current = rect;
    const min = snap((e.clientY - rect.top) / pxPerMin);
    setDraft({ stationId, anchor: min, head: min });
  };

  useEffect(() => {
    if (!draft) return;
    const onMove = (e: MouseEvent) => {
      const rect = draftRectRef.current;
      if (!rect) return;
      setDraft(prev => {
        if (!prev) return prev;
        let head = snap((e.clientY - rect.top) / pxPerMin);
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
        if (b - a >= 30) openBlockModal(prev.stationId, a, b, '');
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft !== null, pxPerMin, snap]);

  // ─── Create-block modal ──────────────────────────────────────────────────

  const [blockModal, setBlockModal] = useState<{ stationId: string; startStr: string; endStr: string; guardId: string } | null>(null);
  const [blockSaving, setBlockSaving] = useState(false);

  const absToWallStr = useCallback((abs: number): string => {
    const dayDate = addDays(days[0], Math.floor(abs / 1440));
    const m = ((abs % 1440) + 1440) % 1440;
    return `${fmtDate(dayDate)}T${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
  }, [days]);

  const openBlockModal = (stationId: string, aAbs: number, bAbs: number, guardId: string) => {
    setBlockModal({ stationId, startStr: absToWallStr(aAbs), endStr: absToWallStr(bAbs), guardId });
  };

  const saveBlock = async () => {
    if (!blockModal) return;
    if (!blockModal.guardId) { toast.error('Seleccione un vigilante'); return; }
    const start = wallStrToDate(blockModal.startStr, tz);
    const end = wallStrToDate(blockModal.endStr, tz);
    if (!start || !end) { toast.error('Fechas inválidas'); return; }
    if (end <= start) { toast.error('El fin debe ser posterior al inicio'); return; }
    if (end.getTime() - start.getTime() > 24 * 3600000) { toast.error('Un turno no puede durar más de 24 horas'); return; }
    const station = stations.find(s => s.id === blockModal.stationId);
    setBlockSaving(true);
    try {
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
      setBlockModal(null);
      onChanged();
    } catch (e: any) {
      toast.error(e?.data?.message || e?.message || 'Error al crear turno');
    } finally {
      setBlockSaving(false);
    }
  };

  // ─── Block detail / delete ───────────────────────────────────────────────

  const [detail, setDetail] = useState<ShiftRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const deleteShift = async () => {
    if (!detail) return;
    const isEngine = !!detail.positionId;
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
      await ApiService.delete(`/tenant/${tenantId}/shift/${detail.id}`);
      toast.success('Turno eliminado');
      setDetail(null);
      onChanged();
    } catch (e: any) {
      toast.error(e?.data?.message || e?.message || 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  // Drop a guard chip (dragged from the side panel) onto a column → prefilled block.
  const onColDrop = (e: React.DragEvent, stationId: string) => {
    e.preventDefault();
    const guardId = e.dataTransfer.getData('guardId');
    if (!guardId) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const start = snap((e.clientY - rect.top) / pxPerMin);
    openBlockModal(stationId, start, Math.min(totalMin, start + 12 * 60), guardId);
  };

  // ─── Render helpers ──────────────────────────────────────────────────────

  const dayTint = (day: Date): string | null => {
    if (fmtDate(day) === todayStr) return 'rgba(200,134,10,0.06)';
    if (day.getDay() === 0) return 'rgba(239,68,68,0.04)';
    return null;
  };

  const guardLabelOf = (s: ShiftRecord) =>
    s.guard ? `${s.guard.firstName || ''} ${s.guard.lastName || ''}`.trim() : (guardsPool.find(g => g.id === s.guardId)?.label || '?');

  const inputCls = 'w-full rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20';

  return (
    <>
      <div className="flex-1 min-w-0 overflow-auto select-none bg-card border border-border/40 rounded-xl shadow-sm">
        <div style={{ minWidth: GUTTER_W + stations.length * COL_W }}>
          {/* ─── Frozen header: station columns ─── */}
          <div className="sticky top-0 z-30 border-b border-border/30 bg-card">
            <div className="flex" style={{ height: HEADER_H }}>
              <div className="sticky left-0 z-40 shrink-0 bg-card border-r border-border/20 flex items-center justify-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wide" style={{ width: GUTTER_W }}>
                Hora
              </div>
              {stations.map(st => (
                <div key={st.id} className="shrink-0 border-r border-border/20 px-3 py-1.5 overflow-hidden" style={{ width: COL_W }}>
                  <div className="text-xs font-semibold text-foreground truncate">{st.stationName}</div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {st.scheduleType ? st.scheduleType.replace('-', ' ').toUpperCase() : 'Sin configurar'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Body: time gutter (frozen left) + one column per estación ─── */}
          <div className="flex">
            {/* Time axis */}
            <div className="sticky left-0 z-20 shrink-0 bg-card border-r border-border/20 relative" style={{ width: GUTTER_W, height: totalH }}>
              {days.map((day, di) => {
                const top = di * 1440 * pxPerMin;
                const isToday = fmtDate(day) === todayStr;
                return (
                  <div key={di}>
                    {/* Day label at the day boundary */}
                    <div className="absolute left-0 right-0 border-t border-border/40 px-1.5 pt-0.5" style={{ top }}>
                      <span className={`text-[10px] font-bold ${isToday ? 'text-primary' : 'text-foreground'}`}>
                        {DAYS_ES[day.getDay()]} {day.getDate()}
                      </span>
                      {view === 'day' && di === 1 && (
                        <span className="block text-[8px] leading-tight text-muted-foreground">(siguiente)</span>
                      )}
                    </div>
                    {/* Hour ticks */}
                    {tickHours.map(h => (
                      <span
                        key={h}
                        className="absolute right-1.5 text-[9px] text-muted-foreground -translate-y-1/2"
                        style={{ top: top + h * 60 * pxPerMin }}
                      >
                        {pad2(h)}:00
                      </span>
                    ))}
                  </div>
                );
              })}
              {nowAbs != null && (
                <div className="absolute left-0 right-0 h-px bg-primary z-10" style={{ top: nowAbs * pxPerMin }} />
              )}
            </div>

            {/* Station columns */}
            {stations.map(station => {
              const col = colsByStation.get(station.id) || { blocks: [], lanes: 1 };
              const laneW = (COL_W - 6) / col.lanes;
              const colDraft = draft && draft.stationId === station.id ? draft : null;
              const dA = colDraft ? Math.min(colDraft.anchor, colDraft.head) : 0;
              const dB = colDraft ? Math.max(colDraft.anchor, colDraft.head) : 0;

              return (
                <div
                  key={station.id}
                  className="relative shrink-0 border-r border-border/15 cursor-crosshair"
                  style={{
                    width: COL_W,
                    height: totalH,
                    backgroundImage: `repeating-linear-gradient(to bottom, rgba(128,128,128,0.10) 0, rgba(128,128,128,0.10) 1px, transparent 1px, transparent ${hourH}px)`,
                  }}
                  onMouseDown={e => beginDraw(e, station.id)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => onColDrop(e, station.id)}
                >
                  {/* Day tints + boundaries (horizontal bands) */}
                  {days.map((day, di) => {
                    const tint = dayTint(day);
                    return (
                      <div
                        key={di}
                        className="absolute left-0 right-0 pointer-events-none border-t border-border/40"
                        style={{ top: di * 1440 * pxPerMin, height: 1440 * pxPerMin, backgroundColor: tint || undefined }}
                      />
                    );
                  })}

                  {/* Now line */}
                  {nowAbs != null && (
                    <div className="absolute left-0 right-0 h-px bg-primary/70 pointer-events-none" style={{ top: nowAbs * pxPerMin }} />
                  )}

                  {/* Shift blocks */}
                  {col.blocks.map(blk => {
                    const s = blk.shift;
                    const color = guardColorMap[s.guardId] || '#888';
                    const isEngine = !!s.positionId;
                    const h = (blk.b - blk.a) * pxPerMin;
                    const name = guardLabelOf(s);
                    const startW = dateToWall(new Date(s.startTime), tz);
                    const endW = dateToWall(new Date(s.endTime), tz);
                    const timeLbl = `${minLabel(startW.minutes)}–${minLabel(endW.minutes)}`;
                    return (
                      <div
                        key={s.id}
                        className={`absolute rounded-md px-1.5 py-0.5 overflow-hidden cursor-pointer transition-all hover:brightness-110 ${isEngine ? 'border border-dashed' : 'border'}`}
                        style={{
                          top: blk.a * pxPerMin,
                          height: Math.max(8, h - 2),
                          left: 3 + blk.lane * laneW,
                          width: laneW - 2,
                          backgroundColor: `${color}${isEngine ? '14' : '26'}`,
                          borderColor: `${color}66`,
                          borderTop: `3px solid ${color}`,
                        }}
                        title={`${name} · ${timeLbl}${isEngine ? ' · generado por rotación' : ' · turno manual'}`}
                        onMouseDown={e => e.stopPropagation()}
                        onClick={() => setDetail(s)}
                      >
                        {h > 22 && (
                          <span className="block text-[9px] font-semibold truncate" style={{ color }}>
                            {name.split(' ')[0]}
                          </span>
                        )}
                        {h > 38 && (
                          <span className="block text-[8px] text-muted-foreground truncate">{timeLbl}</span>
                        )}
                      </div>
                    );
                  })}

                  {/* Draw preview */}
                  {colDraft && dB > dA && (
                    <div
                      className="absolute left-1 right-1 rounded-md bg-primary/20 border-2 border-primary/60 pointer-events-none flex items-center justify-center"
                      style={{ top: dA * pxPerMin, height: (dB - dA) * pxPerMin }}
                    >
                      <span className="text-[9px] font-bold text-primary whitespace-nowrap px-1">
                        {minLabel(dA)} – {minLabel(dB)} · {((dB - dA) / 60).toFixed(1).replace('.0', '')}h
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {stations.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">No hay estaciones.</div>
          )}
        </div>
      </div>

      {/* ─── Create-block modal ─── */}
      {blockModal && (() => {
        const station = stations.find(s => s.id === blockModal.stationId);
        const start = wallStrToDate(blockModal.startStr, tz);
        const end = wallStrToDate(blockModal.endStr, tz);
        const hours = start && end && end > start ? (end.getTime() - start.getTime()) / 3600000 : 0;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setBlockModal(null)}>
            <div className="bg-card border border-border/30 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="px-5 py-4 border-b border-border/20 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Nuevo bloque de trabajo</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <MapPin size={11} /> {station?.stationName || 'Estación'}
                  </p>
                </div>
                <button onClick={() => setBlockModal(null)} className="p-1.5 rounded-lg hover:bg-muted/30 text-muted-foreground"><X size={15} /></button>
              </div>
              <div className="p-5 space-y-4">
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
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Si el vigilante tiene turnos que se solapan con este bloque, se reemplazan.
                  </p>
                </div>
              </div>
              <div className="px-5 py-3 border-t border-border/20 flex items-center justify-end gap-2">
                <button onClick={() => setBlockModal(null)} className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-all">Cancelar</button>
                <button
                  onClick={saveBlock}
                  disabled={blockSaving || !blockModal.guardId || hours <= 0 || hours > 24}
                  className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 transition-all shadow-sm"
                >
                  {blockSaving ? <Loader2 size={14} className="animate-spin" /> : 'Crear turno'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── Block detail modal ─── */}
      {detail && (() => {
        const station = stations.find(s => s.id === detail.stationId);
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
              <div className="px-5 py-3 border-t border-border/20 flex items-center justify-between">
                <button
                  onClick={deleteShift}
                  disabled={deleting}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-500/10 disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Eliminar turno
                </button>
                <button onClick={() => setDetail(null)} className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-all">Cerrar</button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
