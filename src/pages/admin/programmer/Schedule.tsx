import { useState, useEffect, useMemo, useCallback } from "react";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Users, X, Loader2, Clock, Moon, Sun, Shield } from "lucide-react";
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
  type: 'day' | 'night' | 'relief';
  startTime: string;
  endTime: string;
  guardsNeeded: number;
  sortOrder: number;
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

// ─── Constants ──────────────────────────────────────────────────────────────

const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const POSITION_COLORS: Record<string, { bg: string; border: string; text: string; icon: any }> = {
  day: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-600', icon: Sun },
  night: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400', icon: Moon },
  relief: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-500', icon: Shield },
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
  const [rotationStyles, setRotationStyles] = useState<RotationStyle[]>([]);
  const [guardsPool, setGuardsPool] = useState<GuardOption[]>([]);
  const [loading, setLoading] = useState(true);

  // View state
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Assignment form
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignTarget, setAssignTarget] = useState<{ stationId: string; positionId: string } | null>(null);
  const [assignGuard, setAssignGuard] = useState('');
  const [assignRotation, setAssignRotation] = useState('');
  const [assignStartDate, setAssignStartDate] = useState('');
  const [assignOffset, setAssignOffset] = useState(0);
  const [assignSaving, setAssignSaving] = useState(false);

  // Configure station form
  const [configStation, setConfigStation] = useState<Station | null>(null);
  const [configType, setConfigType] = useState('24h');
  const [configSaving, setConfigSaving] = useState(false);

  // ─── Data Loading ─────────────────────────────────────────────────────────

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentDate);
      d.setDate(currentDate.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  const startDateStr = weekDays[0].toISOString().slice(0, 10);
  const endDateStr = weekDays[6].toISOString().slice(0, 10);

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

  // Unassigned guards (not in any active assignment)
  const unassignedGuards = useMemo(() => {
    const assignedIds = new Set(assignments.map(a => a.guardId));
    return guardsPool.filter(g => !assignedIds.has(g.id));
  }, [guardsPool, assignments]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const openAssignForm = (stationId: string, positionId: string) => {
    setAssignTarget({ stationId, positionId });
    setAssignGuard('');
    setAssignRotation(rotationStyles[0]?.id || '');
    setAssignStartDate(new Date().toISOString().slice(0, 10));
    setAssignOffset(0);
    setShowAssignForm(true);
  };

  const handleDrop = (e: React.DragEvent, stationId: string, positionId: string) => {
    e.preventDefault();
    const guardId = e.dataTransfer.getData('guardId');
    if (!guardId) return;
    setAssignTarget({ stationId, positionId });
    setAssignGuard(guardId);
    setAssignRotation(rotationStyles[0]?.id || '');
    setAssignStartDate(new Date().toISOString().slice(0, 10));
    setAssignOffset(0);
    setShowAssignForm(true);
  };

  const saveAssignment = async () => {
    if (!assignTarget || !assignGuard || !assignRotation || !assignStartDate) {
      toast.error('Complete todos los campos');
      return;
    }
    setAssignSaving(true);
    try {
      await ApiService.post(`/tenant/${tenantId}/guard-assignment`, {
        data: {
          guardId: assignGuard,
          stationId: assignTarget.stationId,
          positionId: assignTarget.positionId,
          rotationStyleId: assignRotation,
          startDate: assignStartDate,
          platoonOffset: assignOffset,
          isRelief: positions.find(p => p.id === assignTarget.positionId)?.type === 'relief',
        },
      });
      toast.success('Guardia asignado con rotación');
      setShowAssignForm(false);
      fetchAll();
    } catch (e: any) {
      toast.error(e?.message || 'Error al asignar');
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
  };

  const saveStationConfig = async () => {
    if (!configStation) return;
    setConfigSaving(true);
    try {
      await ApiService.post(`/tenant/${tenantId}/station/${configStation.id}/auto-positions`, {
        data: { scheduleType: configType },
      });
      toast.success('Posiciones configuradas');
      setConfigStation(null);
      fetchAll();
    } catch (e: any) {
      toast.error(e?.message || 'Error');
    } finally {
      setConfigSaving(false);
    }
  };

  const addPosition = async (stationId: string) => {
    try {
      await ApiService.post(`/tenant/${tenantId}/station/${stationId}/positions`, {
        data: { name: 'Sacafranco', type: 'relief', startTime: '07:00', endTime: '19:00', guardsNeeded: 1, sortOrder: 99 },
      });
      toast.success('Posición sacafranco agregada');
      fetchAll();
    } catch (e: any) {
      toast.error(e?.message || 'Error');
    }
  };

  // ─── Navigation ───────────────────────────────────────────────────────────

  const nav = (dir: number) => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + dir * 7);
      return d;
    });
  };

  const goToday = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    setCurrentDate(d);
  };

  const weekLabel = useMemo(() => {
    const first = weekDays[0];
    const last = weekDays[6];
    const fmtD = (d: Date) => d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
    return `${fmtD(first)} – ${fmtD(last)}`;
  }, [weekDays]);

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
            <span className="text-sm font-medium text-foreground min-w-[150px] text-center">{weekLabel}</span>
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
          <div className="space-y-4">
            {/* Schedule Grid */}
            <div className="bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm overflow-x-auto">
              {/* Header row */}
              <div className="grid grid-cols-[240px_repeat(7,1fr)] min-w-[900px] border-b border-border/30 bg-muted/20">
                <div className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-r border-border/20">
                  Estación / Posición
                </div>
                {weekDays.map((day, i) => {
                  const isToday = day.toISOString().slice(0, 10) === todayStr;
                  return (
                    <div key={i} className={`px-2 py-3 text-center border-r border-border/20 last:border-r-0 ${isToday ? 'bg-[#C8860A]/5' : ''}`}>
                      <div className="text-[11px] font-medium text-muted-foreground uppercase">{DAYS_ES[i]}</div>
                      <div className={`text-sm font-semibold mt-0.5 ${isToday ? 'text-[#C8860A]' : 'text-foreground'}`}>
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
                    <div className="grid grid-cols-[240px_repeat(7,1fr)] min-w-[900px] bg-muted/10">
                      <div className="px-4 py-2.5 flex items-center gap-2 border-r border-border/20">
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
                          <button
                            onClick={() => addPosition(station.id)}
                            className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                            title="Agregar posición sacafranco"
                          >
                            <Plus size={14} />
                          </button>
                        )}
                      </div>
                      {weekDays.map((_, i) => (
                        <div key={i} className="border-r border-border/10 last:border-r-0" />
                      ))}
                    </div>

                    {/* Position rows */}
                    {stationPositions.map(pos => {
                      const posAssignments = getAssignmentsForPosition(pos.id);
                      const colors = POSITION_COLORS[pos.type] || POSITION_COLORS.day;
                      const Icon = colors.icon;

                      return (
                        <div key={pos.id} className="grid grid-cols-[240px_repeat(7,1fr)] min-w-[900px] border-t border-border/10">
                          {/* Position label */}
                          <div className="px-4 py-2 flex items-center gap-2 border-r border-border/20">
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
                              <button
                                onClick={() => openAssignForm(station.id, pos.id)}
                                className="p-1 rounded-md bg-[#C8860A]/10 hover:bg-[#C8860A]/20 text-[#C8860A] transition-colors"
                                title="Asignar guardia"
                              >
                                <Plus size={12} />
                              </button>
                            )}
                          </div>

                          {/* Day cells */}
                          {weekDays.map((day, dayIdx) => {
                            const dateStr = day.toISOString().slice(0, 10);
                            const isToday = dateStr === todayStr;

                            return (
                              <div
                                key={dayIdx}
                                className={`border-r border-border/10 last:border-r-0 px-0.5 py-0.5 min-h-[44px] ${isToday ? 'bg-[#C8860A]/3' : ''}`}
                                onDragOver={e => e.preventDefault()}
                                onDrop={e => handleDrop(e, station.id, pos.id)}
                              >
                                {posAssignments.length === 0 ? (
                                  <div className="w-full h-full min-h-[38px] rounded border border-dashed border-red-500/30 bg-red-500/5 flex items-center justify-center">
                                    <span className="text-[9px] text-red-400">SIN CUBRIR</span>
                                  </div>
                                ) : (
                                  <div className="space-y-0.5">
                                    {posAssignments.map(assignment => {
                                      const workStatus = isWorkDay(assignment, day);
                                      const guardName = assignment.guard
                                        ? `${assignment.guard.firstName || ''} ${assignment.guard.lastName || ''}`.trim()
                                        : '?';
                                      const initials = guardName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                                      const color = guardColorMap[assignment.guardId] || '#666';

                                      if (workStatus === 'rest') {
                                        return (
                                          <div key={assignment.id} className="h-[20px] rounded bg-muted/20 flex items-center justify-center" title={`${guardName} — Descanso`}>
                                            <span className="text-[9px] text-muted-foreground/40">—</span>
                                          </div>
                                        );
                                      }

                                      return (
                                        <div
                                          key={assignment.id}
                                          className="h-[20px] rounded flex items-center gap-0.5 px-1"
                                          style={{ backgroundColor: `${color}20`, borderLeft: `2px solid ${color}` }}
                                          title={`${guardName} — ${workStatus === 'day' ? 'Diurno' : 'Nocturno'} (${pos.startTime}-${pos.endTime})`}
                                        >
                                          <span className="text-[9px] font-bold" style={{ color }}>{initials}</span>
                                          {workStatus === 'night' && <Moon size={8} className="text-indigo-400 ml-auto" />}
                                          {workStatus === 'day' && <Sun size={8} className="text-amber-500 ml-auto" />}
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
                      <div className="grid grid-cols-[240px_repeat(7,1fr)] min-w-[900px] border-t border-border/10">
                        <div className="col-span-8 px-4 py-4 text-center">
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
                const colors = POSITION_COLORS[pos.type] || POSITION_COLORS.day;
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
                <select value={assignGuard} onChange={e => setAssignGuard(e.target.value)} className="w-full px-3 py-2.5 border border-border/40 rounded-xl text-sm bg-background focus:ring-2 focus:ring-[#C8860A]/20 focus:border-[#C8860A] transition-all outline-none">
                  <option value="">Seleccionar guardia...</option>
                  {guardsPool.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                </select>
              </div>

              {/* Rotation Style */}
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Estilo de rotación</label>
                <div className="grid grid-cols-3 gap-2">
                  {rotationStyles.map(r => (
                    <button
                      key={r.id}
                      onClick={() => setAssignRotation(r.id)}
                      className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all ${assignRotation === r.id ? 'bg-[#C8860A]/10 border-[#C8860A] text-[#C8860A]' : 'border-border/40 text-muted-foreground hover:border-border'}`}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
                {assignRotation && (() => {
                  const rot = rotationStyles.find(r => r.id === assignRotation);
                  if (!rot) return null;
                  return (
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      {rot.nightShifts > 0
                        ? `${rot.dayShifts} días, ${rot.nightShifts} noches, ${rot.restDays} descanso`
                        : `${rot.dayShifts} días trabajo, ${rot.restDays} descanso`
                      }
                    </p>
                  );
                })()}
              </div>

              {/* Start date */}
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Fecha inicio rotación</label>
                <input type="date" value={assignStartDate} onChange={e => setAssignStartDate(e.target.value)} className="w-full px-3 py-2.5 border border-border/40 rounded-xl text-sm bg-background focus:ring-2 focus:ring-[#C8860A]/20 focus:border-[#C8860A] transition-all outline-none" />
              </div>

              {/* Platoon offset */}
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Offset de platón (días)</label>
                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setAssignOffset(n)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium border transition-all ${assignOffset === n ? 'bg-[#C8860A]/10 border-[#C8860A] text-[#C8860A]' : 'border-border/40 text-muted-foreground hover:border-border'}`}
                    >{n}</button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Desfase para que guardias en la misma posición no descansen al mismo tiempo</p>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-border/20 flex items-center justify-end gap-2">
              <button onClick={() => setShowAssignForm(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-all">Cancelar</button>
              <button onClick={saveAssignment} disabled={assignSaving || !assignGuard || !assignRotation} className="px-5 py-2 bg-[#C8860A] text-white rounded-xl text-sm font-semibold hover:bg-[#B37809] disabled:opacity-40 transition-all shadow-sm">
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
                  { value: '24h', label: '24 Horas', desc: 'Diurno + Nocturno + Sacafranco' },
                  { value: '12h-day', label: '12h Diurno', desc: 'Solo turno de día + Sacafranco' },
                  { value: '12h-night', label: '12h Nocturno', desc: 'Solo turno de noche + Sacafranco' },
                  { value: 'custom', label: 'Personalizado', desc: 'Horario custom' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setConfigType(opt.value)}
                    className={`p-3 rounded-xl border text-left transition-all ${configType === opt.value ? 'bg-[#C8860A]/10 border-[#C8860A]' : 'border-border/40 hover:border-border'}`}
                  >
                    <div className={`text-sm font-medium ${configType === opt.value ? 'text-[#C8860A]' : 'text-foreground'}`}>{opt.label}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
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
    </AppLayout>
  );
}
