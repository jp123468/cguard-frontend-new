import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Clock, Users, Shield, Pencil, X, Check, Loader2, Plus, Trash2 } from 'lucide-react';
import { ApiService } from '@/services/api/apiService';
import { toast } from 'sonner';
import StationGeofencePolygon, { type PolyPoint } from '@/components/GoogleMap/StationGeofencePolygon';

type Props = { station: any; stationId: string; postSiteId: string };

const DAYS_OF_WEEK = [
  { key: 'lun', label: 'L', full: 'Lunes' },
  { key: 'mar', label: 'M', full: 'Martes' },
  { key: 'mie', label: 'X', full: 'Miércoles' },
  { key: 'jue', label: 'J', full: 'Jueves' },
  { key: 'vie', label: 'V', full: 'Viernes' },
  { key: 'sab', label: 'S', full: 'Sábado' },
  { key: 'dom', label: 'D', full: 'Domingo' },
];

const ALL_DAYS = DAYS_OF_WEEK.map(d => d.key);

const JORNADA_PRESETS = [
  { tipo: 'Matutina', startTime: '07:00', endTime: '19:00' },
  { tipo: 'Nocturna', startTime: '19:00', endTime: '07:00' },
  { tipo: '24h', startTime: '00:00', endTime: '00:00' },
  { tipo: 'Personalizada', startTime: '', endTime: '' },
];

const JORNADA_COLORS: Record<string, string> = {
  matutina:      'bg-amber-500/15 text-amber-500 border-amber-500/30',
  nocturna:      'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  sacafranco:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  '24h':         'bg-rose-500/15 text-rose-400 border-rose-500/30',
  personalizada: 'bg-muted text-foreground border-border',
};

interface Jornada {
  tipo: string;
  nombre?: string;
  startTime: string;
  endTime: string;
  guardsCount: string | number;
  days: string[]; // ['lun','mar','mie',...]
  _key?: string; // client-only stable React key; stripped before persisting
}

let _jornadaKeySeq = 0;
const nextJornadaKey = () => `j-${Date.now().toString(36)}-${(_jornadaKeySeq++).toString(36)}`;
// Persist jornadas without any client-only fields (keys prefixed with '_').
const serializeJornadas = (list: Jornada[]) =>
  JSON.stringify(list.map(({ _key, ...rest }) => rest));

export default function StationOverview({ station, stationId, postSiteId }: Props) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [jornadas, setJornadas] = useState<Jornada[]>([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [guardsCount, setGuardsCount] = useState('');

  // Sync state from station prop
  useEffect(() => {
    if (!station) return;
    // Parse stationSchedule
    let parsed: Jornada[] = [];
    try {
      const raw = station.stationSchedule;
      if (Array.isArray(raw)) parsed = raw;
      else if (raw && typeof raw === 'string' && raw.trim().startsWith('[')) parsed = JSON.parse(raw);
    } catch {}
    // Ensure each jornada has 'days' field and a stable client-only key
    parsed = parsed.map(j => ({
      ...j,
      days: j.days || [...ALL_DAYS],
      guardsCount: j.guardsCount || '1',
      _key: j._key || nextJornadaKey(),
    }));
    if (parsed.length === 0) {
      // Default from station fields
      parsed = [{
        tipo: 'Matutina',
        startTime: station.startingTimeInDay || '07:00',
        endTime: station.finishTimeInDay || '19:00',
        guardsCount: station.numberOfGuardsInStation || '1',
        days: [...ALL_DAYS],
        _key: nextJornadaKey(),
      }];
    }
    setJornadas(parsed);
    setStartTime(station.startingTimeInDay || '');
    setEndTime(station.finishTimeInDay || '');
    setGuardsCount(String(station.numberOfGuardsInStation || ''));
  }, [station]);

  if (!station) {
    return <div className="text-muted-foreground text-sm">No hay información del puesto</div>;
  }

  const name = station.name || station.stationName || '-';
  const lat = station.latitud || station.latitude || '';
  const lng = station.longitud || station.longitude || '';
  const assignedGuards = Array.isArray(station.assignedGuards) ? station.assignedGuards : [];

  // Polygon geofence editing for this (existing) station.
  const [polygon, setPolygon] = useState<PolyPoint[]>(
    Array.isArray(station.geofencePolygon) ? station.geofencePolygon : [],
  );
  const [savingPoly, setSavingPoly] = useState(false);
  const savePolygon = async () => {
    setSavingPoly(true);
    try {
      const tenantId = localStorage.getItem('tenantId') || '';
      await ApiService.put(`/tenant/${tenantId}/station/${stationId}`, {
        data: { geofencePolygon: polygon.length >= 3 ? polygon : null },
      });
      toast.success(polygon.length >= 3 ? 'Geocerca poligonal guardada' : 'Geocerca poligonal eliminada');
    } catch (e: any) {
      toast.error(e?.message || 'Error al guardar la geocerca');
    } finally {
      setSavingPoly(false);
    }
  };

  // Save
  const handleSave = async () => {
    setSaving(true);
    try {
      const tenantId = localStorage.getItem('tenantId') || '';
      // Compute main start/end from first jornada
      const mainStart = jornadas[0]?.startTime || startTime;
      const mainEnd = jornadas[0]?.endTime || endTime;
      const totalGuards = jornadas.reduce((sum, j) => sum + (parseInt(String(j.guardsCount)) || 1), 0);

      await ApiService.put(`/tenant/${tenantId}/station/${stationId}`, {
        data: {
          stationSchedule: serializeJornadas(jornadas),
          startingTimeInDay: mainStart,
          finishTimeInDay: mainEnd,
          numberOfGuardsInStation: String(totalGuards),
        },
      });
      // Reflect saved values in local display state instead of reloading the whole SPA.
      setStartTime(mainStart);
      setEndTime(mainEnd);
      setGuardsCount(String(totalGuards));
      toast.success('Horario actualizado');
      setEditing(false);
    } catch (e: any) {
      toast.error(e?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // Jornada CRUD
  const addJornada = () => {
    setJornadas([...jornadas, {
      tipo: 'Personalizada',
      startTime: '07:00',
      endTime: '19:00',
      guardsCount: '1',
      days: [...ALL_DAYS],
      _key: nextJornadaKey(),
    }]);
  };

  const removeJornada = (idx: number) => {
    setJornadas(jornadas.filter((_, i) => i !== idx));
  };

  const updateJornada = (idx: number, field: keyof Jornada, value: any) => {
    setJornadas(prev => prev.map((j, i) => i === idx ? { ...j, [field]: value } : j));
  };

  const toggleDay = (idx: number, day: string) => {
    setJornadas(prev => prev.map((j, i) => {
      if (i !== idx) return j;
      const days = j.days.includes(day) ? j.days.filter(d => d !== day) : [...j.days, day];
      return { ...j, days };
    }));
  };

  const setPresetDays = (idx: number, preset: 'all' | 'weekdays' | 'weekend') => {
    const map = {
      all: [...ALL_DAYS],
      weekdays: ['lun', 'mar', 'mie', 'jue', 'vie'],
      weekend: ['sab', 'dom'],
    };
    updateJornada(idx, 'days', map[preset]);
  };

  const applyPreset = (idx: number, preset: typeof JORNADA_PRESETS[0]) => {
    setJornadas(prev => prev.map((j, i) => i === idx ? {
      ...j,
      tipo: preset.tipo,
      startTime: preset.startTime || j.startTime,
      endTime: preset.endTime || j.endTime,
    } : j));
  };

  // ── READ MODE ──
  if (!editing) {
    return (
      <div className="space-y-4">
        <div className="bg-card border border-border/40 rounded-2xl p-6 relative">
          <button
            onClick={() => setEditing(true)}
            className="absolute top-4 right-4 p-2 rounded-xl bg-muted/20 hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-all"
            title="Editar horario"
          >
            <Pencil size={14} />
          </button>

          <h2 className="text-lg font-semibold text-foreground mb-4">{name}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Schedule */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#C8860A]/10 flex items-center justify-center flex-shrink-0">
                <Clock size={16} className="text-[#C8860A]" />
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1.5">Horario</div>
                <div className="space-y-2">
                  {jornadas.map((j, i) => {
                    const tipo = (j.tipo || '').toLowerCase();
                    const colorClass = JORNADA_COLORS[tipo] || JORNADA_COLORS.personalizada;
                    return (
                      <div key={i} className="space-y-1">
                        <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium ${colorClass}`}>
                          {j.tipo || j.nombre || 'Turno'}
                          <span className="font-mono opacity-70 ml-1.5">{j.startTime}–{j.endTime}</span>
                          {j.guardsCount && String(j.guardsCount) !== '1' && (
                            <span className="ml-1.5 opacity-60">×{j.guardsCount}</span>
                          )}
                        </span>
                        <div className="flex gap-0.5 ml-0.5">
                          {DAYS_OF_WEEK.map(d => (
                            <span
                              key={d.key}
                              className={`w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center ${
                                j.days?.includes(d.key)
                                  ? 'bg-[#C8860A]/15 text-[#C8860A]'
                                  : 'bg-muted/20 text-muted-foreground/30'
                              }`}
                            >
                              {d.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Guards count */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#C8860A]/10 flex items-center justify-center flex-shrink-0">
                <Users size={16} className="text-[#C8860A]" />
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Guardias requeridos</div>
                <div className="text-sm text-foreground font-semibold">
                  {jornadas.reduce((sum, j) => sum + (parseInt(String(j.guardsCount)) || 1), 0)}
                </div>
              </div>
            </div>

            {/* Location */}
            {(lat || lng) && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#C8860A]/10 flex items-center justify-center flex-shrink-0">
                  <MapPin size={16} className="text-[#C8860A]" />
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Ubicación</div>
                  <div className="text-sm text-foreground font-mono">{lat}, {lng}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Assigned guards */}
        {assignedGuards.length > 0 && (
          <div className="bg-card border border-border/40 rounded-2xl p-6">
            <h3 className="text-base font-semibold text-foreground mb-3">Guardias Asignados</h3>
            <ul className="divide-y divide-border/20">
              {assignedGuards.slice(0, 8).map((g: any, i: number) => {
                const gname = g.fullName || g.name || `${g.firstName || ''} ${g.lastName || ''}`.trim() || g.email || '-';
                return <li key={g.id || i} className="py-2 text-sm text-foreground">{gname}</li>;
              })}
            </ul>
            {assignedGuards.length > 8 && (
              <div className="text-xs text-muted-foreground mt-2">+{assignedGuards.length - 8} más</div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── EDIT MODE ──
  return (
    <div className="space-y-4">
      <div className="bg-card border border-[#C8860A]/20 rounded-2xl overflow-hidden shadow-lg">
        {/* Edit header */}
        <div className="px-6 py-4 border-b border-border/20 flex items-center justify-between bg-[#C8860A]/[0.03]">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Configurar horario</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Define los turnos y días de operación del puesto</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditing(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 bg-[#C8860A] text-white rounded-lg text-xs font-semibold hover:bg-[#B37809] disabled:opacity-50 transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Guardar
            </button>
          </div>
        </div>

        {/* Geocerca poligonal */}
        <div className="p-6 border-t border-border/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-[#C8860A]" />
              <h3 className="text-sm font-semibold text-foreground">Geocerca poligonal</h3>
            </div>
            <button
              onClick={savePolygon}
              disabled={savingPoly}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#C8860A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#B37809] disabled:opacity-50"
            >
              {savingPoly ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Guardar geocerca
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Define un polígono (3+ puntos) para validar la marcación por área en lugar del radio. Déjalo vacío para usar el radio.
          </p>
          <StationGeofencePolygon
            value={polygon}
            onChange={setPolygon}
            centerLat={Number(lat) || undefined}
            centerLng={Number(lng) || undefined}
          />
        </div>

        {/* Jornadas editor */}
        <div className="p-6 space-y-5">
          {jornadas.map((jornada, idx) => (
            <div key={jornada._key || idx} className="bg-muted/10 border border-border/30 rounded-xl p-4 space-y-4 relative group">
              {jornadas.length > 1 && (
                <button
                  onClick={() => removeJornada(idx)}
                  className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
              )}

              {/* Row 1: Type and times */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Tipo de turno</label>
                  <select
                    value={jornada.tipo}
                    onChange={(e) => {
                      const preset = JORNADA_PRESETS.find(p => p.tipo === e.target.value);
                      if (preset) applyPreset(idx, preset);
                      else updateJornada(idx, 'tipo', e.target.value);
                    }}
                    className="w-full px-3 py-2 border border-border/40 rounded-lg text-sm bg-background focus:ring-2 focus:ring-[#C8860A]/20 focus:border-[#C8860A] transition-all outline-none"
                  >
                    {JORNADA_PRESETS.map(p => (
                      <option key={p.tipo} value={p.tipo}>{p.tipo}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Hora inicio</label>
                  <input
                    type="time"
                    value={jornada.startTime}
                    onChange={(e) => updateJornada(idx, 'startTime', e.target.value)}
                    className="w-full px-3 py-2 border border-border/40 rounded-lg text-sm bg-background font-mono focus:ring-2 focus:ring-[#C8860A]/20 focus:border-[#C8860A] transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Hora fin</label>
                  <input
                    type="time"
                    value={jornada.endTime}
                    onChange={(e) => updateJornada(idx, 'endTime', e.target.value)}
                    className="w-full px-3 py-2 border border-border/40 rounded-lg text-sm bg-background font-mono focus:ring-2 focus:ring-[#C8860A]/20 focus:border-[#C8860A] transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Guardias</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={jornada.guardsCount}
                    onChange={(e) => updateJornada(idx, 'guardsCount', e.target.value)}
                    className="w-full px-3 py-2 border border-border/40 rounded-lg text-sm bg-background focus:ring-2 focus:ring-[#C8860A]/20 focus:border-[#C8860A] transition-all outline-none"
                  />
                </div>
              </div>

              {/* Row 2: Days of week */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Días de operación</label>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPresetDays(idx, 'all')}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                        jornada.days.length === 7 ? 'bg-[#C8860A]/15 text-[#C8860A]' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setPresetDays(idx, 'weekdays')}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                        jornada.days.length === 5 && !jornada.days.includes('sab') ? 'bg-[#C8860A]/15 text-[#C8860A]' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                      }`}
                    >
                      L-V
                    </button>
                    <button
                      onClick={() => setPresetDays(idx, 'weekend')}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                        jornada.days.length === 2 && jornada.days.includes('sab') ? 'bg-[#C8860A]/15 text-[#C8860A]' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                      }`}
                    >
                      S-D
                    </button>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {DAYS_OF_WEEK.map(d => (
                    <button
                      key={d.key}
                      onClick={() => toggleDay(idx, d.key)}
                      className={`w-10 h-10 rounded-xl text-xs font-bold flex flex-col items-center justify-center transition-all duration-150 ${
                        jornada.days.includes(d.key)
                          ? 'bg-[#C8860A] text-white shadow-sm shadow-[#C8860A]/20'
                          : 'bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                      }`}
                      title={d.full}
                    >
                      <span className="text-[11px]">{d.label}</span>
                      <span className="text-[7px] opacity-70 mt-[-1px]">{d.full.slice(0, 3)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Add jornada button */}
          <button
            onClick={addJornada}
            className="w-full py-3 border-2 border-dashed border-border/30 rounded-xl text-xs font-medium text-muted-foreground hover:border-[#C8860A]/30 hover:text-[#C8860A] transition-all flex items-center justify-center gap-1.5"
          >
            <Plus size={14} /> Agregar otro turno
          </button>
        </div>
      </div>
    </div>
  );
}
