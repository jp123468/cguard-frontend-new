import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polygon,
  Polyline,
  CircleMarker,
  Tooltip,
  useMapEvents,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Undo2, Trash2, MapPin } from "lucide-react";

export type PolyPoint = { lat: number; lng: number };

// Quito fallback when no site coordinates are available yet.
const DEFAULT_CENTER: [number, number] = [-0.2295, -78.5236];

/** Adds a vertex wherever the user clicks the map. */
function ClickToAdd({ onAdd }: { onAdd: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => onAdd(e.latlng.lat, e.latlng.lng),
  });
  return null;
}

/** Recenters once the real site coordinates arrive (they load async). */
function Recenter({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, Math.max(map.getZoom(), 17));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.[0], center?.[1]]);
  return null;
}

/** Leaflet renders gray tiles when the container is sized after mount. Force a
 *  resize once layout has settled so the map is fully visible. */
function FixSize() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 120);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

/**
 * Polygon geofence editor (react-leaflet). Click the map to drop vertices; the
 * line/polygon and numbered vertex markers render live as SVG overlays — always
 * visible (no Google mapId / AdvancedMarker dependency). "Deshacer" removes the
 * last point, "Limpiar" resets. Points are returned via onChange and persisted
 * by the parent on the station's `geofencePolygon`.
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
  const addPoint = (lat: number, lng: number) => onChange([...pts, { lat, lng }]);
  const undo = () => onChange(pts.slice(0, -1));
  const clear = () => onChange([]);

  const [mapType, setMapType] = useState<"map" | "satellite">("satellite");

  const hasSiteCenter =
    typeof centerLat === "number" &&
    typeof centerLng === "number" &&
    Number.isFinite(centerLat) &&
    Number.isFinite(centerLng);

  const initialCenter: [number, number] = hasSiteCenter
    ? [centerLat as number, centerLng as number]
    : pts.length
      ? [pts[0].lat, pts[0].lng]
      : DEFAULT_CENTER;

  const latlngs = pts.map((p) => [p.lat, p.lng] as [number, number]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin size={12} /> {pts.length} punto(s) · toca el mapa para agregar vértices
        </span>
        <div className="flex items-center gap-2">
          {/* Map / satellite toggle */}
          <div className="flex overflow-hidden rounded-md border border-border text-xs">
            <button
              type="button"
              onClick={() => setMapType("map")}
              className={`px-2 py-1 ${mapType === "map" ? "bg-[#C8860A] text-white" : "text-muted-foreground"}`}
            >
              Mapa
            </button>
            <button
              type="button"
              onClick={() => setMapType("satellite")}
              className={`px-2 py-1 ${mapType === "satellite" ? "bg-[#C8860A] text-white" : "text-muted-foreground"}`}
            >
              Satélite
            </button>
          </div>
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
        <MapContainer
          center={initialCenter}
          zoom={17}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          {mapType === "satellite" ? (
            <TileLayer
              attribution="Tiles &copy; Esri"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={21}
            />
          ) : (
            <TileLayer
              attribution="&copy; OpenStreetMap"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
          )}

          <FixSize />
          <ClickToAdd onAdd={addPoint} />
          <Recenter center={hasSiteCenter ? [centerLat as number, centerLng as number] : null} />

          {/* Live shape: polygon once it's closed (3+), otherwise the in-progress line */}
          {latlngs.length >= 3 ? (
            <Polygon
              positions={latlngs}
              pathOptions={{
                color: "#C8860A",
                weight: 2,
                fillColor: "#C8860A",
                fillOpacity: 0.18,
              }}
            />
          ) : latlngs.length === 2 ? (
            <Polyline positions={latlngs} pathOptions={{ color: "#C8860A", weight: 2 }} />
          ) : null}

          {/* Numbered vertex markers (display-only so they never swallow map clicks) */}
          {pts.map((p, i) => (
            <CircleMarker
              key={i}
              center={[p.lat, p.lng]}
              radius={7}
              pathOptions={
                {
                  color: "#ffffff",
                  weight: 2,
                  fillColor: "#C8860A",
                  fillOpacity: 1,
                  interactive: false,
                } as any
              }
            >
              <Tooltip permanent direction="top" offset={[0, -8]}>
                {i + 1}
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {pts.length > 0 && pts.length < 3 && (
        <p className="text-[11px] text-amber-600">
          Agrega al menos 3 puntos para formar una geocerca.
        </p>
      )}
    </div>
  );
}
