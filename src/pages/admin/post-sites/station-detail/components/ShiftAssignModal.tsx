import { localToday, nextRestDates, offsetForRestStart, weeklyRestWeekday, shortRestLabel, type RotationCycle } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';
import { Loader2, UserPlus, Repeat, CalendarRange, Moon } from 'lucide-react';
import { toast } from 'sonner';
import { ApiService } from '@/services/api/apiService';
import { Modal } from '@/components/kit';
import { Button } from '@/components/ui/button';
import type { Station } from '@/types';

// Local YYYY-MM-DD (avoid toISOString — it shifts day in negative-UTC zones).
const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

interface StationDetail extends Station {
  startingTimeInDay?: string | null;
  finishTimeInDay?: string | null;
}

// A scheduler position row from `/station/:id/positions`.
interface PositionRow { id: string; type?: string; platoonOffset?: number; sortOrder?: number }
// A rotation style (patrón) — dayShifts/nightShifts/restDays define the cycle.
interface RotationStyleRow extends RotationCycle { id: string; name?: string }
// A raw shift row from `/shift` (only the fields this modal reads).
interface ShiftRow { id?: string; startTime?: string; start?: string; endTime?: string; end?: string }
// A guard autocomplete row.
interface GuardAutoRow { guardId?: string; id?: string; value?: string; fullName?: string; name?: string; label?: string; email?: string }

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called after a successful save. firstDate = the first created turno's date. */
  onSaved: (firstDate?: Date) => void;
  station: StationDetail;
  stationId: string;
  postSiteId: string;
  presetGuardId?: string;
};

/**
 * The single guard-assignment modal (used by the Turnos tab AND "Vigilantes
 * Asignados"). Rotación mode assigns the guard to a POSITION (Vigilante 1/2) via
 * the scheduling engine, which staggers day/night automatically from the
 * station's patrón de rotación — NO per-guard jornada or pattern. "Turno único"
 * creates a one-off shift. Self-contained: loads its own guards + positions.
 */
export default function ShiftAssignModal({ open, onClose, onSaved, station, stationId, postSiteId, presetGuardId }: Props) {
  const tenantId = (station?.tenantId || localStorage.getItem('tenantId') || '') as string;

  const [assignMode, setAssignMode] = useState<'single' | 'rotation'>('rotation');
  const [shiftGuard, setShiftGuard] = useState('');
  const [guardsOptions, setGuardsOptions] = useState<{ id: string; label: string }[]>([]);
  const [loadingGuards, setLoadingGuards] = useState(false);
  const [saving, setSaving] = useState(false);
  // The rotation PHASE comes from the station position (staggered), not a date —
  // so we don't ask for one (no date input). Shifts simply begin today.
  const [rotationStartDate, setRotationStartDate] = useState(() => localToday());
  // Optional end date: assign the guard to the station only until this date (e.g.
  // temporary cover). Empty ⇒ indefinite. Backend already supports endDate.
  const [rotationEndDate, setRotationEndDate] = useState('');
  // Optional planner override: pick the guard's FIRST day of descanso. Empty ⇒ the
  // station position's own staggered phase (the default). When set, we re-phase the
  // assignment after creating it so the rest day lands exactly where the planner wants.
  const [restStartDate, setRestStartDate] = useState('');
  const [rotationStyles, setRotationStyles] = useState<RotationStyleRow[]>([]);
  const [selectedPositionId, setSelectedPositionId] = useState('');
  const [shiftStart, setShiftStart] = useState('');
  const [shiftEnd, setShiftEnd] = useState('');
  const [positions, setPositions] = useState<PositionRow[]>([]);
  // Occupancy (tenant-wide active rotations) so we never offer a vigilante who
  // already has an assignment, nor a puesto that's already taken.
  const [occupiedGuardIds, setOccupiedGuardIds] = useState<Set<string>>(new Set());
  const [occupiedPositionIds, setOccupiedPositionIds] = useState<Set<string>>(new Set());

  // Assignable positions (puestos). Fijos shown as "Vigilante 1/2…" (they rotate
  // through day AND night, staggered by the engine); sacafranco shown separately.
  // A puesto already taken is flagged `occupied` (disabled in the UI).
  const positionOptions = useMemo(() => {
    const fijos = positions.filter((p: PositionRow) => (p.type || 'fijo') !== 'sacafranco');
    const sacas = positions.filter((p: PositionRow) => (p.type || 'fijo') === 'sacafranco');
    return [
      ...fijos.map((p: PositionRow, i: number) => ({ id: p.id, label: `Vigilante ${i + 1}`, type: 'fijo' as const, occupied: occupiedPositionIds.has(String(p.id)) })),
      ...sacas.map((p: PositionRow, i: number) => ({ id: p.id, label: sacas.length > 1 ? `Sacafranco ${i + 1}` : 'Sacafranco', type: 'sacafranco' as const, occupied: occupiedPositionIds.has(String(p.id)) })),
    ];
  }, [positions, occupiedPositionIds]);

  // Vigilantes free to assign (drop anyone with an active rotation anywhere).
  const availableGuards = useMemo(
    () => guardsOptions.filter((g) => !occupiedGuardIds.has(String(g.id))),
    [guardsOptions, occupiedGuardIds],
  );

  // Live rest-day preview for the selected fijo puesto. Uses the station's patrón +
  // the position's staggered offset (or the planner's chosen rest day, if set), so
  // the planner SEES the descanso before saving — no more invisible wrong weekday.
  const restPreview = useMemo(() => {
    const pos = positions.find((p) => p.id === selectedPositionId);
    if (!pos || (pos.type || 'fijo') === 'sacafranco') return null;
    const style = rotationStyles.find((s) => String(s.id) === String((station as any).rotationStyleId));
    if (!style) return null;
    const cycle = style.dayShifts + style.nightShifts + style.restDays;
    if (cycle <= 0) return null;
    const override = restStartDate ? offsetForRestStart(style, new Date(restStartDate + 'T12:00:00')) : null;
    const offset = override ?? (typeof pos.platoonOffset === 'number' ? pos.platoonOffset : (pos.sortOrder || 0));
    const dates = nextRestDates(style, offset, new Date(), style.restDays >= 2 ? 2 : 1);
    return { weekday: weeklyRestWeekday(style, offset), dates, styleName: style.name, overridden: !!override };
  }, [positions, selectedPositionId, rotationStyles, station, restStartDate]);

  // Initialize + load data each time the modal opens.
  useEffect(() => {
    if (!open) return;
    const startHour = station?.startingTimeInDay || '07:00';
    const endHour = station?.finishTimeInDay || '19:00';
    const target = dateKey(new Date());
    setShiftStart(`${target}T${startHour}`);
    setShiftEnd(`${target}T${endHour}`);
    setShiftGuard(presetGuardId || '');
    setRotationStartDate(target);
    setRestStartDate('');
    setAssignMode('rotation');
    setSelectedPositionId('');

    (async () => {
      setLoadingGuards(true);
      try {
        const res: any = await ApiService.get(`/tenant/${tenantId}/security-guard/autocomplete?limit=200`);
        const list = Array.isArray(res) ? res : (res?.rows ?? []);
        setGuardsOptions(list.map((r: GuardAutoRow) => ({ id: r.guardId || r.id || r.value || '', label: r.fullName || r.name || r.label || r.email || '' })).filter((g: { id: string; label: string }) => g.id));
      } catch { setGuardsOptions([]); } finally { setLoadingGuards(false); }
    })();
    ApiService.get(`/tenant/${tenantId}/station/${stationId}/positions`).then((r: any) => setPositions(Array.isArray(r) ? r : (r?.rows ?? []))).catch(() => {});
    // Rotation styles → resolve the station's patrón (dayShifts/nightShifts/restDays)
    // so we can preview the guard's rest day.
    ApiService.get(`/tenant/${tenantId}/rotation-styles`).then((r: any) => setRotationStyles(Array.isArray(r) ? r : (r?.rows ?? r?.data?.rows ?? []))).catch(() => {});
    // Tenant-wide active assignments → occupied vigilantes + occupied puestos.
    ApiService.get(`/tenant/${tenantId}/guard-assignments?status=active`).then((r: any) => {
      const rows = Array.isArray(r) ? r : (r?.rows ?? []);
      const og = new Set<string>(); const op = new Set<string>();
      for (const a of rows) {
        const isRotation = a.kind ? a.kind === 'rotation' : (!!a.positionId || !!a.isRelief);
        if (!isRotation) continue;
        const gid = String(a.guardId || a.guard?.id || '');
        if (gid) og.add(gid);
        if (String(a.stationId) === String(stationId) && a.positionId) op.add(String(a.positionId));
      }
      setOccupiedGuardIds(og); setOccupiedPositionIds(op);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Default the puesto to the first FREE one once positions/occupancy load.
  useEffect(() => {
    if (!open) return;
    const free = positionOptions.find((p) => !p.occupied);
    if (free && (!selectedPositionId || positionOptions.find((p) => p.id === selectedPositionId)?.occupied)) {
      setSelectedPositionId(free.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, positionOptions]);

  // A slot already taken by THIS guard is the desired end state, not an error.
  const isBenignSlotConflict = (e: any) => {
    const blob = `${e?.message || ''} ${(() => { try { return JSON.stringify(e?.data ?? e?.response ?? ''); } catch { return ''; } })()}`;
    return /uniq_shift_slot/i.test(blob);
  };

  // Fetch the station's current shifts (fresh — avoids stale-overlap conflicts).
  const fetchCurrentShifts = async (): Promise<ShiftRow[]> => {
    try {
      const r: any = await ApiService.get(`/tenant/${tenantId}/shift?filter[station]=${encodeURIComponent(stationId)}&limit=999&_=${Date.now()}`);
      return Array.isArray(r) ? r : (r?.rows ?? []);
    } catch { return []; }
  };

  // Replace whatever already occupies a slot at this station (one turno per slot).
  const deleteOverlappingShifts = async (list: ShiftRow[], start: Date, end: Date) => {
    const s = start.getTime(); const e = end.getTime();
    const matched = list.filter((r: ShiftRow) => {
      const rs = new Date(r.startTime || r.start || '').getTime();
      const re = new Date(r.endTime || r.end || '').getTime();
      return Number.isFinite(rs) && Number.isFinite(re) && rs < e && re > s;
    });
    const ids = matched.map((r: ShiftRow) => r.id).filter(Boolean);
    if (ids.length) {
      await ApiService.delete(`/tenant/${tenantId}/shift?ids=${ids.join(',')}`);
      matched.forEach((m) => { const i = list.indexOf(m); if (i >= 0) list.splice(i, 1); });
    }
    return ids.length;
  };

  const saveShift = async () => {
    if (!shiftGuard) { toast.error('Seleccione un vigilante'); return; }

    // ── Turno único (one-off ad-hoc shift) ────────────────────────────────────
    if (assignMode === 'single') {
      if (!shiftStart || !shiftEnd) { toast.error('Complete todos los campos'); return; }
      const start = new Date(shiftStart); const end = new Date(shiftEnd);
      if (end <= start) { toast.error('La hora de fin debe ser posterior al inicio'); return; }
      if ((end.getTime() - start.getTime()) > 24 * 60 * 60 * 1000) { toast.error('Un turno no puede durar más de 24 horas'); return; }
      const current = await fetchCurrentShifts();
      setSaving(true);
      try {
        await deleteOverlappingShifts(current, start, end);
        await ApiService.post(`/tenant/${tenantId}/shift`, { data: { startTime: start.toISOString(), endTime: end.toISOString(), station: stationId, guard: shiftGuard, postSiteId } });
        toast.success('Turno creado');
        onSaved(start);
      } catch (e: any) {
        if (isBenignSlotConflict(e)) { toast.success('El vigilante ya estaba asignado a ese turno'); onSaved(start); }
        else toast.error(e?.data?.message || e?.message || 'Error al crear turno');
      } finally { setSaving(false); }
      return;
    }

    // ── Rotación → the scheduling ENGINE (assign to a position) ────────────────
    // The guard is assigned to a station POSITION (Vigilante 1/2). The engine
    // generates the staggered rotation (one starts day, the other night, swapping
    // each cycle) from the station's patrón de rotación. Same path as Programador.
    if (!selectedPositionId) { toast.error('Seleccione el puesto (Vigilante)'); return; }
    const pos = positions.find((p: PositionRow) => p.id === selectedPositionId);
    const isRelief = (pos?.type || 'fijo') === 'sacafranco';
    setSaving(true);
    try {
      const created: any = await ApiService.post(`/tenant/${tenantId}/guard-assignment`, {
        data: {
          guardId: shiftGuard,
          stationId,
          positionId: selectedPositionId,
          startDate: rotationStartDate,
          endDate: rotationEndDate || null,
          isRelief,
        },
      });
      // Planner chose an explicit first day of descanso → re-phase the fresh
      // assignment (updates position + assignment offset + regenerates) so the rest
      // day lands exactly there, on any station type.
      if (restStartDate && !isRelief) {
        let asgId = created?.id || created?.data?.id || created?.rows?.[0]?.id;
        if (!asgId) {
          try {
            const list: any = await ApiService.get(`/tenant/${tenantId}/guard-assignments?status=active`);
            const rows = Array.isArray(list) ? list : (list?.rows ?? []);
            asgId = rows.find((a: any) => String(a.guardId) === String(shiftGuard) && String(a.positionId) === String(selectedPositionId) && String(a.stationId) === String(stationId))?.id;
          } catch { /* best-effort */ }
        }
        if (asgId) {
          try { await ApiService.post(`/tenant/${tenantId}/guard-assignment/${asgId}/rephase`, { data: { restStartDate } }); }
          catch { toast.warning('Se asignó, pero no se pudo fijar el día de descanso. Ajústalo en Programador › Horario.'); }
        }
      }
      toast.success('Vigilante asignado · si es fijo, la rotación se genera automáticamente; los sacafrancos se colocan a mano en Programador › Horario');
      onSaved(new Date(rotationStartDate + 'T12:00:00'));
    } catch (e: any) {
      toast.error(e?.data?.message || e?.message || 'Error al asignar');
    } finally { setSaving(false); }
  };

  const inputCls = 'w-full rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20';

  return (
    <Modal
      open={open}
      onOpenChange={(o) => { if (!o) onClose(); }}
      size="md"
      icon={<UserPlus className="h-5 w-5" />}
      title="Asignar vigilante"
      description="Programa la cobertura del turno de este puesto"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={saveShift} disabled={saving || !shiftGuard || (assignMode === 'rotation' && !selectedPositionId)}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            {assignMode === 'rotation' ? 'Asignar rotación' : 'Crear turno'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
          <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-muted/20 p-1">
            <button onClick={() => setAssignMode('rotation')} className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${assignMode === 'rotation' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}><Repeat size={14} /> Rotación</button>
            <button onClick={() => setAssignMode('single')} className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${assignMode === 'single' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}><CalendarRange size={14} /> Turno único</button>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Vigilante</label>
            {loadingGuards ? (
              <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground"><Loader2 size={12} className="animate-spin" /> Cargando…</div>
            ) : (
              <select value={shiftGuard} onChange={(e) => setShiftGuard(e.target.value)} className={inputCls}>
                <option value="">Seleccionar vigilante…</option>
                {availableGuards.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
              </select>
            )}
            {!loadingGuards && availableGuards.length === 0 && (
              <p className="mt-1.5 text-[11px] text-amber-600">Todos los vigilantes ya tienen una asignación activa. Libera uno o crea un nuevo vigilante.</p>
            )}
          </div>

          {assignMode === 'rotation' ? (
            <>
              {/* Puesto (Vigilante): assign to a position — the engine staggers day/night. */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Puesto</label>
                {positionOptions.length === 0 ? (
                  <div className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-600">Configura primero el horario de la estación (Vista general › Horario del turno) para crear los puestos.</div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {positionOptions.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        disabled={p.occupied}
                        onClick={() => setSelectedPositionId(p.id)}
                        title={p.occupied ? 'Puesto ocupado' : undefined}
                        className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all ${p.occupied ? 'cursor-not-allowed border-border/30 text-muted-foreground/40 line-through' : selectedPositionId === p.id ? 'border-primary bg-primary/10 text-primary' : 'border-border/40 text-muted-foreground hover:border-primary/40'}`}
                      >{p.label}{p.occupied ? ' · ocupado' : ''}</button>
                    ))}
                  </div>
                )}
                <p className="mt-1.5 text-[11px] text-muted-foreground">Rotación automática: los vigilantes alternan día y noche de forma escalonada según el horario de la estación. No requiere fecha de inicio.</p>
              </div>

              {restPreview && (
                <div className="rounded-xl border border-primary/25 bg-primary/[0.04] px-3 py-2.5">
                  <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                    <Moon size={13} className="text-primary" />
                    {restPreview.weekday
                      ? <span>Descansa: <span className="font-semibold capitalize text-primary">{restPreview.weekday}</span></span>
                      : <span>Próximo descanso</span>}
                  </div>
                  {restPreview.dates.length > 0 && (
                    <p className="mt-1 text-[11px] capitalize text-muted-foreground">
                      {restPreview.dates.map(shortRestLabel).join(' · ')}{restPreview.overridden ? ' · ajustado' : ''}
                    </p>
                  )}
                  <div className="mt-2.5">
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Primer día de descanso (opcional)</label>
                    <input type="date" value={restStartDate} min={rotationStartDate} onChange={(e) => setRestStartDate(e.target.value)} className={inputCls} />
                    <p className="mt-1 text-[10px] text-muted-foreground/70">Vacío = fase automática del puesto. Elige un día para fijar el descanso del vigilante desde esa fecha.</p>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Hasta (opcional)</label>
                <input type="date" value={rotationEndDate} min={rotationStartDate} onChange={(e) => setRotationEndDate(e.target.value)} className={inputCls} />
                <p className="mt-1 text-[10px] text-muted-foreground/70">Déjalo vacío para una asignación indefinida; pon una fecha para una cobertura temporal.</p>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Inicio</label>
                <input type="datetime-local" value={shiftStart} onChange={(e) => setShiftStart(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Fin</label>
                <input type="datetime-local" value={shiftEnd} onChange={(e) => setShiftEnd(e.target.value)} className={inputCls} />
              </div>
            </div>
          )}
      </div>
    </Modal>
  );
}
