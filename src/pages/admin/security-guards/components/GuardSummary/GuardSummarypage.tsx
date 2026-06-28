import React, { useEffect, useState } from 'react';
import { DateRange } from 'react-day-picker';
import { subDays, startOfDay, endOfDay, format as dateFnsFormat } from 'date-fns';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useTranslation } from 'react-i18next';
import { ApiService } from '@/services/api/apiService';

type Props = {
  guard: any;
};

export default function GuardSummary({ guard }: Props) {
  const { t } = useTranslation()
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(subDays(new Date(), 6)),
    to: endOfDay(new Date()),
  });

  const [compareWith, setCompareWith] = useState<string>('previous'); // 'previous' o 'none'
  const [activities, setActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

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
    if (!guard?.id) return;
    let mounted = true;
    setActivitiesLoading(true);
    const tenantId = localStorage.getItem('tenantId') || '';
    ApiService.get(
      `/tenant/${tenantId}/memos?filter[guardName]=${guard.id}&limit=10&orderBy=dateTime_DESC`,
    )
      .then((res: any) => {
        if (!mounted) return;
        const rows: any[] = Array.isArray(res) ? res : res.rows ?? [];
        const fullName =
          guard.fullName ??
          `${guard.firstName ?? ''} ${guard.lastName ?? ''}`.trim();
        const initial = fullName ? fullName.charAt(0).toUpperCase() : '?';
        const mapped = rows.map((memo: any) => ({
          initial,
          message: memo.content || memo.subject || '',
          timestamp: memo.dateTime
            ? dateFnsFormat(new Date(memo.dateTime), 'MMM dd, yyyy HH:mm')
            : memo.createdAt
            ? dateFnsFormat(new Date(memo.createdAt), 'MMM dd, yyyy HH:mm')
            : '',
          badge: memo.wasAccepted ? t('guards.summary.badge.accepted') : null,
          subject: memo.subject || '',
        }));
        setActivities(mapped);
      })
      .catch(() => {
        /* silently ignore — activity section just stays empty */
      })
      .finally(() => {
        if (mounted) setActivitiesLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [guard?.id]);

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
      orange: 'text-primary',
      gray: 'text-foreground',
      red: 'text-red-500',
    };

    return (
      <div className="bg-card border rounded-lg p-4 shadow-sm">
        <div className={`text-sm font-medium mb-2 ${colorClasses[color as keyof typeof colorClasses]}`}>
          {t(title)}
        </div>
        <div className={`text-3xl font-bold mb-3 ${colorClasses[color as keyof typeof colorClasses]}`}>
          {isTime ? value : value}
        </div>
        {compareWith === 'previous' && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {t('guards.summary.previous')}<br />
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
      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-foreground/70 font-semibold text-2xl overflow-hidden">
            {guard?.photoUrl ? (
              <img src={guard.photoUrl} alt={guard.fullName} className="w-full h-full object-cover" />
            ) : (
              <span>{((guard?.fullName || '').split(' ').map((s: string) => s[0] || '').join('').slice(0, 2)) || 'G'}</span>
            )}
          </div>
          <div className="flex-1 grid grid-cols-3 gap-8">
            <div>
              <div className="text-xl font-semibold mb-1">{guard?.fullName ?? '—'}</div>
              <div className="text-sm text-foreground/70">{guard?.role ?? t('guards.summary.roleDefault')}</div>
              <div className="mt-3">
                <div className="text-xs text-muted-foreground">{t('guards.summary.header.guardNumber')}</div>
                <div className="font-semibold">{guard?.guardNumber ?? guard?.employeeCode ?? '100447'}</div>
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t('guards.summary.header.addedOn')}</div>
              <div className="font-medium">
                {guard?.createdAt ? new Date(guard.createdAt).toLocaleDateString('es-ES', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: '2-digit' 
                }) : 'Oct 07, 2025'}
              </div>
              <div className="mt-3">
                <div className="text-xs text-muted-foreground">{t('guards.summary.header.lastShift')}</div>
                <div className="font-medium">--</div>
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t('guards.summary.header.about')}</div>
              <div className="font-medium">--</div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t('guards.summary.stats.title')}</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span>{t('guards.summary.stats.last7Days')}</span>
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground/70">{t('guards.summary.stats.compareWith')}</span>
            <select 
              value={compareWith}
              onChange={(e) => setCompareWith(e.target.value)}
              className="px-3 py-1.5 border rounded-md text-sm"
            >
              <option value="previous">{t('guards.summary.stats.compareOptions.previous')}</option>
              <option value="none">{t('guards.summary.stats.compareOptions.none')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistics Grid - First Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="guards.summary.stats.metrics.assignedSites"
          value={metricsCurrent.assignedSites}
          previous={metricsPrevious.assignedSites}
          color="blue"
        />
        <StatCard
          title="guards.summary.stats.metrics.completedRoutes"
          value={metricsCurrent.completedRoutes}
          previous={metricsPrevious.completedRoutes}
          color="orange"
        />
        <StatCard
          title="guards.summary.stats.metrics.tasksCompleted"
          value={metricsCurrent.tasksCompleted}
          previous={metricsPrevious.tasksCompleted}
          color="gray"
        />
        <StatCard
          title="guards.summary.stats.metrics.reportsSent"
          value={metricsCurrent.reportsSent}
          previous={metricsPrevious.reportsSent}
          color="blue"
        />
      </div>

      {/* Statistics Grid - Second Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="guards.summary.stats.metrics.inactivityAlerts"
          value={metricsCurrent.inactivityAlerts}
          previous={metricsPrevious.inactivityAlerts}
          color="orange"
        />
        <StatCard
          title="guards.summary.stats.metrics.noShows"
          value={metricsCurrent.noShows}
          previous={metricsPrevious.noShows}
          color="red"
        />
        <StatCard
          title="guards.summary.stats.metrics.lateArrivals"
          value={metricsCurrent.lateArrivals}
          previous={metricsPrevious.lateArrivals}
          color="orange"
        />
        <StatCard
          title="guards.summary.stats.metrics.hoursWorked"
          value={formatHours(metricsCurrent.hoursWorkedSeconds)}
          previous={formatHours(metricsPrevious.hoursWorkedSeconds)}
          isTime={true}
          color="orange"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{t('guards.summary.recentActivity.title')}</h3>
            <button className="text-sm text-blue-600 hover:underline">{t('guards.summary.recentActivity.filter')}</button>
        </div>
        <div className="space-y-4">
          {activitiesLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading') || 'Cargando...'}</p>
          ) : activities.length > 0 ? (
            activities.map((activity: any, idx: number) => (
              <div key={idx} className="flex items-start gap-3 pb-3 border-b last:border-b-0">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                  {activity.initial}
                </div>
                <div className="flex-1">
                  {activity.subject && (
                    <p className="text-xs font-semibold text-foreground/70 mb-0.5">{activity.subject}</p>
                  )}
                  <p className="text-sm text-foreground">{activity.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{activity.timestamp}</p>
                </div>
                {activity.badge && (
                  <span className="px-2 py-1 bg-yellow-500/15 text-yellow-800 text-xs rounded">
                    {activity.badge}
                  </span>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">{t('guards.summary.recentActivity.empty') || 'Sin actividad reciente'}</p>
          )}
        </div>
      </div>
    </div>
  );
}
