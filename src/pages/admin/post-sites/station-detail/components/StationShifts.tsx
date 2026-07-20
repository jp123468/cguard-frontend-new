import React, { useEffect, useState, useMemo, useCallback } from 'react';
import ShiftAssignModal from './ShiftAssignModal';
import SacafrancoAssignModal from './SacafrancoAssignModal';
import StationRoster from './StationRoster';
import { confirmDialog } from '@/components/ui/confirmDialog';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus, ChevronLeft, ChevronRight, User, Calendar, AlertTriangle, CheckCircle2, Sun, Moon, Trash2 } from 'lucide-react';
import { ApiService } from '@/services/api/apiService';
import { toast } from 'sonner';
import { getTenantTimezone } from '@/utils/tenantLocation';
import { Button } from '@/components/ui/button';
import type { Station } from '@/types';

interface StationDetail extends Station { stationSchedule?: string | null }

// Minutes-of-day of a UTC instant rendered in the tenant timezone. Shift times
// are stored as UTC; the jornada window is the station's local wall-clock. We
// must compare them in the tenant tz, or coverage is mis-counted for any viewer
// whose device isn't in the tenant's timezone.
function minutesInTenantTz(d: Date): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: getTenantTimezone(), hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(d);
    const h = Number(parts.find(p => p.type === 'hour')?.value || 0);
    const m = Number(parts.find(p => p.type === 'minute')?.value || 0);
    return h * 60 + m;
  } catch {
    return d.getHours() * 60 + d.getMinutes();
  }
}

type Props = { station: StationDetail; stationId: string; postSiteId: string };

const GUARD_COLORS = [
  { bg: 'rgba(200, 134, 10, 0.15)', accent: '#C8860A', text: '#C8860A' },
  { bg: 'rgba(59, 130, 246, 0.12)', accent: '#3B82F6', text: '#60A5FA' },
  { bg: 'rgba(168, 85, 247, 0.12)', accent: '#A855F7', text: '#C084FC' },
  { bg: 'rgba(16, 185, 129, 0.12)', accent: '#10B981', text: '#34D399' },
  { bg: 'rgba(239, 68, 68, 0.12)', accent: '#EF4444', text: '#F87171' },
  { bg: 'rgba(236, 72, 153, 0.12)', accent: '#EC4899', text: '#F472B6' },
  { bg: 'rgba(6, 182, 212, 0.12)', accent: '#06B6D4', text: '#22D3EE' },
  { bg: 'rgba(245, 158, 11, 0.12)', accent: '#F59E0B', text: '#FBBF24' },
];

const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Map JS getDay() (0=Sun) to our day keys
const DAY_INDEX_MAP = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];

// Local-date key (YYYY-MM-DD). Do NOT use toISOString() for this: on a Date that
// carries a time-of-day, toISOString() converts to UTC first, so in negative-UTC
// zones (e.g. UTC-5) any evening time rolls to the NEXT calendar day. That made
// calendar columns key one day off from where shifts were filed, so freshly
// created turnos rendered on the wrong day or vanished from the visible week.
const dateKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

type ViewMode = 'day' | 'week' | 'month';

interface Jornada {
  tipo: string;
  startTime: string;
  endTime: string;
  guardsCount: string | number;
  days: string[];
}

interface ScheduleSlot {
  jornada: Jornada;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  guardsNeeded: number;
  guardsAssigned: number;
  isCovered: boolean;
}

// A calendar event derived from a raw shift row (see `events` useMemo).
type GuardColor = { bg: string; accent: string; text: string };
interface ShiftEvent {
  id: string;
  guardName: string;
  guardId: string;
  start: Date;
  end: Date;
  status: 'active' | 'upcoming' | 'completed';
  raw: ShiftRow;
}
// Aggregated coverage for a single calendar date.
interface DayCoverage { slots: ScheduleSlot[]; allCovered: boolean; uncoveredCount: number }
// A scheduler position row from `/station/:id/positions`.
interface PositionRow { type?: string; startTime?: string; endTime?: string }
// A raw shift row from `/shift` — nested guard may live under several keys and
// times under several aliases, so this stays intentionally permissive.
interface ShiftGuardRef { id?: string; fullName?: string; name?: string; firstName?: string; lastName?: string; email?: string }
interface ShiftRow {
  id?: string;
  guard?: ShiftGuardRef | null;
  securityGuard?: ShiftGuardRef | null;
  user?: ShiftGuardRef | null;
  guardId?: string;
  guardName?: string;
  startTime?: string; endTime?: string;
  punchInTime?: string; punchOutTime?: string;
  start?: string; end?: string;
  guardAssignmentId?: string;
}

export default function StationShifts({ station, stationId, postSiteId }: Props) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<ShiftRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedShift, setSelectedShift] = useState<ShiftEvent | null>(null);

  // Assignment is handled entirely by <ShiftAssignModal/> (self-contained).
  const [showForm, setShowForm] = useState(false);
  const [showSacafranco, setShowSacafranco] = useState(false);

  const tenantId = localStorage.getItem('tenantId') || '';

  const loadShifts = async () => {
    if (!stationId) return;
    setLoading(true);
    setError(null);
    try {
      const res: any = await ApiService.get(
        `/tenant/${tenantId}/shift?filter[station]=${encodeURIComponent(stationId)}&limit=999`
      );
      const list = Array.isArray(res) ? res : (res?.rows ?? []);
      setRows(list);
    } catch (e: any) {
      setError(e?.message || 'Error al cargar turnos');
    } finally {
      setLoading(false);
    }
  };

  // Load positions from scheduler API — positions are the source of truth for
  // the coverage sketch, so they must re-fetch whenever the horario changes.
  const [positions, setPositions] = useState<PositionRow[]>([]);
  const loadPositions = useCallback(() => {
    if (!stationId || !tenantId) return;
    ApiService.get(`/tenant/${tenantId}/station/${stationId}/positions`)
      .then((res: any) => { setPositions(Array.isArray(res) ? res : (res?.rows ?? [])); })
      .catch(() => {});
  }, [stationId, tenantId]);
  useEffect(() => { loadPositions(); }, [loadPositions]);

  useEffect(() => { loadShifts(); }, [stationId]);

  // Auto-refresh the sketch when the horario/turnos of THIS station change
  // (the editor broadcasts after /auto-positions succeeds) — no manual reload,
  // no stale day+night sketch after switching a station to a custom turno.
  useEffect(() => {
    const onChanged = (e: Event) => {
      const changedId = (e as CustomEvent)?.detail?.stationId;
      if (!changedId || String(changedId) === String(stationId)) {
        loadPositions();
        loadShifts();
      }
    };
    window.addEventListener('station-horario-changed', onChanged);
    return () => window.removeEventListener('station-horario-changed', onChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationId, loadPositions]);

  // Jornadas = the TURNO the user defined on the station (its schedule). That is
  // the source of truth for what coverage is required; positions are just the
  // staffing used to cover it. So we read the station schedule FIRST and only
  // fall back to positions when no explicit schedule exists.
  const jornadas: Jornada[] = useMemo(() => {
    const ALL_DAYS = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];
    const fijos = positions.filter((p: PositionRow) => (p.type || 'fijo') !== 'sacafranco');

    // UNIVERSAL SOURCE OF TRUTH = the station's fijo POSITIONS, grouped by their
    // block (startTime|endTime). Each DISTINCT block is one required jornada
    // needing ONE guard on duty at a time — fijos sharing a block are alternating
    // (24x24 → one 24h block, 1 guard/day; NOT a phantom day+night split), while
    // fijos in different blocks each need their own coverage (16h/2×8h → two
    // 8h jornadas). This mirrors the backend's block-based gap engine, so the
    // sketch matches whatever horario the tenant configured — any hours, any
    // number of guards, with or without sacafranco.
    const blockLabel = (start: string, end: string): string => {
      const sh = parseInt(String(start).split(':')[0], 10) || 0;
      const eh = parseInt(String(end).split(':')[0], 10) || 0;
      let span = (eh - sh + 24) % 24; if (span === 0) span = 24;
      if (span >= 23) return '24 horas';
      return sh >= 18 || sh < 6 ? 'Nocturno' : 'Diurno';
    };
    if (fijos.length > 0) {
      const blocks = new Map<string, { startTime: string; endTime: string }>();
      for (const p of fijos) {
        const startTime = p.startTime || '07:00';
        const endTime = p.endTime || '19:00';
        blocks.set(`${startTime}|${endTime}`, { startTime, endTime });
      }
      return Array.from(blocks.values())
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
        .map((b) => ({
          tipo: blockLabel(b.startTime, b.endTime),
          startTime: b.startTime,
          endTime: b.endTime,
          guardsCount: 1,
          days: ALL_DAYS,
        }) as any);
    }

    // No positions yet: fall back to the station's scheduleType so an
    // un-staffed station still shows its intended coverage.
    const st = (station as any)?.scheduleType as string | undefined;
    if (st === '24h') {
      return [
        { tipo: 'Diurno', startTime: '07:00', endTime: '19:00', guardsCount: 1, days: ALL_DAYS } as any,
        { tipo: 'Nocturno', startTime: '19:00', endTime: '07:00', guardsCount: 1, days: ALL_DAYS } as any,
      ];
    }
    if (st === '12h-day' || st === '12h-night') {
      const isNight = st === '12h-night';
      return [{
        tipo: isNight ? 'Nocturno' : 'Diurno',
        startTime: isNight ? '19:00' : '07:00',
        endTime: isNight ? '07:00' : '19:00',
        guardsCount: 1,
        days: ALL_DAYS,
      } as any];
    }
    // Legacy custom: explicit hand-edited stationSchedule JSON.
    let parsed: any[] = [];
    try {
      const raw = station?.stationSchedule;
      if (Array.isArray(raw)) parsed = raw;
      else if (raw && typeof raw === 'string' && raw.trim().startsWith('[')) parsed = JSON.parse(raw);
    } catch {}
    if (parsed.length > 0) {
      return parsed.map(j => ({ ...j, days: j.days || ALL_DAYS, guardsCount: j.guardsCount || 1 }));
    }
    return [];
  }, [station, positions]);

  // Guard color assignment
  const guardColorMap = useMemo(() => {
    const map: Record<string, GuardColor> = {};
    let idx = 0;
    rows.forEach((r: any) => {
      const g = r.guard || r.securityGuard || r.user || {};
      const guardId = g.id || r.guardId || r.guard || 'unknown';
      if (!map[guardId]) {
        map[guardId] = GUARD_COLORS[idx % GUARD_COLORS.length];
        idx++;
      }
    });
    return map;
  }, [rows]);

  // Parse shifts into events
  const events = useMemo<ShiftEvent[]>(() => {
    return rows.map((r: any) => {
      const g = r.guard || r.securityGuard || r.user || {};
      const guardName = g.fullName || g.name || `${g.firstName || ''} ${g.lastName || ''}`.trim() || r.guardName || 'Sin asignar';
      const guardId = g.id || r.guardId || r.guard || 'unknown';
      const start = new Date(r.startTime || r.punchInTime || r.start);
      const end = new Date(r.endTime || r.punchOutTime || r.end);
      const now = Date.now();
      const status = now >= start.getTime() && now <= end.getTime() ? 'active'
        : now < start.getTime() ? 'upcoming' : 'completed';
      return { id: r.id, guardName, guardId, start, end, status, raw: r };
    });
  }, [rows]);

  const toDateKey = dateKey;

  // Events per date
  const eventsByDate = useMemo(() => {
    const map: Record<string, typeof events> = {};
    events.forEach(ev => {
      const cursor = new Date(ev.start);
      cursor.setHours(0, 0, 0, 0);
      const endDay = new Date(ev.end);
      endDay.setHours(0, 0, 0, 0);
      while (cursor <= endDay) {
        const key = toDateKey(cursor);
        if (!map[key]) map[key] = [];
        map[key].push(ev);
        cursor.setDate(cursor.getDate() + 1);
      }
    });
    return map;
  }, [events]);

  // Schedule coverage per date: check if jornada requirements are met
  const coverageByDate = useMemo(() => {
    const map: Record<string, { slots: ScheduleSlot[]; allCovered: boolean; uncoveredCount: number }> = {};

    // Helper: check if a date's day-of-week matches a jornada's days
    const getDayKey = (d: Date) => DAY_INDEX_MAP[d.getDay()];

    // Generate coverage for all visible dates
    const generateForDate = (dateStr: string) => {
      if (map[dateStr]) return map[dateStr];
      const date = new Date(dateStr + 'T12:00:00');
      const dayKey = getDayKey(date);
      const dayEvents = eventsByDate[dateStr] || [];
      const slots: ScheduleSlot[] = [];

      jornadas.forEach(jornada => {
        if (!jornada.days.includes(dayKey)) return; // not an operating day for this jornada
        const guardsNeeded = parseInt(String(jornada.guardsCount)) || 1;

        // Count assigned guards by attributing each shift (by its START day in
        // tenant tz) to THIS jornada's block. A 24h/full-day block accepts any
        // start; otherwise match the shift's start half (day/night) to the
        // block's — robust for night shifts that cross midnight (19:00→07:00),
        // which naive time-overlap missed.
        const jStartH = parseInt(String(jornada.startTime || '07:00').split(':')[0], 10) || 0;
        const jEndH = parseInt(String(jornada.endTime || '19:00').split(':')[0], 10) || 0;
        let jSpan = (jEndH - jStartH + 24) % 24; if (jSpan === 0) jSpan = 24;
        const isFullDay = jSpan >= 23;
        const jornadaNight = jStartH >= 18 || jStartH < 6;
        const guardsAssigned = dayEvents.filter(ev => {
          if (dateKey(ev.start) !== dateStr) return false; // attribute to its start day
          if (isFullDay) return true; // a 24h block is covered by any shift that day
          const startMin = minutesInTenantTz(ev.start);
          const evNight = startMin >= 18 * 60 || startMin < 6 * 60; // evening/pre-dawn start = night
          return jornadaNight ? evNight : !evNight;
        }).length;

        slots.push({
          jornada,
          date: dateStr,
          startTime: jornada.startTime,
          endTime: jornada.endTime,
          guardsNeeded,
          guardsAssigned,
          isCovered: guardsAssigned >= guardsNeeded,
        });
      });

      const uncoveredCount = slots.filter(s => !s.isCovered).length;
      map[dateStr] = { slots, allCovered: uncoveredCount === 0, uncoveredCount };
      return map[dateStr];
    };

    // Pre-generate for next 60 days
    const now = new Date();
    for (let i = -7; i < 60; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      generateForDate(toDateKey(d));
    }

    return map;
  }, [jornadas, eventsByDate]);

  // Count total uncovered future slots for alert banner
  // Count uncovered turnos over a NEAR-TERM horizon (14 days), not the whole 60-day
  // generation window — counting two months of the fijos' inherent rest-day gaps
  // inflated this to an alarming, non-actionable number.
  const futureUncovered = useMemo(() => {
    const today = toDateKey(new Date());
    const h = new Date(); h.setDate(h.getDate() + 14);
    const horizonKey = toDateKey(h);
    let count = 0;
    Object.entries(coverageByDate).forEach(([dateStr, cov]) => {
      if (dateStr >= today && dateStr <= horizonKey) count += cov.uncoveredCount;
    });
    return count;
  }, [coverageByDate]);

  // Dates (next 14 days) that have at least one uncovered turno — the days a
  // sacafranco needs to cover. Fed to the sacafranco card to match availability.
  const gapDates = useMemo(() => {
    const today = toDateKey(new Date());
    const h = new Date(); h.setDate(h.getDate() + 14);
    const horizonKey = toDateKey(h);
    return Object.entries(coverageByDate)
      .filter(([dateStr, cov]) => dateStr >= today && dateStr <= horizonKey && cov.uncoveredCount > 0)
      .map(([dateStr]) => dateStr)
      .sort();
  }, [coverageByDate]);

  // Navigation
  const navigate = useCallback((dir: number) => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (viewMode === 'day') d.setDate(d.getDate() + dir);
      else if (viewMode === 'week') d.setDate(d.getDate() + dir * 7);
      else d.setMonth(d.getMonth() + dir);
      return d;
    });
    setSelectedDate(null);
    setSelectedShift(null);
  }, [viewMode]);

  const goToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(dateKey(new Date()));
    setSelectedShift(null);
  };

  const getWeekDays = useCallback(() => {
    const d = new Date(currentDate);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) { days.push(new Date(d)); d.setDate(d.getDate() + 1); }
    return days;
  }, [currentDate]);

  const getMonthGrid = useCallback(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const days: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [currentDate]);

  // Only shifts that START on the selected day — a night shift (19:00→07:00) spans
  // two days and eventsByDate lists it on both, which double-listed the night guard.
  const selectedDayEvents = selectedDate
    ? (eventsByDate[selectedDate] || []).filter((ev: ShiftEvent) => dateKey(ev.start) === selectedDate)
    : [];
  const selectedDayCoverage = selectedDate ? coverageByDate[selectedDate] : null;

  const fmtTime = (d: Date) => d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: getTenantTimezone() });
  const fmtDate = (d: Date) => d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });

  // Guard currently assigned to this station (the predominant guard across its
  // existing shifts) — used to pre-select the dropdown when creating a turno.
  const stationGuardId = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach((r: any) => {
      const g = r.guard || r.securityGuard || r.user || {};
      const id = g.id || r.guardId;
      if (id) counts[id] = (counts[id] || 0) + 1;
    });
    let best = '';
    let bestN = 0;
    Object.entries(counts).forEach(([id, n]) => { if (n > bestN) { best = id; bestN = n; } });
    return best;
  }, [rows]);

  // The assign modal (ShiftAssignModal) initializes itself on open.
  const openForm = (_dateStr?: string) => { setShowForm(true); };

  // Remove a guard from this station: end their ACTIVE rotation assignment (the
  // backend cascades and deletes future shifts). Falls back to deleting the single
  // shift for legacy shift-only rows that have no assignment.
  const removeGuard = async (ev: ShiftEvent) => {
    if (!(await confirmDialog({ title: 'Quitar vigilante', message: `¿Quitar a ${ev.guardName} de este puesto? Se eliminarán sus turnos en este sitio.`, confirmText: 'Quitar', tone: 'danger' }))) return;
    try {
      let assignmentId: string | null = ev.raw?.guardAssignmentId || null;
      if (!assignmentId) {
        const res: any = await ApiService.get(
          `/tenant/${tenantId}/guard-assignments?stationId=${encodeURIComponent(stationId)}&status=active`,
        );
        const list = Array.isArray(res) ? res : (res?.rows || res?.data || []);
        const match = list.find((a: any) => String(a.guardId) === String(ev.guardId));
        assignmentId = match?.id || null;
      }
      if (assignmentId) {
        await ApiService.delete(`/tenant/${tenantId}/guard-assignment/${encodeURIComponent(assignmentId)}`);
      } else if (ev.id) {
        await ApiService.delete(`/tenant/${tenantId}/shift?ids=${encodeURIComponent(ev.id)}`);
      }
      toast.success('Vigilante removido del puesto');
      setSelectedShift(null);
      loadShifts();
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo quitar al vigilante');
    }
  };


  const title = useMemo(() => {
    if (viewMode === 'day') return currentDate.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (viewMode === 'month') return `${MONTHS_ES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    const days = getWeekDays();
    const first = days[0], last = days[6];
    if (first.getMonth() === last.getMonth()) return `${first.getDate()} \u2013 ${last.getDate()} ${MONTHS_ES[first.getMonth()]} ${first.getFullYear()}`;
    return `${first.getDate()} ${MONTHS_ES[first.getMonth()].slice(0, 3)} \u2013 ${last.getDate()} ${MONTHS_ES[last.getMonth()].slice(0, 3)} ${last.getFullYear()}`;
  }, [currentDate, viewMode, getWeekDays]);

  return (
    <div className="space-y-3">
      {/* Alert banner for uncovered shifts */}
      {futureUncovered > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={16} className="text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-400">
              {futureUncovered} turno{futureUncovered > 1 ? 's' : ''} por cubrir (próximos 14 días)
            </p>
            <p className="text-xs text-red-400/70 mt-0.5">
              Completa los fijos del puesto y asigna un <strong>sacafranco</strong> (relevo) para cubrir sus días de descanso — 2 fijos no alcanzan a cubrir 24/7.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowSacafranco(true)}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-all"
            >
              Asignar sacafranco
            </button>
            <button
              onClick={() => openForm()}
              className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 transition-all"
            >
              Asignar fijo
            </button>
          </div>
        </div>
      )}

      <div className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-lg backdrop-blur-sm">
        {/* Top Bar */}
        <div className="px-5 py-3 flex items-center justify-between border-b border-border/20">
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-muted/20 rounded-lg p-[3px]">
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${viewMode === 'day' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Día
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${viewMode === 'week' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Semana
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${viewMode === 'month' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Mes
              </button>
            </div>
            <button onClick={goToday} className="px-2.5 py-1.5 text-xs font-medium border border-border/40 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-all">
              Hoy
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft size={16} />
            </button>
            <h3 className="text-sm font-semibold text-foreground min-w-[200px] text-center select-none">{title}</h3>
            <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>

          <Button
            variant="brand"
            size="sm"
            onClick={() => openForm(selectedDate || undefined)}
            className="gap-1.5 active:scale-95"
          >
            <Plus size={13} strokeWidth={2.5} /> Nuevo turno
          </Button>
        </div>

        {/* Calendar Body */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={24} />
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-red-500">{error}</div>
        ) : (
          <div className="flex flex-col">
          <div className="px-3 pt-3">
            <StationRoster stationId={stationId} tenantId={tenantId} events={events} guardColorMap={guardColorMap} />
          </div>
          <div className="flex flex-col lg:flex-row min-h-[420px]">
            {/* Calendar grid */}
            <div className="flex-1 min-w-0 overflow-hidden">
              {viewMode === 'day' ? (
                <DayView
                  date={currentDate}
                  coverage={coverageByDate[dateKey(currentDate)]}
                  dayEvents={eventsByDate[dateKey(currentDate)] || []}
                  guardColorMap={guardColorMap}
                  onAssign={(d) => { setSelectedDate(d); setSelectedShift(null); openForm(d); }}
                />
              ) : viewMode === 'week' ? (
                <WeekView
                  days={getWeekDays()}
                  eventsByDate={eventsByDate}
                  coverageByDate={coverageByDate}
                  guardColorMap={guardColorMap}
                  selectedDate={selectedDate}
                  onSelectDate={(d) => { setSelectedDate(d); setSelectedShift(null); }}
                  onAssign={(d) => { setSelectedDate(d); setSelectedShift(null); openForm(d); }}
                  station={station}
                  jornadas={jornadas}
                />
              ) : (
                <MonthView
                  days={getMonthGrid()}
                  eventsByDate={eventsByDate}
                  coverageByDate={coverageByDate}
                  guardColorMap={guardColorMap}
                  selectedDate={selectedDate}
                  onSelectDate={(d) => { setSelectedDate(d); setSelectedShift(null); }}
                  currentMonth={currentDate.getMonth()}
                />
              )}
            </div>

            {/* Side detail panel — hidden in Día view (DayView is self-contained) */}
            {viewMode !== 'day' && (
            <div className="lg:w-[300px] border-t lg:border-t-0 lg:border-l border-border/20 bg-muted/[0.02]">
              {selectedDate ? (
                <div className="p-4 space-y-3">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {fmtDate(new Date(selectedDate + 'T12:00:00'))}
                  </h4>

                  {/* Schedule slots coverage */}
                  {selectedDayCoverage && selectedDayCoverage.slots.length > 0 && (
                    <div className="space-y-2">
                      {selectedDayCoverage.slots.map((slot, i) => (
                        <div
                          key={i}
                          className={`rounded-xl p-3 border transition-all ${
                            slot.isCovered
                              ? 'bg-emerald-500/8 border-emerald-500/20'
                              : 'bg-red-500/8 border-red-500/20'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {slot.isCovered ? (
                                <CheckCircle2 size={14} className="text-emerald-500" />
                              ) : (
                                <AlertTriangle size={14} className="text-red-500" />
                              )}
                              <span className="text-xs font-semibold text-foreground">{slot.jornada.tipo}</span>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              slot.isCovered ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                            }`}>
                              {slot.guardsAssigned}/{slot.guardsNeeded}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-1 font-mono">
                            {slot.startTime} – {slot.endTime}
                          </div>
                          {!slot.isCovered && (
                            <button
                              onClick={() => openForm(selectedDate)}
                              className="mt-2 text-[10px] text-red-400 font-semibold hover:text-red-300 flex items-center gap-1"
                            >
                              <Plus size={10} /> Asignar vigilante
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Assigned shifts */}
                  {selectedDayEvents.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <h5 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">Vigilantes asignados</h5>
                      {selectedDayEvents.map((ev, i) => {
                        const color = guardColorMap[ev.guardId] || GUARD_COLORS[0];
                        const isSelected = selectedShift?.id === ev.id;
                        return (
                          <button
                            key={ev.id || i}
                            onClick={() => setSelectedShift(isSelected ? null : ev)}
                            className={`w-full text-left rounded-xl p-2.5 transition-all duration-200 border ${
                              isSelected ? 'border-primary/30 shadow-lg' : 'border-transparent hover:border-border/30'
                            }`}
                            style={{ backgroundColor: color.bg }}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-[3px] h-8 rounded-full flex-shrink-0" style={{ backgroundColor: color.accent }} />
                              <div className="min-w-0 flex-1">
                                <p className="text-[12px] font-medium text-foreground truncate">{ev.guardName}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {toDateKey(ev.start) === toDateKey(ev.end)
                                    ? `${fmtTime(ev.start)} – ${fmtTime(ev.end)}`
                                    : `${ev.start.toLocaleDateString('es', { day: 'numeric', month: 'short' })} ${fmtTime(ev.start)} – ${ev.end.toLocaleDateString('es', { day: 'numeric', month: 'short' })} ${fmtTime(ev.end)}`
                                  }
                                </p>
                              </div>
                              {ev.status === 'active' && (
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                              )}
                            </div>
                            {isSelected && (
                              <div className="mt-2 pt-2 border-t border-border/15 flex items-center gap-2">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                                  ev.status === 'active' ? 'bg-green-500/15 text-green-400' :
                                  ev.status === 'upcoming' ? 'bg-blue-500/15 text-blue-400' :
                                  'bg-muted/40 text-muted-foreground'
                                }`}>
                                  {ev.status === 'active' ? 'En servicio' : ev.status === 'upcoming' ? 'Programado' : 'Completado'}
                                </span>
                                <span className="text-[9px] text-muted-foreground">
                                  {Math.round((ev.end.getTime() - ev.start.getTime()) / (1000 * 60 * 60))}h
                                </span>
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => { e.stopPropagation(); removeGuard(ev); }}
                                  className="ml-auto inline-flex items-center gap-1 rounded-md border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[9px] font-semibold text-red-400 hover:bg-red-500/20 cursor-pointer transition-colors"
                                >
                                  <Trash2 size={10} /> Quitar del puesto
                                </div>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Empty state */}
                  {selectedDayEvents.length === 0 && (!selectedDayCoverage || selectedDayCoverage.slots.length === 0) && (
                    <div className="text-center py-8">
                      <p className="text-xs text-muted-foreground/60">Día libre – sin horario programado</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-16 px-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted/15 flex items-center justify-center mb-3">
                    <Calendar size={20} className="text-muted-foreground/30" />
                  </div>
                  <p className="text-[11px] text-muted-foreground/60">Selecciona un día</p>
                </div>
              )}
            </div>
            )}
          </div>
          </div>
        )}

        {/* Create Form Modal */}
        <ShiftAssignModal
          open={showForm}
          onClose={() => setShowForm(false)}
          onSaved={(d) => { setShowForm(false); loadShifts(); if (d) { setCurrentDate(new Date(d)); setSelectedDate(dateKey(d)); } }}
          station={station}
          stationId={stationId}
          postSiteId={postSiteId}
          presetGuardId={stationGuardId}
        />

        {/* Sacafranco (relief) availability + assign */}
        <SacafrancoAssignModal
          open={showSacafranco}
          onClose={() => setShowSacafranco(false)}
          stationId={stationId}
          tenantId={tenantId}
          gapDates={gapDates}
          onAssigned={() => loadShifts()}
        />
      </div>
    </div>
  );
}

// ── WEEK VIEW ────────────────────────────────────────────────────────────────

function WeekView({ days, eventsByDate, coverageByDate, guardColorMap, selectedDate, onSelectDate, onAssign, station, jornadas }: {
  days: Date[];
  eventsByDate: Record<string, ShiftEvent[]>;
  coverageByDate: Record<string, DayCoverage>;
  guardColorMap: Record<string, GuardColor>;
  selectedDate: string | null;
  onSelectDate: (d: string) => void;
  onAssign: (d: string) => void;
  station: StationDetail;
  jornadas: Jornada[];
}) {
  void station; void jornadas;
  const toDateKey = dateKey;
  const isToday = (d: Date) => toDateKey(d) === toDateKey(new Date());
  // Guards covering a slot, matched by the day/night class of the shift's start
  // (a 19:00→07:00 night shift can't be matched by hour overlap — only by class).
  const coveringGuards = (key: string, isNight: boolean) =>
    (eventsByDate[key] || []).filter((ev: ShiftEvent) => {
      // Attribute a shift to the day it STARTS (a 19:00→07:00 night shift spans two
      // days; without this it would also show on the morning of the NEXT day —
      // making it look like two night guards). Mirrors the coverage count.
      if (toDateKey(ev.start) !== key) return false;
      const startMin = minutesInTenantTz(ev.start);
      const evNight = startMin >= 18 * 60 || startMin < 6 * 60;
      return isNight ? evNight : !evNight;
    });

  return (
    <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
      <div className="min-w-[640px]">
        {/* Day headers */}
        <div className="grid grid-cols-[48px_repeat(7,1fr)] sticky top-0 z-10 bg-card/95 backdrop-blur-md border-b border-border/15">
          <div />
          {days.map((d, i) => {
            const key = toDateKey(d);
            const coverage = coverageByDate[key];
            const hasEvents = (eventsByDate[key]?.length || 0) > 0;
            const isScheduledDay = coverage && coverage.slots.length > 0;
            const allCovered = coverage?.allCovered;
            return (
              <button
                key={i}
                onClick={() => onSelectDate(key)}
                className={`py-2.5 text-center transition-all relative group ${
                  selectedDate === key ? 'bg-primary/[0.04]' : ''
                }`}
              >
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
                  {DAYS_ES[i]}
                </div>
                <div className={`mt-1 w-8 h-8 mx-auto flex items-center justify-center rounded-full text-sm font-semibold transition-all ${
                  isToday(d) ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30' :
                  selectedDate === key ? 'bg-foreground/8 text-foreground' :
                  'text-foreground group-hover:bg-muted/20'
                }`}>
                  {d.getDate()}
                </div>
                {/* Coverage indicator dot */}
                {isScheduledDay && (
                  <div className={`mt-1 mx-auto w-4 h-1 rounded-full transition-all ${
                    allCovered ? 'bg-emerald-500/60' : 'bg-red-500/70 animate-pulse'
                  }`} />
                )}
                {!isScheduledDay && hasEvents && (
                  <div className="mt-1 mx-auto w-1.5 h-1.5 rounded-full bg-primary/50" />
                )}
              </button>
            );
          })}
        </div>

        {/* Day/night turno blocks — NO hourly axis, so night shifts (19:00→07:00)
            and everything after 7pm are fully visible and assignable. */}
        <div className="grid grid-cols-[48px_repeat(7,1fr)]">
          {/* spacer aligning with the header's time-label column */}
          <div />
          {days.map((day, dayIdx) => {
            const key = toDateKey(day);
            const coverage = coverageByDate[key];
            const slots: ScheduleSlot[] = coverage?.slots || [];
            return (
              <div
                key={dayIdx}
                className={`flex flex-col gap-1.5 border-l border-border/8 p-1.5 min-h-[220px] transition-colors ${
                  selectedDate === key ? 'bg-primary/[0.03]' : ''
                }`}
              >
                {slots.length === 0 ? (
                  <button
                    onClick={() => onSelectDate(key)}
                    className="flex-1 flex items-center justify-center text-[10px] text-muted-foreground/40"
                  >
                    Sin turnos
                  </button>
                ) : slots.map((slot, si) => {
                  const isNight = String(slot.jornada.tipo || '').toLowerCase().includes('noct');
                  const guards = coveringGuards(key, isNight);
                  return (
                    <div
                      key={si}
                      onClick={() => onSelectDate(key)}
                      className={`rounded-lg border p-2 cursor-pointer transition-all hover:brightness-110 ${
                        slot.isCovered ? 'border-emerald-500/20 bg-emerald-500/[0.05]' : 'border-red-500/25 bg-red-500/[0.06]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-foreground">
                          {isNight ? <Moon size={11} className="text-indigo-400" /> : <Sun size={11} className="text-amber-400" />}
                          {slot.jornada.tipo}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          slot.isCovered ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                        }`}>
                          {slot.guardsAssigned}/{slot.guardsNeeded}
                        </span>
                      </div>
                      <div className="mt-0.5 font-mono text-[9px] text-muted-foreground/70">
                        {slot.startTime} – {slot.endTime}
                      </div>

                      {guards.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {guards.slice(0, 3).map((ev: ShiftEvent, gi: number) => {
                            const color = guardColorMap[ev.guardId] || GUARD_COLORS[0];
                            return (
                              <div key={ev.id || gi} className="flex items-center gap-1 rounded px-1 py-0.5" style={{ backgroundColor: color.bg }}>
                                <div className="h-3 w-[3px] flex-shrink-0 rounded-full" style={{ backgroundColor: color.accent }} />
                                <span className="truncate text-[10px] font-medium" style={{ color: color.text }}>
                                  {ev.guardName.split(' ').slice(0, 2).join(' ')}
                                </span>
                                {ev.status === 'active' && <div className="ml-auto h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500 animate-pulse" />}
                              </div>
                            );
                          })}
                          {guards.length > 3 && (
                            <div className="text-[9px] text-muted-foreground/60">+{guards.length - 3} más</div>
                          )}
                        </div>
                      )}

                      {!slot.isCovered && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onAssign(key); }}
                          className="mt-1 flex w-full items-center justify-center gap-1 rounded-md border border-red-500/20 bg-red-500/5 py-1 text-[10px] font-semibold text-red-400 transition-colors hover:bg-red-500/10"
                        >
                          <Plus size={10} /> Asignar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── MONTH VIEW ───────────────────────────────────────────────────────────────

// ── Day view: a 24-hour vertical timeline of the day's coverage ───────────────
function DayView({ date, coverage, dayEvents, guardColorMap, onAssign }: {
  date: Date;
  coverage: DayCoverage | undefined;
  dayEvents: ShiftEvent[]; // events OVERLAPPING this day (incl. a night shift from the day before)
  guardColorMap: Record<string, GuardColor>;
  onAssign: (d: string) => void;
}) {
  const ROW = 30;          // px per hour
  const H = 24 * ROW;      // full-day height
  const dayK = dateKey(date);
  const slots: ScheduleSlot[] = coverage?.slots || [];
  const covered = slots.filter((s) => s.isCovered).length;
  const fmtT = (d: Date) => d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: getTenantTimezone() });

  // An event's [startH,endH] on THIS day's 0–24 axis (clamped across midnight).
  const eventSeg = (ev: ShiftEvent) => {
    const startBefore = dateKey(ev.start) < dayK;
    const endAfter = dateKey(ev.end) > dayK;
    const startH = startBefore ? 0 : minutesInTenantTz(ev.start) / 60;
    let endH = endAfter ? 24 : minutesInTenantTz(ev.end) / 60;
    if (endH <= startH) endH = 24;
    return { startH, endH, startBefore, endAfter };
  };

  const hours = [0, 3, 6, 9, 12, 15, 18, 21, 24];
  const now = new Date();
  const isToday = dateKey(now) === dayK;
  const nowH = minutesInTenantTz(now) / 60;

  return (
    <div className="p-4 lg:p-5">
      {/* Summary */}
      {slots.length > 0 && (
        <div className="mb-4 flex items-center gap-3">
          <div className={`grid h-11 w-11 place-items-center rounded-2xl text-base font-bold ${covered === slots.length ? 'bg-emerald-500/15 text-emerald-500' : 'bg-red-500/15 text-red-500'}`}>
            {covered}/{slots.length}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{covered === slots.length ? 'Cobertura completa' : `${slots.length - covered} turno(s) sin cubrir`}</p>
            <p className="text-[11px] text-muted-foreground">Línea de tiempo · 24 h</p>
          </div>
          <div className="hidden items-center gap-3 text-[10px] text-muted-foreground sm:flex">
            <span className="inline-flex items-center gap-1"><Sun size={11} className="text-amber-400" /> Día</span>
            <span className="inline-flex items-center gap-1"><Moon size={11} className="text-indigo-400" /> Noche</span>
          </div>
        </div>
      )}

      {slots.length === 0 && dayEvents.length === 0 ? (
        <div className="py-20 text-center">
          <Calendar size={28} className="mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground/60">Día libre — sin horario programado</p>
        </div>
      ) : (
        <div className="max-h-[600px] overflow-y-auto pr-1">
          <div className="relative flex" style={{ height: H }}>
            {/* Hour axis */}
            <div className="relative w-12 shrink-0">
              {hours.map((h) => (
                <div key={h} className="absolute right-2 -translate-y-1/2 text-[10px] font-medium tabular-nums text-muted-foreground/50" style={{ top: (h / 24) * H }}>
                  {String(h % 24).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Lane */}
            <div className="relative flex-1 overflow-hidden rounded-xl border border-border/20 bg-muted/[0.015]">
              {/* gridlines */}
              {hours.map((h) => (
                <div key={h} className="absolute inset-x-0 border-t border-border/10" style={{ top: (h / 24) * H }} />
              ))}

              {/* now indicator */}
              {isToday && nowH > 0 && nowH < 24 && (
                <div className="absolute inset-x-0 z-30 flex items-center" style={{ top: (nowH / 24) * H }}>
                  <div className="-ml-[3px] h-2 w-2 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
                  <div className="h-px flex-1 bg-red-500/60" />
                </div>
              )}

              {/* Uncovered turno blocks (anchored at the turno's start on this day) */}
              {slots.filter((s) => !s.isCovered).map((slot, si) => {
                const isNight = String(slot.jornada.tipo || '').toLowerCase().includes('noct');
                const [sH, sM] = slot.startTime.split(':').map(Number);
                const [eH, eM] = slot.endTime.split(':').map(Number);
                const s = sH + (sM || 0) / 60;
                const e = eH + (eM || 0) / 60;
                const endH = e > s ? e : 24; // night wraps → show the part on this day
                const top = (s / 24) * H;
                const height = ((endH - s) / 24) * H;
                return (
                  <button
                    key={`u-${si}`}
                    onClick={() => onAssign(dayK)}
                    className="absolute inset-x-1 z-10 flex flex-col justify-center gap-0.5 rounded-lg border border-dashed border-red-500/40 bg-red-500/[0.07] px-2 text-left transition-colors hover:bg-red-500/[0.12]"
                    style={{ top, height }}
                  >
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-red-400">
                      {isNight ? <Moon size={11} /> : <Sun size={11} />} {slot.jornada.tipo} · sin asignar
                    </span>
                    {height > 36 && <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-400/80"><Plus size={10} /> Asignar vigilante</span>}
                  </button>
                );
              })}

              {/* Covering guard blocks (actual shifts, clamped to the day) */}
              {dayEvents.map((ev: ShiftEvent, i: number) => {
                const { startH, endH, startBefore, endAfter } = eventSeg(ev);
                const top = (startH / 24) * H;
                const height = Math.max(((endH - startH) / 24) * H, 24);
                const color = guardColorMap[ev.guardId] || GUARD_COLORS[0];
                return (
                  <div
                    key={ev.id || i}
                    className="absolute inset-x-1 z-20 overflow-hidden rounded-lg px-2 py-1 shadow-sm"
                    style={{ top, height, backgroundColor: color.bg, borderLeft: `3px solid ${color.accent}` }}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[8px] font-bold text-white" style={{ background: color.accent }}>
                        {ev.guardName.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
                      </div>
                      <span className="truncate text-[11px] font-semibold" style={{ color: color.text }}>{ev.guardName}</span>
                      {ev.status === 'active' && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-green-500 animate-pulse" />}
                    </div>
                    {height > 36 && (
                      <p className="mt-0.5 truncate text-[9px] text-muted-foreground/80">
                        {startBefore ? '↑ ' : ''}{fmtT(ev.start)} – {fmtT(ev.end)}{endAfter ? ' ↓' : ''}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MonthView({ days, eventsByDate, coverageByDate, guardColorMap, selectedDate, onSelectDate, currentMonth }: {
  days: (Date | null)[];
  eventsByDate: Record<string, ShiftEvent[]>;
  coverageByDate: Record<string, DayCoverage>;
  guardColorMap: Record<string, GuardColor>;
  selectedDate: string | null;
  onSelectDate: (d: string) => void;
  currentMonth: number;
}) {
  const toDateKey = dateKey;
  const isToday = (d: Date) => toDateKey(d) === toDateKey(new Date());
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div className="p-3">
      <div className="grid grid-cols-7 mb-2">
        {DAYS_ES.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40 py-2">{d}</div>
        ))}
      </div>
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((day, di) => {
              if (!day) return <div key={di} className="min-h-[62px]" />;
              const key = toDateKey(day);
              const dayEvents = eventsByDate[key] || [];
              const coverage = coverageByDate[key];
              const isScheduledDay = coverage && coverage.slots.length > 0;
              const isCurrentMonth = day.getMonth() === currentMonth;
              return (
                <button
                  key={di}
                  onClick={() => onSelectDate(key)}
                  className={`relative min-h-[62px] rounded-xl p-1 flex flex-col items-center transition-all duration-150 group ${
                    selectedDate === key ? 'bg-primary/10 ring-1 ring-primary/25 shadow-sm' : 'hover:bg-muted/15'
                  } ${!isCurrentMonth ? 'opacity-25' : ''}`}
                >
                  <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full transition-all ${
                    isToday(day) ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30' :
                    selectedDate === key ? 'text-primary font-semibold' :
                    'text-foreground group-hover:bg-muted/20'
                  }`}>
                    {day.getDate()}
                  </span>
                  {/* Coverage per turno: día (amber) / noche (indigo); red = sin cubrir */}
                  {isScheduledDay ? (
                    <div className="mt-auto w-full space-y-[2px] px-0.5 pb-0.5">
                      {coverage.slots.map((slot: ScheduleSlot, i: number) => {
                        const isNight = String(slot.jornada.tipo || '').toLowerCase().includes('noct');
                        return (
                          <div
                            key={i}
                            title={`${slot.jornada.tipo}: ${slot.guardsAssigned}/${slot.guardsNeeded}`}
                            className={`flex h-[8px] items-center justify-center rounded-full text-[6px] font-bold leading-none text-white/95 ${
                              slot.isCovered ? (isNight ? 'bg-indigo-500/70' : 'bg-amber-500/75') : 'bg-red-500/70'
                            }`}
                          >
                            {isNight ? 'N' : 'D'}
                          </div>
                        );
                      })}
                    </div>
                  ) : dayEvents.length > 0 ? (
                    <div className="flex items-center gap-[3px] mt-auto mb-0.5">
                      {dayEvents.slice(0, 3).map((ev, i) => {
                        const color = guardColorMap[ev.guardId] || GUARD_COLORS[0];
                        return <div key={i} className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: color.accent }} />;
                      })}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
