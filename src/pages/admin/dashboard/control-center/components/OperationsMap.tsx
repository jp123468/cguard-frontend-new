import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/utils/loadGoogleMaps";
import { mapIdIfConfigured } from "@/utils/mapMarker";
import type { MapEntity, EntityKind } from "../types";
import type { DashboardPrefs } from "../prefs";
import { iconInnerSvg } from "../iconRegistry";

/** Dark/night map style so it reads as a command-center, not a plain embed. */
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

const KIND_LABEL: Record<EntityKind, string> = {
  tenant: "Sede", station: "Puesto", supervisor: "Supervisor", guard: "Vigilante", incident: "Incidente",
};

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

/** Resolve the Google map style array from the app theme + the user override. */
function mapStyles(isDark: boolean, mapTheme: DashboardPrefs["mapTheme"]) {
  if (mapTheme === "roadmap") return isDark ? DARK_STYLE : undefined; // "estándar" still respects dark
  return isDark ? DARK_STYLE : LIGHT_STYLE;
}

function pinSvg(color: string, pulse: boolean, iconName?: string) {
  const ring = pulse
    ? `<circle cx="22" cy="22" r="11" fill="${color}" opacity="0.35"><animate attributeName="r" values="11;22" dur="1.8s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.5;0" dur="1.8s" repeatCount="indefinite"/></circle>`
    : "";
  // custom icon drawn inside the pin (scaled from a 24x24 lucide glyph)
  const glyph = iconName
    ? `<g transform="translate(13.5,13.5) scale(0.71)" fill="none" stroke="#0b1020" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${iconInnerSvg(iconName)}</g>`
    : `<circle cx="22" cy="22" r="3" fill="#0b1020"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
    ${ring}
    <circle cx="22" cy="22" r="12" fill="${color}" stroke="#0b1020" stroke-width="2.5"/>
    ${glyph}
  </svg>`;
}

export function OperationsMap({
  entities, prefs, height = 460, onSelect, defaultCenter,
}: {
  entities: MapEntity[]; prefs: DashboardPrefs; height?: number;
  onSelect?: (e: MapEntity) => void;
  defaultCenter?: { lat: number; lng: number; zoom?: number };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const infoRef = useRef<any>(null);
  const appliedCenterRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isDark = useIsDark();

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then(() => {
      if (cancelled || !ref.current) return;
      const g = (window as any).google;
      const first = entities[0];
      // Default center priority: resolved company/IP center → first entity → fallback.
      const initCenter = defaultCenter
        ? { lat: defaultCenter.lat, lng: defaultCenter.lng }
        : first ? { lat: first.lat, lng: first.lng } : { lat: -0.18, lng: -78.46 };
      if (defaultCenter) appliedCenterRef.current = `${defaultCenter.lat},${defaultCenter.lng},${defaultCenter.zoom ?? 12}`;
      // With a Cloud Map ID the appearance comes from the cloud-based map style
      // (dark) and AdvancedMarkerElement is enabled; inline `styles` are ignored
      // on such a map, so we omit them. Without a Map ID, keep the inline styles.
      const mapId = mapIdIfConfigured();
      mapRef.current = new g.maps.Map(ref.current, {
        center: initCenter,
        zoom: defaultCenter?.zoom ?? 12, disableDefaultUI: true, gestureHandling: "greedy", clickableIcons: false,
        ...(mapId ? { mapId } : { styles: mapStyles(isDark, prefs.mapTheme) }),
        backgroundColor: isDark ? "#0b1020" : "#eef1f6",
      });
      infoRef.current = new g.maps.InfoWindow();
      setReady(true);
    }).catch((e) => setErr(e?.message || "No se pudo cargar el mapa"));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // re-style live when the theme toggles or the user changes map theme.
  // No-op under a Cloud Map ID — the cloud style controls appearance and setting
  // inline `styles` on a mapId map is ignored (and warns).
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    if (mapIdIfConfigured()) return;
    mapRef.current.setOptions({
      styles: mapStyles(isDark, prefs.mapTheme),
      backgroundColor: isDark ? "#0b1020" : "#eef1f6",
    });
  }, [isDark, prefs.mapTheme, ready]);

  // recenter when the default center resolves asynchronously (company coords →
  // geocoded address → IP country). Skipped once fitBounds has framed the live
  // entities, so it never fights the operations auto-frame.
  useEffect(() => {
    if (!ready || !mapRef.current || !defaultCenter) return;
    if ((mapRef.current as any).__fitted) return;
    const sig = `${defaultCenter.lat},${defaultCenter.lng},${defaultCenter.zoom ?? 12}`;
    if (appliedCenterRef.current === sig) return;
    appliedCenterRef.current = sig;
    mapRef.current.setCenter({ lat: defaultCenter.lat, lng: defaultCenter.lng });
    if (defaultCenter.zoom) mapRef.current.setZoom(defaultCenter.zoom);
  }, [defaultCenter, ready]);

  // sync markers whenever entities/prefs change
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const g = (window as any).google;
    // Prefer AdvancedMarkerElement (needs a Cloud Map ID); fall back to the
    // legacy Marker where a mapId isn't configured or the lib is missing.
    const AME = g.maps.marker?.AdvancedMarkerElement;
    const useAdvanced = !!(AME && mapIdIfConfigured());
    const seen = new Set<string>();
    const bounds = new g.maps.LatLngBounds();
    let any = false;

    const iconUrl = (color: string, pulse: boolean, kind: EntityKind) =>
      "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(pinSvg(color, pulse, prefs.pinIcons[kind]));
    const buildContent = (url: string) => {
      const img = document.createElement("img");
      img.src = url; img.width = 44; img.height = 44;
      img.style.cssText = "width:44px;height:44px;cursor:pointer";
      return img;
    };

    entities.forEach((e) => {
      seen.add(e.id);
      const color = (e.meta && (e.meta as any).color) || prefs.pinColors[e.kind] || prefs.statusColors[e.status] || "#d4a017";
      const pulse = e.kind === "guard" || e.kind === "supervisor" || e.status === "emergency" || e.status === "incident";
      const url = iconUrl(color, pulse, e.kind);
      const openInfo = (anchor: any) => {
        infoRef.current.setContent(
          `<div class="cc-pop"><div style="font-weight:700;margin-bottom:2px">${escapeHtml(e.label)}</div>
           <div style="opacity:.7">${KIND_LABEL[e.kind]}${e.sub ? " · " + escapeHtml(e.sub) : ""}</div>
           <div style="margin-top:6px;display:flex;align-items:center;gap:6px">
             <span style="width:8px;height:8px;border-radius:9px;background:${color};display:inline-block"></span>
             <span style="opacity:.8">${e.status}</span></div></div>`
        );
        infoRef.current.open(useAdvanced ? { map: mapRef.current, anchor } : mapRef.current, useAdvanced ? undefined : anchor);
        onSelect?.(e);
      };

      let m = markersRef.current[e.id];
      if (!m) {
        if (useAdvanced) {
          const content = buildContent(url);
          m = new AME({ map: mapRef.current, position: { lat: e.lat, lng: e.lng }, title: e.label, content, zIndex: e.kind === "tenant" ? 999 : undefined });
          content.addEventListener("click", () => openInfo(m));
        } else {
          m = new g.maps.Marker({ map: mapRef.current, position: { lat: e.lat, lng: e.lng }, icon: { url, scaledSize: new g.maps.Size(44, 44), anchor: new g.maps.Point(22, 22) }, title: e.label, zIndex: e.kind === "tenant" ? 999 : undefined });
          m.addListener("click", () => openInfo(m));
        }
        markersRef.current[e.id] = m;
      } else if (useAdvanced) {
        m.position = { lat: e.lat, lng: e.lng };
        if (m.content && (m.content as HTMLImageElement).src !== undefined) (m.content as HTMLImageElement).src = url;
      } else {
        m.setPosition({ lat: e.lat, lng: e.lng });
        m.setIcon({ url, scaledSize: new g.maps.Size(44, 44), anchor: new g.maps.Point(22, 22) });
      }
      bounds.extend({ lat: e.lat, lng: e.lng });
      any = true;
    });

    // remove stale markers
    Object.keys(markersRef.current).forEach((id) => {
      if (!seen.has(id)) {
        const stale = markersRef.current[id];
        if (useAdvanced) stale.map = null; else stale.setMap(null);
        delete markersRef.current[id];
      }
    });

    if (any && !(mapRef.current as any).__fitted && entities.length > 1) {
      mapRef.current.fitBounds(bounds, 64);
      (mapRef.current as any).__fitted = true;
    }
  }, [entities, prefs, ready, onSelect]);

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
      <div ref={ref} className="absolute inset-0 rounded-b-2xl" />
      {/* glass vignette so the map blends into the panel */}
      <div className="pointer-events-none absolute inset-0 rounded-b-2xl"
        style={{ boxShadow: "inset 0 0 80px 10px color-mix(in oklab, var(--background) 70%, transparent)" }} />
    </div>
  );
}

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
