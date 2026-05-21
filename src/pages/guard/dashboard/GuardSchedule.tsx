import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Loader2, Clock } from 'lucide-react';
import guardMeService from '@/lib/api/guardMeService';

export default function GuardSchedule() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await guardMeService.schedule();
        setData(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="animate-spin text-[#C8860A]" size={32} />
      </div>
    );
  }

  const shifts = data?.shifts || [];
  const freeDays = data?.freeDays || [];
  const timeOff = data?.timeOff || [];

  const fmtDate = (v: any) => {
    if (!v) return '-';
    try { return new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v)); }
    catch { return String(v); }
  };

  const fmtDay = (v: any) => {
    if (!v) return '-';
    try { return new Intl.DateTimeFormat('es', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(v)); }
    catch { return String(v); }
  };

  const now = Date.now();

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
        <Calendar size={22} className="text-[#C8860A]" />
        {t('guard.schedule.title', 'Mi Horario')}
      </h1>

      {/* Upcoming Shifts */}
      <div className="bg-card border rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Clock size={16} className="text-[#C8860A]" />
          {t('guard.schedule.upcoming', 'Próximos turnos')}
        </h3>
        {shifts.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin turnos programados.</p>
        ) : (
          <div className="space-y-2">
            {shifts.map((s: any) => {
              const isActive = new Date(s.startTime).getTime() <= now && new Date(s.endTime).getTime() >= now;
              return (
                <div
                  key={s.id}
                  className={`border rounded-lg p-3 ${isActive ? 'border-green-400 bg-green-500/5' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">
                      {s.station?.stationName || 'Puesto'}
                    </p>
                    {isActive && (
                      <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                        AHORA
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {fmtDate(s.startTime)} — {fmtDate(s.endTime)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Free Days */}
      <div className="bg-card border rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          {t('guard.schedule.freeDays', 'Días libres')}
        </h3>
        {freeDays.length === 0 ? (
          <p className="text-xs text-muted-foreground">No tienes días libres aprobados próximos.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {freeDays.slice(0, 30).map((d: string) => (
              <span key={d} className="inline-flex items-center rounded-full border border-green-300 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                {fmtDay(d + 'T12:00:00')}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Approved Time Off */}
      {timeOff.length > 0 && (
        <div className="bg-card border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            {t('guard.schedule.approvedTimeOff', 'Permisos aprobados')}
          </h3>
          {timeOff.map((to: any) => (
            <div key={to.id} className="border rounded-lg p-3">
              <p className="text-sm font-medium text-foreground capitalize">{to.type}</p>
              <p className="text-xs text-muted-foreground">
                {fmtDay(to.startDate)} — {fmtDay(to.endDate)}
              </p>
              {to.reason && <p className="text-xs text-muted-foreground mt-1">{to.reason}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
