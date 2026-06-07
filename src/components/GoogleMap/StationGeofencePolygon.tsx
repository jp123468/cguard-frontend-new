import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/utils/loadGoogleMaps";
import { getTenantLocation } from "@/utils/tenantLocation";
import { Undo2, Trash2, MapPin } from "lucide-react";

export type PolyPoint = { lat: number; lng: number };

const FALLBACK = { lat: -0.2295, lng: -78.5236 }; // Quito

/**
 * Polygon geofence editor on Google Maps. Click the map to drop vertices; a
 * numbered marker is dropped at each point and the polygon (or in-progress line)
 * renders live. The polygon is editable — drag a vertex or the midpoint handles
 * to adjust. "Deshacer" removes the last point, "Limpiar" resets.
 *
 * Implementation note: uses CLASSIC google.maps.Marker / Polyline / Polygon on a
 * map created WITHOUT a mapId. AdvancedMarkerElement + a cloud mapId silently
 * render nothing when the mapId isn't valid for the key — that was the original
 * "I can't see what I'm drawing" bug. Classic overlays always render.
 */
export default function StationGeofencePolygon({
  value,
  onChange,
  centerLat,
  centerLng,
}: {
  value: PolyPoint[];
  onChange: (pts: PolyPoint[]) => void;
  centerLat?: number;
  centerLng?: number;
}) {
  const pts = value || [];

  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const polyRef = useRef<any>(null);
  const lineRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);

  // The map-click listener is registered once; read the latest props via refs.
  const ptsRef = useRef(pts);
  ptsRef.current = pts;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const hasCenter =
    typeof centerLat === "number" &&
    typeof centerLng === "number" &&
    Number.isFinite(centerLat) &&
    Number.isFinite(centerLng);

  // ── Init map once ──────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await loadGoogleMaps();
        if (!mounted || !mapDivRef.current) return;
        const g = (window as any).google;
        if (!g?.maps) return;

        const biz = getTenantLocation();
        const center = hasCenter
          ? { lat: centerLat as number, lng: centerLng as number }
          : pts.length
            ? { lat: pts[0].lat, lng: pts[0].lng }
            : biz
              ? { lat: biz.lat, lng: biz.lng }
              : FALLBACK;

        const map = new g.maps.Map(mapDivRef.current, {
          center,
          zoom: 18,
          mapTypeId: "satellite", // best for tracing a building outline
          mapTypeControl: true, // native Map/Satellite toggle
          streetViewControl: false,
          fullscreenControl: true,
          tilt: 0,
          draggableCursor: "crosshair",
          // No mapId on purpose — keeps classic Markers/Polygon rendering.
        });
        mapRef.current = map;

        map.addListener("click", (e: any) => {
          if (!e?.latLng) return;
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          onChangeRef.current([...(ptsRef.current || []), { lat, lng }]);
        });

        setReady(true);
      } catch (err) {
        console.error("[StationGeofencePolygon] map init failed", err);
      }
    })();
    return () => {
      mounted = false;
      try {
        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = [];
        if (lineRef.current) lineRef.current.setMap(null);
        if (polyRef.current) polyRef.current.setMap(null);
        mapRef.current = null;
      } catch {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Recenter when site coords arrive (they load async) ─────────────────────
  useEffect(() => {
    if (mapRef.current && hasCenter) {
      mapRef.current.setCenter({ lat: centerLat as number, lng: centerLng as number });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerLat, centerLng]);

  // ── Redraw markers + line/polygon whenever the points change ───────────────
  useEffect(() => {
    const g = (window as any).google;
    if (!ready || !g?.maps || !mapRef.current) return;
    const map = mapRef.current;

    // Clear previous overlays.
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (lineRef.current) { lineRef.current.setMap(null); lineRef.current = null; }
    if (polyRef.current) { polyRef.current.setMap(null); polyRef.current = null; }

    const path = pts.map((p) => ({ lat: p.lat, lng: p.lng }));

    if (path.length >= 3) {
      polyRef.current = new g.maps.Polygon({
        paths: path,
        map,
        editable: true,
        strokeColor: "#C8860A",
        strokeOpacity: 0.95,
        strokeWeight: 2,
        fillColor: "#C8860A",
        fillOpacity: 0.18,
      });
      // Sync back when the user drags a vertex or inserts/removes one.
      const p = polyRef.current.getPath();
      const sync = () => {
        const arr = p.getArray().map((ll: any) => ({ lat: ll.lat(), lng: ll.lng() }));
        onChangeRef.current(arr);
      };
      g.maps.event.addListener(p, "set_at", sync);
      g.maps.event.addListener(p, "insert_at", sync);
      g.maps.event.addListener(p, "remove_at", sync);
    } else if (path.length === 2) {
      lineRef.current = new g.maps.Polyline({
        path,
        map,
        strokeColor: "#C8860A",
        strokeOpacity: 0.95,
        strokeWeight: 2,
      });
    }

    // Numbered vertex markers (classic Marker = always visible, no mapId needed).
    pts.forEach((pt, i) => {
      const marker = new g.maps.Marker({
        position: { lat: pt.lat, lng: pt.lng },
        map,
        label: { text: String(i + 1), color: "#ffffff", fontSize: "11px", fontWeight: "700" },
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#C8860A",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
        zIndex: 1000 + i,
      });
      markersRef.current.push(marker);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, JSON.stringify(pts)]);

  const undo = () => onChange(pts.slice(0, -1));
  const clear = () => onChange([]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin size={12} /> {pts.length} punto(s) · toca el mapa para agregar vértices
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={undo}
            disabled={!pts.length}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs disabled:opacity-40"
          >
            <Undo2 size={12} /> Deshacer
          </button>
          <button
            type="button"
            onClick={clear}
            disabled={!pts.length}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-red-600 disabled:opacity-40"
          >
            <Trash2 size={12} /> Limpiar
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border" style={{ height: 320 }}>
        <div ref={mapDivRef} className="h-full w-full" />
      </div>

      {pts.length > 0 && pts.length < 3 && (
        <p className="text-[11px] text-amber-600">
          Agrega al menos 3 puntos para formar una geocerca.
        </p>
      )}
    </div>
  );
}
