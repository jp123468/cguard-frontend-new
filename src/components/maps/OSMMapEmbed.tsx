import React, { useRef, useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icon
if (typeof window !== 'undefined' && L && L.Icon && L.Icon.Default) {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

/**
 * OSMMapEmbed
 * Mapa interactivo con scrollWheelZoom siempre habilitado para mejor experiencia de usuario.
 * Props:
 * - lat, lng: coordenadas
 * - zoom: nivel de zoom inicial
 * - height: altura del mapa
 * - className: clases CSS
 */

interface OSMMapEmbedProps {
  lat?: number | string;
  lng?: number | string;
  zoom?: number;
  height?: string;
  className?: string;
  mapType?: 'osm' | 'satellite';
  // onMarkerMove: lat, lng, display_name, and structured address details
  onMarkerMove?: (lat: number, lng: number, address: string, addressDetails?: any) => void;
}

const OSMMapEmbed: React.FC<OSMMapEmbedProps> = ({
  lat,
  lng,
  zoom = 15,
  height = "300px",
  className = "w-full rounded-md border overflow-hidden",
  mapType = 'osm',
  onMarkerMove,
}) => {
  if (!lat || !lng) return null;
  const initialLat = typeof lat === "string" ? parseFloat(lat) : lat;
  const initialLng = typeof lng === "string" ? parseFloat(lng) : lng;
  if (isNaN(initialLat) || isNaN(initialLng)) return null;
  // Estado para la posición actual del marcador (movible)
  const [markerPos, setMarkerPos] = useState<[number, number]>([initialLat, initialLng]);
  const [address, setAddress] = useState<string>("");
  const mapRef = useRef<any>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (map && (map as any).scrollWheelZoom && !(map as any).scrollWheelZoom.enabled()) {
      try { (map as any).scrollWheelZoom.enable(); } catch (e) {}
    }
  }, []);

  // Botón para centrar el mapa en la ubicación del dispositivo usando la API de Geolocalización
  const [geoError, setGeoError] = useState<string | null>(null);

  // Centra el mapa en las coordenadas originales (props)
  const handleCenter = () => {
    const map = mapRef.current;
    if (map && typeof (map as any).flyTo === 'function') {
      try { (map as any).flyTo([initialLat, initialLng], 15, { animate: true }); } catch (e) {}
      setMarkerPos([initialLat, initialLng]);
    }
  };

  // Geocodificación inversa para mostrar dirección
  const fetchAddress = async (lat: number, lng: number) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
      const res = await fetch(url);
      const data = await res.json();
      const display = data.display_name || "";
      setAddress(display);
      const details = data.address || {};
      if (onMarkerMove) onMarkerMove(lat, lng, display, details);
    } catch {
      setAddress("");
      if (onMarkerMove) onMarkerMove(lat, lng, "", {});
    }
  };

  // Sync marker when parent updates lat/lng props
  useEffect(() => {
    const newLat = typeof lat === "string" ? parseFloat(lat) : lat;
    const newLng = typeof lng === "string" ? parseFloat(lng) : lng;
    if (!isNaN(newLat) && !isNaN(newLng)) {
      setMarkerPos([newLat, newLng]);
      const map = mapRef.current;
      if (map && typeof (map as any).flyTo === 'function') {
        try { (map as any).flyTo([newLat, newLng], Math.max(12, zoom), { animate: true }); } catch (e) {}
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  useEffect(() => {
    fetchAddress(markerPos[0], markerPos[1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markerPos[0], markerPos[1]]);

  return (
    <div style={{ position: 'relative', height }} className={className}>
      <button
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 1000,
          background: 'white',
          border: '1px solid #ccc',
          borderRadius: 4,
          padding: '4px 10px',
          fontSize: 13,
          cursor: 'pointer',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
        }}
        title="Centrar en la ubicación"
        onClick={handleCenter}
      >
        Centrar ubicación
      </button>
      {geoError && (
        <div style={{
          position: 'absolute',
          top: 50,
          right: 10,
          zIndex: 1001,
          background: '#fff0f0',
          color: '#b91c1c',
          border: '1px solid #fca5a5',
          borderRadius: 4,
          padding: '6px 12px',
          fontSize: 13,
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
        }}>
          {geoError}
        </div>
      )}
      <MapContainer
        center={markerPos}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
        dragging={true}
        doubleClickZoom={true}
        zoomControl={true}
        ref={mapRef}
      >
        {mapType === 'satellite' ? (
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}
        <Marker
          position={markerPos}
          draggable={true}
          eventHandlers={{
            dragend: (e) => {
              const marker = e.target;
              const pos = marker.getLatLng();
              setMarkerPos([pos.lat, pos.lng]);
              // fetchAddress(pos.lat, pos.lng) se llama por useEffect
            },
          }}
        />
      </MapContainer>
      {address && (
        <div style={{ marginTop: 8, fontSize: 13, color: '#333' }}>
          <b>Dirección actual:</b> {address}
        </div>
      )}
    </div>
  );
}

export default OSMMapEmbed;
