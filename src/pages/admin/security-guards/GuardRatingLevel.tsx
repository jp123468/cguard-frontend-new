/**
 * Compact per-guard review "level" badge — a star + average + count. Shown on
 * every worker-detail surface (Personal asignado, guard cards/list, guard hero)
 * so a bad service pattern is visible at a glance. Clickable → the guard's
 * Perfil › Reseñas. Renders nothing when the guard has no reviews (count 0),
 * unless `showEmpty` is set (then a muted "Sin reseñas").
 */
import { Star } from 'lucide-react';

const toneFor = (avg: number) =>
  avg >= 4 ? 'text-emerald-600 bg-emerald-500/10'
    : avg >= 3 ? 'text-yellow-700 bg-yellow-500/10'
    : 'text-red-600 bg-red-500/10';

export default function GuardRatingLevel({
  average,
  count,
  onClick,
  showEmpty = false,
  className = '',
}: {
  average?: number | null;
  count?: number | null;
  onClick?: () => void;
  showEmpty?: boolean;
  className?: string;
}) {
  const has = typeof average === 'number' && (count ?? 0) > 0;
  if (!has) {
    if (!showEmpty) return null;
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground ${className}`}>
        <Star className="h-3 w-3" /> Sin reseñas
      </span>
    );
  }
  const avg = average as number;
  const inner = (
    <>
      <Star className="h-3 w-3 fill-current" />
      <span className="font-semibold tabular-nums">{avg.toFixed(1)}</span>
      <span className="opacity-70">({count})</span>
    </>
  );
  const cls = `inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${toneFor(avg)} ${className}`;
  if (onClick) {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className={`${cls} transition hover:brightness-95`}
        title="Ver reseñas del vigilante"
      >
        {inner}
      </button>
    );
  }
  return <span className={cls} title={`${avg.toFixed(2)} de 5 · ${count} reseña(s)`}>{inner}</span>;
}
