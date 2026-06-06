/**
 * useNotificationStream
 *
 * Connects to the backend over **websockets** (socket.io) and stores incoming
 * notifications. On connect it seeds the recent backlog from the REST
 * `/:tenantId/events` endpoint (the websocket only pushes events emitted after
 * connection). socket.io handles auto-reconnect.
 * Returns the list of recent notifications and the live unread count.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAuthToken } from '@/lib/api';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) || '';

// The socket is served under /api/socket.io (see backend lib/realtime.ts) so it
// rides the same routing that already proxies /api to the backend.
const SOCKET_PATH = '/api/socket.io';

function socketOrigin(): string {
  try {
    return new URL(API_URL || window.location.origin, window.location.origin).origin;
  } catch {
    return window.location.origin;
  }
}

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

export function useNotificationStream(tenantId: string | null | undefined): UseNotificationStreamResult {
  const [notifications, setNotifications] = useState<PlatformNotification[]>([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const addNotification = useCallback((n: PlatformNotification, read = false) => {
    setNotifications((prev) => {
      if (prev.some((x) => x.id === n.id)) return prev;
      return [{ ...n, read }, ...prev].slice(0, MAX_STORED);
    });
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
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
    const token = getAuthToken();
    if (!token) return;

    let destroyed = false;

    // Seed the recent backlog (websocket only delivers new events post-connect).
    fetch(`${API_URL}/${tenantId}/events?limit=30`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.json() : { rows: [] }))
      .then((data) => {
        if (destroyed) return;
        const rows: any[] = data?.rows || [];
        for (const ev of rows) {
          addNotification(
            {
              id: ev.id,
              eventType: ev.eventType,
              title: ev.title,
              body: ev.body,
              payload: ev.payload,
              sourceEntityType: ev.sourceEntityType,
              sourceEntityId: ev.sourceEntityId,
              createdAt: ev.createdAt,
            },
            ev.deliveryStatus === 'read',
          );
        }
      })
      .catch(() => {});

    const socket = io(socketOrigin(), {
      path: SOCKET_PATH,
      transports: ['websocket'],
      withCredentials: true,
      auth: { token, tenantId },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      if (!destroyed) setConnected(true);
    });
    socket.on('disconnect', () => {
      if (!destroyed) setConnected(false);
    });
    socket.on('connect_error', () => {
      if (!destroyed) setConnected(false);
    });
    socket.on('notification', (n: PlatformNotification) => {
      if (destroyed || !n || !n.id) return;
      addNotification(n, false);
    });

    return () => {
      destroyed = true;
      setConnected(false);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [tenantId, addNotification]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, markRead, markAllRead, connected };
}
