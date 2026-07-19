import { useEffect, useState } from 'react';
import { format as dateFnsFormat } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { ApiService } from '@/services/api/apiService';
import securityGuardService from '@/lib/api/securityGuardService';
import { Section, StatCard, EmptyState } from '@/components/kit';
import { MapPin, Gauge, CalendarDays, Building2, Clock } from 'lucide-react';
import type {
  GuardDetail,
  GuardAssignmentRow,
  GuardPerformance,
  PerformanceStats,
  ScheduleSnapshot,
} from '../../guardDetailTypes';

type Props = {
  guard: GuardDetail & { firstName?: string; lastName?: string };
};

/** A mapped memo row shown in the recent-activity feed. */
interface SummaryActivity {
  initial: string;
  message: string;
  timestamp: string;
  badge: string | null;
  subject: string;
}

/** A memo row as returned by the memos endpoint. */
interface MemoRow {
  content?: string;
  subject?: string;
  dateTime?: string;
  createdAt?: string;
  wasAccepted?: boolean;
}

/** A distinct station derived from the assignment rows. */
interface StationSummary {
  stationName: string | null;
  postSiteName: string | null;
  clientName: string | null;
  window: string | null;
}

// Mirrors src/pages/admin/clientes/components/ClientCoverage/ScheduleCard.tsx
const CELL: Record<string, { label: string; cls: string }> = {
  day: { label: 'D', cls: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
  night: { label: 'N', cls: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300' },
  rest: { label: 'L', cls: 'bg-muted text-muted-foreground' },
  none: { label: '·', cls: 'text-muted-foreground/40' },
};

const TIER_LABEL: Record<string, string> = {
  excellent: 'Excelente',
  good: 'Bueno',
  fair: 'Regular',
  needs_improvement: 'Por mejorar',
};
const TIER_ACCENT: Record<string, 'green' | 'orange' | 'red'> = {
  excellent: 'green',
  good: 'green',
  fair: 'orange',
  needs_improvement: 'red',
};

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Shift startTime/endTime may arrive as an "HH:MM[:SS]" clock string or a full
// timestamp — show a clean "HH:MM - HH:MM" window when we can, otherwise skip it.
const clock = (v: string | null | undefined): string | null => {
  if (!v) return null;
  const s = String(v);
  const m = s.match(/(\d{2}:\d{2})/);
  if (m) return m[1];
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : dateFnsFormat(d, 'HH:mm');
};
const windowLabel = (a: GuardAssignmentRow): string | null => {
  const from = clock(a.startTime);
  const to = clock(a.endTime);
  if (from && to) return `${from} - ${to}`;
  return from || to || null;
};

export default function GuardSummary({ guard }: Props) {
  const { t } = useTranslation();

  const [activities, setActivities] = useState<SummaryActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  const [assignments, setAssignments] = useState<GuardAssignmentRow[] | null>(null);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);

  const [perf, setPerf] = useState<GuardPerformance | null>(null);
  const [perfLoading, setPerfLoading] = useState(false);

  const [schedule, setSchedule] = useState<ScheduleSnapshot | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  // ── Recent activity (memos feed) — REAL, kept as-is ──────────────────────
  useEffect(() => {
    if (!guard?.id) return;
    let mounted = true;
    setActivitiesLoading(true);
    const tenantId = localStorage.getItem('tenantId') || '';
    ApiService.get(
      `/tenant/${tenantId}/memos?filter[guardName]=${guard.id}&limit=10&orderBy=dateTime_DESC`,
    )
      .then((res: { rows?: MemoRow[] } | MemoRow[]) => {
        if (!mounted) return;
        const rows: MemoRow[] = Array.isArray(res) ? res : res.rows ?? [];
        const fullName =
          guard.fullName ??
          `${guard.firstName ?? ''} ${guard.lastName ?? ''}`.trim();
        const initial = fullName ? fullName.charAt(0).toUpperCase() : '?';
        const mapped: SummaryActivity[] = rows.map((memo: MemoRow) => ({
          initial,
          message: memo.content || memo.subject || '',
          timestamp: memo.dateTime
            ? dateFnsFormat(new Date(memo.dateTime), 'dd MMM yyyy HH:mm')
            : memo.createdAt
            ? dateFnsFormat(new Date(memo.createdAt), 'dd MMM yyyy HH:mm')
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

  // ── Station / post assignments — REAL ────────────────────────────────────
  useEffect(() => {
    if (!guard?.id) return;
    let mounted = true;
    setAssignmentsLoading(true);
    securityGuardService
      .getAssignments(guard.id)
      .then((res) => {
        if (mounted) setAssignments(res?.rows ?? []);
      })
      .catch(() => {
        if (mounted) setAssignments([]);
      })
      .finally(() => {
        if (mounted) setAssignmentsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [guard?.id]);

  // ── Performance (8-factor) — REAL ────────────────────────────────────────
  useEffect(() => {
    if (!guard?.id) return;
    let mounted = true;
    setPerfLoading(true);
    securityGuardService
      .getPerformance(guard.id, 30)
      .then((res) => {
        if (mounted) setPerf(res ?? null);
      })
      .catch(() => {
        if (mounted) setPerf(null);
      })
      .finally(() => {
        if (mounted) setPerfLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [guard?.id]);

  // ── Schedule snapshot (next 7 days) — REAL ───────────────────────────────
  useEffect(() => {
    if (!guard?.id) return;
    let mounted = true;
    setScheduleLoading(true);
    const today = new Date();
    const end = new Date(today.getTime() + 6 * 86400000);
    securityGuardService
      .getSchedule(guard.id, { startDate: ymd(today), endDate: ymd(end) })
      .then((res) => {
        if (mounted) setSchedule(res ?? null);
      })
      .catch(() => {
        if (mounted) setSchedule(null);
      })
      .finally(() => {
        if (mounted) setScheduleLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [guard?.id]);

  // ── Derive distinct stations from the (shift-level) assignment rows ───────
  const stations = (() => {
    const rows = assignments ?? [];
    const seen = new Map<string, StationSummary>();
    for (const a of rows) {
      const key = `${a.businessInfoId ?? ''}|${a.stationName ?? ''}|${a.postSiteName ?? ''}`;
      if (!seen.has(key)) {
        seen.set(key, {
          stationName: a.stationName || null,
          postSiteName: a.postSiteName || null,
          clientName: a.clientName || null,
          window: windowLabel(a),
        });
      }
    }
    return Array.from(seen.values());
  })();

  const days = schedule?.days || [];
  const scheduleRows = schedule?.rows || [];
  const stats: PerformanceStats = perf?.stats || {};

  return (
    <div className="space-y-6">
      {/* ── STATION / POST ASSIGNMENT ─────────────────────────────────────── */}
      <Section title="Puesto y estación" icon={<MapPin className="h-4 w-4" />}>
        {assignmentsLoading && assignments === null ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Cargando asignación…</div>
        ) : stations.length === 0 ? (
          <EmptyState
            icon={<MapPin className="h-5 w-5" />}
            title="Sin asignación"
            description="Este vigilante todavía no tiene una estación o puesto asignado. Asígnalo desde la pestaña “Puesto y estaciones”."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {stations.map((s, i) => (
              <div key={i} className="rounded-2xl border bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-sm">{s.stationName || 'Estación'}</div>
                    {s.postSiteName && s.postSiteName !== s.stationName && (
                      <div className="truncate text-xs text-muted-foreground">Sede: {s.postSiteName}</div>
                    )}
                    {s.clientName && (
                      <div className="truncate text-xs text-muted-foreground">Cliente: {s.clientName}</div>
                    )}
                    {s.window && (
                      <div className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" /> {s.window}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── PERFORMANCE SUMMARY ───────────────────────────────────────────── */}
      <Section
        title="Desempeño (últimos 30 días)"
        icon={<Gauge className="h-4 w-4" />}
      >
        {perfLoading && perf === null ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Calculando desempeño…</div>
        ) : !perf?.hasData ? (
          <div className="rounded-2xl border border-dashed py-8 text-center text-sm text-muted-foreground">
            Aún no hay datos suficientes para calcular el desempeño de este vigilante.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Puntaje"
              value={`${perf.score}/100`}
              hint={TIER_LABEL[perf.tier] || perf.tier}
              accent={TIER_ACCENT[perf.tier] || 'slate'}
              icon={<Gauge />}
            />
            <StatCard
              label="Asistencia"
              value={stats.attendanceRate != null ? `${stats.attendanceRate}%` : '—'}
              hint={`${stats.shiftsWorked ?? 0}/${stats.shiftsScheduled ?? 0} turnos`}
              accent="blue"
            />
            <StatCard
              label="Horas trabajadas"
              value={stats.hoursWorked != null ? `${stats.hoursWorked} h` : '—'}
              accent="primary"
            />
            <StatCard
              label="Faltas / Atrasos"
              value={`${stats.absences ?? 0} / ${stats.tardies ?? 0}`}
              hint={
                stats.clientRatingCount
                  ? `Calif. cliente ${stats.clientRatingAvg ?? '—'} (${stats.clientRatingCount})`
                  : undefined
              }
              accent={
                (stats.absences ?? 0) > 0 || (stats.tardies ?? 0) > 0 ? 'orange' : 'green'
              }
            />
          </div>
        )}
      </Section>

      {/* ── SCHEDULE SNAPSHOT (this week) ──────────────────────────────────── */}
      <Section title="Horario esta semana" icon={<CalendarDays className="h-4 w-4" />}>
        {scheduleLoading && schedule === null ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Cargando horario…</div>
        ) : scheduleRows.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="h-5 w-5" />}
            title="Sin rotación configurada"
            description="Este vigilante no tiene una rotación de turnos configurada en su estación."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 min-w-[160px] border-b bg-card px-2 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Estación · Puesto
                    </th>
                    {days.map((d) => (
                      <th
                        key={d.date}
                        className={`border-b px-1 py-1 text-center text-[11px] font-medium ${
                          d.isToday ? 'text-primary' : d.weekend ? 'text-muted-foreground/70' : 'text-muted-foreground'
                        }`}
                      >
                        <div>{d.dow}</div>
                        <div className={`tabular-nums ${d.isToday ? 'font-bold' : ''}`}>{d.day}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scheduleRows.map((r, ri) => (
                    <tr key={ri} className="hover:bg-muted/30">
                      <td className="sticky left-0 z-10 min-w-[160px] border-b bg-card px-2 py-1.5">
                        <div className="truncate text-xs font-semibold text-foreground">{r.stationName || 'Estación'}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {r.positionName}
                          {r.positionType === 'sacafranco' ? ' · SF' : ''}
                          {r.window ? ` · ${r.window}` : ''}
                        </div>
                      </td>
                      {(r.cells || []).map((c) => {
                        const m = CELL[c.status] || CELL.none;
                        return (
                          <td key={c.date} className="border-b p-0.5 text-center">
                            <span className={`grid h-7 w-full min-w-[26px] place-items-center rounded text-[11px] font-bold ${m.cls}`}>
                              {m.label}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><span className="grid h-4 w-4 place-items-center rounded bg-sky-500/15 text-[10px] font-bold text-sky-700">D</span> Día</span>
              <span className="inline-flex items-center gap-1.5"><span className="grid h-4 w-4 place-items-center rounded bg-indigo-500/15 text-[10px] font-bold text-indigo-700">N</span> Noche</span>
              <span className="inline-flex items-center gap-1.5"><span className="grid h-4 w-4 place-items-center rounded bg-muted text-[10px] font-bold text-muted-foreground">L</span> Libre</span>
            </div>
          </>
        )}
      </Section>

      {/* ── RECENT ACTIVITY (memos feed) — REAL, kept ─────────────────────── */}
      <Section title={t('guards.summary.recentActivity.title')} icon={<Clock className="h-4 w-4" />}>
        <div className="space-y-4">
          {activitiesLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading') || 'Cargando...'}</p>
          ) : activities.length > 0 ? (
            activities.map((activity: SummaryActivity, idx: number) => (
              <div key={idx} className="flex items-start gap-3 border-b pb-3 last:border-b-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
                  {activity.initial}
                </div>
                <div className="flex-1">
                  {activity.subject && (
                    <p className="mb-0.5 text-xs font-semibold text-foreground/70">{activity.subject}</p>
                  )}
                  <p className="text-sm text-foreground">{activity.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{activity.timestamp}</p>
                </div>
                {activity.badge && (
                  <span className="rounded bg-yellow-500/15 px-2 py-1 text-xs text-yellow-800">
                    {activity.badge}
                  </span>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('guards.summary.recentActivity.empty') || 'Sin actividad reciente'}
            </p>
          )}
        </div>
      </Section>
    </div>
  );
}
