import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X, Clock, UserPlus, Repeat, CalendarRange } from 'lucide-react';
import { toast } from 'sonner';
import { ApiService } from '@/services/api/apiService';

// Map JS getDay() (0=Sun) to our day keys.
const DAY_INDEX_MAP = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];
// Local YYYY-MM-DD (avoid toISOString — it shifts day in negative-UTC zones).
const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

interface Jornada { tipo: string; startTime: string; endTime: string; guardsCount: string | number; days: string[]; }

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called after a successful save. firstDate = the first created turno's date. */
  onSaved: (firstDate?: Date) => void;
  station: any;
  stationId: string;
  postSiteId: string;
  presetGuardId?: string;
};

/**
 * The full guard-assignment modal used by the Turnos tab AND "Vigilantes Asignados":
 * pick a guard, a rotation pattern (5-2 / 6-1 / …), start date and number of weeks
 * (or a single turno), and it generates the station's shifts. Self-contained:
 * loads its own guards, positions, jornadas and existing shifts.
 */
export default function ShiftAssignModal({ open, onClose, onSaved, station, stationId, postSiteId, presetGuardId }: Props) {
  const tenantId = (station?.tenantId || localStorage.getItem('tenantId') || '') as string;

  const [assignMode, setAssignMode] = useState<'single' | 'rotation'>('rotation');
  const [shiftGuard, setShiftGuard] = useState('');
  const [guardsOptions, setGuardsOptions] = useState<{ id: string; label: string }[]>([]);
  const [loadingGuards, setLoadingGuards] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rotationPattern, setRotationPattern] = useState('5-2');
  const [rotationWeeks, setRotationWeeks] = useState(4);
  const [rotationStartDate, setRotationStartDate] = useState('');
  const [selectedJornada, setSelectedJornada] = useState(0);
  const [shiftStart, setShiftStart] = useState('');
  const [shiftEnd, setShiftEnd] = useState('');
  const [positions, setPositions] = useState<any[]>([]);

  // Jornadas = the station schedule (source of truth), else derived from positions.
  const jornadas: Jornada[] = useMemo(() => {
    let parsed: any[] = [];
    try {
      const raw = station?.stationSchedule;
      if (Array.isArray(raw)) parsed = raw;
      else if (raw && typeof raw === 'string' && raw.trim().startsWith('[')) parsed = JSON.parse(raw);
    } catch { /* ignore */ }
    if (parsed.length > 0) {
      return parsed.map((j) => ({ ...j, days: j.days || ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'], guardsCount: j.guardsCount || '1' }));
    }
    if (positions.length > 0) {
      return positions.map((p) => ({
        tipo: p.name || p.type, startTime: p.startTime || '07:00', endTime: p.endTime || '19:00',
        guardsCount: p.guardsNeeded || 1, days: ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'],
      }));
    }
    return [];
  }, [station, positions]);

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
    setSelectedJornada(0);
    setAssignMode('rotation');
    setRotationPattern('5-2');
    setRotationWeeks(4);

    (async () => {
      setLoadingGuards(true);
      try {
        const res: any = await ApiService.get(`/tenant/${tenantId}/security-guard/autocomplete?limit=200`);
        const list = Array.isArray(res) ? res : (res?.rows ?? []);
        setGuardsOptions(list.map((r: any) => ({ id: r.guardId || r.id || r.value, label: r.fullName || r.name || r.label || r.email || '' })).filter((g: any) => g.id));
      } catch { setGuardsOptions([]); } finally { setLoadingGuards(false); }
    })();
    ApiService.get(`/tenant/${tenantId}/station/${stationId}/positions`).then((r: any) => setPositions(Array.isArray(r) ? r : (r?.rows ?? []))).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // A slot already taken by THIS guard is the desired end state, not an error.
  const isBenignSlotConflict = (e: any) => {
    const blob = `${e?.message || ''} ${(() => { try { return JSON.stringify(e?.data ?? e?.response ?? ''); } catch { return ''; } })()}`;
    return /uniq_shift_slot/i.test(blob);
  };

  // Fetch the station's current shifts (fresh — avoids stale-overlap conflicts).
  const fetchCurrentShifts = async (): Promise<any[]> => {
    try {
      const r: any = await ApiService.get(`/tenant/${tenantId}/shift?filter[station]=${encodeURIComponent(stationId)}&limit=999&_=${Date.now()}`);
      return Array.isArray(r) ? r : (r?.rows ?? []);
    } catch { return []; }
  };

  const generateRotationDates = (startDate: string, pattern: string, weeks: number, jornada: Jornada): Date[] => {
    const [workDays, restDays] = pattern.split('-').map(Number);
    if (!workDays || !restDays) return [];
    const cycleLength = workDays + restDays;
    const totalDays = weeks * 7;
    const dates: Date[] = [];
    const start = new Date(startDate + 'T12:00:00');
    const jornadaDays = jornada.days || ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];
    let dayInCycle = 0;
    for (let i = 0; i < totalDays; i++) {
      const current = new Date(start);
      current.setDate(start.getDate() + i);
      const key = DAY_INDEX_MAP[current.getDay()];
      if (!jornadaDays.includes(key)) continue;
      if (dayInCycle < workDays) dates.push(current);
      dayInCycle = (dayInCycle + 1) % cycleLength;
    }
    return dates;
  };

  // Replace whatever already occupies a slot at this station (one turno per slot).
  // Mutates `list` so the same row isn't re-deleted across overlapping slots.
  const deleteOverlappingShifts = async (list: any[], start: Date, end: Date) => {
    const s = start.getTime(); const e = end.getTime();
    const matched = list.filter((r: any) => {
      const rs = new Date(r.startTime || r.start).getTime();
      const re = new Date(r.endTime || r.end).getTime();
      return Number.isFinite(rs) && Number.isFinite(re) && rs < e && re > s;
    });
    const ids = matched.map((r: any) => r.id).filter(Boolean);
    if (ids.length) {
      await ApiService.delete(`/tenant/${tenantId}/shift?ids=${ids.join(',')}`);
      matched.forEach((m) => { const i = list.indexOf(m); if (i >= 0) list.splice(i, 1); });
    }
    return ids.length;
  };

  const saveShift = async () => {
    if (!shiftGuard) { toast.error('Seleccione un vigilante'); return; }
    // Always work from a FRESH snapshot of the station's shifts so overlap
    // cleanup is accurate (the stale snapshot was causing uniq_shift_slot 400s).
    const current = await fetchCurrentShifts();

    if (assignMode === 'single') {
      if (!shiftStart || !shiftEnd) { toast.error('Complete todos los campos'); return; }
      const start = new Date(shiftStart); const end = new Date(shiftEnd);
      if (end <= start) { toast.error('La hora de fin debe ser posterior al inicio'); return; }
      if ((end.getTime() - start.getTime()) > 24 * 60 * 60 * 1000) { toast.error('Un turno no puede durar más de 24 horas'); return; }
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

    if (!rotationStartDate) { toast.error('Seleccione fecha de inicio'); return; }
    if (jornadas.length === 0) { toast.error('Configure primero el horario de la estación'); return; }
    const jornada = jornadas[selectedJornada] || jornadas[0];
    const dates = generateRotationDates(rotationStartDate, rotationPattern, rotationWeeks, jornada);
    if (dates.length === 0) { toast.error('No se generaron turnos con esta configuración'); return; }

    setSaving(true);
    let created = 0; let already = 0; let failed = 0; let firstError = '';
    try {
      for (const date of dates) {
        const ds = dateKey(date);
        const startTime = new Date(`${ds}T${jornada.startTime || '07:00'}:00`);
        const endTime = new Date(`${ds}T${jornada.endTime || '19:00'}:00`);
        if (endTime <= startTime) endTime.setDate(endTime.getDate() + 1);
        try {
          await deleteOverlappingShifts(current, startTime, endTime);
          await ApiService.post(`/tenant/${tenantId}/shift`, { data: { startTime: startTime.toISOString(), endTime: endTime.toISOString(), station: stationId, guard: shiftGuard, postSiteId } });
          created++;
        } catch (e: any) {
          if (isBenignSlotConflict(e)) already++;  // this guard already has that slot
          else { failed++; if (!firstError) firstError = e?.data?.message || e?.message || ''; }
        }
      }
      const ok: string[] = [];
      if (created) ok.push(`${created} turnos creados`);
      if (already) ok.push(`${already} ya asignados`);
      if (ok.length) toast.success(`${ok.join(' · ')} (patrón ${rotationPattern})`);
      if (failed) toast.error(`${failed} turno(s) no se crearon${firstError ? `: ${firstError}` : ''}`);
      onSaved(dates[0]);
    } catch (e: any) { toast.error(e?.message || 'Error al crear turnos'); }
    finally { setSaving(false); }
  };

  if (!open) return null;

  const inputCls = 'w-full rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm outline-none transition-all focus:border-[#C8860A] focus:ring-2 focus:ring-[#C8860A]/20';

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border/30 bg-card shadow-2xl max-h-[92vh] animate-in fade-in slide-in-from-bottom-4 duration-200 sm:max-h-[88vh] sm:rounded-2xl sm:zoom-in-95" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-border/20 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C8860A]/12 text-[#C8860A]"><UserPlus size={18} /></div>
            <div>
              <h4 className="text-base font-semibold text-foreground">Asignar vigilante</h4>
              <p className="text-xs text-muted-foreground">Programa la cobertura del turno de este puesto</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"><X size={16} /></button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
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
                {guardsOptions.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
              </select>
            )}
          </div>

          {assignMode === 'rotation' ? (
            <>
              {jornadas.length > 1 && (
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Jornada</label>
                  <select value={selectedJornada} onChange={(e) => setSelectedJornada(Number(e.target.value))} className={inputCls}>
                    {jornadas.map((j, i) => <option key={i} value={i}>{j.tipo} ({j.startTime} - {j.endTime})</option>)}
                  </select>
                </div>
              )}
              {jornadas.length === 1 && (
                <div className="flex items-center gap-2 rounded-xl bg-muted/20 px-3 py-2.5 text-sm">
                  <Clock size={14} className="text-[#C8860A]" />
                  <span className="font-medium text-foreground">{jornadas[0].tipo}</span>
                  <span className="text-muted-foreground">{jornadas[0].startTime} – {jornadas[0].endTime}</span>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Patrón de rotación</label>
                <div className="grid grid-cols-4 gap-2">
                  {['5-2', '6-1', '4-3', '4-2'].map((p) => (
                    <button key={p} onClick={() => setRotationPattern(p)} className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${rotationPattern === p ? 'border-[#C8860A] bg-[#C8860A]/10 text-[#C8860A]' : 'border-border/40 text-muted-foreground hover:border-border'}`}>{p}</button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">{rotationPattern.split('-')[0]} días trabaja, {rotationPattern.split('-')[1]} días descansa</p>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Fecha inicio</label>
                <input type="date" value={rotationStartDate} onChange={(e) => setRotationStartDate(e.target.value)} className={inputCls} />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Semanas a programar</label>
                <div className="flex items-center gap-3">
                  {[2, 4, 6, 8].map((w) => (
                    <button key={w} onClick={() => setRotationWeeks(w)} className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${rotationWeeks === w ? 'border-[#C8860A] bg-[#C8860A]/10 text-[#C8860A]' : 'border-border/40 text-muted-foreground hover:border-border'}`}>{w}</button>
                  ))}
                </div>
              </div>

              {shiftGuard && rotationStartDate && jornadas.length > 0 && (
                <div className="rounded-xl bg-muted/20 px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">
                    Se crearán <span className="font-semibold text-foreground">{generateRotationDates(rotationStartDate, rotationPattern, rotationWeeks, jornadas[selectedJornada] || jornadas[0]).length}</span> turnos en {rotationWeeks} semanas con patrón {rotationPattern}
                  </p>
                </div>
              )}
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

        <div className="flex items-center justify-end gap-2 border-t border-border/20 px-5 py-3">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted/20 hover:text-foreground">Cancelar</button>
          <button onClick={saveShift} disabled={saving || !shiftGuard} className="inline-flex items-center gap-1.5 rounded-xl bg-[#C8860A] px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#B37809] active:scale-95 disabled:opacity-40">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            {assignMode === 'rotation' ? 'Asignar rotación' : 'Crear turno'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
