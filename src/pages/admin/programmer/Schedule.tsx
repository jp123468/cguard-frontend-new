import { useState, useEffect, useMemo, useCallback } from "react";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Users, X, Loader2, Clock, Shield, Sparkles, Zap, Sun, Moon } from "lucide-react";
import Breadcrumb from "@/components/ui/breadcrumb";
import { ApiService } from "@/services/api/apiService";
import { toast } from "sonner";

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
  const [assignStartDate, setAssignStartDate] = useState('');
  const [assignOffset, setAssignOffset] = useState(0);
  const [assignRotation, setAssignRotation] = useState('');
  const [assignSaving, setAssignSaving] = useState(false);

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

  const startDateStr = monthDays[0].toISOString().slice(0, 10);
  const endDateStr = monthDays[monthDays.length - 1].toISOString().slice(0, 10);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, rotRes, guardsRes] = await Promise.all([
        ApiService.get(`/tenant/${tenantId}/scheduler/overview?startDate=${startDateStr}&endDate=${endDateStr}`),
        ApiService.get(`/tenant/${tenantId}/rotation-styles`),
        ApiService.get(`/tenant/${tenantId}/security-guard/autocomplete?limit=200`),
      ]);

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
    } catch (e: any) {
      console.error('[Scheduler] fetch error', e);
      toast.error('Error al cargar horario');
    } finally {
      setLoading(false);
    }
  }, [tenantId, startDateStr, endDateStr]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const getPositionsForStation = (stationId: string) =>
    positions.filter(p => p.stationId === stationId);

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

  // Check if a guard works on a given date based on rotation
  const isWorkDay = (assignment: GuardAssignment, date: Date): 'day' | 'night' | 'rest' => {
    const rot = assignment.rotationStyle;
    if (!rot) return 'rest';

    // For sacafranco positions, check if any fijo guard at the same station is resting
    const pos = positions.find(p => p.id === assignment.positionId);
    if (pos?.type === 'sacafranco' || assignment.isRelief) {
      // Sacafranco follows its OWN rotation: D/N/L — independent of fijo coverage
      const sfCycle = rot.dayShifts + rot.nightShifts + rot.restDays;
      if (sfCycle === 0) return 'rest';
      const sfStart = new Date(assignment.startDate + 'T00:00:00');
      const target = new Date(date);
      target.setHours(0, 0, 0, 0);
      const sfDiff = Math.floor((target.getTime() - sfStart.getTime()) / (24 * 60 * 60 * 1000));
      if (sfDiff < 0) return 'rest';
      const sfAdj = ((sfDiff - (assignment.platoonOffset || 0)) % sfCycle + sfCycle) % sfCycle;
      if (sfAdj < rot.dayShifts) return 'day';
      if (sfAdj < rot.dayShifts + rot.nightShifts) return 'night';
      return 'rest';
    }

    // ─── FIJO LOGIC ─── Guard rotates D→N→L following the station rotation
    const cycleLength = rot.dayShifts + rot.nightShifts + rot.restDays;
    const start = new Date(assignment.startDate + 'T00:00:00');
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    const diffMs = target.getTime() - start.getTime();
    const daysSinceStart = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    if (daysSinceStart < 0) return 'rest';
    const adjustedDay = ((daysSinceStart - assignment.platoonOffset) % cycleLength + cycleLength) % cycleLength;
    if (adjustedDay < rot.dayShifts) return 'day';
    if (adjustedDay < rot.dayShifts + rot.nightShifts) return 'night';
    return 'rest';
  };

  // Compute the rotation slot status for a position (no guard needed)
  // Uses the station's rotation style and position sortOrder as default offset
  const getSlotStatus = (stationId: string, position: StationPosition, date: Date): 'day' | 'night' | 'rest' => {
    const station = stations.find(s => s.id === stationId);
    if (!station?.rotationStyleId) return 'rest';
    const rot = rotationStyles.find(r => r.id === station.rotationStyleId);
    if (!rot) return 'rest';

    const cycleLength = rot.dayShifts + rot.nightShifts + rot.restDays;
    if (cycleLength === 0) return 'rest';

    // Use Jan 1 of current year as epoch for consistent pattern display
    const epoch = new Date(date.getFullYear(), 0, 1);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    const diffMs = target.getTime() - epoch.getTime();
    const daysSinceEpoch = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    // Use position's platoonOffset (station-defined) to stagger positions
    const offset = position.platoonOffset ?? position.sortOrder ?? 0;
    const adjustedDay = ((daysSinceEpoch - offset) % cycleLength + cycleLength) % cycleLength;
    if (adjustedDay < rot.dayShifts) return 'day';
    if (adjustedDay < rot.dayShifts + rot.nightShifts) return 'night';
    return 'rest';
  };

  // Unassigned guards (not in any active assignment)
  const unassignedGuards = useMemo(() => {
    const assignedIds = new Set(assignments.map(a => a.guardId));
    return guardsPool.filter(g => !assignedIds.has(g.id));
  }, [guardsPool, assignments]);

  // Sacafranco availability: guards assigned to sacafranco positions + their D/N/L schedule
  const sacafrancoData = useMemo(() => {
    const reliefAssignments = assignments.filter(a => {
      const pos = positions.find(p => p.id === a.positionId);
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
      const rot = primaryAssignment?.rotationStyle;
      if (!rot) return;

      const sfCycle = rot.dayShifts + rot.nightShifts + rot.restDays;
      if (sfCycle === 0) return;

      const sfStart = new Date(primaryAssignment.startDate + 'T00:00:00');

      monthDays.forEach(day => {
        const target = new Date(day);
        target.setHours(0, 0, 0, 0);
        const sfDiff = Math.floor((target.getTime() - sfStart.getTime()) / (24 * 60 * 60 * 1000));
        if (sfDiff < 0) {
          data.availability.push({ date: day, status: 'available' });
          return;
        }
        const sfAdj = ((sfDiff - (primaryAssignment.platoonOffset || 0)) % sfCycle + sfCycle) % sfCycle;
        if (sfAdj >= rot.dayShifts + rot.nightShifts) {
          // Rest day
          data.availability.push({ date: day, status: 'available' });
        } else {
          // Work day — find which station has a fijo resting
          let coveringStation: string | undefined;
          for (const asgn of data.assignments) {
            const station = stations.find(s => s.id === asgn.stationId);
            const stationFijos = assignments.filter(ma =>
              ma.stationId === asgn.stationId && !ma.isRelief &&
              positions.find(p => p.id === ma.positionId)?.type === 'fijo'
            );
            for (const mainA of stationFijos) {
              const mainRot = mainA.rotationStyle;
              if (!mainRot) continue;
              const mainCycle = mainRot.dayShifts + mainRot.nightShifts + mainRot.restDays;
              const mainStart = new Date(mainA.startDate + 'T00:00:00');
              const daysSince = Math.floor((target.getTime() - mainStart.getTime()) / (24 * 60 * 60 * 1000));
              if (daysSince < 0) continue;
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
  }, [assignments, positions, stations, monthDays]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const openAssignForm = (stationId: string, positionId: string) => {
    setAssignTarget({ stationId, positionId });
    setAssignGuard('');
    setAssignStartDate(new Date().toISOString().slice(0, 10));
    setAssignOffset(0);
    setAssignRotation('');
    setShowAssignForm(true);
  };

  const handleDrop = (e: React.DragEvent, stationId: string, positionId: string) => {
    e.preventDefault();
    const guardId = e.dataTransfer.getData('guardId');
    if (!guardId) return;
    setAssignTarget({ stationId, positionId });
    setAssignGuard(guardId);
    setAssignStartDate(new Date().toISOString().slice(0, 10));
    setAssignOffset(0);
    setAssignRotation('');
    setShowAssignForm(true);
  };

  const saveAssignment = async () => {
    if (!assignTarget || !assignGuard || !assignStartDate) {
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
          ...(isSacafranco && assignRotation ? { rotationStyleId: assignRotation } : {}),
        },
      });
      toast.success('Guardia asignado con rotación');
      setShowAssignForm(false);
      fetchAll();
    } catch (e: any) {
      toast.error(e?.data?.message || e?.message || 'Error al asignar');
    } finally {
      setAssignSaving(false);
    }
  };

  const removeAssignment = async (assignmentId: string) => {
    if (!confirm('¿Remover esta asignación? Se eliminarán los turnos futuros generados.')) return;
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
  };

  const filteredRotationStyles = useMemo(() => {
    if (configType === '24h') return rotationStyles.filter(r => r.nightShifts > 0);
    if (configType === '12h-day' || configType === '12h-night') return rotationStyles.filter(r => r.nightShifts === 0);
    return [];
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
    if (!confirm('¿Eliminar esta posición?')) return;
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

  const runAutoAssign = async () => {
    if (!confirm('¿Asignar automáticamente guardias a todas las estaciones sin cubrir? Esto asigna guardias por cercanía, configura rotaciones y asigna sacafrancos.')) return;
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
    if (!confirm('¿Optimizar la rotación de sacafrancos? Esto regenerará los turnos de todos los sacafrancos para maximizar cobertura.')) return;
    setAutoAssigning(true);
    try {
      const res = await ApiService.post(`/tenant/${tenantId}/scheduler/optimize-sacafrancos`, { data: { rotationStyleId: assignRotation || undefined } });
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

  const todayStr = new Date().toISOString().slice(0, 10);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <Breadcrumb items={[{ label: "Panel de control", path: "/dashboard" }, { label: "Horario" }]} />

      <div className="p-4 lg:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-xl font-bold text-foreground">Programador de Horarios</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => nav(-1)}><ChevronLeft size={16} /></Button>
            <Button variant="outline" size="sm" onClick={goToday}>Hoy</Button>
            <span className="text-sm font-medium text-foreground min-w-[150px] text-center">{monthLabel}</span>
            <Button variant="outline" size="sm" onClick={() => nav(1)}><ChevronRight size={16} /></Button>
          </div>
        </div>

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
                  Asigna guardias automáticamente por cercanía, configura rotaciones óptimas y programa sacafrancos.
                </p>
                <button
                  onClick={runAutoAssign}
                  disabled={autoAssigning}
                  className="w-full px-4 py-2.5 bg-[#C8860A] text-white rounded-xl text-sm font-semibold hover:bg-[#B37809] disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  {autoAssigning ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                  {autoAssigning ? 'Asignando...' : 'Auto-asignar todo'}
                </button>
                {autoResult && (
                  <div className="mt-3 p-2 bg-background/60 rounded-lg space-y-1">
                    <div className="text-[11px] text-foreground font-medium">Resultado:</div>
                    <div className="text-[10px] text-muted-foreground">• {autoResult.titularesAssigned} titulares asignados</div>
                    <div className="text-[10px] text-muted-foreground">• {autoResult.sacafrancosAssigned} sacafrancos asignados</div>
                    <div className="text-[10px] text-muted-foreground">• {autoResult.unassignedRemaining} guardias sin asignar</div>
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
              </div>

              {/* Stats summary */}
              <div className="bg-card border border-border/40 rounded-xl p-4 space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Resumen</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-muted/20 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-foreground">{stations.length}</div>
                    <div className="text-[9px] text-muted-foreground">Estaciones</div>
                  </div>
                  <div className="bg-muted/20 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-foreground">{positions.length}</div>
                    <div className="text-[9px] text-muted-foreground">Posiciones</div>
                  </div>
                  <div className="bg-muted/20 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-[#C8860A]">{assignments.length}</div>
                    <div className="text-[9px] text-muted-foreground">Asignados</div>
                  </div>
                  <div className="bg-muted/20 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-emerald-500">{unassignedGuards.length}</div>
                    <div className="text-[9px] text-muted-foreground">Disponibles</div>
                  </div>
                </div>
                {/* Coverage */}
                {(() => {
                  const fijoPositions = positions.filter(p => p.type !== 'sacafranco');
                  const covered = fijoPositions.filter(p => assignments.some(a => a.positionId === p.id)).length;
                  const pct = fijoPositions.length > 0 ? Math.round((covered / fijoPositions.length) * 100) : 0;
                  return (
                    <div className="pt-2 border-t border-border/20">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground">Cobertura</span>
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
                  const isToday = day.toISOString().slice(0, 10) === todayStr;
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
                              <div className="text-[10px] text-muted-foreground">{pos.startTime} – {pos.endTime}</div>
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
                                  title="Asignar guardia"
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
                            const dateStr = day.toISOString().slice(0, 10);
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
                                        <div className={`h-[20px] rounded border border-dashed flex items-center justify-center cursor-pointer ${sfBg}`} title={`Sacafranco — ${sfCode} (sin guardia)`} onClick={() => openAssignForm(station.id, pos.id)}>
                                          <span className={`text-[10px] font-bold ${sfText}`}>{sfCode}</span>
                                        </div>
                                      );
                                    }
                                    // Fijo position: show D/N/L pattern
                                    if (slotStatus === 'rest') {
                                      return (
                                        <div className="h-[20px] rounded bg-muted/20 border border-dashed border-border/30 flex items-center justify-center cursor-pointer" title="Slot libre (sin guardia asignado)" onClick={() => openAssignForm(station.id, pos.id)}>
                                          <span className="text-[10px] font-bold text-muted-foreground/40">L</span>
                                        </div>
                                      );
                                    }
                                    const code = slotStatus === 'night' ? 'N' : 'D';
                                    const bg = slotStatus === 'night' ? 'bg-indigo-500/8 border-indigo-500/20' : 'bg-sky-500/8 border-sky-500/20';
                                    const textColor = slotStatus === 'night' ? 'text-indigo-400/50' : 'text-sky-500/50';
                                    return (
                                      <div className={`h-[20px] rounded border border-dashed flex items-center justify-center cursor-pointer ${bg}`} title={`Slot ${code} (sin guardia asignado — click para asignar)`} onClick={() => openAssignForm(station.id, pos.id)}>
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
                                      const is24h = pos.startTime === pos.endTime || (pos.startTime === '07:00' && pos.endTime === '07:00');

                                      if (workStatus === 'rest') {
                                        return (
                                          <div
                                            key={assignment.id}
                                            className="h-[20px] rounded bg-muted/30 flex items-center justify-center cursor-pointer hover:bg-muted/50"
                                            title={`${guardName} — Libre (click para novedad)`}
                                            onClick={() => setOverrideTarget({ guardId: assignment.guardId, guardName, date: dateStr, assignmentId: assignment.id })}
                                          >
                                            <span className="text-[10px] font-bold text-muted-foreground/50">L</span>
                                          </div>
                                        );
                                      }

                                      const code = is24h ? '24' : workStatus === 'night' ? 'N' : 'D';
                                      const bg = workStatus === 'night'
                                        ? 'bg-indigo-500/15'
                                        : is24h ? 'bg-amber-500/15' : 'bg-sky-500/15';
                                      const textColor = workStatus === 'night'
                                        ? 'text-indigo-400'
                                        : is24h ? 'text-amber-500' : 'text-sky-500';

                                      return (
                                        <div
                                          key={assignment.id}
                                          className={`h-[20px] rounded flex items-center justify-center cursor-pointer hover:opacity-80 ${bg}`}
                                          style={{ borderLeft: `2px solid ${color}` }}
                                          title={`${guardName} — ${code === 'N' ? 'Nocturno' : code === '24' ? '24 Horas' : 'Diurno'} (click para novedad)`}
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
            </div>

            {/* Unassigned Guards Pool */}
            <div className="bg-card border border-border/40 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users size={16} className="text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Guardias disponibles</h3>
                <span className="text-xs text-muted-foreground">({unassignedGuards.length})</span>
              </div>
              {unassignedGuards.length === 0 ? (
                <p className="text-xs text-muted-foreground">Todos los guardias están asignados.</p>
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
        )}
      </div>

      {/* ─── Assignment Modal ─────────────────────────────────────────────── */}
      {showAssignForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAssignForm(false)}>
          <div className="bg-card border border-border/30 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border/20 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">Asignar Guardia a Posición</h4>
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
                    <div className={`text-xs font-semibold ${colors.text}`}>{st.stationName} → {pos.name}</div>
                    <div className="text-[10px] text-muted-foreground">{pos.startTime} – {pos.endTime}</div>
                  </div>
                );
              })()}

              {/* Guard */}
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Guardia</label>
                {(() => {
                  const targetPos = positions.find(p => p.id === assignTarget?.positionId);
                  const isSacafranco = targetPos?.type === 'sacafranco';
                  // Fijo: filter out guards already assigned as fijo anywhere
                  // Sacafranco: show all guards (they float across stations)
                  const fijoAssignedIds = new Set(
                    assignments
                      .filter(a => !a.isRelief && positions.find(p => p.id === a.positionId)?.type === 'fijo')
                      .map(a => a.guardId)
                  );
                  const availableGuards = isSacafranco
                    ? guardsPool
                    : guardsPool.filter(g => !fijoAssignedIds.has(g.id));

                  return (
                    <select value={assignGuard} onChange={e => setAssignGuard(e.target.value)} className="w-full px-3 py-2.5 border border-border/40 rounded-xl text-sm bg-background focus:ring-2 focus:ring-[#C8860A]/20 focus:border-[#C8860A] transition-all outline-none">
                      <option value="">Seleccionar guardia...</option>
                      {availableGuards.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                      {!isSacafranco && fijoAssignedIds.size > 0 && (
                        <option disabled>── Ya asignados como Fijo ──</option>
                      )}
                      {!isSacafranco && guardsPool.filter(g => fijoAssignedIds.has(g.id)).map(g => (
                        <option key={g.id} value="" disabled>⛔ {g.label}</option>
                      ))}
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

              {/* Sacafranco rotation style (independent from station) */}
              {positions.find(p => p.id === assignTarget?.positionId)?.type === 'sacafranco' && (
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Rotación del Sacafranco</label>
                  <div className="grid grid-cols-3 gap-2">
                    {rotationStyles.map(r => (
                      <button
                        key={r.id}
                        onClick={() => setAssignRotation(r.id)}
                        className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all ${assignRotation === r.id ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600' : 'border-border/40 text-muted-foreground hover:border-border'}`}
                      >
                        {r.name}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Rotación propia del sacafranco (independiente de la estación)</p>
                </div>
              )}

              {/* Start date */}
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Fecha inicio rotación</label>
                <input type="date" value={assignStartDate} onChange={e => setAssignStartDate(e.target.value)} className="w-full px-3 py-2.5 border border-border/40 rounded-xl text-sm bg-background focus:ring-2 focus:ring-[#C8860A]/20 focus:border-[#C8860A] transition-all outline-none" />
              </div>

              {/* Offset is now auto-calculated from station position */}
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
                        className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all ${configRotation === r.id ? 'bg-[#C8860A]/10 border-[#C8860A] text-[#C8860A]' : 'border-border/40 text-muted-foreground hover:border-border'}`}
                      >
                        {r.name}
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
                    ✕ Quitar novedad actual ({existing.type})
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
    </AppLayout>
  );
}
