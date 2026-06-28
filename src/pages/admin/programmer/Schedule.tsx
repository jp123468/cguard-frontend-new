import { useState, useEffect, useMemo, useCallback } from "react";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Users,
  X,
  Loader2,
  Clock,
  Shield,
  Sparkles,
  Zap,
  Sun,
  Moon,
  AlertTriangle,
  Bot,
  ArrowRight,
  FileText,
  CheckCircle2,
  Trash2,
  Plus as PlusIcon,
  MinusCircle,
  RefreshCw,
  MapPin,
} from "lucide-react";
import Breadcrumb from "@/components/ui/breadcrumb";
import { PageContainer, PageHeader, StatusBadge } from "@/components/kit";
import { CalendarDays } from "lucide-react";
import { ApiService } from "@/services/api/apiService";
import { toast } from "sonner";
import { confirmDialog } from "@/components/ui/confirmDialog";

// ─── Types ──────────────────────────────────────────────────────────────────

interface RotationStyle {
  id: string;
  name: string;
  description?: string;
  dayShifts: number;
  nightShifts: number;
  restDays: number;
  isSystem: boolean;
}

interface StationPosition {
  id: string;
  name: string;
  type: 'fijo' | 'sacafranco';
  startTime: string;
  endTime: string;
  guardsNeeded: number;
  sortOrder: number;
  platoonOffset: number;
  stationId: string;
}

interface GuardAssignment {
  id: string;
  guardId: string;
  stationId: string;
  positionId: string;
  rotationStyleId: string;
  startDate: string;
  endDate?: string;
  platoonOffset: number;
  isRelief: boolean;
  status: string;
  guard?: { id: string; firstName: string; lastName: string; email?: string };
  position?: StationPosition;
  rotationStyle?: RotationStyle;
}

interface Station {
  id: string;
  stationName: string;
  scheduleType?: string;
  rotationStyleId?: string;
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

interface ScheduleOverride {
  id: string;
  guardId: string;
  assignmentId?: string;
  date: string;
  type: string; // V, PM, F, 24, D, N, L
  note?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// Format a Date as a LOCAL date-only string (YYYY-MM-DD). Using toISOString() here
// would convert local-midnight dates to UTC and shift the day back for users west of
// UTC (all of LATAM), causing wrong-month queries and off-by-one cell/override matching.
const fmtDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const POSITION_COLORS: Record<string, { bg: string; border: string; text: string; icon: any }> = {
  fijo: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-600', icon: Sun },
  sacafranco: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-500', icon: Shield },
};

const GUARD_COLORS = [
  '#C8860A', '#3B82F6', '#A855F7', '#10B981', '#EF4444',
  '#EC4899', '#06B6D4', '#F59E0B', '#8B5CF6', '#14B8A6',
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function Schedule() {
  const tenantId = localStorage.getItem('tenantId') || '';

  // Data
  const [stations, setStations] = useState<Station[]>([]);
  const [positions, setPositions] = useState<StationPosition[]>([]);
  const [assignments, setAssignments] = useState<GuardAssignment[]>([]);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);
  const [rotationStyles, setRotationStyles] = useState<RotationStyle[]>([]);
  const [guardsPool, setGuardsPool] = useState<GuardOption[]>([]);
  const [staffing, setStaffing] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // View state
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Assignment form
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignTarget, setAssignTarget] = useState<{ stationId: string; positionId: string } | null>(null);
  const [assignGuard, setAssignGuard] = useState('');
  // Rotation phase comes from the station position, not a date — default to today
  // (no date input shown; reset to today on modal open).
  const [assignStartDate, setAssignStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [assignOffset, setAssignOffset] = useState(0);
  const [assignSaving, setAssignSaving] = useState(false);
  const [coverage, setCoverage] = useState<any>(null); // real coverage of live schedule

  // Configure station form
  const [configStation, setConfigStation] = useState<Station | null>(null);
  const [configType, setConfigType] = useState('24h');
  const [configRotation, setConfigRotation] = useState('');
  const [configSaving, setConfigSaving] = useState(false);
  const [customDays, setCustomDays] = useState(5);
  const [customNights, setCustomNights] = useState(0);
  const [customRest, setCustomRest] = useState(2);

  // ─── Data Loading ─────────────────────────────────────────────────────────

  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: Date[] = [];
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [currentDate]);

  const startDateStr = fmtDate(monthDays[0]);
  const endDateStr = fmtDate(monthDays[monthDays.length - 1]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, rotRes, guardsRes, staffingRes, coverageRes] = await Promise.all([
        ApiService.get(`/tenant/${tenantId}/scheduler/overview?startDate=${startDateStr}&endDate=${endDateStr}`),
        ApiService.get(`/tenant/${tenantId}/rotation-styles`),
        ApiService.get(`/tenant/${tenantId}/security-guard/autocomplete?limit=200`),
        ApiService.get(`/tenant/${tenantId}/scheduler/staffing`).catch(() => null),
        ApiService.get(`/tenant/${tenantId}/scheduler/coverage?days=14`).catch(() => null),
      ]);

      setCoverage(coverageRes?.data ?? coverageRes ?? null);
      const ov = overviewRes?.data || overviewRes || {};
      setStations(ov.stations || []);
      setPositions(ov.positions || []);
      setAssignments(ov.assignments || []);
      setShifts(ov.shifts || []);
      setOverrides(ov.overrides || []);

      const rots = rotRes?.rows || rotRes?.data?.rows || [];
      setRotationStyles(rots);

      const guards = Array.isArray(guardsRes) ? guardsRes : (guardsRes?.rows || []);
      setGuardsPool(guards.map((g: any) => ({
        id: g.guardId || g.id || g.value,
        label: g.fullName || g.name || g.label || g.email || '',
      })).filter((g: any) => g.id));

      if (staffingRes) {
        const sd = staffingRes?.data || staffingRes;
        setStaffing(sd);
      }
    } catch (e: any) {
      console.error('[Scheduler] fetch error', e);
      toast.error('Error al cargar horario');
    } finally {
      setLoading(false);
    }
  }, [tenantId, startDateStr, endDateStr]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  // Pre-indexed lookups (built once per data load) to replace repeated O(n) .find()
  // scans inside the month grid / coverage memos.
  const stationsById = useMemo(() => {
    const m = new Map<string, Station>();
    for (const s of stations) m.set(s.id, s);
    return m;
  }, [stations]);

  const rotationStylesById = useMemo(() => {
    const m = new Map<string, RotationStyle>();
    for (const r of rotationStyles) m.set(r.id, r);
    return m;
  }, [rotationStyles]);

  const positionsById = useMemo(() => {
    const m = new Map<string, StationPosition>();
    for (const p of positions) m.set(p.id, p);
    return m;
  }, [positions]);

  // `${positionId}-${dateStr}` → shift for that day (avoids per-cell shifts.find scan).
  // Key uses the raw startTime date slice to match the previous .find() semantics exactly.
  const shiftsByPositionDate = useMemo(() => {
    const m = new Map<string, ShiftRecord>();
    for (const s of shifts) {
      if (!s.positionId || !s.startTime) continue;
      m.set(`${s.positionId}-${s.startTime.slice(0, 10)}`, s);
    }
    return m;
  }, [shifts]);

  // Sacafranco PREVIEW (mirrors the backend STRICT 4-4-2 model): every SF runs a
  // real day→night→rest rotation (its platoonOffset = the planned SF offset). On
  // a day-block day it covers a DAY gap; on a night-block day a NIGHT gap; it
  // rests otherwise — never a night then a day next morning. When >1 SF, they
  // split the day's same-half gaps by index.
  const sfPreview = useMemo(() => {
    const map = new Map<string, { half: 'day' | 'night'; stationId: string }>();
    if (!monthDays.length) return map;
    const epoch = new Date(2024, 0, 1);
    const reqHalves = (st?: string | null): ('day' | 'night')[] =>
      st === '24h' ? ['day', 'night'] : st === '12h-night' ? ['night'] : ['day'];
    const covHalf = (st: string | null | undefined, status: 'day' | 'night' | 'rest'): 'day' | 'night' | null =>
      status === 'rest' ? null : st === '12h-day' ? 'day' : st === '12h-night' ? 'night' : (status === 'night' ? 'night' : 'day');

    const fijoByStation = new Map<string, StationPosition[]>();
    const sfList: StationPosition[] = [];
    for (const p of positions) {
      if (p.type === 'fijo') {
        if (!fijoByStation.has(p.stationId)) fijoByStation.set(p.stationId, []);
        fijoByStation.get(p.stationId)!.push(p);
      } else if (p.type === 'sacafranco') {
        sfList.push(p);
      }
    }
    sfList.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    if (sfList.length === 0) return map;

    // SF rotation is 4-4-2 (day 4, night 4, rest 2).
    const sfStatus = (dse: number, off: number): 'day' | 'night' | 'rest' => {
      const adj = ((dse - off) % 10 + 10) % 10;
      return adj < 4 ? 'day' : adj < 8 ? 'night' : 'rest';
    };
    const gapsOn = (dse: number): { stationId: string; half: 'day' | 'night' }[] => {
      const gaps: { stationId: string; half: 'day' | 'night' }[] = [];
      for (const [stId, fijos] of fijoByStation) {
        const st = stationsById.get(stId);
        if (!st?.rotationStyleId) continue;
        const rot = rotationStylesById.get(st.rotationStyleId);
        if (!rot) continue;
        const cov = new Set<string>();
        for (const f of fijos) {
          const c = rot.dayShifts + rot.nightShifts + rot.restDays;
          if (c <= 0) continue;
          const adj = ((dse - (f.platoonOffset || 0)) % c + c) % c;
          const status = adj < rot.dayShifts ? 'day' : adj < rot.dayShifts + rot.nightShifts ? 'night' : 'rest';
          const h = covHalf(st.scheduleType, status);
          if (h) cov.add(h);
        }
        for (const h of reqHalves(st.scheduleType)) if (!cov.has(h)) gaps.push({ stationId: stId, half: h });
      }
      return gaps;
    };

    for (const day of monthDays) {
      const dse = Math.floor((new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime() - epoch.getTime()) / 86400000);
      const dateStr = fmtDate(day);
      const gaps = gapsOn(dse);
      const dayGaps = gaps.filter((g) => g.half === 'day').sort((a, b) => a.stationId.localeCompare(b.stationId));
      const nightGaps = gaps.filter((g) => g.half === 'night').sort((a, b) => a.stationId.localeCompare(b.stationId));
      for (let i = 0; i < sfList.length; i++) {
        const off = sfList[i].platoonOffset || 0;
        const st = sfStatus(dse, off);
        if (st === 'rest') continue;
        const pool = st === 'day' ? dayGaps : nightGaps;
        const pick = pool[i]; // SFs split same-half gaps by index
        if (pick) map.set(`${sfList[i].id}-${dateStr}`, pick);
      }
    }
    return map;
  }, [positions, stationsById, rotationStylesById, monthDays]);

  const getPositionsForStation = (stationId: string) =>
    positions.filter(p => p.stationId === stationId && p.type !== 'sacafranco');

  const getAssignmentsForPosition = (positionId: string) =>
    assignments.filter(a => a.positionId === positionId);

  const guardColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    let idx = 0;
    assignments.forEach(a => {
      if (a.guardId && !map[a.guardId]) {
        map[a.guardId] = GUARD_COLORS[idx % GUARD_COLORS.length];
        idx++;
      }
    });
    shifts.forEach(s => {
      if (s.guardId && !map[s.guardId]) {
        map[s.guardId] = GUARD_COLORS[idx % GUARD_COLORS.length];
        idx++;
      }
    });
    return map;
  }, [assignments, shifts]);

  // Check if a guard works on a given date based on rotation.
  // useCallback so dependent memos (sfStationCoverage, localStationAlerts) keep a stable
  // identity and only recompute when their real inputs change.
  const isWorkDay = useCallback((assignment: GuardAssignment, date: Date): 'day' | 'night' | 'rest' => {
    // The patrón de rotación lives on the STATION now (assignment.rotationStyleId
    // is null), so resolve it from the station; fall back to any legacy embedded
    // style. (Reading assignment.rotationStyle made every day show "L".)
    const station = stationsById.get(assignment.stationId);
    const rot = (station?.rotationStyleId ? rotationStylesById.get(station.rotationStyleId) : null) || assignment.rotationStyle;
    if (!rot) return 'rest';

    // For sacafranco positions, check if any fijo guard at the same station is resting
    const pos = positionsById.get(assignment.positionId);
    if (pos?.type === 'sacafranco' || assignment.isRelief) {
      // Sacafranco follows its OWN rotation using global epoch (Jan 1)
      const sfCycle = rot.dayShifts + rot.nightShifts + rot.restDays;
      if (sfCycle === 0) return 'rest';
      const epoch = new Date(2024, 0, 1); // fixed rotation anchor (matches backend getGlobalEpoch)
      const target = new Date(date);
      target.setHours(0, 0, 0, 0);
      const sfDiff = Math.floor((target.getTime() - epoch.getTime()) / (24 * 60 * 60 * 1000));
      const sfAdj = ((sfDiff - (assignment.platoonOffset || 0)) % sfCycle + sfCycle) % sfCycle;
      if (sfAdj < rot.dayShifts) return 'day';
      if (sfAdj < rot.dayShifts + rot.nightShifts) return 'night';
      return 'rest';
    }

    // ─── FIJO LOGIC ─── Guard rotates work/rest following the station rotation
    // Uses GLOBAL EPOCH (Jan 1) for consistent sequential pattern across all stations
    const cycleLength = rot.dayShifts + rot.nightShifts + rot.restDays;
    const epoch = new Date(2024, 0, 1); // fixed rotation anchor (matches backend getGlobalEpoch)
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    const diffMs = target.getTime() - epoch.getTime();
    const daysSinceEpoch = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const adjustedDay = ((daysSinceEpoch - assignment.platoonOffset) % cycleLength + cycleLength) % cycleLength;

    // For 24H positions: distinguish day/night phases
    // For 12H positions: both day and night rotation phases are just "work" days
    const is24h = station?.scheduleType === '24h';
    if (adjustedDay < rot.dayShifts) return 'day';
    if (adjustedDay < rot.dayShifts + rot.nightShifts) return is24h ? 'night' : 'day';
    return 'rest';
  }, [positionsById, stationsById, rotationStylesById]);

  // Compute the rotation slot status for a position (no guard needed)
  // Uses the station's rotation style and position offset
  const getSlotStatus = useCallback((stationId: string, position: StationPosition, date: Date): 'day' | 'night' | 'rest' => {
    const station = stationsById.get(stationId);
    if (!station?.rotationStyleId) return 'rest';
    const rot = rotationStylesById.get(station.rotationStyleId);
    if (!rot) return 'rest';

    const cycleLength = rot.dayShifts + rot.nightShifts + rot.restDays;
    if (cycleLength === 0) return 'rest';

    // Use Jan 1 of current year as epoch for consistent pattern display
    const epoch = new Date(2024, 0, 1); // fixed rotation anchor (matches backend getGlobalEpoch)
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    const diffMs = target.getTime() - epoch.getTime();
    const daysSinceEpoch = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    // Use position's platoonOffset (station-defined) to stagger positions
    const offset = position.platoonOffset ?? position.sortOrder ?? 0;
    const adjustedDay = ((daysSinceEpoch - offset) % cycleLength + cycleLength) % cycleLength;

    // For 24H positions: distinguish day vs night phase
    // For 12H positions: both phases are "work" (day)
    const is24hSlot = station?.scheduleType === '24h';
    if (adjustedDay < rot.dayShifts) return 'day';
    if (adjustedDay < rot.dayShifts + rot.nightShifts) return is24hSlot ? 'night' : 'day';
    return 'rest';
  }, [stationsById, rotationStylesById]);

  // Unassigned guards (not in any active assignment)
  const unassignedGuards = useMemo(() => {
    const assignedIds = new Set(assignments.map(a => a.guardId));
    return guardsPool.filter(g => !assignedIds.has(g.id));
  }, [guardsPool, assignments]);

  // Sacafranco availability: guards assigned to sacafranco positions + their D/N/L schedule
  const sacafrancoData = useMemo(() => {
    const reliefAssignments = assignments.filter(a => {
      const pos = positionsById.get(a.positionId);
      return pos?.type === 'sacafranco' || a.isRelief;
    });

    // Group by guard (deduplicate — a sacafranco may have assignments at multiple stations)
    const byGuard = new Map<string, { guard: any; assignments: GuardAssignment[]; availability: { date: Date; status: 'covering' | 'available'; stationName?: string }[] }>();

    reliefAssignments.forEach(a => {
      if (!byGuard.has(a.guardId)) {
        byGuard.set(a.guardId, { guard: a.guard, assignments: [], availability: [] });
      }
      byGuard.get(a.guardId)!.assignments.push(a);
    });

    // For each sacafranco, compute daily status using their OWN rotation
    byGuard.forEach((data) => {
      const primaryAssignment = data.assignments[0]; // Use first assignment for rotation info
      // The patrón de rotación lives on the STATION (assignment.rotationStyle is
      // null by design), so resolve it from the station — reading the assignment
      // relation skipped every sacafranco, so none rendered in the Programador.
      const sfStation = stationsById.get(primaryAssignment?.stationId);
      const rot = (sfStation?.rotationStyleId ? rotationStylesById.get(sfStation.rotationStyleId) : null) || primaryAssignment?.rotationStyle;
      if (!rot) return;

      const sfCycle = rot.dayShifts + rot.nightShifts + rot.restDays;
      if (sfCycle === 0) return;

      // Fixed rotation anchor — must match backend getGlobalEpoch (2024-01-01)
      const epoch = new Date(2024, 0, 1);

      monthDays.forEach(day => {
        const target = new Date(day);
        target.setHours(0, 0, 0, 0);
        const sfDiff = Math.floor((target.getTime() - epoch.getTime()) / (24 * 60 * 60 * 1000));
        const sfAdj = ((sfDiff - (primaryAssignment.platoonOffset || 0)) % sfCycle + sfCycle) % sfCycle;
        if (sfAdj >= rot.dayShifts + rot.nightShifts) {
          // Rest day
          data.availability.push({ date: day, status: 'available' });
        } else {
          // Work day — find which station has a fijo resting
          let coveringStation: string | undefined;
          for (const asgn of data.assignments) {
            const station = stationsById.get(asgn.stationId);
            const stationFijos = assignments.filter(ma =>
              ma.stationId === asgn.stationId && !ma.isRelief &&
              positionsById.get(ma.positionId)?.type === 'fijo'
            );
            for (const mainA of stationFijos) {
              const mainRot = (station?.rotationStyleId ? rotationStylesById.get(station.rotationStyleId) : null) || mainA.rotationStyle;
              if (!mainRot) continue;
              const mainCycle = mainRot.dayShifts + mainRot.nightShifts + mainRot.restDays;
              const daysSince = Math.floor((target.getTime() - epoch.getTime()) / (24 * 60 * 60 * 1000));
              const adj = ((daysSince - (mainA.platoonOffset || 0)) % mainCycle + mainCycle) % mainCycle;
              if (adj >= mainRot.dayShifts + mainRot.nightShifts) {
                coveringStation = station?.stationName || 'Estación';
                break;
              }
            }
            if (coveringStation) break;
          }
          data.availability.push({ date: day, status: 'covering', stationName: coveringStation || 'Cobertura' });
        }
      });
    });

    return Array.from(byGuard.values());
  }, [assignments, positionsById, stationsById, rotationStylesById, monthDays]);

  // Map: `${stationId}-${dateStr}` → covering SF guard name(s)
  // Algorithm: on each day, match working SFs to stations that have fijos resting
  const sfStationCoverage = useMemo(() => {
    const map = new Map<string, { name: string; fullName: string }[]>();

    // Pre-compute: which stations have fijos resting on each day
    const stationRestDays = new Map<string, string[]>(); // dateStr → [stationId, ...]
    const fijoAssigns = assignments.filter(a => {
      const pos = positionsById.get(a.positionId);
      return pos?.type === 'fijo' && !a.isRelief;
    });

    for (const day of monthDays) {
      const dateStr = fmtDate(day);
      const stationsNeeding: string[] = [];
      // Group fijo assignments by station
      const byStation = new Map<string, GuardAssignment[]>();
      for (const a of fijoAssigns) {
        if (!byStation.has(a.stationId)) byStation.set(a.stationId, []);
        byStation.get(a.stationId)!.push(a);
      }
      // Check each station: does any fijo rest today?
      for (const [stId, stAssigns] of byStation) {
        const anyResting = stAssigns.some(a => isWorkDay(a, day) === 'rest');
        if (anyResting) stationsNeeding.push(stId);
      }
      stationRestDays.set(dateStr, stationsNeeding);
    }

    // Pre-compute: which SFs are working on each day
    for (const day of monthDays) {
      const dateStr = fmtDate(day);
      const stationsNeeding = stationRestDays.get(dateStr) || [];
      if (stationsNeeding.length === 0) continue;

      // Get working SFs for this day
      const workingSfs: { name: string; fullName: string }[] = [];
      for (const sf of sacafrancoData) {
        if (!sf.guard) continue;
        const entry = sf.availability.find(a => {
          const d = a.date instanceof Date ? fmtDate(a.date) : String(a.date).slice(0, 10);
          return d === dateStr;
        });
        if (entry?.status === 'covering') {
          workingSfs.push({
            name: `${sf.guard.firstName?.[0] || ''}${sf.guard.lastName?.[0] || ''}`.toUpperCase(),
            fullName: `${sf.guard.firstName || ''} ${sf.guard.lastName || ''}`.trim(),
          });
        }
      }

      // Assign SFs to stations round-robin
      for (let i = 0; i < stationsNeeding.length; i++) {
        const stId = stationsNeeding[i];
        const key = `${stId}-${dateStr}`;
        if (workingSfs.length > 0) {
          const sfIdx = i % workingSfs.length;
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(workingSfs[sfIdx]);
        }
      }
    }

    return map;
  }, [sacafrancoData, assignments, positionsById, monthDays, isWorkDay]);

  // Per-station alerts for uncovered fijo slots and SF rest-day coverage gaps.
  const localStationAlerts = useMemo(() => {
    const rows: { stationId: string; stationName: string; missingFijoCount: number; sfUncoveredDays: number }[] = [];

    for (const st of stations) {
      const stationFijoPositions = positions.filter(p => p.stationId === st.id && p.type === 'fijo');
      const stationFijoAssignments = assignments.filter(a => {
        const pos = positionsById.get(a.positionId);
        return a.stationId === st.id && !a.isRelief && pos?.type === 'fijo';
      });

      const assignedPosIds = new Set(stationFijoAssignments.map(a => a.positionId));
      const missingFijoCount = stationFijoPositions.filter(p => !assignedPosIds.has(p.id)).length;

      let sfUncoveredDays = 0;
      if (stationFijoAssignments.length > 0) {
        for (const day of monthDays) {
          const dateStr = fmtDate(day);
          const anyResting = stationFijoAssignments.some(a => isWorkDay(a, day) === 'rest');
          if (!anyResting) continue;

          const key = `${st.id}-${dateStr}`;
          const coveredBySf = (sfStationCoverage.get(key) || []).length > 0;
          if (!coveredBySf) sfUncoveredDays++;
        }
      }

      if (missingFijoCount > 0 || sfUncoveredDays > 0) {
        rows.push({
          stationId: st.id,
          stationName: st.stationName,
          missingFijoCount,
          sfUncoveredDays,
        });
      }
    }

    rows.sort((a, b) => (b.missingFijoCount + b.sfUncoveredDays) - (a.missingFijoCount + a.sfUncoveredDays));
    return rows;
  }, [stations, positions, positionsById, assignments, monthDays, sfStationCoverage, isWorkDay]);

  const stationAlerts = useMemo(() => {
    const apiAlerts = staffing?.stationAlerts;
    if (Array.isArray(apiAlerts)) return apiAlerts;
    return localStationAlerts;
  }, [staffing, localStationAlerts]);

  const stationAlertByStationId = useMemo(() => {
    const map = new Map<string, any>();
    for (const alert of stationAlerts || []) {
      if (alert?.stationId) map.set(alert.stationId, alert);
    }
    return map;
  }, [stationAlerts]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const openAssignForm = (stationId: string, positionId: string) => {
    setAssignTarget({ stationId, positionId });
    setAssignGuard('');
    setAssignStartDate(fmtDate(new Date()));
    setAssignOffset(0);
    setShowAssignForm(true);
  };

  const handleDrop = (e: React.DragEvent, stationId: string, positionId: string) => {
    e.preventDefault();
    const guardId = e.dataTransfer.getData('guardId');
    if (!guardId) return;
    setAssignTarget({ stationId, positionId });
    setAssignGuard(guardId);
    setAssignStartDate(fmtDate(new Date()));
    setAssignOffset(0);
    setShowAssignForm(true);
  };

  const saveAssignment = async () => {
    if (!assignTarget || !assignGuard) {
      toast.error('Complete todos los campos');
      return;
    }
    const isSacafranco = positions.find(p => p.id === assignTarget.positionId)?.type === 'sacafranco';
    setAssignSaving(true);
    try {
      await ApiService.post(`/tenant/${tenantId}/guard-assignment`, {
        data: {
          guardId: assignGuard,
          stationId: assignTarget.stationId,
          positionId: assignTarget.positionId,
          startDate: assignStartDate,
          platoonOffset: assignOffset,
          isRelief: isSacafranco,
          // No rotationStyleId here — the guard INHERITS the station's patrón de
          // rotación (resolved server-side in assignmentService from station.rotationStyleId).
        },
      });
      toast.success('Vigilante asignado');
      setShowAssignForm(false);
      fetchAll();
    } catch (e: any) {
      toast.error(e?.data?.message || e?.message || 'Error al asignar');
    } finally {
      setAssignSaving(false);
    }
  };

  const removeAssignment = async (assignmentId: string) => {
    if (!(await confirmDialog({ title: 'Remover asignación', message: '¿Remover esta asignación? Se eliminarán los turnos futuros generados.', confirmText: 'Remover', tone: 'danger' }))) return;
    try {
      await ApiService.delete(`/tenant/${tenantId}/guard-assignment/${assignmentId}`);
      toast.success('Asignación removida');
      fetchAll();
    } catch (e: any) {
      toast.error(e?.message || 'Error');
    }
  };

  const configureStation = (station: Station) => {
    setConfigStation(station);
    setConfigType(station.scheduleType || '24h');
    setConfigRotation(station.rotationStyleId || '');
    setCustomDays(5);
    setCustomNights(0);
    setCustomRest(2);
    // Auto-select recommended rotation if no rotation set
    if (!station.rotationStyleId) {
      const recommended = station.scheduleType === '24h'
        ? rotationStyles.find(r => r.name === '4-4-2')
        : rotationStyles.find(r => r.name === '5-2');
      if (recommended) setConfigRotation(recommended.id);
    }
  };

  const filteredRotationStyles = useMemo(() => {
    if (configType === '24h') return rotationStyles.filter(r => r.nightShifts > 0);
    if (configType === '12h-day' || configType === '12h-night') return rotationStyles.filter(r => r.nightShifts === 0);
    return [];
  }, [configType, rotationStyles]);

  // Recommended rotation for current config type
  const recommendedRotationId = useMemo(() => {
    const name = configType === '24h' ? '4-4-2' : '5-2';
    return rotationStyles.find(r => r.name === name)?.id || '';
  }, [configType, rotationStyles]);

  const saveStationConfig = async () => {
    if (!configStation) return;
    setConfigSaving(true);
    try {
      let rotationId = configRotation;
      if (configType === 'custom') {
        // Create a custom rotation style first
        const res = await ApiService.post(`/tenant/${tenantId}/rotation-styles`, {
          data: { name: `${customDays}-${customNights > 0 ? customNights + '-' : ''}${customRest}`, dayShifts: customDays, nightShifts: customNights, restDays: customRest },
        });
        rotationId = res?.id;
      } else if (!rotationId) {
        toast.error('Seleccione un estilo de rotación');
        setConfigSaving(false);
        return;
      }
      await ApiService.post(`/tenant/${tenantId}/station/${configStation.id}/auto-positions`, {
        data: { scheduleType: configType, rotationStyleId: rotationId },
      });
      toast.success('Estación configurada');
      setConfigStation(null);
      fetchAll();
    } catch (e: any) {
      toast.error(e?.data?.message || e?.message || 'Error');
    } finally {
      setConfigSaving(false);
    }
  };

  const addPosition = async (stationId: string) => {
    try {
      await ApiService.post(`/tenant/${tenantId}/station/${stationId}/positions`, {
        data: { name: 'Sacafranco', type: 'sacafranco', startTime: '07:00', endTime: '19:00', guardsNeeded: 1, sortOrder: 99 },
      });
      toast.success('Posición sacafranco agregada');
      fetchAll();
    } catch (e: any) {
      toast.error(e?.message || 'Error');
    }
  };

  const deletePosition = async (stationId: string, positionId: string) => {
    if (!(await confirmDialog({ title: 'Eliminar posición', message: '¿Eliminar esta posición?', confirmText: 'Eliminar', tone: 'danger' }))) return;
    try {
      await ApiService.delete(`/tenant/${tenantId}/station/${stationId}/positions/${positionId}`);
      toast.success('Posición eliminada');
      fetchAll();
    } catch (e: any) {
      toast.error(e?.message || 'Error al eliminar');
    }
  };

  // AI Auto-assign
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [autoResult, setAutoResult] = useState<any>(null);

  // Draft horario proposal (generate → review/diff → publish/discard).
  const [proposalLoading, setProposalLoading] = useState(false);
  const [proposalData, setProposalData] = useState<any>(null); // { proposal, changes }
  const [publishing, setPublishing] = useState(false);
  const [planData, setPlanData] = useState<any>(null); // implementation plan after publish

  const generateDraft = async () => {
    setProposalLoading(true);
    try {
      const gen = await ApiService.post(`/tenant/${tenantId}/scheduler/proposals`, { data: { scope: 'tenant' } });
      const id = gen?.proposalId || gen?.data?.proposalId;
      if (!id) throw new Error('No se pudo generar el borrador');
      const detail = await ApiService.get(`/tenant/${tenantId}/scheduler/proposals/${id}`);
      setProposalData(detail?.data ?? detail);
    } catch (e: any) {
      toast.error(e?.data?.message || e?.message || 'Error generando el borrador');
    } finally {
      setProposalLoading(false);
    }
  };

  const publishProposal = async (allowGaps = false) => {
    const id = proposalData?.proposal?.id;
    if (!id) return;
    setPublishing(true);
    try {
      const res = await ApiService.post(`/tenant/${tenantId}/scheduler/proposals/${id}/publish`, { data: { confirm: true, allowGaps } });
      const notified = res?.plan?.notifiedGuards ?? res?.data?.plan?.notifiedGuards ?? 0;
      toast.success(`Horario publicado · ${notified} vigilante${notified === 1 ? '' : 's'} notificado${notified === 1 ? '' : 's'}`);
      // Switch the modal to the implementation plan (who was notified).
      try {
        const plan = await ApiService.get(`/tenant/${tenantId}/scheduler/proposals/${id}/plan`);
        setPlanData(plan?.data ?? plan);
      } catch { setPlanData({ plan: { notifiedGuards: notified }, items: [] }); }
      fetchAll();
    } catch (e: any) {
      toast.error(e?.data?.message || e?.message || 'Error al publicar');
    } finally {
      setPublishing(false);
    }
  };

  const discardProposal = async () => {
    const id = proposalData?.proposal?.id;
    if (id) {
      try { await ApiService.post(`/tenant/${tenantId}/scheduler/proposals/${id}/discard`, { data: {} }); } catch { /* best effort */ }
    }
    setProposalData(null);
  };

  const closeProposalModal = () => { setProposalData(null); setPlanData(null); };

  // Geocode guards missing home coordinates (enables real proximity ranking).
  const [geocoding, setGeocoding] = useState(false);
  const runGeocode = async () => {
    setGeocoding(true);
    try {
      const res = await ApiService.post(`/tenant/${tenantId}/security-guard/geocode-missing`, {});
      const g = res?.geocoded ?? res?.data?.geocoded ?? 0;
      const rem = res?.remaining ?? res?.data?.remaining ?? 0;
      toast.success(`${g} vigilante(s) geolocalizados${rem > 0 ? ` · ${rem} pendientes (ejecuta de nuevo)` : ''}`);
    } catch (e: any) {
      toast.error(e?.data?.message || e?.message || 'Error al geolocalizar vigilantes');
    } finally {
      setGeocoding(false);
    }
  };
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);

  const runAiRecommend = async () => {
    setAiLoading(true);
    setAiRecommendation(null);
    try {
      const [result] = await ApiService.post(`/tenant/${tenantId}/scheduler/ai-recommend`, { type: 'optimize' });
      const rec = result?.recommendation || result?.data?.recommendation || 'Sin respuesta';
      setAiRecommendation(rec);
    } catch (e: any) {
      toast.error('Error al consultar IA');
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  const runAutoAssign = async () => {
    if (!(await confirmDialog({ message: '¿Asignar automáticamente vigilantes a todas las estaciones sin cubrir?\n\nSolo se cubren los puestos VACÍOS con vigilantes sin asignar (por cercanía, configurando rotaciones y sacafrancos). NO se moverá ni reasignará ningún vigilante que ya esté asignado a un puesto.', confirmText: 'Asignar' }))) return;
    setAutoAssigning(true);
    setAutoResult(null);
    try {
      const res = await ApiService.post(`/tenant/${tenantId}/scheduler/auto-assign`, { data: {} });
      setAutoResult(res);
      toast.success(`${res.assignmentsCreated} asignaciones creadas`);
      fetchAll();
    } catch (e: any) {
      toast.error(e?.data?.message || e?.message || 'Error en auto-asignación');
    } finally {
      setAutoAssigning(false);
    }
  };

  const runOptimizeSacafrancos = async () => {
    if (!(await confirmDialog({ message: '¿Optimizar la rotación de sacafrancos?\n\nATENCIÓN: esto MOVERÁ vigilantes sacafranco ya asignados a otros puestos/estaciones y regenerará sus turnos para maximizar cobertura. Los vigilantes fijos NO se tocan.', confirmText: 'Optimizar' }))) return;
    setAutoAssigning(true);
    try {
      const res = await ApiService.post(`/tenant/${tenantId}/scheduler/optimize-sacafrancos`, { data: {} });
      toast.success(res?.message || 'Sacafrancos optimizados');
      fetchAll();
    } catch (e: any) {
      toast.error(e?.data?.message || e?.message || 'Error en optimización');
    } finally {
      setAutoAssigning(false);
    }
  };

  // Schedule overrides
  const [overrideTarget, setOverrideTarget] = useState<{ guardId: string; guardName: string; date: string; assignmentId?: string } | null>(null);
  const [sfSectionOpen, setSfSectionOpen] = useState(false); // SF section collapsed by default

  const getOverride = (guardId: string, dateStr: string): ScheduleOverride | undefined =>
    overrides.find(o => o.guardId === guardId && o.date === dateStr);

  const saveOverride = async (type: string, note?: string) => {
    if (!overrideTarget) return;
    try {
      await ApiService.post(`/tenant/${tenantId}/schedule-overrides`, {
        data: { guardId: overrideTarget.guardId, assignmentId: overrideTarget.assignmentId, date: overrideTarget.date, type, note },
      });
      toast.success(`Novedad ${type} registrada`);
      setOverrideTarget(null);
      fetchAll();
    } catch (e: any) {
      toast.error(e?.message || 'Error');
    }
  };

  const removeOverride = async (id: string) => {
    try {
      await ApiService.delete(`/tenant/${tenantId}/schedule-overrides/${id}`);
      toast.success('Novedad eliminada');
      setOverrideTarget(null);
      fetchAll();
    } catch (e: any) {
      toast.error(e?.message || 'Error');
    }
  };

  // ─── Navigation ───────────────────────────────────────────────────────────

  const nav = (dir: number) => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + dir);
      d.setDate(1);
      return d;
    });
  };

  const goToday = () => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    setCurrentDate(d);
  };

  const monthLabel = useMemo(() => {
    return currentDate.toLocaleDateString('es', { month: 'long', year: 'numeric' }).replace(/^./, c => c.toUpperCase());
  }, [currentDate]);

  const todayStr = fmtDate(new Date());

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <Breadcrumb items={[{ label: "Panel de control", path: "/dashboard" }, { label: "Horario" }]} />

      <PageContainer width="wide" className="px-4 lg:px-6">
        {/* Header */}
        <PageHeader
          icon={<CalendarDays />}
          title="Programador de Horarios"
          subtitle="Rotaciones, coberturas y asignación de vigilantes por puesto."
          badges={coverage && typeof coverage.coveredPct === 'number' ? (
            (() => {
              const ok = (coverage.gapCount || 0) === 0;
              return (
                <StatusBadge tone={ok ? 'green' : 'red'} dot={false}>
                  {ok ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                  Cobertura {coverage.coveredPct}%
                  {(coverage.gapCount || 0) > 0 && <span>· {coverage.gapCount} sin cubrir</span>}
                </StatusBadge>
              );
            })()
          ) : undefined}
          actions={(
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => nav(-1)}><ChevronLeft size={16} /></Button>
              <Button variant="outline" size="sm" onClick={goToday}>Hoy</Button>
              <span className="text-sm font-medium text-foreground min-w-[150px] text-center">{monthLabel}</span>
              <Button variant="outline" size="sm" onClick={() => nav(1)}><ChevronRight size={16} /></Button>
            </div>
          )}
        />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-[#C8860A]" size={32} />
          </div>
        ) : stations.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg">No hay estaciones configuradas</p>
            <p className="text-sm mt-2">Crea una estación desde la sección de Puestos para comenzar.</p>
          </div>
        ) : (
          <>
          {/* ─── Onboarding CTA: stations exist but unconfigured ─── */}
          {(positions.length === 0 || assignments.length === 0) && (
            <div className="bg-gradient-to-br from-[#C8860A]/10 to-[#C8860A]/5 border border-[#C8860A]/30 rounded-xl p-4 lg:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-[#C8860A]/15 flex items-center justify-center">
                  <Sparkles size={20} className="text-[#C8860A]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground">Tus estaciones aún no tienen horario</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Tienes {stations.length} estaciones sin puestos ni vigilantes asignados. Genera la asignación automática para crear los puestos de cada estación, asignar vigilantes por cercanía y escalonar los turnos (sacafrancos incluidos).
                  </p>
                </div>
              </div>
              <button
                onClick={runAutoAssign}
                disabled={autoAssigning}
                className="shrink-0 px-4 py-2.5 bg-[#C8860A] text-white rounded-xl text-sm font-semibold hover:bg-[#B37809] disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {autoAssigning ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                {autoAssigning ? 'Asignando...' : 'Generar asignación automática'}
              </button>
            </div>
          )}
          <div className="flex gap-4">
            {/* ─── Left Sidebar Panel ─── */}
            <div className="w-[260px] shrink-0 space-y-3 hidden xl:block">
              {/* AI Auto-Assign */}
              <div className="bg-gradient-to-br from-[#C8860A]/10 to-[#C8860A]/5 border border-[#C8860A]/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={16} className="text-[#C8860A]" />
                  <h3 className="text-sm font-bold text-foreground">Asignación AI</h3>
                </div>
                <p className="text-[11px] text-muted-foreground mb-3">
                  Asigna vigilantes automáticamente por cercanía, configura rotaciones óptimas y programa sacafrancos.
                </p>
                <button
                  onClick={generateDraft}
                  disabled={proposalLoading}
                  className="w-full px-4 py-2.5 bg-[#C8860A] text-white rounded-xl text-sm font-semibold hover:bg-[#B37809] disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  {proposalLoading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                  {proposalLoading ? 'Generando borrador...' : 'Generar borrador de horario'}
                </button>
                <p className="mt-1 mb-3 text-[10px] text-muted-foreground">
                  Calcula el horario propuesto y muestra los cambios antes de aplicar. No modifica nada hasta que publiques.
                </p>
                <button
                  onClick={runAutoAssign}
                  disabled={autoAssigning}
                  className="w-full px-4 py-2 bg-background border border-input text-foreground rounded-xl text-xs font-semibold hover:bg-muted/40 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {autoAssigning ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                  {autoAssigning ? 'Asignando...' : 'Auto-asignar puestos vacíos'}
                </button>
                {autoResult && (
                  <div className="mt-3 p-2 bg-background/60 rounded-lg space-y-1">
                    <div className="text-[11px] text-foreground font-medium">Resultado:</div>
                    <div className="text-[10px] text-muted-foreground">• {autoResult.titularesAssigned} titulares asignados</div>
                    <div className="text-[10px] text-muted-foreground">• {autoResult.sacafrancosAssigned} sacafrancos asignados</div>
                    <div className="text-[10px] text-muted-foreground">• {autoResult.unassignedRemaining} vigilantes sin asignar</div>
                  </div>
                )}
                <button
                  onClick={runOptimizeSacafrancos}
                  disabled={autoAssigning}
                  className="w-full mt-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <Shield size={12} />
                  Optimizar Sacafrancos
                </button>
                <button
                  onClick={runGeocode}
                  disabled={geocoding}
                  className="w-full mt-2 px-4 py-2 bg-background border border-input text-foreground rounded-xl text-xs font-semibold hover:bg-muted/40 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  title="Geolocaliza las direcciones de los vigilantes para asignar por cercanía real"
                >
                  {geocoding ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />}
                  {geocoding ? 'Geolocalizando...' : 'Geolocalizar vigilantes'}
                </button>
                <button
                  onClick={runAiRecommend}
                  disabled={aiLoading}
                  className="w-full mt-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-semibold hover:bg-purple-700 disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {aiLoading ? 'Analizando...' : 'Recomendación IA'}
                </button>
                {aiRecommendation && (
                  <div className="mt-3 p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg max-h-[300px] overflow-y-auto">
                    <div className="text-[10px] font-semibold text-purple-600 mb-1"><Bot className="inline h-3 w-3 mr-1" />Recomendación IA:</div>
                    <div className="text-[10px] text-foreground/80 whitespace-pre-wrap leading-relaxed">{aiRecommendation}</div>
                  </div>
                )}
              </div>

              {/* Stats summary */}
              <div className="bg-card border border-border/40 rounded-xl p-4 space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Personal Necesario</h3>
                {staffing ? (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-amber-500/10 rounded-lg p-2 text-center">
                        <div className="text-lg font-bold text-amber-600">{staffing.fijosNeeded || 0}</div>
                        <div className="text-[9px] text-muted-foreground">Fijos</div>
                      </div>
                      <div className="bg-emerald-500/10 rounded-lg p-2 text-center">
                        <div className="text-lg font-bold text-emerald-500">{staffing.sacafrancosNeeded || 0}</div>
                        <div className="text-[9px] text-muted-foreground">Sacafrancos</div>
                      </div>
                      <div className="bg-sky-500/10 rounded-lg p-2 text-center">
                        <div className="text-lg font-bold text-sky-500">{staffing.totalGuardsNeeded || 0}</div>
                        <div className="text-[9px] text-muted-foreground">Total</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="bg-muted/20 rounded-lg p-2 text-center">
                        <div className="text-sm font-bold text-foreground">{staffing.currentFijoGuards || 0}<span className="text-muted-foreground font-normal">/{staffing.fijosNeeded || 0}</span></div>
                        <div className="text-[9px] text-muted-foreground">Fijos asignados</div>
                      </div>
                      <div className="bg-muted/20 rounded-lg p-2 text-center">
                        <div className="text-sm font-bold text-foreground">{staffing.currentSfGuards || 0}<span className="text-muted-foreground font-normal">/{staffing.sacafrancosNeeded || 0}</span></div>
                        <div className="text-[9px] text-muted-foreground">SF asignados</div>
                      </div>
                    </div>
                    {/* Hiring recommendation */}
                    {((staffing.fijosNeeded - (staffing.currentFijoGuards || 0)) > 0 || (staffing.sacafrancosNeeded - (staffing.currentSfGuards || 0)) > 0) && (
                      <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-2 space-y-1">
                        <div className="text-[10px] font-semibold text-red-600"><AlertTriangle className="inline h-3 w-3 mr-1" />Contratar:</div>
                        {(staffing.fijosNeeded - (staffing.currentFijoGuards || 0)) > 0 && (
                          <div className="text-[10px] text-red-500">{staffing.fijosNeeded - (staffing.currentFijoGuards || 0)} fijos más</div>
                        )}
                        {(staffing.sacafrancosNeeded - (staffing.currentSfGuards || 0)) > 0 && (
                          <div className="text-[10px] text-red-500">{staffing.sacafrancosNeeded - (staffing.currentSfGuards || 0)} sacafrancos más</div>
                        )}
                      </div>
                    )}
                    {staffing.sfRotation && (
                      <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/20">
                        Rotación SF: <span className="font-semibold text-foreground">{staffing.sfRotation.name}</span> ({staffing.sfRotation.dayShifts}D-{staffing.sfRotation.nightShifts}N-{staffing.sfRotation.restDays}L)
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground">
                      Demanda pico: <span className="font-semibold text-foreground">{staffing.peakDemand}</span> estaciones simultáneas
                    </div>

                    {stationAlerts.length > 0 && (
                      <div className="pt-2 border-t border-border/20 space-y-1.5">
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-red-600">
                          <AlertTriangle size={11} />
                          Alertas por estación ({stationAlerts.length})
                        </div>
                        <div className="max-h-[160px] overflow-y-auto space-y-1 pr-1">
                          {stationAlerts.map(alert => (
                            <div key={alert.stationId} className="text-[10px] bg-red-500/5 border border-red-500/20 rounded px-2 py-1">
                              <div className="font-medium text-foreground truncate">{alert.stationName}</div>
                              {alert.missingFijoCount > 0 && (
                                <div className="text-red-500">• {alert.missingFijoCount} fijo(s) sin vigilante</div>
                              )}
                              {alert.sfUncoveredDays > 0 && (
                                <div className="text-red-500">• {alert.sfUncoveredDays} día(s) L sin SF cubriendo</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-muted/20 rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-foreground">{stations.length}</div>
                      <div className="text-[9px] text-muted-foreground">Estaciones</div>
                    </div>
                    <div className="bg-muted/20 rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-foreground">{assignments.length}</div>
                      <div className="text-[9px] text-muted-foreground">Asignados</div>
                    </div>
                  </div>
                )}
                {/* Coverage */}
                {(() => {
                  const fijoPositions = positions.filter(p => p.type !== 'sacafranco');
                  const covered = fijoPositions.filter(p => assignments.some(a => a.positionId === p.id)).length;
                  const pct = fijoPositions.length > 0 ? Math.round((covered / fijoPositions.length) * 100) : 0;
                  return (
                    <div className="pt-2 border-t border-border/20">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground">Cobertura Fijos</span>
                        <span className="text-[10px] font-semibold text-foreground">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                        <div className="h-full bg-[#C8860A] rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-[9px] text-muted-foreground mt-1">{covered}/{fijoPositions.length} posiciones cubiertas</div>
                    </div>
                  );
                })()}
              </div>

              {/* Sacafrancos mini panel */}
              {sacafrancoData.length > 0 && (
                <div className="bg-card border border-emerald-500/20 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Shield size={12} className="text-emerald-500" />
                    <h3 className="text-[11px] font-semibold text-foreground">Sacafrancos ({sacafrancoData.length})</h3>
                  </div>
                  <div className="space-y-1.5">
                    {sacafrancoData.slice(0, 5).map(sf => {
                      const name = sf.guard ? `${sf.guard.firstName || ''} ${sf.guard.lastName || ''}`.trim().split(' ').slice(0, 2).join(' ') : '?';
                      const availDays = sf.availability.filter(a => a.status === 'available').length;
                      return (
                        <div key={sf.guard?.id} className="flex items-center justify-between py-1 px-2 rounded bg-muted/20">
                          <span className="text-[10px] text-foreground font-medium truncate max-w-[120px]">{name}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${availDays > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-600'}`}>
                            {availDays} disp
                          </span>
                        </div>
                      );
                    })}
                    {sacafrancoData.length > 5 && (
                      <div className="text-[9px] text-muted-foreground text-center">+{sacafrancoData.length - 5} más</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ─── Main Content ─── */}
            <div className="flex-1 min-w-0 space-y-4">
            {/* Schedule Grid */}
            <div className="bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm overflow-x-auto">
              {/* Header row */}
              <div className="grid border-b border-border/30 bg-muted/20" style={{ gridTemplateColumns: `240px repeat(${monthDays.length}, 44px)` }}>
                <div className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-r border-border/20 sticky left-0 z-10 bg-muted/95 backdrop-blur-sm">
                  Estación / Posición
                </div>
                {monthDays.map((day, i) => {
                  const isToday = fmtDate(day) === todayStr;
                  const isSunday = day.getDay() === 0;
                  return (
                    <div key={i} className={`px-0.5 py-2 text-center border-r border-border/20 last:border-r-0 ${isToday ? 'bg-[#C8860A]/5' : ''} ${isSunday ? 'bg-red-500/5' : ''}`}>
                      <div className="text-[9px] font-medium text-muted-foreground uppercase">{DAYS_ES[day.getDay()]}</div>
                      <div className={`text-xs font-semibold mt-0.5 ${isToday ? 'text-[#C8860A]' : 'text-foreground'}`}>
                        {day.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Station rows */}
              {stations.map(station => {
                const stationPositions = getPositionsForStation(station.id);
                const hasPositions = stationPositions.length > 0;
                const stationAlert = stationAlertByStationId.get(station.id);

                return (
                  <div key={station.id} className="border-b border-border/20 last:border-b-0">
                    {/* Station header */}
                    <div className="grid bg-muted/10" style={{ gridTemplateColumns: `240px repeat(${monthDays.length}, 44px)` }}>
                      <div className="px-4 py-2.5 flex items-center gap-2 border-r border-border/20 sticky left-0 z-10 bg-muted/95 backdrop-blur-sm">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-foreground truncate">{station.stationName}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {station.scheduleType ? station.scheduleType.replace('-', ' ').toUpperCase() : 'Sin configurar'}
                          </div>
                          {stationAlert && (
                            <div className="mt-1 flex items-center gap-1 flex-wrap">
                              {stationAlert.missingFijoCount > 0 && (
                                <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-red-600 font-medium">
                                  <AlertTriangle size={9} />
                                  {stationAlert.missingFijoCount} fijo(s) faltan
                                </span>
                              )}
                              {stationAlert.sfUncoveredDays > 0 && (
                                <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-700 font-medium">
                                  <AlertTriangle size={9} />
                                  {stationAlert.sfUncoveredDays} L sin SF
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {!hasPositions && (
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => configureStation(station)}>
                            Configurar
                          </Button>
                        )}
                        {hasPositions && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => configureStation(station)}
                              className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                              title="Reconfigurar estación"
                            >
                              <Clock size={14} />
                            </button>
                            <button
                              onClick={() => addPosition(station.id)}
                              className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                              title="Agregar posición sacafranco"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                      {monthDays.map((_, i) => (
                        <div key={i} className="border-r border-border/10 last:border-r-0" />
                      ))}
                    </div>

                    {/* Position rows */}
                    {stationPositions.map(pos => {
                      const posAssignments = getAssignmentsForPosition(pos.id);
                      const colors = POSITION_COLORS[pos.type] || POSITION_COLORS.fijo;
                      const Icon = colors.icon;

                      return (
                        <div key={pos.id} className="grid border-t border-border/10" style={{ gridTemplateColumns: `240px repeat(${monthDays.length}, 44px)` }}>
                          {/* Position label */}
                          <div className="px-4 py-2 flex items-center gap-2 border-r border-border/20 sticky left-0 z-10 bg-card backdrop-blur-sm">
                            <div className={`w-6 h-6 rounded flex items-center justify-center ${colors.bg}`}>
                              <Icon size={12} className={colors.text} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-foreground truncate">{pos.name}</div>
                              <div className="text-[10px] text-muted-foreground">
                                {station.scheduleType === '12h-night' ? '19:00 – 07:00' : station.scheduleType === '24h' ? '24 Horas' : '07:00 – 19:00'}
                              </div>
                            </div>
                            {/* Assigned guard names */}
                            {posAssignments.length > 0 && (
                              <div className="flex flex-col gap-0.5">
                                {posAssignments.map(a => {
                                  const name = a.guard ? `${a.guard.firstName || ''} ${a.guard.lastName || ''}`.trim().split(' ')[0] : '?';
                                  const color = guardColorMap[a.guardId] || '#666';
                                  return (
                                    <button
                                      key={a.id}
                                      onClick={() => removeAssignment(a.id)}
                                      className="text-[9px] font-medium px-1.5 py-0.5 rounded"
                                      style={{ backgroundColor: `${color}20`, color }}
                                      title={`${a.guard?.firstName} ${a.guard?.lastName} — Click para remover`}
                                    >
                                      {name} ×
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                            {posAssignments.length === 0 && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => openAssignForm(station.id, pos.id)}
                                  className="p-1 rounded-md bg-[#C8860A]/10 hover:bg-[#C8860A]/20 text-[#C8860A] transition-colors"
                                  title="Asignar vigilante"
                                >
                                  <Plus size={12} />
                                </button>
                                <button
                                  onClick={() => deletePosition(station.id, pos.id)}
                                  className="p-1 rounded-md hover:bg-red-500/10 text-muted-foreground/50 hover:text-red-500 transition-colors"
                                  title="Eliminar posición"
                                >
                                  <X size={11} />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Day cells */}
                          {monthDays.map((day, dayIdx) => {
                            const dateStr = fmtDate(day);
                            const isToday = dateStr === todayStr;
                            const isSunday = day.getDay() === 0;

                            return (
                              <div
                                key={dayIdx}
                                className={`border-r border-border/10 last:border-r-0 px-0.5 py-0.5 min-h-[44px] ${isToday ? 'bg-[#C8860A]/3' : ''} ${isSunday ? 'bg-red-500/3' : ''}`}
                                onDragOver={e => e.preventDefault()}
                                onDrop={e => handleDrop(e, station.id, pos.id)}
                              >
                                {posAssignments.length === 0 ? (
                                  (() => {
                                    // Show rotation pattern even without a guard assigned
                                    const slotStatus = getSlotStatus(station.id, pos, day);
                                    if (pos.type === 'sacafranco') {
                                      // Sacafranco follows its own D/N/L rotation (same calc as fijo using position offset)
                                      if (slotStatus === 'rest') {
                                        return (
                                          <div className="h-[20px] rounded bg-muted/20 border border-dashed border-border/30 flex items-center justify-center cursor-pointer" title="Sacafranco — Libre" onClick={() => openAssignForm(station.id, pos.id)}>
                                            <span className="text-[10px] font-bold text-muted-foreground/40">L</span>
                                          </div>
                                        );
                                      }
                                      const sfCode = slotStatus === 'night' ? 'N' : 'D';
                                      const sfBg = slotStatus === 'night' ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-emerald-500/10 border-emerald-500/30';
                                      const sfText = slotStatus === 'night' ? 'text-indigo-400/60' : 'text-emerald-500/60';
                                      return (
                                        <div className={`h-[20px] rounded border border-dashed flex items-center justify-center cursor-pointer ${sfBg}`} title={`Sacafranco — ${sfCode} (sin vigilante)`} onClick={() => openAssignForm(station.id, pos.id)}>
                                          <span className={`text-[10px] font-bold ${sfText}`}>{sfCode}</span>
                                        </div>
                                      );
                                    }
                                    // Fijo position: show D/N/L pattern
                                    if (slotStatus === 'rest') {
                                      return (
                                        <div className="h-[20px] rounded bg-muted/20 border border-dashed border-border/30 flex items-center justify-center cursor-pointer" title="Slot libre (sin vigilante asignado)" onClick={() => openAssignForm(station.id, pos.id)}>
                                          <span className="text-[10px] font-bold text-muted-foreground/40">L</span>
                                        </div>
                                      );
                                    }
                                    // Use STATION scheduleType to determine D vs N label
                                    const is24hSlot = station.scheduleType === '24h';
                                    const isNightSlot = station.scheduleType === '12h-night';
                                    const code = is24hSlot
                                      ? (slotStatus === 'night' ? 'N' : 'D')
                                      : isNightSlot ? 'N' : 'D';
                                    const bg = code === 'N' ? 'bg-indigo-500/8 border-indigo-500/20' : 'bg-sky-500/8 border-sky-500/20';
                                    const textColor = code === 'N' ? 'text-indigo-400/50' : 'text-sky-500/50';
                                    return (
                                      <div className={`h-[20px] rounded border border-dashed flex items-center justify-center cursor-pointer ${bg}`} title={`Slot ${code} (sin vigilante asignado — click para asignar)`} onClick={() => openAssignForm(station.id, pos.id)}>
                                        <span className={`text-[10px] font-bold ${textColor}`}>{code}</span>
                                      </div>
                                    );
                                  })()
                                ) : (
                                  <div className="space-y-0.5">
                                    {posAssignments.map(assignment => {
                                      const guardName = assignment.guard
                                        ? `${assignment.guard.firstName || ''} ${assignment.guard.lastName || ''}`.trim()
                                        : '?';
                                      const color = guardColorMap[assignment.guardId] || '#666';
                                      const override = getOverride(assignment.guardId, dateStr);

                                      // If there's an override, show it instead of calculated rotation
                                      if (override) {
                                        const oType = override.type;
                                        const oStyles: Record<string, { bg: string; text: string }> = {
                                          V: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
                                          PM: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
                                          F: { bg: 'bg-red-500/20', text: 'text-red-400' },
                                          '24': { bg: 'bg-amber-500/15', text: 'text-amber-500' },
                                          D: { bg: 'bg-sky-500/15', text: 'text-sky-500' },
                                          N: { bg: 'bg-indigo-500/15', text: 'text-indigo-400' },
                                          L: { bg: 'bg-muted/30', text: 'text-muted-foreground/50' },
                                        };
                                        const s = oStyles[oType] || { bg: 'bg-muted/30', text: 'text-foreground' };
                                        return (
                                          <div
                                            key={assignment.id}
                                            className={`h-[20px] rounded flex items-center justify-center cursor-pointer ${s.bg}`}
                                            style={{ borderLeft: `2px solid ${color}` }}
                                            title={`${guardName} — ${oType}${override.note ? ': ' + override.note : ''} (click para editar)`}
                                            onClick={() => setOverrideTarget({ guardId: assignment.guardId, guardName, date: dateStr, assignmentId: assignment.id })}
                                          >
                                            <span className={`text-[10px] font-bold ${s.text}`}>{oType}</span>
                                          </div>
                                        );
                                      }

                                      const workStatus = isWorkDay(assignment, day);
                                      // Determine display label based on STATION scheduleType
                                      const is24h = station.scheduleType === '24h';
                                      const isNightPos = station.scheduleType === '12h-night';

                                      if (workStatus === 'rest') {
                                        const coverKey = `${station.id}-${dateStr}`;
                                        const coveringSfs = sfStationCoverage.get(coverKey) || [];
                                        const sfLabel = coveringSfs.length > 0 ? coveringSfs[0].name : '';
                                        const sfTooltip = coveringSfs.length > 0 ? coveringSfs.map(s => s.fullName).join(', ') : '';
                                        return (
                                          <div
                                            key={assignment.id}
                                            className={`h-[20px] rounded flex items-center justify-center cursor-pointer relative ${sfLabel ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-muted/30 hover:bg-muted/50'}`}
                                            title={`${guardName} — Libre${sfTooltip ? ` · Cubre: ${sfTooltip}` : ' (sin cobertura)'}`}
                                            onClick={() => setOverrideTarget({ guardId: assignment.guardId, guardName, date: dateStr, assignmentId: assignment.id })}
                                          >
                                            {sfLabel ? (
                                              <span className="text-[8px] font-bold text-emerald-600">{sfLabel}</span>
                                            ) : (
                                              <span className="text-[10px] font-bold text-muted-foreground/50">L</span>
                                            )}
                                          </div>
                                        );
                                      }

                                      // For 24H: show D/N based on rotation phase
                                      // For 12H DAY: always D
                                      // For 12H NIGHT: always N
                                      const code = is24h
                                        ? (workStatus === 'night' ? 'N' : 'D')
                                        : isNightPos ? 'N' : 'D';
                                      const bg = code === 'N'
                                        ? 'bg-indigo-500/15'
                                        : is24h ? 'bg-amber-500/15' : 'bg-sky-500/15';
                                      const textColor = code === 'N'
                                        ? 'text-indigo-400'
                                        : is24h ? 'text-amber-500' : 'text-sky-500';

                                      return (
                                        <div
                                          key={assignment.id}
                                          className={`h-[20px] rounded flex items-center justify-center cursor-pointer hover:opacity-80 ${bg}`}
                                          style={{ borderLeft: `2px solid ${color}` }}
                                          title={`${guardName} — ${code === 'N' ? 'Nocturno' : (code as string) === '24' ? '24 Horas' : 'Diurno'} (click para novedad)`}
                                          onClick={() => setOverrideTarget({ guardId: assignment.guardId, guardName, date: dateStr, assignmentId: assignment.id })}
                                        >
                                          <span className={`text-[10px] font-bold ${textColor}`}>{code}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}

                    {/* No positions configured */}
                    {!hasPositions && (
                      <div className="grid border-t border-border/10" style={{ gridTemplateColumns: `240px repeat(${monthDays.length}, 44px)` }}>
                        <div className="col-span-full px-4 py-4 text-center">
                          <p className="text-xs text-muted-foreground mb-2">Esta estación no tiene posiciones configuradas</p>
                          <Button size="sm" variant="outline" className="text-xs" onClick={() => configureStation(station)}>
                            Configurar posiciones
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* ─── Sacafrancos Section ─── */}
              {(() => {
                const sfPositions = positions.filter(p => p.type === 'sacafranco');
                if (sfPositions.length === 0) return null;
                return (
                  <div className="border-t-2 border-emerald-500/30">
                    {/* SF Header - clickable to expand/collapse */}
                    <div className="grid bg-emerald-500/5 cursor-pointer" style={{ gridTemplateColumns: `240px repeat(${monthDays.length}, 44px)` }} onClick={() => setSfSectionOpen(!sfSectionOpen)}>
                      <div className="px-4 py-2.5 flex items-center gap-2 border-r border-border/20 sticky left-0 z-10 bg-emerald-500/5 backdrop-blur-sm">
                        <Shield size={14} className="text-emerald-500" />
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-emerald-600">Sacafrancos</div>
                          <div className="text-[10px] text-muted-foreground">{sfPositions.length} posiciones {sfSectionOpen ? '▾' : '▸ (click para expandir)'}</div>
                        </div>
                      </div>
                      {monthDays.map((_, i) => <div key={i} className="border-r border-border/10 last:border-r-0" />)}
                    </div>

                    {/* SF Position rows — only if expanded */}
                    {sfSectionOpen && sfPositions.map(pos => {
                      const posAssignments = getAssignmentsForPosition(pos.id);
                      return (
                        <div key={pos.id} className="grid border-t border-border/10" style={{ gridTemplateColumns: `240px repeat(${monthDays.length}, 44px)` }}>
                          {/* SF label */}
                          <div className="px-4 py-2 flex items-center gap-2 border-r border-border/20 sticky left-0 z-10 bg-card backdrop-blur-sm">
                            <div className="w-6 h-6 rounded flex items-center justify-center bg-emerald-500/10">
                              <Shield size={12} className="text-emerald-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-foreground truncate">{pos.name}</div>
                              <div className="text-[10px] text-muted-foreground">{pos.startTime} – {pos.endTime}</div>
                            </div>
                            {posAssignments.length > 0 && posAssignments[0]?.guard && (
                              <button
                                onClick={() => removeAssignment(posAssignments[0].id)}
                                className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600"
                                title="Click para remover"
                              >
                                {posAssignments[0].guard.firstName?.split(' ')[0]} ×
                              </button>
                            )}
                            {posAssignments.length === 0 && (
                              <button
                                onClick={() => openAssignForm(pos.stationId, pos.id)}
                                className="p-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition-colors"
                                title="Asignar vigilante sacafranco"
                              >
                                <Plus size={12} />
                              </button>
                            )}
                          </div>

                          {/* Day cells — gap-driven chain preview (same for assigned/unassigned) */}
                          {monthDays.map((day, dayIdx) => {
                            const dateStr = fmtDate(day);
                            const isToday = dateStr === todayStr;
                            const isSunday = day.getDay() === 0;
                            const assigned = posAssignments.length > 0;
                            const cov = sfPreview.get(`${pos.id}-${dateStr}`);
                            const cellBase = `border-r border-border/10 last:border-r-0 px-0.5 py-0.5 min-h-[44px] ${isToday ? 'bg-[#C8860A]/3' : ''} ${isSunday ? 'bg-red-500/3' : ''}`;

                            if (!cov) {
                              // Rest day (no gap for this SF). Unassigned → clickable to assign.
                              return (
                                <div key={dayIdx} className={cellBase}>
                                  <div
                                    className={`h-[20px] rounded flex items-center justify-center ${assigned ? 'bg-muted/30' : 'bg-muted/20 border border-dashed border-border/30 cursor-pointer'}`}
                                    onClick={assigned ? undefined : () => openAssignForm(pos.stationId, pos.id)}
                                  >
                                    <span className="text-[10px] font-bold text-muted-foreground/50">L</span>
                                  </div>
                                </div>
                              );
                            }

                            const code = cov.half === 'night' ? 'N' : 'D';
                            const stName = stationsById.get(cov.stationId)?.stationName?.slice(0, 3) || '';
                            const bg = cov.half === 'night' ? 'bg-indigo-500/15' : 'bg-emerald-500/15';
                            const textColor = cov.half === 'night' ? 'text-indigo-400' : 'text-emerald-500';
                            return (
                              <div key={dayIdx} className={cellBase}>
                                <div
                                  className={`h-[20px] rounded flex flex-col items-center justify-center ${bg} ${assigned ? '' : 'border border-dashed border-border/30 cursor-pointer'}`}
                                  title={`Cubre: ${stationsById.get(cov.stationId)?.stationName || ''}`}
                                  onClick={assigned ? undefined : () => openAssignForm(pos.stationId, pos.id)}
                                >
                                  <span className={`text-[10px] font-bold ${textColor}`}>{code}</span>
                                  {stName && <span className="text-[7px] text-muted-foreground leading-none">{stName}</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Unassigned Guards Pool */}
            <div className="bg-card border border-border/40 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users size={16} className="text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Vigilantes disponibles</h3>
                <span className="text-xs text-muted-foreground">({unassignedGuards.length})</span>
              </div>
              {unassignedGuards.length === 0 ? (
                <p className="text-xs text-muted-foreground">Todos los vigilantes están asignados.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {unassignedGuards.map(g => (
                    <div
                      key={g.id}
                      className="px-3 py-1.5 rounded-lg bg-muted/30 border border-border/30 text-xs font-medium text-foreground cursor-grab hover:border-[#C8860A]/40 hover:bg-[#C8860A]/5 transition-all active:cursor-grabbing"
                      draggable
                      onDragStart={(e) => { e.dataTransfer.setData('guardId', g.id); }}
                    >
                      {g.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sacafrancos Panel */}
            {sacafrancoData.length > 0 && (
              <div className="bg-card border border-emerald-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={16} className="text-emerald-500" />
                  <h3 className="text-sm font-semibold text-foreground">Sacafrancos</h3>
                  <span className="text-xs text-muted-foreground">({sacafrancoData.length})</span>
                </div>
                <div className="space-y-3">
                  {sacafrancoData.map(sf => {
                    const name = sf.guard ? `${sf.guard.firstName || ''} ${sf.guard.lastName || ''}`.trim() : '?';
                    const availDays = sf.availability.filter(a => a.status === 'available').length;
                    const coverDays = sf.availability.filter(a => a.status === 'covering').length;
                    const stationsCovering = [...new Set(sf.assignments.map(a => stations.find(s => s.id === a.stationId)?.stationName).filter(Boolean))];

                    return (
                      <div key={sf.guard?.id || Math.random()} className="border border-border/30 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">{name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-medium">{availDays} disp</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-medium">{coverDays} cubre</span>
                          </div>
                        </div>
                        {stationsCovering.length > 0 && (
                          <div className="text-[10px] text-muted-foreground">
                            Cubre: {stationsCovering.join(', ')}
                          </div>
                        )}
                        {/* Monthly summary */}
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 border border-amber-500/30">
                            {sf.availability.filter(a => a.status === 'covering').length}d cubriendo
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-dashed border-emerald-500/30">
                            {sf.availability.filter(a => a.status === 'available').length}d disponible
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            </div>
          </div>
          </>
        )}
      </PageContainer>

      {/* ─── Assignment Modal ─────────────────────────────────────────────── */}
      {showAssignForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAssignForm(false)}>
          <div className="bg-card border border-border/30 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border/20 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">Asignar Vigilante a Posición</h4>
              <button onClick={() => setShowAssignForm(false)} className="p-1.5 rounded-lg hover:bg-muted/30 text-muted-foreground"><X size={15} /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Position info */}
              {assignTarget && (() => {
                const pos = positions.find(p => p.id === assignTarget.positionId);
                const st = stations.find(s => s.id === assignTarget.stationId);
                if (!pos || !st) return null;
                const colors = POSITION_COLORS[pos.type] || POSITION_COLORS.fijo;
                return (
                  <div className={`px-3 py-2 rounded-xl border ${colors.border} ${colors.bg}`}>
                    <div className={`text-xs font-semibold ${colors.text}`}>{st.stationName} <ArrowRight className="inline h-3 w-3" /> {pos.name}</div>
                    <div className="text-[10px] text-muted-foreground">{pos.startTime} – {pos.endTime}</div>
                  </div>
                );
              })()}

              {/* Guard */}
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Vigilante</label>
                {(() => {
                  // A vigilante can hold only ONE active rotation (fijo OR sacafranco).
                  // Drop everyone already assigned from the options so it's impossible
                  // to pick an occupied vigilante.
                  const occupiedIds = new Set(assignments.map(a => a.guardId));
                  const availableGuards = guardsPool.filter(g => !occupiedIds.has(g.id));

                  return (
                    <select value={assignGuard} onChange={e => setAssignGuard(e.target.value)} className="w-full px-3 py-2.5 border border-border/40 rounded-xl text-sm bg-background focus:ring-2 focus:ring-[#C8860A]/20 focus:border-[#C8860A] transition-all outline-none">
                      <option value="">Seleccionar vigilante...</option>
                      {availableGuards.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                      {availableGuards.length === 0 && <option value="" disabled>Todos los vigilantes ya están asignados</option>}
                    </select>
                  );
                })()}
                {positions.find(p => p.id === assignTarget?.positionId)?.type === 'sacafranco' && (
                  <p className="text-[10px] text-emerald-600 mt-1">Sacafranco: puede cubrir múltiples estaciones</p>
                )}
                {positions.find(p => p.id === assignTarget?.positionId)?.type === 'fijo' && (
                  <p className="text-[10px] text-amber-600 mt-1">Fijo: exclusivo a esta estación</p>
                )}
              </div>

              {/* The patrón de rotación is set on the STATION (Sitios › Estación ›
                  Horario del turno) and inherited here — not chosen per guard. */}
              {(() => {
                const st = stationsById.get(assignTarget?.stationId || '');
                const rot = st?.rotationStyleId ? rotationStylesById.get(st.rotationStyleId) : null;
                return (
                  <div className="rounded-lg border border-border/40 bg-muted/10 px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">
                      Patrón de rotación: <span className="font-semibold text-foreground">{rot?.name || 'el de la estación'}</span> · se hereda de la estación.
                    </p>
                  </div>
                );
              })()}

              {/* No start date: the rotation phase comes from the station position
                  (staggered day/night), not a date. Shifts begin today. */}
            </div>
            <div className="px-5 py-3 border-t border-border/20 flex items-center justify-end gap-2">
              <button onClick={() => setShowAssignForm(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-all">Cancelar</button>
              <button onClick={saveAssignment} disabled={assignSaving || !assignGuard} className="px-5 py-2 bg-[#C8860A] text-white rounded-xl text-sm font-semibold hover:bg-[#B37809] disabled:opacity-40 transition-all shadow-sm">
                {assignSaving ? <Loader2 size={14} className="animate-spin" /> : 'Asignar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Configure Station Modal ─────────────────────────────────────── */}
      {configStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setConfigStation(null)}>
          <div className="bg-card border border-border/30 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border/20 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">Configurar: {configStation.stationName}</h4>
              <button onClick={() => setConfigStation(null)} className="p-1.5 rounded-lg hover:bg-muted/30 text-muted-foreground"><X size={15} /></button>
            </div>
            <div className="p-5 space-y-4">
              <label className="block text-[11px] font-medium text-muted-foreground mb-2 uppercase tracking-wide">Tipo de cobertura</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: '24h', label: '24 Horas', desc: 'Fijo 1 + Fijo 2 + Sacafranco' },
                  { value: '12h-day', label: '12h Diurno', desc: 'Fijo 1 (día) + Sacafranco' },
                  { value: '12h-night', label: '12h Nocturno', desc: 'Fijo 1 (noche) + Sacafranco' },
                  { value: 'custom', label: 'Personalizado', desc: 'Rotación custom (días/noches/libre)' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setConfigType(opt.value); setConfigRotation(''); }}
                    className={`p-3 rounded-xl border text-left transition-all ${configType === opt.value ? 'bg-[#C8860A]/10 border-[#C8860A]' : 'border-border/40 hover:border-border'}`}
                  >
                    <div className={`text-sm font-medium ${configType === opt.value ? 'text-[#C8860A]' : 'text-foreground'}`}>{opt.label}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>

              {configType !== 'custom' && (
                <>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-2 uppercase tracking-wide">Estilo de rotación</label>
                  <div className="grid grid-cols-3 gap-2">
                    {filteredRotationStyles.map(r => (
                      <button
                        key={r.id}
                        onClick={() => setConfigRotation(r.id)}
                        className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all relative ${configRotation === r.id ? 'bg-[#C8860A]/10 border-[#C8860A] text-[#C8860A]' : r.id === recommendedRotationId ? 'border-emerald-500/50 text-emerald-600 bg-emerald-500/5' : 'border-border/40 text-muted-foreground hover:border-border'}`}
                      >
                        {r.name}
                        {r.id === recommendedRotationId && <span className="absolute -top-1.5 -right-1 text-[7px] bg-emerald-500 text-white px-1 rounded">REC</span>}
                      </button>
                    ))}
                  </div>
                  {configRotation && (() => {
                    const rot = rotationStyles.find(r => r.id === configRotation);
                    if (!rot) return null;
                    return (
                      <p className="text-[11px] text-muted-foreground">
                        {rot.nightShifts > 0
                          ? `${rot.dayShifts} días, ${rot.nightShifts} noches, ${rot.restDays} descanso`
                          : `${rot.dayShifts} días trabajo, ${rot.restDays} descanso`
                        }
                      </p>
                    );
                  })()}
                </>
              )}
              {configType === 'custom' && (
                <>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-2 uppercase tracking-wide">Rotación personalizada</label>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-muted-foreground mb-1">Días</label>
                      <input type="number" min={0} max={30} value={customDays} onChange={e => setCustomDays(Number(e.target.value))} className="w-full px-3 py-2 border border-border/40 rounded-lg text-sm bg-background text-center focus:ring-2 focus:ring-[#C8860A]/20 focus:border-[#C8860A] outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted-foreground mb-1">Noches</label>
                      <input type="number" min={0} max={30} value={customNights} onChange={e => setCustomNights(Number(e.target.value))} className="w-full px-3 py-2 border border-border/40 rounded-lg text-sm bg-background text-center focus:ring-2 focus:ring-[#C8860A]/20 focus:border-[#C8860A] outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted-foreground mb-1">Descanso</label>
                      <input type="number" min={0} max={30} value={customRest} onChange={e => setCustomRest(Number(e.target.value))} className="w-full px-3 py-2 border border-border/40 rounded-lg text-sm bg-background text-center focus:ring-2 focus:ring-[#C8860A]/20 focus:border-[#C8860A] outline-none" />
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {customNights > 0
                      ? `${customDays} días, ${customNights} noches, ${customRest} descanso`
                      : `${customDays} días trabajo, ${customRest} descanso`
                    }
                  </p>
                </>
              )}
            </div>
            <div className="px-5 py-3 border-t border-border/20 flex items-center justify-end gap-2">
              <button onClick={() => setConfigStation(null)} className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground">Cancelar</button>
              <button onClick={saveStationConfig} disabled={configSaving} className="px-5 py-2 bg-[#C8860A] text-white rounded-xl text-sm font-semibold hover:bg-[#B37809] disabled:opacity-40 transition-all shadow-sm">
                {configSaving ? <Loader2 size={14} className="animate-spin" /> : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Override Modal ───────────────────────────────────────────────── */}
      {overrideTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setOverrideTarget(null)}>
          <div className="bg-card border border-border/30 rounded-2xl shadow-2xl w-full max-w-xs mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border/20">
              <h4 className="text-sm font-semibold text-foreground">Registrar Novedad</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">{overrideTarget.guardName} — {overrideTarget.date}</p>
            </div>
            <div className="p-4 grid grid-cols-2 gap-2">
              {[
                { type: 'V', label: 'Vacaciones', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
                { type: 'PM', label: 'Permiso', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
                { type: 'F', label: 'Falta', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
                { type: 'L', label: 'Libre', color: 'bg-muted/40 text-muted-foreground border-border/40' },
                { type: 'D', label: 'Diurno', color: 'bg-sky-500/15 text-sky-500 border-sky-500/30' },
                { type: 'N', label: 'Nocturno', color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' },
                { type: '24', label: '24 Horas', color: 'bg-amber-500/15 text-amber-500 border-amber-500/30' },
              ].map(opt => (
                <button
                  key={opt.type}
                  onClick={() => saveOverride(opt.type)}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all hover:scale-105 ${opt.color}`}
                >
                  {opt.type} — {opt.label}
                </button>
              ))}
              {(() => {
                const existing = getOverride(overrideTarget.guardId, overrideTarget.date);
                if (!existing) return null;
                return (
                  <button
                    onClick={() => removeOverride(existing.id)}
                    className="col-span-2 px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all"
                  >
                    <X className="inline h-3.5 w-3.5 mr-1" />Quitar novedad actual ({existing.type})
                  </button>
                );
              })()}
            </div>
            <div className="px-5 py-3 border-t border-border/20 flex justify-end">
              <button onClick={() => setOverrideTarget(null)} className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-all">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Draft horario review/diff Modal ──────────────────────────────── */}
      {proposalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-card shadow-2xl border border-border/30 overflow-hidden">
            <div className="px-5 py-4 border-b border-border/20">
              <div className="flex items-center gap-2">
                {planData ? <CheckCircle2 size={18} className="text-emerald-600" /> : <FileText size={18} className="text-[#C8860A]" />}
                <h3 className="text-base font-bold text-foreground">{planData ? 'Plan de implementación' : 'Borrador de horario'}</h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {planData ? 'Horario publicado. Estos vigilantes fueron notificados de sus cambios.' : 'Revisa los cambios propuestos. Nada se aplica hasta que publiques.'}
              </p>
            </div>

            {planData ? (
              /* Implementation plan (post-publish): who was notified */
              <div className="flex-1 overflow-auto px-5 py-3">
                <div className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-emerald-700">
                  <Users size={16} />
                  <span className="text-sm font-semibold">
                    {(planData?.plan?.notifiedGuards ?? 0)} de {(planData?.plan?.totalGuards ?? planData?.items?.length ?? 0)} vigilantes notificados
                  </span>
                </div>
                {(planData?.items || []).length ? (
                  <div className="divide-y divide-border/20">
                    {(planData.items || []).map((it: any) => {
                      const ch: string[] = [];
                      if (it.added) ch.push(`+${it.added}`);
                      if (it.changed) ch.push(`~${it.changed}`);
                      if (it.removed) ch.push(`-${it.removed}`);
                      const ok = it.notifyStatus === 'sent';
                      return (
                        <div key={it.id || it.guardId} className="flex items-center gap-3 py-2">
                          <span className={`shrink-0 ${ok ? 'text-emerald-600' : 'text-muted-foreground'}`}>{ok ? <CheckCircle2 size={15} /> : <Clock size={15} />}</span>
                          <span className="min-w-0 flex-1 truncate text-sm text-foreground">{it.guardName || 'Vigilante'}</span>
                          <span className="shrink-0 font-mono text-xs text-muted-foreground">{ch.join(' ')}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">No hubo vigilantes afectados.</p>
                )}
              </div>
            ) : (
            <>
            {/* Summary counters */}
            {(() => {
              const s = proposalData?.proposal?.summary || {};
              const cards = [
                { label: 'Nuevos', value: s.added || 0, icon: <PlusIcon size={14} />, cls: 'text-emerald-600' },
                { label: 'Eliminados', value: s.removed || 0, icon: <MinusCircle size={14} />, cls: 'text-red-600' },
                { label: 'Modificados', value: s.changed || 0, icon: <RefreshCw size={14} />, cls: 'text-amber-600' },
                { label: 'Vigilantes afectados', value: s.guardsAffected || 0, icon: <Users size={14} />, cls: 'text-foreground' },
              ];
              return (
                <div className="grid grid-cols-4 gap-2 px-5 py-3 border-b border-border/20">
                  {cards.map((c) => (
                    <div key={c.label} className="rounded-xl border border-border/30 p-2 text-center">
                      <div className={`flex items-center justify-center gap-1 ${c.cls}`}>{c.icon}<span className="text-lg font-bold tabular-nums">{c.value}</span></div>
                      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{c.label}</div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Projected cost (req 5) */}
            {(() => {
              const cost = proposalData?.proposal?.summary?.cost;
              if (!cost) return null;
              const cur = cost.currency || 'USD';
              const money = (n: number) => `${cur} ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
              if (!cost.hasRate) {
                return (
                  <div className="px-5 py-2.5 border-b border-border/20 text-[11px] text-muted-foreground">
                    Configura la tarifa por hora en Nómina para ver el costo proyectado.
                  </div>
                );
              }
              const delta = Number(cost.delta || 0);
              const deltaCls = delta > 0 ? 'text-red-600' : delta < 0 ? 'text-emerald-600' : 'text-muted-foreground';
              return (
                <div className="flex items-center justify-between px-5 py-2.5 border-b border-border/20">
                  <div className="text-[11px] text-muted-foreground">
                    Costo proyectado <span className="text-muted-foreground/70">(30 días)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold tabular-nums text-foreground">{money(cost.projected)}</span>
                    <span className={`text-xs font-semibold tabular-nums ${deltaCls}`}>
                      {delta > 0 ? '+' : ''}{money(delta)}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Coverage (Phase 7): is every puesto covered? */}
            {(() => {
              const cov = proposalData?.proposal?.summary?.warnings?.coverage;
              if (!cov) return null;
              const ok = (cov.gapCount || 0) === 0;
              return (
                <div className="flex items-center justify-between px-5 py-2.5 border-b border-border/20">
                  <div className="flex items-center gap-2">
                    {ok ? <CheckCircle2 size={15} className="text-emerald-600" /> : <AlertTriangle size={15} className="text-red-600" />}
                    <span className="text-[11px] text-muted-foreground">Cobertura de puestos <span className="text-muted-foreground/70">(14 días)</span></span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className={`font-bold tabular-nums ${ok ? 'text-emerald-600' : 'text-red-600'}`}>{cov.coveredPct}%</span>
                    {(cov.gapCount || 0) > 0 && <span className="font-semibold text-red-600">{cov.gapCount} sin cubrir</span>}
                    {(cov.overstaffCount || 0) > 0 && <span className="text-amber-600">{cov.overstaffCount} sobre-cubierto</span>}
                  </div>
                </div>
              );
            })()}

            {/* Rest-rule + sacafranco warnings (reqs 3 & 9) */}
            {(() => {
              const w = proposalData?.proposal?.summary?.warnings;
              if (!w || (!w.total && !w.restViolations?.length && !w.doubleBookings?.length && !w.sfStyleInconsistencies?.length)) return null;
              const lines: string[] = [];
              if (w.doubleBookings?.length) lines.push(`${w.doubleBookings.length} vigilante(s) con doble asignación el mismo día`);
              if (w.restViolations?.length) lines.push(`${w.restViolations.length} vigilante(s) sin descanso semanal (más de ${w.maxConsecutiveAllowed || 7} días seguidos)`);
              if (w.sfStyleInconsistencies?.length) lines.push(`${w.sfStyleInconsistencies.length} sitio(s) con sacafrancos en estilos de turno distintos`);
              if (!lines.length) return null;
              return (
                <div className="px-5 py-2.5 border-b border-border/20">
                  <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-amber-700">
                    <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                    <div className="text-[11px] leading-relaxed">
                      <p className="font-semibold">Revisa antes de publicar:</p>
                      <ul className="list-disc pl-4">
                        {lines.map((l, i) => <li key={i}>{l}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Change list */}
            <div className="flex-1 overflow-auto px-5 py-3">
              {(() => {
                const changes = (proposalData?.changes || []).filter((c: any) => c.action !== 'keep');
                if (!changes.length) {
                  return (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <CheckCircle2 size={28} className="text-emerald-600 mb-2" />
                      <p className="text-sm font-medium text-foreground">El horario ya está al día</p>
                      <p className="text-xs text-muted-foreground">No hay cambios que aplicar.</p>
                    </div>
                  );
                }
                const fmt = (d: string) => {
                  try { return new Date(d).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return d; }
                };
                const badge: Record<string, string> = {
                  add: 'bg-emerald-500/10 text-emerald-600',
                  remove: 'bg-red-500/10 text-red-600',
                  change: 'bg-amber-500/10 text-amber-600',
                };
                const label: Record<string, string> = { add: 'Nuevo', remove: 'Eliminar', change: 'Cambio' };
                return (
                  <div className="divide-y divide-border/20">
                    {changes.slice(0, 300).map((c: any) => (
                      <div key={c.id} className="flex items-center gap-3 py-2">
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${badge[c.action] || 'bg-muted text-foreground'}`}>{label[c.action] || c.action}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-foreground">{fmt(c.startTime)} {c.meta?.shiftType ? `· ${c.meta.shiftType === 'night' ? 'Nocturno' : c.meta.shiftType === 'day' ? 'Diurno' : c.meta.shiftType}` : ''}</p>
                        </div>
                      </div>
                    ))}
                    {changes.length > 300 && (
                      <p className="py-2 text-center text-[11px] text-muted-foreground">+{changes.length - 300} cambios más…</p>
                    )}
                  </div>
                );
              })()}
            </div>
            </>
            )}

            <div className="px-5 py-3 border-t border-border/20 flex items-center justify-between gap-3">
              {planData ? (
                <button onClick={closeProposalModal} className="ml-auto px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#C8860A] hover:bg-[#B37809] transition-all shadow-sm">Listo</button>
              ) : (
                <>
                  <button onClick={discardProposal} disabled={publishing} className="px-4 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-500/10 disabled:opacity-50 transition-all flex items-center gap-1.5">
                    <Trash2 size={14} /> Descartar
                  </button>
                  {(() => {
                    const gaps = proposalData?.proposal?.summary?.warnings?.coverage?.gapCount || 0;
                    const hasGaps = gaps > 0;
                    return (
                      <button
                        onClick={() => publishProposal(hasGaps)}
                        disabled={publishing}
                        className={`px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all shadow-sm flex items-center gap-2 ${hasGaps ? 'bg-red-600 hover:bg-red-700' : 'bg-[#C8860A] hover:bg-[#B37809]'}`}
                      >
                        {publishing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        {publishing ? 'Publicando...' : hasGaps ? 'Publicar con faltantes' : 'Publicar y aplicar'}
                      </button>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
