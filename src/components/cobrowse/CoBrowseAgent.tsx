/**
 * CoBrowseAgent — runs in the TENANT's CRM. It sits idle until a superadmin
 * starts watching this user's session (backend emits `cobrowse:start`). Then it
 * records the page with rrweb (DOM + cursor/clicks/scroll), streams the events
 * over socket.io, and shows a visible "Soporte está viendo tu sesión" banner so
 * the user always knows they're being observed (consent-by-transparency).
 *
 * rrweb is dynamically imported: it only loads when a support session actually
 * starts, so it costs nothing to normal users. Inputs are masked by default so
 * typed values (passwords, personal data) are never streamed.
 *
 * Mounted once at the app root; no-op when unauthenticated.
 */
import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getAuthToken } from '@/lib/api';
import { Eye } from 'lucide-react';

const SOCKET_PATH = '/api/socket.io';
const API_URL = (import.meta.env.VITE_API_URL as string | undefined) || '';
function socketOrigin(): string {
  try {
    return new URL(API_URL || window.location.origin, window.location.origin).origin;
  } catch {
    return window.location.origin;
  }
}

export default function CoBrowseAgent() {
  const [watchedBy, setWatchedBy] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const stopRecordRef = useRef<null | (() => void)>(null);
  const bufferRef = useRef<any[]>([]);
  const flushTimerRef = useRef<any>(null);

  useEffect(() => {
    const token = getAuthToken();
    const tenantId = (() => { try { return localStorage.getItem('tenantId') || ''; } catch { return ''; } })();
    if (!token || !tenantId) return;

    const socket = io(socketOrigin(), {
      path: SOCKET_PATH,
      transports: ['websocket'],
      withCredentials: true,
      auth: { token, tenantId },
    });
    socketRef.current = socket;

    const flush = () => {
      if (!bufferRef.current.length || !socket.connected) return;
      const batch = bufferRef.current;
      bufferRef.current = [];
      socket.emit('cobrowse:event', { events: batch });
    };

    const startRecording = async (fresh: boolean) => {
      // Already recording → just push a fresh full snapshot for a late watcher.
      if (stopRecordRef.current) {
        if (fresh) {
          try {
            const rr: any = await import('rrweb');
            (rr.record as any)?.takeFullSnapshot?.(true);
          } catch { /* ignore */ }
        }
        return;
      }
      try {
        const rr: any = await import('rrweb');
        const stop = rr.record({
          emit(event: any) {
            bufferRef.current.push(event);
            if (bufferRef.current.length >= 40) flush();
          },
          sampling: { mousemove: 40, scroll: 150, input: 'last' },
          maskAllInputs: true,       // never stream typed values
          recordCanvas: false,
          collectFonts: false,
        });
        stopRecordRef.current = typeof stop === 'function' ? stop : null;
        flushTimerRef.current = setInterval(flush, 250);
      } catch (e) {
        // rrweb failed to load — fail closed (no stream), never break the CRM.
        // eslint-disable-next-line no-console
        console.warn('[cobrowse] recorder unavailable', e);
      }
    };

    const stopRecording = () => {
      try { stopRecordRef.current?.(); } catch { /* ignore */ }
      stopRecordRef.current = null;
      if (flushTimerRef.current) { clearInterval(flushTimerRef.current); flushTimerRef.current = null; }
      bufferRef.current = [];
    };

    socket.on('cobrowse:start', (p: { by?: string; fresh?: boolean } = {}) => {
      setWatchedBy(p.by || 'Soporte');
      startRecording(!!p.fresh);
    });
    socket.on('cobrowse:stop', () => {
      setWatchedBy(null);
      stopRecording();
    });

    return () => {
      stopRecording();
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  if (!watchedBy) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[9999] flex items-center justify-center gap-2 bg-amber-500 px-3 py-1.5 text-center text-xs font-semibold text-black shadow-md"
      style={{ paddingTop: 'max(6px, env(safe-area-inset-top))' }}
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-600 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
      </span>
      <Eye className="h-3.5 w-3.5" />
      Soporte ({watchedBy}) está viendo tu sesión en vivo para ayudarte.
    </div>
  );
}
