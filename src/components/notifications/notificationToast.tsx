import { toast } from 'sonner';
import { LogIn, LogOut, AlertTriangle, Route, CalendarClock, UserCheck, Siren, Bell, X, MessageSquare, ClipboardList } from 'lucide-react';
import { fileUrlFromPrivate } from '@/lib/fileUrl';
import type { PlatformNotification } from '@/hooks/useNotificationStream';

function iconFor(eventType: string): { Icon: typeof Bell; color: string } {
  const t = (eventType || '').toLowerCase();
  if (t === 'guard.checkin') return { Icon: LogIn, color: '#22c55e' };
  if (t === 'guard.checkout') return { Icon: LogOut, color: '#64748b' };
  if (t === 'attendance.clockout_requested') return { Icon: LogOut, color: '#f59e0b' };
  if (t.startsWith('incident')) return { Icon: AlertTriangle, color: '#ef4444' };
  if (t.startsWith('patrol')) return { Icon: Route, color: '#a855f7' };
  if (t.startsWith('shift') || t.startsWith('timeoff')) return { Icon: CalendarClock, color: '#0ea5e9' };
  if (t.startsWith('visitor')) return { Icon: UserCheck, color: '#38bdf8' };
  if (t.startsWith('dispatch')) return { Icon: Siren, color: '#e11d48' };
  if (t.startsWith('message')) return { Icon: MessageSquare, color: '#C8860A' };
  if (t.startsWith('task')) return { Icon: ClipboardList, color: '#f59e0b' };
  return { Icon: Bell, color: '#0ea5e9' };
}

function localDay(dateStr: string): string {
  const d = new Date(dateStr);
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mo}-${da}`;
}

/**
 * Where clicking a notification should take you. Every event resolves to a
 * destination so the alert (and the panel) is always actionable; the Actividad
 * feed is the catch-all, focused on the event.
 */
export function targetForNotification(n: PlatformNotification): string {
  const type = (n.eventType || '').toLowerCase();
  const id = n.sourceEntityId;

  // Requests that need a supervisor DECISION → the Nómina approvals queue,
  // focused on the specific request. Includes LATE clock-in requests
  // (attendance.clockin_requested) and early clock-out requests. Must precede
  // the generic attendance rule below (which otherwise sends them to records).
  if (
    type === 'attendance.clockin_requested' ||
    type === 'attendance.clockout_requested' ||
    type === 'attendance.approval_required' ||
    type === 'attendance.correction_submitted'
  ) {
    return id ? `/nomina/approvals?focus=${id}` : '/nomina/approvals';
  }

  // Clock-in/out + attendance exceptions → the Nómina attendance records, focused.
  if (
    type === 'guard.checkin' ||
    type === 'guard.checkout' ||
    type.startsWith('attendance')
  ) {
    const params = new URLSearchParams({ date: localDay(n.createdAt) });
    if (id) params.set('focus', id);
    return `/nomina/records?${params.toString()}`;
  }
  if (type.startsWith('incident')) return id ? `/reports/incident/${id}` : '/activities';
  if (type.startsWith('message')) {
    const cid = n.payload?.conversationId;
    return cid ? `/messenger?conversation=${cid}` : '/messenger';
  }
  if (type.startsWith('visitor')) return '/visitors';
  if (type.startsWith('patrol')) return '/vehicle-patrol';
  if (type.startsWith('device')) return '/security-guards';
  // Client tasks: a pending one needs a DECISION → the approvals queue; the rest →
  // the tracking list. Focused on the task.
  if (type === 'task.pending_approval') {
    return id ? `/tasks/approvals?focus=${id}` : '/tasks/approvals';
  }
  if (type.startsWith('task')) return id ? `/tasks?focus=${id}` : '/tasks';

  // Everything else → the Actividad feed, focused on this event.
  const params = new URLSearchParams();
  if (id) params.set('focus', id);
  const qs = params.toString();
  return qs ? `/activities?${qs}` : '/activities';
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
  // NOTE (token migration): this is a plain imperative function (not a React
  // component), so the `useFileUrl` hook can't be used here, and the live
  // notification payload carries only a raw `photoUrl` privateUrl string (no
  // companion `downloadUrl`). Left on `fileUrlFromPrivate` as a documented
  // transitional fallback. If FILE_DOWNLOAD_REQUIRE_TOKEN is enabled, the
  // backend should start emitting a token `downloadUrl` in the notification
  // payload instead — switch to that field here when it's available.
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
