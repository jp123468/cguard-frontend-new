import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '@/layouts/app-layout';
import GuardsLayout from '@/layouts/GuardsLayout';
import GuardSummary from '@/pages/admin/security-guards/components/GuardSummary/GuardSummarypage';
import { useEffect, useState } from 'react';
import securityGuardService from '@/lib/api/securityGuardService';
import guardRatingService from '@/lib/api/guardRatingService';
import GuardRatingLevel from '@/pages/admin/security-guards/GuardRatingLevel';
import { fileUrlFromFile } from '@/lib/fileUrl';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const GOLD = '#C8860A';

// ── Small presentational helpers ────────────────────────────────────────────
const StatTile = ({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  accent?: 'gold' | 'green' | 'blue' | 'muted';
  icon: React.ReactNode;
}) => {
  const ring =
    accent === 'gold'
      ? 'bg-primary/10 text-primary'
      : accent === 'green'
        ? 'bg-green-500/10 text-green-600'
        : accent === 'blue'
          ? 'bg-blue-500/10 text-blue-600'
          : 'bg-muted text-muted-foreground';
  return (
    <div className="bg-card border rounded-2xl p-4 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow">
      <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${ring}`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground truncate">{label}</div>
        <div className="font-semibold text-lg tracking-tight truncate">{value}</div>
      </div>
    </div>
  );
};

export default function GuardResumenPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [guard, setGuard] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState<{ average: number; count: number } | null>(null);
  useEffect(() => {
    if (!id) return;
    let alive = true;
    guardRatingService.summary([id]).then((m) => { if (alive) setRating(m[id] || null); }).catch(() => {});
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    securityGuardService
      .get(id)
      .then((data: any) => {
        if (!mounted) return;
        const g = data.guard ?? data;
        const fullName = g.fullName ?? `${g.firstName ?? ''} ${g.lastName ?? ''}`.trim();
        // The photo comes back on the TOP-LEVEL response as `profileImage` (a signed
        // file array), NOT on the nested `guard` user — flatten it to `photoUrl` so the
        // avatar here AND the <GuardSummary guard={guard}> child both render it.
        const pi = data.profileImage ?? g.profileImage;
        const photoFile = Array.isArray(pi) ? pi[0] : pi;
        const photoUrl = data.photoUrl ?? g.photoUrl ?? fileUrlFromFile(photoFile) ?? null;
        setGuard({ ...g, fullName, photoUrl });
      })
      .catch((err: any) => {
        console.error('Error cargando vigilante:', err);
        toast.error(t('guards.overview.loadError'));
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  // ── Derived presentation values (from data the page already loads) ──────────
  const fullName = guard?.fullName || t('guards.profile.nav') || 'Vigilante';
  const initials =
    (fullName || '')
      .split(' ')
      .map((s: string) => s[0] || '')
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'G';
  const avatar = guard?.photoUrl || null;
  const onDuty = !!(guard?.isOnDuty ?? guard?.guard?.isOnDuty);
  const gStatus = guard?.status ?? guard?.guard?.status;
  const hasPassword = guard?.hasPassword ?? guard?.guard?.hasPassword;
  const isActivated = hasPassword && gStatus === 'active';

  const accessBadge = isActivated
    ? {
        txt: t('guards.profile.access.statusActive') || 'App activa',
        cls: 'bg-green-500/15 text-green-700',
        dot: 'bg-green-500',
      }
    : {
        txt: t('guards.profile.access.statusPending') || 'Acceso pendiente',
        cls: 'bg-orange-500/15 text-orange-700',
        dot: 'bg-orange-500',
      };

  const assignedSites = guard?.assignedSitesCount ?? 1;
  const completedRoutes = guard?.completedRoutes ?? 0;
  const reportsSent = guard?.reportsSent ?? 0;
  const guardNumber = guard?.guardNumber ?? guard?.employeeCode ?? '—';

  return (
    <AppLayout>
      <GuardsLayout navKey="keep-safe" title={t('guards.nav.resumen')}>
        <div className="mx-auto max-w-5xl space-y-6">
          {loading ? (
            <div className="space-y-6">
              <div className="h-44 rounded-2xl border bg-gradient-to-br from-card to-muted/40 animate-pulse" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-[72px] rounded-2xl border bg-card animate-pulse" />
                ))}
              </div>
              <div className="text-center text-sm text-muted-foreground">{t('guards.overview.loading')}</div>
            </div>
          ) : guard ? (
            <>
              {/* ── HERO ───────────────────────────────────────────────────── */}
              <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card to-muted/40 shadow-sm">
                <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-r from-primary/15 to-transparent" />
                <div className="relative p-6 flex flex-col sm:flex-row items-center sm:items-end gap-5">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-2xl bg-muted ring-4 ring-background overflow-hidden flex items-center justify-center shadow-md text-2xl font-semibold text-foreground/70">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={fullName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>
                    <span
                      className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full ring-2 ring-background ${onDuty ? 'bg-green-500' : 'bg-gray-400'}`}
                      title={onDuty ? 'En servicio' : 'Fuera de servicio'}
                    />
                  </div>

                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <h1 className="text-2xl font-bold tracking-tight truncate">{fullName}</h1>
                    <div className="mt-1 flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>
                        {t('guards.summary.header.guardNumber')}:{' '}
                        <span className="font-medium text-foreground">{guardNumber}</span>
                      </span>
                      <span className="truncate">{guard?.role ?? t('guards.summary.roleDefault')}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${onDuty ? 'bg-green-500/15 text-green-700' : 'bg-muted text-foreground/60'}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${onDuty ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {onDuty ? 'En servicio' : 'Fuera de servicio'}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${accessBadge.cls}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${accessBadge.dot}`} />
                        {accessBadge.txt}
                      </span>
                      <GuardRatingLevel
                        average={rating?.average}
                        count={rating?.count}
                        showEmpty
                        onClick={id ? () => navigate(`/guards/${id}/reviews`) : undefined}
                      />
                      {guard?.createdAt && (
                        <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-medium text-muted-foreground">
                          {t('guards.summary.header.addedOn')}:{' '}
                          {new Date(guard.createdAt).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'short',
                            day: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── SUMMARY STAT TILES ─────────────────────────────────────── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatTile
                  label={t('guards.profile.cards.appAccess') || 'Acceso a la app'}
                  value={isActivated ? (t('guards.profile.access.statusActive') || 'Activa') : (t('guards.profile.access.statusPending') || 'Pendiente')}
                  accent={isActivated ? 'green' : 'muted'}
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0-1.105.895-2 2-2s2 .895 2 2v2M5 13h14a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4a2 2 0 012-2z" />
                    </svg>
                  }
                />
                <StatTile
                  label={onDuty ? (t('guards.summary.onDuty') || 'En servicio') : (t('guards.summary.offDuty') || 'Servicio')}
                  value={onDuty ? (t('guards.summary.onDutyYes') || 'Sí') : (t('guards.summary.onDutyNo') || 'No')}
                  accent={onDuty ? 'green' : 'muted'}
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
                <StatTile
                  label={t('guards.summary.stats.metrics.assignedSites') || 'Sitios asignados'}
                  value={assignedSites}
                  accent="blue"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  }
                />
                <StatTile
                  label={t('guards.summary.stats.metrics.reportsSent') || 'Reportes enviados'}
                  value={reportsSent || completedRoutes}
                  accent="gold"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                />
              </div>

              {/* ── DETAILED STATS + ACTIVITY (unchanged functionality) ────── */}
              <GuardSummary guard={guard} />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-16 rounded-2xl border bg-card shadow-sm">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-sm font-medium text-foreground">{t('guards.overview.loadError')}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {t('guards.overview.empty') || 'Sin información del vigilante todavía.'}
              </div>
            </div>
          )}
        </div>
      </GuardsLayout>
    </AppLayout>
  );
}
