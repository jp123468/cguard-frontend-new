import { useEffect, useRef, useState } from 'react';
import securityGuardService from '@/lib/api/securityGuardService';
import userService from '@/lib/api/userService';
import { supervisorService } from '@/lib/api/supervisorService';

type Marker = { id: string; lat: number; lng: number; label?: string; role?: string };

export default function useActiveMarkers(pollInterval = 10000) {
  const [activeMarkers, setActiveMarkers] = useState<Marker[]>([]);
  const [userFallbackMarker, setUserFallbackMarker] = useState<Marker | null>(null);
  const [centerRequest, setCenterRequest] = useState<number>(0);
  // Cache the heavy list-fallback results so the 1000-row scans run at most once
  // (one-shot) instead of on every 10s poll tick.
  const guardListCache = useRef<Marker[] | null>(null);
  const userMarkersCache = useRef<Marker[] | null>(null);

  const hasTenantContext = () => {
    try {
      // tenantId is persisted to localStorage by the AuthProvider on login and
      // is the canonical source of tenant context.
      return !!localStorage.getItem('tenantId');
    } catch {
      return false;
    }
  };

  const extractCoords = (raw: any): { lat?: number; lng?: number } | null => {
    if (!raw) return null;
    const maybe = (k: string) => raw[k] ?? raw?.raw?.[k] ?? raw?.guard?.[k] ?? raw?.location?.[k] ?? undefined;
    const lat = maybe('latitude') ?? maybe('lat') ?? maybe('latitud') ?? maybe('locationLat') ?? maybe('punchInLatitude') ?? maybe('lastLatitude') ?? (raw.coords && raw.coords.lat) ?? null;
    const lng = maybe('longitude') ?? maybe('lng') ?? maybe('longitud') ?? maybe('locationLng') ?? maybe('punchInLongitude') ?? maybe('lastLongitude') ?? (raw.coords && raw.coords.lng) ?? null;
    if (lat == null || lng == null) {
      const loc = raw.location ?? raw.raw?.location ?? null;
      if (typeof loc === 'string' && loc.includes(',')) {
        const parts = loc.split(',').map((s: string) => s.trim());
        if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) return { lat: Number(parts[0]), lng: Number(parts[1]) };
      }
      return null;
    }
    return { lat: Number(lat), lng: Number(lng) };
  };

  useEffect(() => {
    let mounted = true;
    let iv: any = null;

    const loadMarkers = async () => {
      try {
        if (!hasTenantContext()) {
          if (mounted) {
            setActiveMarkers([]);
            setUserFallbackMarker(null);
          }
          return;
        }

        // Primary source: call consolidated backend endpoint that prefers guardShift coords
        const guardMarkers: Marker[] = [];
        const activeLocsRes: any = await securityGuardService.activeLocations().catch(() => null);
        const activeRows = activeLocsRes && Array.isArray(activeLocsRes.rows) ? activeLocsRes.rows : Array.isArray(activeLocsRes) ? activeLocsRes : [];

        const seenGuards = new Set<string>();
        (activeRows || []).forEach((s: any) => {
          if (!s) return;
          const guardId = s.guardId || s.guard || s.id || s.guardId;
          if (!guardId) return;
          const lat = s.latitude ?? s.lat ?? null;
          const lng = s.longitude ?? s.lng ?? null;
          if (lat == null || lng == null) return;
          const label = s.fullName || s.name || `Guard ${guardId}`;
          guardMarkers.push({ id: `guard-${guardId}`, lat: Number(lat), lng: Number(lng), label, role: 'guard' });
          seenGuards.add(String(guardId));
        });

        // If no markers from the consolidated endpoint, fall back to scanning the
        // security-guard list (in case some guards store coords on the record
        // itself). This is a heavy 1000-row fetch, so run it at most ONCE and
        // reuse the cached result on subsequent poll ticks.
        if (guardMarkers.length === 0) {
          if (guardListCache.current === null) {
            const guardsRes: any = await securityGuardService.list({ limit: 1000, offset: 0 } as any).catch(() => null);
            const guardRows = guardsRes && Array.isArray(guardsRes.rows) ? guardsRes.rows : Array.isArray(guardsRes) ? guardsRes : [];

            const fromList: Marker[] = [];
            (guardRows || []).forEach((g: any) => {
              const isOnDuty = (g.isOnDuty ?? g.onDuty ?? g.raw?.isOnDuty ?? g.raw?.onDuty) ?? false;
              if (!isOnDuty) return;
              const guardId = g && g.id;
              if (!guardId) return;
              if (seenGuards.has(String(guardId))) return;
              const coords = extractCoords(g) || extractCoords(g.raw) || null;
              if (!coords) return;
              const label = (g.name || g.fullName || g.guard?.name || g.raw?.name) ?? (g.firstName ? `${g.firstName} ${g.lastName || ''}`.trim() : `Guard ${g.id}`);
              fromList.push({ id: `guard-${g.id}`, lat: coords.lat!, lng: coords.lng!, label, role: 'guard' });
            });
            guardListCache.current = fromList;
          }
          guardMarkers.push(...guardListCache.current);
        }

        // Supervisor markers: from the supervisor listing, which returns each
        // supervisor's latitude/longitude (seeded at clock-in, refreshed by the
        // app's live-ping) + isOnDuty. Cached + reused across poll ticks.
        if (userMarkersCache.current === null) {
          const supRes: any = await supervisorService.list().catch(() => null);
          const supRows = supRes && Array.isArray(supRes.rows) ? supRes.rows : Array.isArray(supRes) ? supRes : [];
          const fromSups: Marker[] = [];
          (supRows || []).forEach((s: any) => {
            if (!s || !(s.isOnDuty ?? s.onDuty)) return;
            const lat = s.latitude ?? s.lat ?? null;
            const lng = s.longitude ?? s.lng ?? null;
            if (lat == null || lng == null) return;
            fromSups.push({ id: `sup-${s.id}`, lat: Number(lat), lng: Number(lng), label: s.fullName || `Supervisor ${s.id}`, role: 'supervisor' });
          });
          userMarkersCache.current = fromSups;
        }
        const userMarkers: Marker[] = userMarkersCache.current;

        if (!mounted) return;
        const merged = [...guardMarkers, ...userMarkers];
        setActiveMarkers(merged);

        // If none, try fallback to current user
        if ((!merged || merged.length === 0)) {
          const me = await userService.fetchCurrentUser().catch(() => null);
          const coords = me ? (extractCoords(me) || extractCoords(me.raw) || null) : null;
          if (coords && coords.lat != null && coords.lng != null) {
            setUserFallbackMarker({ id: 'self', lat: coords.lat, lng: coords.lng, label: (me && (me.name || me.fullName)) || 'Tu ubicación', role: 'self' });
            setCenterRequest(c => c + 1);
          } else {
            setUserFallbackMarker(null);
          }
        } else {
          setUserFallbackMarker(null);
        }
      } catch (e) {
        const msg = (e as any)?.message || '';
        if (!String(msg).toLowerCase().includes('debe estar vinculado')) {
          console.warn('useActiveMarkers: failed loading markers', e);
        }
      }
    };

    // Skip polling work while the tab is hidden to avoid heavy background fetches.
    const tick = () => {
      try {
        if (typeof document !== 'undefined' && document.hidden) return;
      } catch {}
      loadMarkers();
    };

    // Refresh immediately when the tab becomes visible again.
    const onVisibility = () => {
      try {
        if (typeof document !== 'undefined' && !document.hidden) loadMarkers();
      } catch {}
    };

    loadMarkers();
    iv = setInterval(tick, pollInterval);
    try { document.addEventListener('visibilitychange', onVisibility); } catch {}

    return () => {
      mounted = false;
      try { if (iv) clearInterval(iv); } catch {}
      try { document.removeEventListener('visibilitychange', onVisibility); } catch {}
    };
  }, [pollInterval]);

  return { activeMarkers, userFallbackMarker, centerRequest };
}
