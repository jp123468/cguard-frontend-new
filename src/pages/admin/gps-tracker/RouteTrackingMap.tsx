import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/utils/loadGoogleMaps";
import { mapIdIfConfigured } from "@/utils/mapMarker";

/** One plotted stop of a vehicle-patrol route (a point with valid coordinates). */
export interface RouteStopMarker {
  id: string;
  routeId: string;
  routeName: string;
  siteName: string;
  address?: string;
  lat: number;
  lng: number;
  order: number;
  done: boolean;
}

type MapType = "roadmap" | "satellite" | "hybrid" | "terrain";

/** Dark/night map style so it reads as a command-center (mirrors OperationsMap). */
const DARK_STYLE: any[] = [
  { elementType: "geometry", stylers: [{ color: "#0b1020" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0b1020" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6b7894" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#141b2e" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#3b4663" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#070b16" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#1c2740" }] },
];

/** Clean light style so the map matches light mode (soft greys, no POI clutter). */
const LIGHT_STYLE: any[] = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { elementType: "geometry", stylers: [{ color: "#eef1f6" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9aa3b2" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#d6e2f0" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#dfe4ec" }] },
];

/** Tracks the app's dark mode (ThemeContext toggles `.dark` on <html>). */
function useIsDark() {
  const get = () => typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const [dark, setDark] = useState(get);
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(get()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

/** Styled numbered pin. Green when the route ran that day, amber when pending. */
function pinSvg(color: string, label: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="12" fill="${color}" stroke="#0b1020" stroke-width="2.5"/>
    <text x="20" y="20" text-anchor="middle" dominant-baseline="central" font-family="Poppins, system-ui, sans-serif" font-size="12" font-weight="700" fill="#0b1020">${label}</text>
  </svg>`;
}

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

const DONE_COLOR = "#22c55e";
const PENDING_COLOR = "#d4a017";

/**
 * Google map for the live-tracking board: plots the day's vehicle-patrol route
 * stops, one numbered pin per stop, joined by a per-route polyline in route
 * order. Colours by run status (green = completed, amber = pending). Optional
 * geofence circles around each stop. Fully defensive: renders an empty state
 * when no stop has coordinates.
 */
export default function RouteTrackingMap({
  stops,
  mapType = "roadmap",
  showGeofence = false,
  geofenceRadius = 120,
  height = 380,
  defaultCenter,
}: {
  stops: RouteStopMarker[];
  mapType?: MapType;
  showGeofence?: boolean;
  geofenceRadius?: number;
  height?: number;
  defaultCenter?: { lat: number; lng: number; zoom?: number };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const infoRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const linesRef = useRef<any[]>([]);
  const circlesRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isDark = useIsDark();

  const styleFor = (dark: boolean) => (mapType === "roadmap" ? (dark ? DARK_STYLE : LIGHT_STYLE) : undefined);

  // one-time map init
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !ref.current) return;
        const g = (window as any).google;
        const first = stops[0];
        const initCenter = defaultCenter
          ? { lat: defaultCenter.lat, lng: defaultCenter.lng }
          : first
            ? { lat: first.lat, lng: first.lng }
            : { lat: -0.18, lng: -78.46 };
        // Cloud Map ID → cloud dark style + AdvancedMarkerElement; inline styles
        // are ignored on a mapId map so omit them. No Map ID → inline styles.
        const mapId = mapIdIfConfigured();
        mapRef.current = new g.maps.Map(ref.current, {
          center: initCenter,
          zoom: defaultCenter?.zoom ?? 12,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          clickableIcons: false,
          mapTypeId: mapType,
          ...(mapId ? { mapId } : { styles: styleFor(isDark) }),
          backgroundColor: isDark ? "#0b1020" : "#eef1f6",
        });
        infoRef.current = new g.maps.InfoWindow();
        setReady(true);
      })
      .catch((e) => setErr(e?.message || "No se pudo cargar el mapa"));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // react to map-type + theme changes. Under a Cloud Map ID the cloud style owns
  // appearance, so only the map type is applied (setting inline styles is ignored).
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    if (mapIdIfConfigured()) {
      mapRef.current.setOptions({ mapTypeId: mapType });
      return;
    }
    mapRef.current.setOptions({
      mapTypeId: mapType,
      styles: styleFor(isDark),
      backgroundColor: isDark ? "#0b1020" : "#eef1f6",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapType, isDark, ready]);

  // sync markers / polylines / geofences whenever the stops change
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const g = (window as any).google;
    const AME = g.maps.marker?.AdvancedMarkerElement;
    const useAdvanced = !!(AME && mapIdIfConfigured());

    // clear previous overlays
    markersRef.current.forEach((m) => { if (useAdvanced) m.map = null; else m.setMap(null); });
    linesRef.current.forEach((l) => l.setMap(null));
    circlesRef.current.forEach((c) => c.setMap(null));
    markersRef.current = [];
    linesRef.current = [];
    circlesRef.current = [];

    const bounds = new g.maps.LatLngBounds();
    let any = false;

    // group stops by route so each route gets its own ordered polyline
    const byRoute = new Map<string, RouteStopMarker[]>();
    stops.forEach((s) => {
      if (!byRoute.has(s.routeId)) byRoute.set(s.routeId, []);
      byRoute.get(s.routeId)!.push(s);
    });

    byRoute.forEach((group) => {
      const ordered = group.slice().sort((a, b) => a.order - b.order);
      const path: any[] = [];

      ordered.forEach((s, idx) => {
        const pos = { lat: s.lat, lng: s.lng };
        const color = s.done ? DONE_COLOR : PENDING_COLOR;
        const url = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(pinSvg(color, String(idx + 1)));
        const popup = () => {
          infoRef.current.setContent(
            `<div style="min-width:160px"><div style="font-weight:700;margin-bottom:2px">${escapeHtml(s.siteName)}</div>
             <div style="opacity:.7;font-size:12px">${escapeHtml(s.routeName)} · parada ${idx + 1}</div>
             ${s.address ? `<div style="opacity:.7;font-size:12px;margin-top:2px">${escapeHtml(s.address)}</div>` : ""}
             <div style="margin-top:6px;display:flex;align-items:center;gap:6px;font-size:12px">
               <span style="width:8px;height:8px;border-radius:9px;background:${color};display:inline-block"></span>
               <span style="opacity:.8">${s.done ? "Completada" : "Pendiente"}</span></div></div>`
          );
        };
        let marker: any;
        if (useAdvanced) {
          const img = document.createElement("img");
          img.src = url; img.width = 40; img.height = 40;
          img.style.cssText = "width:40px;height:40px;cursor:pointer";
          marker = new AME({ map: mapRef.current, position: pos, title: s.siteName, content: img });
          img.addEventListener("click", () => { popup(); infoRef.current.open({ map: mapRef.current, anchor: marker }); });
        } else {
          marker = new g.maps.Marker({ map: mapRef.current, position: pos, icon: { url, scaledSize: new g.maps.Size(40, 40), anchor: new g.maps.Point(20, 20) }, title: s.siteName });
          marker.addListener("click", () => { popup(); infoRef.current.open(mapRef.current, marker); });
        }
        markersRef.current.push(marker);

        if (showGeofence) {
          circlesRef.current.push(
            new g.maps.Circle({
              map: mapRef.current,
              center: pos,
              radius: geofenceRadius,
              strokeColor: color,
              strokeOpacity: 0.6,
              strokeWeight: 1,
              fillColor: color,
              fillOpacity: 0.1,
            }),
          );
        }

        path.push(pos);
        bounds.extend(pos);
        any = true;
      });

      if (path.length > 1) {
        const done = ordered.every((s) => s.done);
        linesRef.current.push(
          new g.maps.Polyline({
            map: mapRef.current,
            path,
            strokeColor: done ? DONE_COLOR : PENDING_COLOR,
            strokeOpacity: 0.85,
            strokeWeight: 3,
            geodesic: true,
          }),
        );
      }
    });

    if (any && !defaultCenter) {
      if (stops.length > 1) mapRef.current.fitBounds(bounds, 64);
      else mapRef.current.setCenter({ lat: stops[0].lat, lng: stops[0].lng });
    }
  }, [stops, ready, showGeofence, geofenceRadius, defaultCenter]);

  if (err) {
    return (
      <div className="grid place-items-center text-center text-sm text-muted-foreground" style={{ height }}>
        <div>
          <p>{err}</p>
          <p className="mt-1 text-xs">Verifica <code>VITE_GOOGLE_MAPS_API_KEY</code>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" style={{ height }}>
      <div ref={ref} className="absolute inset-0" />
      {ready && stops.length === 0 && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="rounded-xl bg-background/85 px-4 py-3 text-center text-sm text-muted-foreground shadow-sm backdrop-blur">
            No hay paradas con ubicación para mostrar en esta fecha.
          </div>
        </div>
      )}
    </div>
  );
}
