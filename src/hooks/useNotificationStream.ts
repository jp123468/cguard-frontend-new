/**
 * useNotificationStream
 *
 * Connects to the backend SSE endpoint and stores incoming notifications.
 * Auto-reconnects with exponential back-off on disconnect.
 * Returns the list of recent notifications and the live unread count.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { getAuthToken } from '@/lib/api';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) || '';

export interface PlatformNotification {
  id: string;
  eventType: string;
  title: string;
  body: string;
  payload?: any;
  sourceEntityType?: string;
  sourceEntityId?: string;
  createdAt: string;
  read?: boolean;
}

interface UseNotificationStreamResult {
  notifications: PlatformNotification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  connected: boolean;
}

const MAX_STORED = 50;
const BASE_RECONNECT_MS = 3_000;
const MAX_RECONNECT_MS = 60_000;

export function useNotificationStream(tenantId: string | null | undefined): UseNotificationStreamResult {
  const [notifications, setNotifications] = useState<PlatformNotification[]>([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(BASE_RECONNECT_MS);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    // Best-effort server mark
    if (!tenantId) return;
    const token = getAuthToken();
    fetch(`${API_URL}/${tenantId}/events/${id}/read`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => {});
  }, [tenantId]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  useEffect(() => {
    if (!tenantId) return;

    let destroyed = false;

    const connect = () => {
      if (destroyed) return;
      const token = getAuthToken();
      if (!token) return;

      const url = `${API_URL}/${tenantId}/events/stream?token=${encodeURIComponent(token)}`;
      const es = new EventSource(url);
      esRef.current = es;

      es.addEventListener('connected', () => {
        if (destroyed) return;
        setConnected(true);
        reconnectDelayRef.current = BASE_RECONNECT_MS; // reset back-off on successful connect
      });

      es.addEventListener('notification', (e: MessageEvent) => {
        if (destroyed) return;
        try {
          const notification: PlatformNotification = JSON.parse(e.data);
          setNotifications((prev) => {
            // Deduplicate by id
            if (prev.some((n) => n.id === notification.id)) return prev;
            const next = [{ ...notification, read: false }, ...prev];
            return next.slice(0, MAX_STORED);
          });
        } catch {
          // ignore malformed events
        }
      });

      es.onerror = () => {
        if (destroyed) return;
        setConnected(false);
        es.close();
        esRef.current = null;

        // Exponential back-off reconnect
        const delay = reconnectDelayRef.current;
        reconnectDelayRef.current = Math.min(delay * 2, MAX_RECONNECT_MS);
        reconnectTimerRef.current = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      destroyed = true;
      setConnected(false);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [tenantId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, markRead, markAllRead, connected };
}
