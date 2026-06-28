import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Clock, Users, Pencil, Check, Loader2 } from 'lucide-react';
import { ApiService } from '@/services/api/apiService';
import { toast } from 'sonner';
import { confirmDialog } from '@/components/ui/confirmDialog';
import StationGeofencePolygon, { type PolyPoint } from '@/components/GoogleMap/StationGeofencePolygon';
import RotationStyleSelect from '@/components/schedule/RotationStyleSelect';
import { reverseGeocode } from '@/lib/geocodeClient';

type Props = { station: any; stationId: string; postSiteId: string };

// A station's "horario" = the scheduling engine's scheduleType, configured via
// /auto-positions (the same path Programador › Horario uses). The turno picker
// maps to scheduleType so assigned guards abide by the station's horario.
type TurnoType = 'diurno' | 'nocturno' | '24h' | 'custom';
const TURNO_LABELS: { key: TurnoType; label: string; sub: string }[] = [
  { key: 'diurno',   label: '12h Diurno',   sub: '07:00–19:00' },
  { key: 'nocturno', label: '12h Nocturno', sub: '19:00–07:00' },
  { key: '24h',      label: '24 Horas',     sub: 'Día + Noche' },
  { key: 'custom',   label: 'Personalizado', sub: 'Define las horas' },
];
function turnoToScheduleType(turno: TurnoType): '12h-day' | '12h-night' | '24h' | 'custom' {
  switch (turno) {
    case 'diurno': return '12h-day';
    case 'nocturno': return '12h-night';
    case '24h': return '24h';
    default: return 'custom';
  }
}
function scheduleTypeToTurno(st?: string | null): TurnoType | '' {
  switch (st) {
    case '12h-day': return 'diurno';
    case '12h-night': return 'nocturno';
    case '24h': return '24h';
    case 'custom': return 'custom';
    default: return '';
  }
}

export default function StationOverview({ station, stationId, postSiteId }: Props) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Per-station clock-in tolerance windows (minutes). Empty = use tenant default.
  const [clockInEarlyBufferMin, setClockInEarlyBufferMin] = useState('');
  const [clockInLateGraceMin, setClockInLateGraceMin] = useState('');

  // Station horario (turno) — drives scheduleType + positions via /auto-positions.
  const [turno, setTurno] = useState<TurnoType | ''>('');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [rotationStyleId, setRotationStyleId] = useState('');
  const [savingHorario, setSavingHorario] = useState(false);

  // Station LOCATION (coordinates the clock-in geofence uses). Editable here —
  // a station does NOT auto-inherit changes to the client/sitio address.
  const [editLat, setEditLat] = useState('');
  const [editLng, setEditLng] = useState('');
  const [savingLoc, setSavingLoc] = useState(false);
  const [siteLoc, setSiteLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [polygon, setPolygon] = useState<PolyPoint[]>([]);
  // Human-readable address for the station coords (reverse-geocoded for display).
  const [stationAddress, setStationAddress] = useState('');

  useEffect(() => {
    const la = station?.latitud ?? station?.latitude;
    const ln = station?.longitud ?? station?.longitude;
    if (la == null || ln == null || la === '' || ln === '') { setStationAddress(''); return; }
    let alive = true;
    reverseGeocode(la, ln)
      .then((r: any) => { if (alive) setStationAddress(r?.display_name || ''); })
      .catch(() => { /* keep coords fallback */ });
    return () => { alive = false; };
  }, [station?.latitud, station?.longitud, station?.latitude, station?.longitude]);

  // Load the parent sitio's coordinates (for the "Igual que el sitio" button).
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!postSiteId) return;
      try {
        const tenantId = localStorage.getItem('tenantId') || '';
        const res: any = await ApiService.get(`/tenant/${tenantId}/post-site/${postSiteId}`);
        const s = res?.data ?? res ?? {};
        const la = Number(s.latitud ?? s.latitude);
        const ln = Number(s.longitud ?? s.longitude);
        if (alive && Number.isFinite(la) && Number.isFinite(ln)) setSiteLoc({ lat: la, lng: ln });
      } catch { /* best-effort */ }
    })();
    return () => { alive = false; };
  }, [postSiteId]);

  // Sync state from station prop
  useEffect(() => {
    if (!station) return;
    setClockInEarlyBufferMin(
      station.clockInEarlyBufferMin === null || station.clockInEarlyBufferMin === undefined
        ? ''
        : String(station.clockInEarlyBufferMin),
    );
    setClockInLateGraceMin(
      station.clockInLateGraceMin === null || station.clockInLateGraceMin === undefined
        ? ''
        : String(station.clockInLateGraceMin),
    );
    setTurno(scheduleTypeToTurno(station.scheduleType));
    setCustomStart(station.startingTimeInDay || '');
    setCustomEnd(station.finishTimeInDay || '');
    setRotationStyleId(station.rotationStyleId || '');
    setEditLat(station.latitud != null && station.latitud !== '' ? String(station.latitud) : (station.latitude != null ? String(station.latitude) : ''));
    setEditLng(station.longitud != null && station.longitud !== '' ? String(station.longitud) : (station.longitude != null ? String(station.longitude) : ''));
    setPolygon(Array.isArray(station.geofencePolygon) ? station.geofencePolygon : []);
  }, [station]);

  if (!station) {
    return <div className="text-muted-foreground text-sm">No hay información del puesto</div>;
  }

  const name = station.name || station.stationName || '-';
  const lat = station.latitud || station.latitude || '';
  const lng = station.longitud || station.longitude || '';
  const assignedGuards = Array.isArray(station.assignedGuards) ? station.assignedGuards : [];

  // Save the clock-in tolerance windows. The turno (scheduleType) and location
  // each have their own save action below; this only persists the tolerance.
  const handleSave = async () => {
    setSaving(true);
    try {
      const tenantId = localStorage.getItem('tenantId') || '';
      await ApiService.put(`/tenant/${tenantId}/station/${stationId}`, {
        data: {
          // Empty input → null so the tenant Nómina default applies.
          clockInEarlyBufferMin: clockInEarlyBufferMin.trim() === '' ? null : Number(clockInEarlyBufferMin),
          clockInLateGraceMin: clockInLateGraceMin.trim() === '' ? null : Number(clockInLateGraceMin),
        },
      });
      toast.success('Tolerancia guardada');
      setEditing(false);
    } catch (e: any) {
      toast.error(e?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // Update the station's horario through the scheduling engine (same endpoint as
  // Programador › Horario). Reconfigures the turno positions + regenerates
  // shifts, so it only runs when the horario actually changed and after a
  // confirm (it clears existing assignments at this station).
  const updateHorario = async () => {
    if (!turno) { toast.error('Selecciona un turno'); return; }
    if (turno === 'custom' && (!customStart || !customEnd)) {
      toast.error('Define la hora de inicio y fin'); return;
    }
    const scheduleType = turnoToScheduleType(turno);
    const currentType = station.scheduleType || '';
    const unchangedType = scheduleType === currentType;
    const unchangedCustom = turno !== 'custom'
      || (customStart === (station.startingTimeInDay || '') && customEnd === (station.finishTimeInDay || ''));
    const unchangedRotation = (rotationStyleId || '') === (station.rotationStyleId || '');
    if (unchangedType && unchangedCustom && unchangedRotation) { toast.info('El horario no cambió'); return; }
    if (!(await confirmDialog({ message: 'Cambiar el horario reconfigura los puestos del turno. Si hay vigilantes asignados a esta estación, deberán reasignarse. ¿Continuar?', confirmText: 'Continuar' }))) return;
    setSavingHorario(true);
    try {
      const tenantId = localStorage.getItem('tenantId') || '';
      await ApiService.post(`/tenant/${tenantId}/station/${stationId}/auto-positions`, {
        data: {
          scheduleType,
          rotationStyleId: rotationStyleId || undefined,
          startTime: turno === 'custom' ? customStart : undefined,
          endTime: turno === 'custom' ? customEnd : undefined,
        },
      });
      toast.success('Horario actualizado. Los puestos del turno se reconfiguraron.');
    } catch (e: any) {
      toast.error(e?.message || 'Error al actualizar el horario');
    } finally {
      setSavingHorario(false);
    }
  };

  // Save the station's coordinates (the clock-in geofence center) AND the
  // polygon geofence together — one map, one save.
  const saveLocation = async () => {
    const latNum = Number(editLat);
    const lngNum = Number(editLng);
    if (!editLat.trim() || !editLng.trim() || !Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      toast.error('Define la ubicación: busca la dirección, usa la del sitio o arrastra el pin.');
      return;
    }
    setSavingLoc(true);
    try {
      const tenantId = localStorage.getItem('tenantId') || '';
      await ApiService.put(`/tenant/${tenantId}/station/${stationId}`, {
        data: {
          latitud: latNum,
          longitud: lngNum,
          geofencePolygon: polygon.length >= 3 ? polygon : null,
        },
      });
      toast.success('Ubicación y geocerca actualizadas');
    } catch (e: any) {
      toast.error(e?.message || 'Error al guardar la ubicación');
    } finally {
      setSavingLoc(false);
    }
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
            {/* Horario del turno — the scheduleType is the single source of truth */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Clock size={16} className="text-primary" />
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1.5">Horario del turno</div>
                {(() => {
                  const info = TURNO_LABELS.find((o) => o.key === scheduleTypeToTurno(station.scheduleType));
                  return info ? (
                    <span className="inline-flex items-center rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      {info.label}
                      <span className="font-mono opacity-70 ml-1.5">{info.sub}</span>
                    </span>
                  ) : (
                    <div className="text-sm text-muted-foreground">Sin configurar — edita para asignar el turno</div>
                  );
                })()}
              </div>
            </div>

            {/* Guards required — derived from the turno (24h ⇒ 2 fijos, else 1) */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users size={16} className="text-primary" />
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Fijos requeridos</div>
                <div className="text-sm text-foreground font-semibold">
                  {station.scheduleType === '24h' ? 2 : station.scheduleType ? 1 : '—'}
                </div>
              </div>
            </div>

            {/* Location */}
            {(lat || lng) && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MapPin size={16} className="text-primary" />
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Ubicación</div>
                  <div className="text-sm text-foreground">{stationAddress || `${lat}, ${lng}`}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Assigned guards */}
        {assignedGuards.length > 0 && (
          <div className="bg-card border border-border/40 rounded-2xl p-6">
            <h3 className="text-base font-semibold text-foreground mb-3">Vigilantes Asignados</h3>
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
      <div className="bg-card border border-primary/20 rounded-2xl overflow-hidden shadow-lg">
        {/* Edit header */}
        <div className="px-6 py-4 border-b border-border/20 flex items-center justify-between bg-primary/[0.03]">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Configurar puesto</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Turno, ubicación y tolerancia de marcación. "Guardar" aplica la tolerancia.</p>
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
              className="px-4 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Guardar
            </button>
          </div>
        </div>

        {/* Horario del turno — drives scheduleType + positions (engine source of truth) */}
        <div className="p-6 border-t border-border/30 space-y-3">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Horario del turno</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Define el turno del puesto. Los vigilantes asignados a esta estación seguirán este horario. También editable en Programador › Horario.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TURNO_LABELS.map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => setTurno(o.key)}
                className={`rounded-xl border px-3 py-2 text-left transition-all ${turno === o.key ? 'border-primary bg-primary/10' : 'border-border/40 hover:border-primary/40'}`}
              >
                <div className="text-xs font-semibold text-foreground">{o.label}</div>
                <div className="text-[10px] text-muted-foreground">{o.sub}</div>
              </button>
            ))}
          </div>
          {turno === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Hora inicio</label>
                <input type="time" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-full px-3 py-2 border border-border/40 rounded-lg text-sm bg-background font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Hora fin</label>
                <input type="time" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-full px-3 py-2 border border-border/40 rounded-lg text-sm bg-background font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
            </div>
          )}
          {turno && (
            <RotationStyleSelect scheduleType={turnoToScheduleType(turno)} value={rotationStyleId} onChange={setRotationStyleId} />
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-amber-600">Cambiar el horario reconfigura los puestos; los vigilantes asignados deberán reasignarse.</p>
            <button
              onClick={updateHorario}
              disabled={savingHorario}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {savingHorario ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Actualizar horario
            </button>
          </div>
        </div>

        {/* Ubicación y geocerca — ONE map: search the address / "igual que el sitio"
            to set where the guard clocks in, then draw the geofence on the same map. */}
        <div className="p-6 border-t border-border/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Ubicación y geocerca</h3>
            </div>
            <button
              onClick={saveLocation}
              disabled={savingLoc}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {savingLoc ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Guardar ubicación y geocerca
            </button>
          </div>
          <StationGeofencePolygon
            value={polygon}
            onChange={setPolygon}
            centerLat={editLat ? Number(editLat) : undefined}
            centerLng={editLng ? Number(editLng) : undefined}
            showLocation
            siteLocation={siteLoc}
            onCenterChange={(la, ln) => { setEditLat(String(la)); setEditLng(String(ln)); }}
          />
          <p className="text-[11px] text-muted-foreground font-mono">
            {editLat && editLng ? `Punto: ${Number(editLat).toFixed(6)}, ${Number(editLng).toFixed(6)}` : 'Sin coordenadas — busca la dirección o usa la del sitio.'}
          </p>
        </div>

        {/* Clock-in tolerance windows */}
        <div className="p-6 border-t border-border/30 space-y-3">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Tolerancia de marcación de entrada</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Minutos antes/después de la hora de inicio en que el vigilante puede marcar entrada. Vacío = usar el valor por defecto de la empresa.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Tolerancia de entrada anticipada (min)</label>
              <input
                type="number"
                min="0"
                max="240"
                value={clockInEarlyBufferMin}
                onChange={(e) => setClockInEarlyBufferMin(e.target.value)}
                placeholder="Por defecto"
                className="w-full px-3 py-2 border border-border/40 rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Tolerancia de entrada tardía (min)</label>
              <input
                type="number"
                min="0"
                max="240"
                value={clockInLateGraceMin}
                onChange={(e) => setClockInLateGraceMin(e.target.value)}
                placeholder="Por defecto"
                className="w-full px-3 py-2 border border-border/40 rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
