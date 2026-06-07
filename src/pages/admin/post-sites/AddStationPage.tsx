import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ChevronLeft, Loader2 } from 'lucide-react';
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
  const [stationSchedule, setStationSchedule] = useState('');
  const [startingTimeInDay, setStartingTimeInDay] = useState('');
  const [finishTimeInDay, setFinishTimeInDay] = useState('');
  const [geofenceRadius, setGeofenceRadius] = useState('100');
  const [geofencePolygon, setGeofencePolygon] = useState<PolyPoint[]>([]);

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
    if (!stationSchedule) {
      toast.error(t('postSites.stations.provideSchedule', 'Select a schedule'));
      return;
    }
    setSaving(true);
    try {
      const latitud = site?.latitud || site?.latitude || '';
      const longitud = site?.longitud || site?.longitude || '';
      const payload = {
        stationName: newName,
        nickname: nickname.trim() || null,
        postSiteId,
        latitud,
        longitud,
        stationSchedule,
        numberOfGuardsInStation: String(requiredFijos(stationSchedule)),
        startingTimeInDay,
        finishTimeInDay,
        geofenceRadius: Number(geofenceRadius) || 100,
        geofencePolygon: geofencePolygon.length >= 3 ? geofencePolygon : null,
        description: newDescription,
      } as any;
      await ApiService.post(`/tenant/${tenantId}/station`, { data: payload });
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

              {/* Schedule + guards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    {t('postSites.stations.form.schedule', 'Turno *')}
                  </label>
                  <select value={stationSchedule} onChange={(e) => setStationSchedule(e.target.value)} className={inputCls}>
                    <option value="">{t('postSites.stations.form.selectSchedule', 'Seleccionar turno')}</option>
                    <option value="1 hora">1 hora</option>
                    <option value="4 horas">4 horas</option>
                    <option value="8 horas">8 horas</option>
                    <option value="12 horas">12 horas</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    {t('postSites.stations.form.guards', 'Guardias requeridas')}
                  </label>
                  <div className="flex items-center justify-between rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-foreground">
                    <span className="font-semibold">{requiredFijos(stationSchedule)} fijo</span>
                    {jornadaType(startingTimeInDay, finishTimeInDay) && (
                      <span className="text-[11px] capitalize text-muted-foreground">
                        {jornadaType(startingTimeInDay, finishTimeInDay)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Start / End time */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    {t('postSites.stations.form.startTime', 'Inicio')}
                  </label>
                  <input type="time" value={startingTimeInDay} onChange={(e) => setStartingTimeInDay(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    {t('postSites.stations.form.endTime', 'Fin')}
                  </label>
                  <input type="time" value={finishTimeInDay} onChange={(e) => setFinishTimeInDay(e.target.value)} className={inputCls} />
                </div>
              </div>

              {stationSchedule && (
                <p className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
                  {stationSchedule}
                  {jornadaType(startingTimeInDay, finishTimeInDay) ? ` · ${jornadaType(startingTimeInDay, finishTimeInDay)}` : ''}:{' '}
                  <strong className="text-foreground/80">1 guardia fijo</strong> en el puesto +{' '}
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
            disabled={!newName.trim() || saving}
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
