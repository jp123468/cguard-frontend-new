import GoogleMapEmbed from "./GoogleMapEmbed";
import { Undo2, Trash2, MapPin } from "lucide-react";

export type PolyPoint = { lat: number; lng: number };

/**
 * Polygon geofence editor — click on the map to drop vertices (≥3 defines the
 * geofence); the polygon is rendered live. Undo removes the last point, Clear
 * resets. Returns the points via onChange; the parent persists them on the
 * station's `geofencePolygon`.
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

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
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
        <GoogleMapEmbed
          lat={centerLat}
          lng={centerLng}
          zoom={17}
          enableClickToSet
          onMapClick={addPoint}
          polygon={pts}
          markers={pts.map((p, i) => ({ id: `v${i}`, lat: p.lat, lng: p.lng, label: String(i + 1) }))}
          className="w-full h-full"
        />
      </div>
      {pts.length > 0 && pts.length < 3 && (
        <p className="text-[11px] text-amber-600">Agrega al menos 3 puntos para formar una geocerca.</p>
      )}
    </div>
  );
}
