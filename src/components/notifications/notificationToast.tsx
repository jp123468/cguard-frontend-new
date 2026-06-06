import { toast } from 'sonner';
import { LogIn, LogOut, AlertTriangle, Route, CalendarClock, UserCheck, Siren, Bell, X } from 'lucide-react';
import { fileUrlFromPrivate } from '@/lib/fileUrl';
import type { PlatformNotification } from '@/hooks/useNotificationStream';

function iconFor(eventType: string): { Icon: typeof Bell; color: string } {
  const t = (eventType || '').toLowerCase();
  if (t === 'guard.checkin') return { Icon: LogIn, color: '#22c55e' };
  if (t === 'guard.checkout') return { Icon: LogOut, color: '#64748b' };
  if (t.startsWith('incident')) return { Icon: AlertTriangle, color: '#ef4444' };
  if (t.startsWith('patrol')) return { Icon: Route, color: '#a855f7' };
  if (t.startsWith('shift') || t.startsWith('timeoff')) return { Icon: CalendarClock, color: '#0ea5e9' };
  if (t.startsWith('visitor')) return { Icon: UserCheck, color: '#38bdf8' };
  if (t.startsWith('dispatch')) return { Icon: Siren, color: '#e11d48' };
  return { Icon: Bell, color: '#0ea5e9' };
}

function localDay(dateStr: string): string {
  const d = new Date(dateStr);
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mo}-${da}`;
}

/** Where clicking the alert should take you (clock-in/out → that day's attendance). */
export function targetForNotification(n: PlatformNotification): string | null {
  if (n.eventType === 'guard.checkin' || n.eventType === 'guard.checkout') {
    const params = new URLSearchParams({ date: localDay(n.createdAt) });
    if (n.sourceEntityId) params.set('focus', n.sourceEntityId);
    return `/attendance?${params.toString()}`;
  }
  return null;
}

/**
 * Fire a custom in-CRM alert when a live notification arrives. Shows the full
 * details (icon/photo, title, body) and navigates to the event on click.
 */
export function showNotificationToast(
  n: PlatformNotification,
  navigate?: (to: string) => void,
) {
  const { Icon, color } = iconFor(n.eventType);
  const photoUrl = fileUrlFromPrivate(n.payload?.photoUrl);
  const target = targetForNotification(n);

  toast.custom(
    (id) => (
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          if (target && navigate) navigate(target);
          toast.dismiss(id);
        }}
        className="flex w-[360px] max-w-[88vw] cursor-pointer items-start gap-3 rounded-xl border border-border bg-background p-3 shadow-lg ring-1 ring-black/5 transition-colors hover:bg-muted/40"
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt=""
            className="h-12 w-12 shrink-0 rounded-lg border border-border object-cover"
            onError={(e) => ((e.currentTarget.style.display = 'none'))}
          />
        ) : (
          <span
            className="grid h-12 w-12 shrink-0 place-items-center rounded-lg"
            style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}
          >
            <Icon size={20} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-foreground">{n.title}</p>
          {n.body && (
            <p className="mt-0.5 line-clamp-3 text-xs text-muted-foreground">{n.body}</p>
          )}
          <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">Ahora</p>
        </div>
        <button
          aria-label="Cerrar"
          onClick={(e) => {
            e.stopPropagation();
            toast.dismiss(id);
          }}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>
    ),
    { duration: 8000 },
  );
}
