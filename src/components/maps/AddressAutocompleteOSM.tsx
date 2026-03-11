import React, { useState, useRef, useEffect } from 'react';
import { useMapEvent } from 'react-leaflet';
// Componente para manejar el click en el mapa
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvent('click', (e) => {
    onMapClick(e.latlng.lat, e.latlng.lng);
  });
  return null;
}
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Search } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
// @ts-ignore
if (typeof window !== 'undefined' && L && L.Icon && L.Icon.Default) {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

export interface AddressComponents {
  address: string;
  city: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    postcode?: string;
    country?: string;
    state?: string;
  };
}

interface Props {
  onAddressSelect: (address: AddressComponents) => void;
  defaultValue?: string;
  placeholder?: string;
  initialLat?: number;
  initialLng?: number;
  showMap?: boolean;
  mapHeight?: string;
}

function DraggableMarker({ position, setPosition, onDragEnd }: { position: [number, number], setPosition: (pos: [number, number]) => void, onDragEnd: (lat: number, lng: number) => void }) {
  const markerRef = useRef<L.Marker>(null);
  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const pos = marker.getLatLng();
        setPosition([pos.lat, pos.lng]);
        onDragEnd(pos.lat, pos.lng);
      }
    },
  };
  return (
    <Marker draggable={true} eventHandlers={eventHandlers} position={position} ref={markerRef} />
  );
}

export default function AddressAutocompleteOSM({
  onAddressSelect,
  defaultValue = '',
  placeholder = 'Buscar dirección...',
  initialLat = 40.4168,
  initialLng = -3.7038,
  showMap = true,
  mapHeight = '300px',
}: Props) {
  const [searchQuery, setSearchQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<[number, number]>([initialLat, initialLng]);
  const mapRef = useRef<any>(null);

  // Centrar el mapa automáticamente cuando cambie la posición
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(position, mapRef.current.getZoom(), { animate: true });
    }
  }, [position]);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Search addresses using Nominatim (OpenStreetMap geocoding)
  const searchAddress = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      // Try several query variants to improve matches for Ecuadorian address formats
      const variants: string[] = [];
      const q = query.trim();
      const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
      variants.push(q);
      variants.push(q.replace(/\s+y\s+/gi, ', '));
      variants.push(q.replace(/\s+y\s+/gi, ' '));
      variants.push(normalize(q));
      variants.push(normalize(q).replace(/\s+y\s+/gi, ', '));

      let data: SearchResult[] = [];
      for (const v of variants) {
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=ec&limit=10&accept-language=es&q=${encodeURIComponent(
          v
        )}`;
        // eslint-disable-next-line no-await-in-loop
        const response = await fetch(url);
        // eslint-disable-next-line no-await-in-loop
        const chunk: SearchResult[] = await response.json();
        if (Array.isArray(chunk) && chunk.length > 0) {
          data = chunk;
          break;
        }
      }
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
    } catch (error) {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const selectSuggestion = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setPosition([lat, lng]);
    setSearchQuery(result.display_name);
    setShowSuggestions(false);
    const addressData: AddressComponents = {
      address: [result.address.road, result.address.house_number].filter(Boolean).join(' ') || result.display_name,
      city: result.address.city || result.address.town || result.address.village || '',
      postalCode: result.address.postcode || '',
      country: result.address.country || '',
      latitude: lat,
      longitude: lng,
    };
    onAddressSelect(addressData);
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?` +
        `format=json&lat=${lat}&lon=${lng}&` +
        `addressdetails=1&accept-language=es`
      );
      if (!response.ok) {
        throw new Error('Error en la respuesta de Nominatim');
      }
      const data = await response.json();
      // Siempre actualizar el campo de dirección, aunque falten datos
      setSearchQuery(data.display_name || '');
      const addressData: AddressComponents = {
        address: (data.address && ([data.address.road, data.address.house_number].filter(Boolean).join(' '))) || data.display_name || '',
        city: (data.address && (data.address.city || data.address.town || data.address.village)) || '',
        postalCode: (data.address && data.address.postcode) || '',
        country: (data.address && data.address.country) || '',
        latitude: lat,
        longitude: lng,
      };
      onAddressSelect(addressData);
    } catch (error) {
      setSearchQuery('');
      onAddressSelect({
        address: '',
        city: '',
        postalCode: '',
        country: '',
        latitude: lat,
        longitude: lng,
      });
      alert('No se pudo obtener la dirección para esta ubicación.');
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocalización no soportada');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition([lat, lng]);
        reverseGeocode(lat, lng);
      },
      (error) => {
        alert('No se pudo obtener la ubicación');
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
              searchTimeoutRef.current = setTimeout(() => searchAddress(e.target.value), 500);
            }}
            placeholder={placeholder}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
              {suggestions.map((result, index) => (
                <div
                  key={index}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => selectSuggestion(result)}
                >
                  <div className="font-medium text-sm">{result.display_name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleUseCurrentLocation}
          className="flex items-center gap-2"
        >
          <MapPin className="h-4 w-4" />
          <span className="hidden sm:inline">Mi ubicación</span>
        </Button>
      </div>
      {showMap && (
        <div className="h-[350px] rounded-md border overflow-hidden relative">
          <MapContainer
            key={position[0] + '-' + position[1]}
            center={position}
            zoom={13}
            style={{ height: mapHeight, width: '100%' }}
          >
            <MapClickHandler onMapClick={(lat, lng) => {
              setPosition([lat, lng]);
              reverseGeocode(lat, lng);
            }} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <DraggableMarker
              position={position}
              setPosition={setPosition}
              onDragEnd={reverseGeocode}
            />
          </MapContainer>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        💡 Puedes arrastrar el marcador para ajustar la ubicación exacta
      </p>
    </div>
  );
}
