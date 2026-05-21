import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Clock, Shield, CheckCircle, XCircle, Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import guardMeService from '@/lib/api/guardMeService';

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
        <Loader2 className="animate-spin text-[#C8860A]" size={32} />
      </div>
    );
  }

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
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <Shield className="mx-auto text-[#C8860A] mb-2" size={40} />
        <h1 className="text-xl font-bold text-foreground">
          {guard?.fullName || t('guard.dashboard.title', 'Mi Panel')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isClockedIn
            ? t('guard.dashboard.onDuty', 'En servicio')
            : t('guard.dashboard.offDuty', 'Fuera de servicio')}
        </p>
      </div>

      {/* Clock Status */}
      <div className={`rounded-xl border-2 p-6 text-center ${isClockedIn ? 'border-green-500 bg-green-500/5' : 'border-border bg-card'}`}>
        {isClockedIn ? (
          <>
            <CheckCircle className="mx-auto text-green-600 mb-2" size={32} />
            <p className="text-sm font-medium text-green-700">Entrada registrada</p>
            <p className="text-xs text-muted-foreground mt-1">
              Desde: {fmtTime(data?.activeClockIn?.punchInTime)}
            </p>
            <button
              onClick={handleClockOut}
              disabled={clockingOut}
              className="mt-4 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold text-base hover:bg-red-700 disabled:opacity-50 w-full"
            >
              {clockingOut ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Marcar Salida'}
            </button>
          </>
        ) : (
          <>
            <XCircle className="mx-auto text-muted-foreground mb-2" size={32} />
            <p className="text-sm font-medium text-foreground">Sin entrada activa</p>
            {stations.length > 0 && (
              <div className="mt-4 space-y-2">
                {stations.map((st: any) => (
                  <button
                    key={st.id}
                    onClick={() => handleClockIn(st.id)}
                    disabled={clockingIn}
                    className="px-6 py-3 bg-[#C8860A] text-white rounded-xl font-semibold text-base hover:bg-[#B37809] disabled:opacity-50 w-full"
                  >
                    {clockingIn ? <Loader2 size={18} className="animate-spin mx-auto" /> : `Marcar Entrada — ${st.stationName}`}
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
          <p className="text-xs text-red-600 mt-2">{gpsError}</p>
        )}
      </div>

      {/* Current/Next Shift */}
      <div className="bg-card border rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Clock size={16} className="text-[#C8860A]" />
          {t('guard.dashboard.shifts', 'Turnos')}
        </h3>
        {currentShift ? (
          <div className="bg-green-500/10 border border-green-300 rounded-lg p-3">
            <p className="text-xs font-medium text-green-700">Turno actual</p>
            <p className="text-sm text-foreground font-medium">{currentShift.station?.stationName || '-'}</p>
            <p className="text-xs text-muted-foreground">{fmtTime(currentShift.startTime)} — {fmtTime(currentShift.endTime)}</p>
          </div>
        ) : nextShift ? (
          <div className="bg-blue-500/10 border border-blue-300 rounded-lg p-3">
            <p className="text-xs font-medium text-blue-700">Próximo turno</p>
            <p className="text-sm text-foreground font-medium">{nextShift.station?.stationName || '-'}</p>
            <p className="text-xs text-muted-foreground">{fmtTime(nextShift.startTime)} — {fmtTime(nextShift.endTime)}</p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Sin turnos programados.</p>
        )}
      </div>

      {/* Assigned Stations */}
      {stations.length > 0 && (
        <div className="bg-card border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <MapPin size={16} className="text-[#C8860A]" />
            {t('guard.dashboard.stations', 'Mis Puestos')}
          </h3>
          {stations.map((st: any) => (
            <div key={st.id} className="border rounded-lg p-3">
              <p className="text-sm font-medium text-foreground">{st.stationName}</p>
              <p className="text-xs text-muted-foreground">
                {st.startingTimeInDay || '?'} — {st.finishTimeInDay || '?'}
                {st.stationSchedule && ` · ${st.stationSchedule}`}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
