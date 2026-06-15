import { useState } from 'react';
import { Bell, BellOff, Trash2, Wifi, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useFileUrl } from '@/lib/fileUrl';
import type { PlatformNotification } from '@/hooks/useNotificationStream';
import { targetForNotification } from './notificationToast';

interface NotificationsPanelProps {
  notifications: PlatformNotification[];
  unreadCount: number;
  connected: boolean;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'Ahora';
  if (m < 60) return `Hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h}h`;
  return `Hace ${Math.floor(h / 24)}d`;
}

export function NotificationsPanel({
  notifications,
  unreadCount,
  connected,
  onMarkRead,
  onMarkAllRead,
}: NotificationsPanelProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  // The bell is an UNREAD inbox: reading or clearing removes items from here
  // (they remain in the Actividad history). "Clear all" persists to the DB.
  const visible = notifications.filter((n) => !n.read);

  const handleOpen = (n: PlatformNotification) => {
    if (!n.read) onMarkRead(n.id);
    setOpen(false);
    navigate(targetForNotification(n));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10"
          aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
        >
          {connected ? (
            <Bell className={cn('h-6 w-6', unreadCount > 0 && 'text-foreground')} />
          ) : (
            <BellOff className="h-6 w-6 text-muted-foreground" />
          )}
          {unreadCount > 0 && (
            <>
              {/* pulsing ring to draw the eye when something is unread */}
              <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-destructive/60 animate-ping" />
              <Badge
                variant="destructive"
                className="absolute -top-0.5 -right-0.5 h-5 min-w-5 px-1 text-[11px] font-bold flex items-center justify-center rounded-full ring-2 ring-background"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            </>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-96 p-0"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Notificaciones</span>
            <span
              className={cn(
                'flex items-center gap-1 text-xs',
                connected ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground',
              )}
            >
              {connected ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              {connected ? 'En vivo' : 'Reconectando…'}
            </span>
          </div>
          {visible.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
              onClick={onMarkAllRead}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Limpiar todo
            </Button>
          )}
        </div>

        {/* Notification list */}
        <ScrollArea className="h-[420px]">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm gap-2">
              <Bell className="h-8 w-8 opacity-30" />
              <span>Sin notificaciones</span>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {visible.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onOpen={handleOpen}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function NotificationItem({
  notification: n,
  onOpen,
}: {
  notification: PlatformNotification;
  onOpen: (n: PlatformNotification) => void;
}) {
  // Migrated to token URLs: NotificationItem is a component, so a hook is safe.
  // payload carries only a raw privateUrl string, so useFileUrl fetches a token.
  const photoUrl = useFileUrl(n.payload?.photoUrl);
  return (
    <div
      className={cn(
        'px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50',
        !n.read && 'bg-primary/5',
      )}
      onClick={() => onOpen(n)}
    >
      <div className="flex items-start justify-between gap-2">
        {photoUrl && (
          <img
            src={photoUrl}
            alt=""
            loading="lazy"
            className="h-11 w-11 shrink-0 rounded-md border border-border object-cover"
            onError={(e) => ((e.currentTarget.style.display = 'none'))}
          />
        )}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'text-sm leading-snug truncate',
              !n.read ? 'font-semibold text-foreground' : 'font-normal text-foreground',
            )}
          >
            {n.title}
          </p>
          {n.body && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {n.body}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
            {timeAgo(n.createdAt)}
          </span>
          {!n.read && (
            <span className="h-2 w-2 rounded-full bg-primary" />
          )}
        </div>
      </div>
    </div>
  );
}
