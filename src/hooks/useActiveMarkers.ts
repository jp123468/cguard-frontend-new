import { useEffect, useState } from 'react';
import securityGuardService from '@/lib/api/securityGuardService';
import userService from '@/lib/api/userService';

type Marker = { id: string; lat: number; lng: number; label?: string; role?: string };

export default function useActiveMarkers(pollInterval = 10000) {
  const [activeMarkers, setActiveMarkers] = useState<Marker[]>([]);
  const [userFallbackMarker, setUserFallbackMarker] = useState<Marker | null>(null);
  const [centerRequest, setCenterRequest] = useState<number>(0);

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
        // Primary source: call consolidated backend endpoint that prefers guardShift coords
        const guardMarkers: Marker[] = [];
        const activeLocsRes: any = await securityGuardService.activeLocations().catch(() => null);
        const activeRows = activeLocsRes && Array.isArray(activeLocsRes.rows) ? activeLocsRes.rows : Array.isArray(activeLocsRes) ? activeLocsRes : [];
        try { console.debug('useActiveMarkers: activeLocations items:', (activeRows || []).length); } catch (e) {}
        try { console.info('useActiveMarkers: activeLocations sample:', (activeRows || []).slice(0, 5)); } catch (e) {}

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

        // If no markers, fallback to scanning security-guard list (in case some guards
        // have coordinates stored on the guard record itself).
        if (guardMarkers.length === 0) {
          const guardsRes: any = await securityGuardService.list({ limit: 1000, offset: 0 } as any).catch(() => null);
          const guardRows = guardsRes && Array.isArray(guardsRes.rows) ? guardsRes.rows : Array.isArray(guardsRes) ? guardsRes : [];
          try { console.debug('useActiveMarkers: guardsRes items:', (guardRows || []).length); } catch (e) {}
          try { console.info('useActiveMarkers: guardsRes sample:', (guardRows || []).slice(0, 5)); } catch (e) {}

          (guardRows || []).forEach((g: any) => {
            const isOnDuty = (g.isOnDuty ?? g.onDuty ?? g.raw?.isOnDuty ?? g.raw?.onDuty) ?? false;
            if (!isOnDuty) return;
            const guardId = g && g.id;
            if (!guardId) return;
            if (seenGuards.has(String(guardId))) return;
            const coords = extractCoords(g) || extractCoords(g.raw) || null;
            try { console.debug(`useActiveMarkers: guard id=${g && g.id} isOnDuty=${Boolean(isOnDuty)} coords=${coords ? JSON.stringify(coords) : 'null'}`); } catch (e) {}
            if (!coords) return;
            const label = (g.name || g.fullName || g.guard?.name || g.raw?.name) ?? (g.firstName ? `${g.firstName} ${g.lastName || ''}`.trim() : `Guard ${g.id}`);
            guardMarkers.push({ id: `guard-${g.id}`, lat: coords.lat!, lng: coords.lng!, label, role: 'guard' });
          });
        }

        const usersRes: any[] = await userService.listUsers({ limit: 1000, offset: 0 }).catch(() => []);
        try { console.debug('useActiveMarkers: usersRes items:', (usersRes || []).length); } catch (e) {}
        const userMarkers: Marker[] = [];
        (usersRes || []).forEach((u: any) => {
          const roles = (u.roles || u.role || u.rolesList || []).map ? (u.roles || u.role || u.rolesList) : (u.roles ?? u.role ?? []);
          const rolesStr = Array.isArray(roles) ? roles.map((r: any) => (typeof r === 'string' ? r : (r && (r.name || r.role) ? (r.name || r.role) : '') )).join(',').toLowerCase() : String(roles).toLowerCase();
          const isSupervisor = rolesStr.includes('supervisor');
          const isOnDuty = (u.isOnDuty ?? u.onDuty ?? u.raw?.isOnDuty) ?? false;
          if (!isSupervisor || !isOnDuty) return;
          const coords = extractCoords(u) || extractCoords(u.raw) || null;
          if (!coords) return;
          const label = (u.name || u.fullName || u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : `User ${u.id}`) as string;
          userMarkers.push({ id: `user-${u.id}`, lat: coords.lat!, lng: coords.lng!, label, role: 'supervisor' });
        });

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
        console.warn('useActiveMarkers: failed loading markers', e);
      }
    };

    loadMarkers();
    iv = setInterval(loadMarkers, pollInterval);

    return () => {
      mounted = false;
      try { if (iv) clearInterval(iv); } catch {}
    };
  }, [pollInterval]);

  return { activeMarkers, userFallbackMarker, centerRequest };
}
