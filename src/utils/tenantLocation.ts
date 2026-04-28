/**
 * Caches the tenant's (business) default map center in localStorage so that map
 * components can center on the business city without hardcoding any coordinates.
 */

const LAT_KEY = 'tenantLat';
const LNG_KEY = 'tenantLng';

export function cacheTenantLocation(lat: number | string | null | undefined, lng: number | string | null | undefined): void {
    const latNum = typeof lat === 'string' ? parseFloat(lat) : (lat ?? NaN);
    const lngNum = typeof lng === 'string' ? parseFloat(lng) : (lng ?? NaN);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return;
    try {
        localStorage.setItem(LAT_KEY, String(latNum));
        localStorage.setItem(LNG_KEY, String(lngNum));
    } catch {}
}

export function getTenantLocation(): { lat: number; lng: number } | null {
    try {
        const lat = parseFloat(localStorage.getItem(LAT_KEY) || '');
        const lng = parseFloat(localStorage.getItem(LNG_KEY) || '');
        if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    } catch {}
    return null;
}

export function clearTenantLocation(): void {
    try {
        localStorage.removeItem(LAT_KEY);
        localStorage.removeItem(LNG_KEY);
    } catch {}
}
