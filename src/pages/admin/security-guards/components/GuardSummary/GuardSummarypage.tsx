import React, { useEffect, useState } from 'react';
import { DateRange } from 'react-day-picker';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { DateRangePicker } from '@/components/ui/date-range-picker';

type Props = {
  guard: any;
};

export default function GuardSummary({ guard }: Props) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(subDays(new Date(), 6)),
    to: endOfDay(new Date()),
  });

  const [compareWith, setCompareWith] = useState<string>('previous'); // 'previous' o 'none'

  const [metricsCurrent, setMetricsCurrent] = useState<any>({
    assignedSites: 0,
    completedRoutes: 0,
    tasksCompleted: 0,
    reportsSent: 0,
    inactivityAlerts: 0,
    noShows: 0,
    lateArrivals: 0,
    hoursWorkedSeconds: 0,
  });

  const [metricsPrevious, setMetricsPrevious] = useState<any>({
    assignedSites: 0,
    completedRoutes: 0,
    tasksCompleted: 0,
    reportsSent: 0,
    inactivityAlerts: 0,
    noShows: 0,
    lateArrivals: 0,
    hoursWorkedSeconds: 0,
  });

  useEffect(() => {
    if (!guard) return;
    setMetricsCurrent({
      assignedSites: guard.assignedSitesCount ?? 1,
      completedRoutes: guard.completedRoutes ?? 0,
      tasksCompleted: guard.tasksCompleted ?? 0,
      reportsSent: guard.reportsSent ?? 0,
      inactivityAlerts: guard.inactivityAlerts ?? 0,
      noShows: guard.noShows ?? 0,
      lateArrivals: guard.lateArrivals ?? 0,
      hoursWorkedSeconds: guard.hoursWorkedSeconds ?? 0,
    });
    setMetricsPrevious({
      assignedSites: 0,
      completedRoutes: 0,
      tasksCompleted: 0,
      reportsSent: 0,
      inactivityAlerts: 0,
      noShows: 0,
      lateArrivals: 0,
      hoursWorkedSeconds: 0,
    });
  }, [guard]);

  const formatHours = (secs: number) => {
    const h = Math.floor(secs / 3600).toString().padStart(2, '0');
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const calculatePercentage = (current: number, previous: number) => {
    if (previous === 0) return '0 %';
    const pct = ((current - previous) / previous) * 100;
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(0)} %`;
  };

  const StatCard = ({ title, value, previous, isTime = false, color = 'blue' }: any) => {
    const colorClasses = {
      blue: 'text-blue-500',
      orange: 'text-orange-500',
      gray: 'text-gray-700',
      red: 'text-red-500',
    };

    return (
      <div className="bg-white border rounded-lg p-4 shadow-sm">
        <div className={`text-sm font-medium mb-2 ${colorClasses[color as keyof typeof colorClasses]}`}>
          {title}
        </div>
        <div className={`text-3xl font-bold mb-3 ${colorClasses[color as keyof typeof colorClasses]}`}>
          {isTime ? value : value}
        </div>
        {compareWith === 'previous' && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">
              Anterior<br />
              {isTime ? (previous || '00:00') : previous}
            </span>
            <span className="text-green-600 font-medium">
              {calculatePercentage(isTime ? 0 : (value || 0), isTime ? 0 : previous)}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Guard Header */}
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold text-2xl overflow-hidden">
            {guard?.photoUrl ? (
              <img src={guard.photoUrl} alt={guard.fullName} className="w-full h-full object-cover" />
            ) : (
              <span>{((guard?.fullName || '').split(' ').map((s: string) => s[0] || '').join('').slice(0, 2)) || 'G'}</span>
            )}
          </div>
          <div className="flex-1 grid grid-cols-3 gap-8">
            <div>
              <div className="text-xl font-semibold mb-1">{guard?.fullName ?? '—'}</div>
              <div className="text-sm text-gray-600">{guard?.role ?? 'Guardia de Seguridad'}</div>
              <div className="mt-3">
                <div className="text-xs text-gray-500">Número del Guardia</div>
                <div className="font-semibold">{guard?.guardNumber ?? guard?.employeeCode ?? '100447'}</div>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Añadido el</div>
              <div className="font-medium">
                {guard?.createdAt ? new Date(guard.createdAt).toLocaleDateString('es-ES', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: '2-digit' 
                }) : 'Oct 07, 2025'}
              </div>
              <div className="mt-3">
                <div className="text-xs text-gray-500">Última Jornada</div>
                <div className="font-medium">--</div>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Acerca de</div>
              <div className="font-medium">--</div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Estadísticas</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span>Últimos 7 días</span>
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Comparar con</span>
            <select 
              value={compareWith}
              onChange={(e) => setCompareWith(e.target.value)}
              className="px-3 py-1.5 border rounded-md text-sm"
            >
              <option value="previous">Período anterior</option>
              <option value="none">Ninguno</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistics Grid - First Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Sitios Asignados"
          value={metricsCurrent.assignedSites}
          previous={metricsPrevious.assignedSites}
          color="blue"
        />
        <StatCard
          title="Recorridos Completados"
          value={metricsCurrent.completedRoutes}
          previous={metricsPrevious.completedRoutes}
          color="orange"
        />
        <StatCard
          title="Tareas Completadas"
          value={metricsCurrent.tasksCompleted}
          previous={metricsPrevious.tasksCompleted}
          color="gray"
        />
        <StatCard
          title="Informes Enviados"
          value={metricsCurrent.reportsSent}
          previous={metricsPrevious.reportsSent}
          color="blue"
        />
      </div>

      {/* Statistics Grid - Second Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Alertas de Inactividad"
          value={metricsCurrent.inactivityAlerts}
          previous={metricsPrevious.inactivityAlerts}
          color="orange"
        />
        <StatCard
          title="No asistió"
          value={metricsCurrent.noShows}
          previous={metricsPrevious.noShows}
          color="red"
        />
        <StatCard
          title="Llegada Tardía"
          value={metricsCurrent.lateArrivals}
          previous={metricsPrevious.lateArrivals}
          color="orange"
        />
        <StatCard
          title="Horas Trabajadas"
          value={formatHours(metricsCurrent.hoursWorkedSeconds)}
          previous={formatHours(metricsPrevious.hoursWorkedSeconds)}
          isTime={true}
          color="orange"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Última Actividad</h3>
          <button className="text-sm text-blue-600 hover:underline">Filtro</button>
        </div>
        <div className="space-y-4">
          {guard?.recentActivity && guard.recentActivity.length > 0 ? (
            guard.recentActivity.map((activity: any, idx: number) => (
              <div key={idx} className="flex items-start gap-3 pb-3 border-b last:border-b-0">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                  {activity.initial || 'J'}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{activity.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                </div>
                {activity.badge && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                    {activity.badge}
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="flex items-start gap-3 pb-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                J
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-700">
                  This message is to notify you that 'José Alejo Pinos' has accepted the company request and moved to active list
                </p>
                <p className="text-xs text-gray-500 mt-1">Oct 07, 2025 14:59, Ecuador Time</p>
              </div>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                Guardia unido
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
