import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Clock, Shield, CheckCircle, XCircle, Loader2, LogOut, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import guardMeService from '@/lib/api/guardMeService';
import { PageContainer, PageHeader, Section, StatusBadge, FadeIn } from '@/components/kit';

export default function GuardDashboard() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await guardMeService.dashboard();
      setData(res);
    } catch (e: any) {
      toast.error(e?.message || 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboard(); }, []);

  const getPosition = (): Promise<GeolocationPosition> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('GPS no disponible'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });
    });

  const handleClockIn = async (stationId: string) => {
    setClockingIn(true);
    setGpsError(null);
    try {
      const pos = await getPosition();
      const res = await guardMeService.clockIn({
        stationId,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      if (res.success) {
        toast.success('Entrada registrada correctamente');
        loadDashboard();
      } else {
        setGpsError(res.message || 'Error de geovalla');
        toast.error(res.message || 'No pudiste marcar entrada');
      }
    } catch (e: any) {
      const msg = e?.message || 'Error obteniendo ubicación';
      setGpsError(msg);
      toast.error(msg);
    } finally {
      setClockingIn(false);
    }
  };

  const handleClockOut = async () => {
    setClockingOut(true);
    try {
      let latitude: number | undefined;
      let longitude: number | undefined;
      try {
        const pos = await getPosition();
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch { /* GPS optional for clock-out */ }
      const res = await guardMeService.clockOut({ latitude, longitude });
      if (res.success) {
        toast.success('Salida registrada correctamente');
        loadDashboard();
      } else {
        toast.error(res.message || 'Error al marcar salida');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Error');
    } finally {
      setClockingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  // i18n-friendly status labels reused below
  const onDutyLabel = t('guard.dashboard.onDuty', 'En servicio');
  const offDutyLabel = t('guard.dashboard.offDuty', 'Fuera de servicio');

  const guard = data?.guard;
  const stations = data?.stations || [];
  const currentShift = data?.currentShift;
  const nextShift = data?.nextShift;
  const isClockedIn = data?.isClockedIn;

  const fmtTime = (v: any) => {
    if (!v) return '-';
    try { return new Intl.DateTimeFormat('es', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(v)); }
    catch { return String(v); }
  };

  return (
    <PageContainer width="narrow">
      <PageHeader
        icon={<Shield />}
        title={guard?.fullName || t('guard.dashboard.title', 'Mi Panel')}
        subtitle={isClockedIn ? onDutyLabel : offDutyLabel}
        badges={
          <StatusBadge tone={isClockedIn ? 'green' : 'slate'}>
            {isClockedIn ? onDutyLabel : offDutyLabel}
          </StatusBadge>
        }
      />

      {/* Clock Status */}
      <FadeIn>
        <div className={`cg-card cg-card-hover p-6 text-center ${isClockedIn ? 'ring-2 ring-green-500/40 bg-green-500/5' : ''}`}>
          {isClockedIn ? (
            <>
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/12 text-green-600">
                <CheckCircle size={30} />
              </div>
              <p className="text-sm font-semibold text-green-700">Entrada registrada</p>
              <p className="text-xs text-muted-foreground mt-1">
                Desde: {fmtTime(data?.activeClockIn?.punchInTime)}
              </p>
              <button
                onClick={handleClockOut}
                disabled={clockingOut}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold text-base shadow-sm hover:bg-red-700 disabled:opacity-50 transition"
              >
                {clockingOut ? <Loader2 size={18} className="animate-spin" /> : <><LogOut size={18} /> Marcar Salida</>}
              </button>
            </>
          ) : (
            <>
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <XCircle size={30} />
              </div>
              <p className="text-sm font-semibold text-foreground">Sin entrada activa</p>
              {stations.length > 0 && (
                <div className="mt-5 space-y-2">
                  {stations.map((st: any) => (
                    <button
                      key={st.id}
                      onClick={() => handleClockIn(st.id)}
                      disabled={clockingIn}
                      className="inline-flex w-full items-center justify-center gap-2 px-6 py-3 cg-gradient-brand text-primary-foreground rounded-xl font-semibold text-base shadow-sm hover:opacity-90 disabled:opacity-50 transition"
                    >
                      {clockingIn ? <Loader2 size={18} className="animate-spin" /> : <><LogIn size={18} /> {`Marcar Entrada — ${st.stationName}`}</>}
                    </button>
                  ))}
                </div>
              )}
              {stations.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">No tienes puestos asignados.</p>
              )}
            </>
          )}
          {gpsError && (
            <p className="text-xs text-red-600 mt-3">{gpsError}</p>
          )}
        </div>
      </FadeIn>

      {/* Current/Next Shift */}
      <Section title={t('guard.dashboard.shifts', 'Turnos')} icon={<Clock />}>
        {currentShift ? (
          <div className="rounded-xl border border-green-300/60 bg-green-500/10 p-3.5">
            <StatusBadge tone="green">Turno actual</StatusBadge>
            <p className="mt-2 text-sm font-semibold text-foreground">{currentShift.station?.stationName || '-'}</p>
            <p className="text-xs text-muted-foreground">{fmtTime(currentShift.startTime)} — {fmtTime(currentShift.endTime)}</p>
          </div>
        ) : nextShift ? (
          <div className="rounded-xl border border-blue-300/60 bg-blue-500/10 p-3.5">
            <StatusBadge tone="blue">Próximo turno</StatusBadge>
            <p className="mt-2 text-sm font-semibold text-foreground">{nextShift.station?.stationName || '-'}</p>
            <p className="text-xs text-muted-foreground">{fmtTime(nextShift.startTime)} — {fmtTime(nextShift.endTime)}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sin turnos programados.</p>
        )}
      </Section>

      {/* Assigned Stations */}
      {stations.length > 0 && (
        <Section title={t('guard.dashboard.stations', 'Mis Puestos')} icon={<MapPin />}>
          <div className="space-y-2.5">
            {stations.map((st: any) => (
              <div key={st.id} className="rounded-xl border p-3.5">
                <p className="text-sm font-semibold text-foreground">{st.stationName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {st.startingTimeInDay || '?'} — {st.finishTimeInDay || '?'}
                  {st.stationSchedule && ` · ${st.stationSchedule}`}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}
    </PageContainer>
  );
}
