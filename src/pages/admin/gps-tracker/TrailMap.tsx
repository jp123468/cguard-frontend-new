import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/utils/loadGoogleMaps";

export interface TrailPoint {
  lat: number;
  lng: number;
  at: string;
  speed?: number;
  accuracy?: number;
  battery?: number;
}

/**
 * Draws a guard's WALKED GPS trail as a Google Maps polyline with start (green)
 * and end (red) markers, auto-fitting the bounds. Mirrors RouteTrackingMap's
 * init/style so it reads like the rest of the command-center maps. When there
 * are no points it shows an empty-map message.
 */
export default function TrailMap({
  points,
  mapType = "roadmap",
}: {
  points: TrailPoint[];
  mapType?: "roadmap" | "satellite" | "hybrid" | "terrain";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // One-time map init.
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !ref.current) return;
        const g = (window as any).google;
        const first = points[0];
        mapRef.current = new g.maps.Map(ref.current, {
          center: first ? { lat: first.lat, lng: first.lng } : { lat: -0.18, lng: -78.46 },
          zoom: 14,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          clickableIcons: false,
          mapTypeId: mapType,
        });
        setReady(true);
      })
      .catch((e) => setErr(e?.message || "No se pudo cargar el mapa"));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ready && mapRef.current) mapRef.current.setMapTypeId(mapType);
  }, [mapType, ready]);

  // Redraw the polyline + endpoint markers whenever the points change.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const g = (window as any).google;

    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    const valid = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    if (!valid.length) return;

    const path = valid.map((p) => ({ lat: p.lat, lng: p.lng }));
    const line = new g.maps.Polyline({
      path,
      map: mapRef.current,
      strokeColor: "#C8860A",
      strokeOpacity: 0.9,
      strokeWeight: 4,
    });
    overlaysRef.current.push(line);

    const mk = (p: TrailPoint, color: string, label: string) => {
      const m = new g.maps.Marker({
        map: mapRef.current,
        position: { lat: p.lat, lng: p.lng },
        title: `${label} · ${new Date(p.at).toLocaleString("es-EC")}`,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
      });
      overlaysRef.current.push(m);
    };
    mk(valid[0], "#1a8f66", "Inicio");
    mk(valid[valid.length - 1], "#cf3a3f", "Fin");

    const bounds = new g.maps.LatLngBounds();
    path.forEach((pt) => bounds.extend(pt));
    if (valid.length > 1) mapRef.current.fitBounds(bounds, 48);
    else mapRef.current.setCenter(path[0]);
  }, [points, ready]);

  if (err) {
    return (
      <div className="flex h-full items-center justify-center bg-muted text-sm text-muted-foreground">
        {err}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={ref} className="h-full w-full" />
      {ready && points.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rounded-lg bg-background/85 px-3 py-1.5 text-sm text-muted-foreground shadow">
            Sin recorrido para este rango
          </span>
        </div>
      )}
    </div>
  );
}
