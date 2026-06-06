import { Bell, BellOff, CheckCheck, Wifi, WifiOff } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { fileUrlFromPrivate } from '@/lib/fileUrl';
import type { PlatformNotification } from '@/hooks/useNotificationStream';

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
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
        >
          {connected ? (
            <Bell className="h-5 w-5" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px] flex items-center justify-center rounded-full"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
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
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
              onClick={onMarkAllRead}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todo
            </Button>
          )}
        </div>

        {/* Notification list */}
        <ScrollArea className="h-[420px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm gap-2">
              <Bell className="h-8 w-8 opacity-30" />
              <span>Sin notificaciones</span>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onMarkRead={onMarkRead}
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
  onMarkRead,
}: {
  notification: PlatformNotification;
  onMarkRead: (id: string) => void;
}) {
  const photoUrl = fileUrlFromPrivate(n.payload?.photoUrl);
  return (
    <div
      className={cn(
        'px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50',
        !n.read && 'bg-primary/5',
      )}
      onClick={() => !n.read && onMarkRead(n.id)}
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
