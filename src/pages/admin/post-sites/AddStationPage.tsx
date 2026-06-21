import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ChevronLeft, Loader2, Sun, Moon, Clock, SlidersHorizontal } from 'lucide-react';
import PostSiteLayout from '@/layouts/PostSiteLayout';
import { postSiteService, setTenantId as setGlobalTenantId } from '@/lib/api/postSiteService';
import { ApiService } from '@/services/api/apiService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StationGeofencePolygon, { type PolyPoint } from '@/components/GoogleMap/StationGeofencePolygon';

// Mirrors the staffing model used in the Stations tab: one jornada = 1 fijo.
function jornadaType(start?: string, end?: string): 'diurno' | 'nocturno' | null {
  const hour = (s?: string) => {
    if (!s) return null;
    const m = String(s).match(/(\d{1,2}):(\d{2})/);
    return m ? parseInt(m[1], 10) : null;
  };
  const sh = hour(start);
  const eh = hour(end);
  if (sh == null) return null;
  if (eh != null && eh <= sh) return 'nocturno';
  if (sh >= 18 || sh < 5) return 'nocturno';
  return 'diurno';
}
function requiredFijos(_schedule?: string): number {
  return 1;
}

// The station's "horario" maps to the scheduling engine's scheduleType, which
// drives positions + shift generation (the SAME field Programador › Horario
// sets via /auto-positions). This keeps a single source of truth so any guard
// assigned to the station abides by its horario.
function turnoToScheduleType(turno: 'diurno' | 'nocturno' | '24h' | 'custom'): '12h-day' | '12h-night' | '24h' | 'custom' {
  switch (turno) {
    case 'diurno': return '12h-day';
    case 'nocturno': return '12h-night';
    case '24h': return '24h';
    default: return 'custom';
  }
}

// A turno (horario) is one of four types — the same way it's set up in the
// station's horario. Each type presets the jornada window(s); "custom" lets the
// user define the hours. A 24h post is two 12h jornadas (diurno + nocturno),
// hence 2 fijos.
type TurnoType = 'diurno' | 'nocturno' | '24h' | 'custom';
const ALL_DAYS = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];

const TURNO_OPTIONS: {
  key: TurnoType; label: string; sub: string; start: string; end: string; guards: number; Icon: any;
}[] = [
  { key: 'diurno',   label: '12h Diurno',     sub: '07:00 – 19:00',     start: '07:00', end: '19:00', guards: 1, Icon: Sun },
  { key: 'nocturno', label: '12h Nocturno',   sub: '19:00 – 07:00',     start: '19:00', end: '07:00', guards: 1, Icon: Moon },
  { key: '24h',      label: '24 Horas',       sub: 'Diurno + Nocturno', start: '00:00', end: '23:59', guards: 2, Icon: Clock },
  { key: 'custom',   label: 'Personalizado',  sub: 'Define tus horas',  start: '',      end: '',      guards: 1, Icon: SlidersHorizontal },
];

// Build the station's stationSchedule jornadas (the turno) from the selected
// type. This is what the horario/calendar reads as the required coverage.
function buildJornadas(turnoType: TurnoType, start: string, end: string): any[] {
  if (turnoType === '24h') {
    return [
      { tipo: 'Diurno',   startTime: '07:00', endTime: '19:00', guardsCount: '1', days: ALL_DAYS },
      { tipo: 'Nocturno', startTime: '19:00', endTime: '07:00', guardsCount: '1', days: ALL_DAYS },
    ];
  }
  const tipo = turnoType === 'diurno' ? 'Diurno' : turnoType === 'nocturno' ? 'Nocturno' : 'Personalizado';
  return [{ tipo, startTime: start, endTime: end, guardsCount: '1', days: ALL_DAYS }];
}

/**
 * Full-page "Add station" form (replaces the old cramped modal that overflowed
 * the viewport because of the embedded geofence map). Route:
 *   /post-sites/:id/stations/new
 */
export default function AddStationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [site, setSite] = useState<any | null>(null);
  const [loadingSite, setLoadingSite] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state (same fields as the previous modal).
  const [newName, setNewName] = useState('');
  const [nickname, setNickname] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [turnoType, setTurnoType] = useState<TurnoType | ''>('');
  const [startingTimeInDay, setStartingTimeInDay] = useState('');
  const [finishTimeInDay, setFinishTimeInDay] = useState('');

  const requiredGuards = turnoType === '24h' ? 2 : 1;

  // Selecting a turno type presets its window; "custom" keeps the manual times.
  const selectTurno = (key: TurnoType) => {
    setTurnoType(key);
    const opt = TURNO_OPTIONS.find((o) => o.key === key);
    if (opt && key !== 'custom') {
      setStartingTimeInDay(opt.start);
      setFinishTimeInDay(opt.end);
    } else if (key === 'custom') {
      setStartingTimeInDay('');
      setFinishTimeInDay('');
    }
  };
  const [geofenceRadius, setGeofenceRadius] = useState('100');
  const [geofencePolygon, setGeofencePolygon] = useState<PolyPoint[]>([]);
  // Per-station clock-in tolerance windows (minutes). Empty = use tenant default.
  const [clockInEarlyBufferMin, setClockInEarlyBufferMin] = useState('');
  const [clockInLateGraceMin, setClockInLateGraceMin] = useState('');

  const stationsUrl = `/post-sites/${id}/stations`;

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    (async () => {
      setLoadingSite(true);
      try {
        const data = await postSiteService.get(id);
        if (!mounted) return;
        setSite(data);
        const tid = data?.tenantId || (data?.tenant && (data.tenant.id || data.tenant.tenantId));
        if (tid) setGlobalTenantId(tid);
      } catch (e) {
        console.error(e);
        toast.error(t('postsite.Details.unexpected', 'Unexpected error occurred'));
      } finally {
        if (mounted) setLoadingSite(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  const createStation = async () => {
    const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
    const postSiteId = site?.id || id || '';
    if (!newName.trim()) {
      toast.error(t('postSites.stations.provideName', 'Provide a name'));
      return;
    }
    if (!postSiteId) {
      toast.error(t('postsite.Details.unexpected', 'Unexpected error occurred'));
      return;
    }
    if (!turnoType) {
      toast.error(t('postSites.stations.provideSchedule', 'Selecciona un turno'));
      return;
    }
    if (turnoType === 'custom' && (!startingTimeInDay || !finishTimeInDay)) {
      toast.error(t('postSites.stations.provideCustomTimes', 'Define la hora de inicio y fin'));
      return;
    }
    setSaving(true);
    try {
      const latitud = site?.latitud || site?.latitude || '';
      const longitud = site?.longitud || site?.longitude || '';
      // The turno (horario) is stored as jornadas on stationSchedule so the
      // station's horario/calendar reads it as the required coverage.
      const jornadas = buildJornadas(turnoType, startingTimeInDay, finishTimeInDay);
      const stationStart = turnoType === '24h' ? '00:00' : startingTimeInDay;
      const stationEnd = turnoType === '24h' ? '23:59' : finishTimeInDay;
      const payload = {
        stationName: newName,
        nickname: nickname.trim() || null,
        postSiteId,
        latitud,
        longitud,
        stationSchedule: JSON.stringify(jornadas),
        turnoType,
        is24h: turnoType === '24h',
        numberOfGuardsInStation: String(requiredGuards),
        startingTimeInDay: stationStart,
        finishTimeInDay: stationEnd,
        geofenceRadius: Number(geofenceRadius) || 100,
        geofencePolygon: geofencePolygon.length >= 3 ? geofencePolygon : null,
        // Empty input → null so the tenant Nómina default applies.
        clockInEarlyBufferMin: clockInEarlyBufferMin.trim() === '' ? null : Number(clockInEarlyBufferMin),
        clockInLateGraceMin: clockInLateGraceMin.trim() === '' ? null : Number(clockInLateGraceMin),
        description: newDescription,
      } as any;
      const created: any = await ApiService.post(`/tenant/${tenantId}/station`, { data: payload });
      const newStationId = created?.id || created?.data?.id || null;
      // Configure the station's horario through the scheduling engine (the same
      // endpoint Programador › Horario uses): this sets scheduleType, creates the
      // turno positions and regenerates shifts, so assigned guards abide by it.
      // Rotation pattern auto-defaults (4-4-2 for 24h, 5-2 for 12h).
      if (newStationId) {
        try {
          await ApiService.post(`/tenant/${tenantId}/station/${newStationId}/auto-positions`, {
            data: {
              scheduleType: turnoToScheduleType(turnoType),
              startTime: startingTimeInDay || undefined,
              endTime: finishTimeInDay || undefined,
            },
          });
        } catch (cfgErr: any) {
          console.error('auto-positions failed', cfgErr);
          toast.warning(t('postSites.stations.horarioConfigFailed', 'Estación creada, pero no se pudo configurar el horario. Configúralo en Programador › Horario.'));
        }
      }
      toast.success(t('postSites.stations.created', 'Station created'));
      navigate(stationsUrl);
    } catch (err: any) {
      console.error('Failed creating station', err);
      toast.error(err?.message || t('postSites.stations.createFailed', 'Failed creating station'));
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full px-3 py-2 border border-input rounded-md text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-[#C8860A]';

  return (
    <PostSiteLayout
      title={site?.businessName || site?.companyName || site?.name || t('postSites.postsite', 'Post Site')}
      site={site}
    >
      <div className="mx-auto w-full max-w-3xl p-4">
        {/* Page header */}
        <div className="mb-4">
          <Link to={stationsUrl} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
            {t('postSites.stations.backToStations', 'Estaciones')}
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">
            {t('postSites.stations.createTitle', 'Crear estación')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('postSites.stations.createSubtitle', 'Define el turno, horario y la geocerca del puesto.')}
          </p>
        </div>

        {loadingSite && !site ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#C8860A]" />
          </div>
        ) : (
          <Card>
            <CardContent className="space-y-6 p-6">
              {/* Name */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  {t('postSites.stations.form.name', 'Nombre *')}
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t('postSites.stations.placeholderName', 'Nombre de la estación')}
                  className={inputCls}
                  autoFocus
                />
              </div>

              {/* Nickname / nominativo — private to operations */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  {t('postSites.stations.form.nickname', 'Nominativo')}
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                    {t('common.private', 'Privado')}
                  </span>
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder={t('postSites.stations.placeholderNickname', 'Apodo / nominativo interno')}
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('postSites.stations.form.nicknameHint', 'Solo visible para operaciones del tenant. El cliente no lo ve.')}
                </p>
              </div>

              {/* Turno (horario) — same setup as the station's horario */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  {t('postSites.stations.form.schedule', 'Turno (horario) *')}
                </label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {TURNO_OPTIONS.map(({ key, label, sub, Icon }) => {
                    const selected = turnoType === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => selectTurno(key)}
                        className={`flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all ${
                          selected
                            ? 'border-[#C8860A] bg-[#C8860A]/10 ring-1 ring-[#C8860A]/30'
                            : 'border-input bg-card hover:border-[#C8860A]/40'
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${selected ? 'text-[#C8860A]' : 'text-muted-foreground'}`} />
                        <div>
                          <p className={`text-sm font-semibold ${selected ? 'text-[#C8860A]' : 'text-foreground'}`}>{label}</p>
                          <p className="text-[11px] text-muted-foreground">{sub}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Times: editable for diurno / nocturno / custom */}
              {turnoType && turnoType !== '24h' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">{t('postSites.stations.form.startTime', 'Inicio')}</label>
                    <input type="time" value={startingTimeInDay} onChange={(e) => setStartingTimeInDay(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">{t('postSites.stations.form.endTime', 'Fin')}</label>
                    <input type="time" value={finishTimeInDay} onChange={(e) => setFinishTimeInDay(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">{t('postSites.stations.form.guards', 'Guardias')}</label>
                    <div className="flex h-[42px] items-center rounded-md border border-input bg-muted/40 px-3 text-sm">
                      <span className="font-semibold text-foreground">{requiredGuards} fijo{requiredGuards > 1 ? 's' : ''}</span>
                      {jornadaType(startingTimeInDay, finishTimeInDay) && (
                        <span className="ml-auto text-[11px] capitalize text-muted-foreground">{jornadaType(startingTimeInDay, finishTimeInDay)}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 24h is a fixed split into two jornadas */}
              {turnoType === '24h' && (
                <div className="rounded-xl border border-input bg-muted/30 p-4 text-sm">
                  <p className="mb-2 font-medium text-foreground">Cobertura 24 horas — dos jornadas</p>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5"><Sun className="h-3.5 w-3.5 text-[#C8860A]" /> Diurno · 07:00 – 19:00</span>
                    <span className="inline-flex items-center gap-1.5"><Moon className="h-3.5 w-3.5 text-[#C8860A]" /> Nocturno · 19:00 – 07:00</span>
                    <span className="ml-auto font-semibold text-foreground">2 fijos</span>
                  </div>
                </div>
              )}

              {turnoType && (
                <p className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
                  <strong className="text-foreground/80">{requiredGuards} guardia{requiredGuards > 1 ? 's' : ''} fijo{requiredGuards > 1 ? 's' : ''}</strong> en el puesto +{' '}
                  <strong className="text-foreground/80">1 sacafranco</strong> que cubre los días de descanso. El sacafranco salta entre
                  puestos — no pertenece a un solo puesto, por eso no se cuenta en las guardias requeridas.
                </p>
              )}

              {/* Geofence radius */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  {t('postSites.stations.form.geofenceRadius', 'Radio geovalla (metros)')}
                </label>
                <input
                  type="number"
                  min="10"
                  max="5000"
                  value={geofenceRadius}
                  onChange={(e) => setGeofenceRadius(e.target.value)}
                  placeholder="100"
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('postSites.stations.form.geofenceHint', 'Distancia máxima para marcar entrada')}
                </p>
              </div>

              {/* Clock-in tolerance windows */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    {t('postSites.stations.form.clockInEarlyBuffer', 'Tolerancia de entrada anticipada (min)')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="240"
                    value={clockInEarlyBufferMin}
                    onChange={(e) => setClockInEarlyBufferMin(e.target.value)}
                    placeholder={t('common.default', 'Por defecto')}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    {t('postSites.stations.form.clockInLateGrace', 'Tolerancia de entrada tardía (min)')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="240"
                    value={clockInLateGraceMin}
                    onChange={(e) => setClockInLateGraceMin(e.target.value)}
                    placeholder={t('common.default', 'Por defecto')}
                    className={inputCls}
                  />
                </div>
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  {t('postSites.stations.form.clockInBufferHint', 'Minutos antes/después de la hora de inicio en que el guardia puede marcar entrada. Vacío = usar el valor por defecto de la empresa.')}
                </p>
              </div>

              {/* Geofence polygon — now has full page width + height to work with */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Geocerca poligonal (opcional)</label>
                <p className="mb-2 text-xs text-muted-foreground">
                  Si defines un polígono (3+ puntos), se usa en lugar del radio para validar la marcación.
                </p>
                <StationGeofencePolygon
                  value={geofencePolygon}
                  onChange={setGeofencePolygon}
                  centerLat={Number(site?.latitud || site?.latitude) || undefined}
                  centerLng={Number(site?.longitud || site?.longitude) || undefined}
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  {t('postSites.stations.form.description', 'Descripción')}
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder={t('postSites.stations.form.descriptionPlaceholder', 'Descripción opcional')}
                  className={`${inputCls} resize-none`}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sticky action bar */}
        <div className="sticky bottom-0 mt-4 flex items-center justify-end gap-3 rounded-md border border-border bg-card/95 p-3 backdrop-blur">
          <Button variant="outline" onClick={() => navigate(stationsUrl)} disabled={saving}>
            {t('actions.cancel', 'Cancelar')}
          </Button>
          <Button
            onClick={createStation}
            disabled={!newName.trim() || !turnoType || saving}
            className="gap-2 bg-[#C8860A] text-white hover:bg-[#B37809]"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('actions.save', 'Guardar')}
          </Button>
        </div>
      </div>
    </PostSiteLayout>
  );
}
