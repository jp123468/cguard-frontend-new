import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, Gift, Loader2 } from 'lucide-react';
import PerformanceService from '@/services/performance.service';
import type { GuardPerformance } from '../../guardDetailTypes';

type FactorKey =
  | 'punctuality'
  | 'uniform'
  | 'inventory'
  | 'consignas'
  | 'rondas'
  | 'quiz'
  | 'training';

const FACTOR_COLOR: Record<FactorKey, string> = {
  punctuality: '#38bdf8',
  uniform: '#22c55e',
  inventory: '#14b8a6',
  consignas: '#d4a017',
  rondas: '#a855f7',
  quiz: '#6366f1',
  training: '#f97316',
};

const TIER_COLOR: Record<string, string> = {
  excellent: '#22c55e',
  good: '#d4a017',
  fair: '#f97316',
  needs_improvement: '#ef4444',
};

type Props = {
  securityGuardId?: string;
  /** When set, scores a supervisor user id instead of a guard record. */
  supervisorUserId?: string;
  period?: number;
};

/**
 * Read-only 8-factor performance panel for the admin guard detail. Additive —
 * sits alongside the existing KPI tooling.
 */
export default function GuardPerformancePanel({
  securityGuardId,
  supervisorUserId,
  period = 30,
}: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [perf, setPerf] = useState<GuardPerformance | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const id = supervisorUserId || securityGuardId;
    if (!id) return;
    setLoading(true);
    setError(null);
    const req = supervisorUserId
      ? PerformanceService.getSupervisor(supervisorUserId, period)
      : PerformanceService.getGuard(securityGuardId as string, period);
    req
      .then((res: { data?: GuardPerformance } | GuardPerformance) => {
        if (!active) return;
        const p = (res && 'data' in res ? res.data : res) as GuardPerformance | undefined;
        setPerf(p && typeof p.score === 'number' ? p : null);
      })
      .catch((e: unknown) => active && setError((e instanceof Error ? e.message : null) || 'error'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [securityGuardId, supervisorUserId, period]);

  if (loading) {
    return (
      <div className="bg-card border rounded-lg p-6 shadow-sm flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={20} />
      </div>
    );
  }
  if (error || !perf) return null;

  const tierColor = TIER_COLOR[perf.tier] || '#888';
  const penalty = perf.penalty || { points: 0, absences: 0, tardies: 0 };
  const bonus = perf.bonus || { points: 0, volunteerCount: 0, coverCount: 0 };
  const components: Array<{ key: FactorKey; score: number; weight: number }> =
    perf.components || [];

  return (
    <div className="bg-card border rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <TrendingUp size={16} />
          {t('performance.title', 'Indicador de desempeño')}
        </h3>
        <span className="text-xs text-muted-foreground">
          {t('performance.period', 'Últimos {{n}} días', { n: period })}
        </span>
      </div>

      {!perf.hasData ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          {t(
            'performance.noData',
            'Aún no hay datos suficientes para calcular el desempeño.',
          )}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6">
          {/* Score + tier */}
          <div className="flex flex-col items-center justify-center">
            <div
              className="flex h-28 w-28 items-center justify-center rounded-full border-4"
              style={{ borderColor: tierColor, color: tierColor }}
            >
              <span className="text-3xl font-bold">{perf.score}</span>
            </div>
            <span
              className="mt-3 rounded-full border px-3 py-1 text-xs font-semibold"
              style={{
                color: tierColor,
                borderColor: `${tierColor}66`,
                background: `${tierColor}14`,
              }}
            >
              {t(`performance.tier.${perf.tier}`, perf.tier) as string}
            </span>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {penalty.points > 0 && (
                <span className="flex items-center gap-1 rounded-md border border-red-500/40 bg-red-500/5 px-2 py-1 text-[11px] font-semibold text-red-500">
                  <TrendingDown size={12} />
                  −{penalty.points} ({penalty.absences}
                  {t('performance.absShort', 'f')}/{penalty.tardies}
                  {t('performance.lateShort', 'a')})
                </span>
              )}
              {bonus.points > 0 && (
                <span className="flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/5 px-2 py-1 text-[11px] font-semibold text-emerald-500">
                  <Gift size={12} />+{bonus.points}
                </span>
              )}
            </div>
          </div>

          {/* Factor breakdown */}
          <div className="space-y-2.5">
            {components.map((c) => (
              <div key={c.key}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-foreground">
                    {t(`performance.factor.${c.key}`, c.key)}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {c.score}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(0, Math.min(100, c.score))}%`,
                      background: FACTOR_COLOR[c.key] || '#888',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
