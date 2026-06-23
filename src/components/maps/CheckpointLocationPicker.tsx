import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Quito fallback when nothing is set yet.
const FALLBACK: [number, number] = [-0.2295, -78.5236];

// Custom pin (inline SVG) — avoids Leaflet's default marker-image 404 under Vite.
const pinIcon = L.divIcon({
  className: 'cp-pin',
  html:
    `<svg width="30" height="42" viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg">` +
    `<path fill="#C8860A" stroke="#ffffff" stroke-width="1.5" d="M12 0C5.37 0 0 5.37 0 12c0 8.5 12 24 12 24s12-15.5 12-24C24 5.37 18.63 0 12 0z"/>` +
    `<circle cx="12" cy="12" r="4.5" fill="#ffffff"/></svg>`,
  iconSize: [30, 42],
  iconAnchor: [15, 42],
});

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function Recenter({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) map.setView([lat, lng], map.getZoom(), { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);
  return null;
}

export default function CheckpointLocationPicker({
  lat,
  lng,
  radius,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  radius: number;
  onChange: (lat: number, lng: number, radius: number) => void;
}) {
  const hasPin = lat != null && lng != null;
  const center: [number, number] = hasPin ? [lat as number, lng as number] : FALLBACK;

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-xl border border-border" style={{ height: 300 }}>
        <MapContainer center={center} zoom={hasPin ? 17 : 13} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickToPlace onPick={(la, ln) => onChange(la, ln, radius)} />
          <Recenter lat={lat} lng={lng} />
          {hasPin && (
            <>
              <Marker
                position={[lat as number, lng as number]}
                draggable
                icon={pinIcon}
                eventHandlers={{
                  dragend: (e) => {
                    const p = (e.target as L.Marker).getLatLng();
                    onChange(p.lat, p.lng, radius);
                  },
                }}
              />
              {radius > 0 && (
                <Circle
                  center={[lat as number, lng as number]}
                  radius={radius}
                  pathOptions={{ color: '#C8860A', weight: 1.5, fillColor: '#C8860A', fillOpacity: 0.12 }}
                />
              )}
            </>
          )}
        </MapContainer>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Toca el mapa o arrastra el pin para fijar la ubicación exacta del punto.
      </p>

      {/* Coverage radius */}
      <div className="rounded-md border border-border bg-muted/20 p-3">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">Radio de cobertura</span>
          <span className="font-mono text-[#C8860A]">{radius} m</span>
        </div>
        <input
          type="range"
          min={10}
          max={300}
          step={5}
          value={radius}
          onChange={(e) => onChange(lat ?? FALLBACK[0], lng ?? FALLBACK[1], Number(e.target.value))}
          className="w-full accent-[#C8860A]"
          disabled={!hasPin}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          El vigilante debe estar dentro de este radio para que el escaneo cuente como válido.
        </p>
      </div>
    </div>
  );
}
