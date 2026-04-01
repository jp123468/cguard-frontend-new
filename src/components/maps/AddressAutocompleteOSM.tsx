import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Search } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import geocodeClient from '@/lib/geocodeClient';
import { toast } from 'sonner';

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
    post_code?: string;
    country?: string;
    state?: string;
    county?: string;
    suburb?: string;
    city_district?: string;
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
  openWithQuery?: string;
  suppressInitialReverse?: boolean;
  onQueryChange?: (q: string) => void;
  onGeocodeResult?: (address: AddressComponents) => void;
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
  openWithQuery,
  suppressInitialReverse = false,
  onQueryChange,
  onGeocodeResult,
}: Props) {
  const [searchQuery, setSearchQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  // Coerce incoming initialLat/initialLng to numbers and fall back to defaults
  const startLat = (typeof initialLat === 'number' && !Number.isNaN(initialLat)) ? initialLat : 40.4168;
  const startLng = (typeof initialLng === 'number' && !Number.isNaN(initialLng)) ? initialLng : -3.7038;
  const [position, setPosition] = useState<[number, number]>([startLat, startLng]);
  const mapRef = useRef<L.Map | null>(null);
  // Deduplicate address emissions to avoid multiple toasts/notifications
  // Keep last emitted coords and timestamp; dedupe based on proximity only
  const lastEmitRef = useRef<{ lat: number; lng: number; t: number } | null>(null);
  const EMIT_DEDUP_MS = 2000;
  const COORD_TOL = 1e-4; // ~11 meters

  const coordsClose = (aLat: number, aLng: number, bLat: number, bLng: number) => {
    return Math.abs(aLat - bLat) <= COORD_TOL && Math.abs(aLng - bLng) <= COORD_TOL;
  };

  const safeEmit = (addressData: AddressComponents) => {
    const now = Date.now();
    const last = lastEmitRef.current;
    if (last && coordsClose(last.lat, last.lng, addressData.latitude, addressData.longitude) && now - last.t < EMIT_DEDUP_MS) {
      return;
    }
    lastEmitRef.current = { lat: addressData.latitude, lng: addressData.longitude, t: now };
    try {
      onAddressSelect(addressData);
    } catch (e) {
      // swallow
    }
  };

  // Block reverseGeocode emits for a short window after a direct selection
  const blockedUntilRef = useRef<number | null>(null);

  // Debugging: log incoming props to help diagnose center issues
  useEffect(() => {
    try {
      // eslint-disable-next-line no-console
      console.debug('[AddressAutocompleteOSM] props initialLat/initialLng:', initialLat, initialLng, '-> start:', startLat, startLng);
    } catch (e) {}
  }, [initialLat, initialLng, startLat, startLng]);

  // expose map instance for debugging when available
  useEffect(() => {
    try {
      if ((window as any).__lastAddressMap !== mapRef.current) {
        (window as any).__lastAddressMap = mapRef.current;
      }
    } catch (e) {}
  }, [mapRef.current]);

  // Centrar el mapa automáticamente cuando cambie la posición
  useEffect(() => {
    try {
      if (mapRef.current) {
        const map = mapRef.current as any;
        const currentZoom = (map && typeof map.getZoom === 'function') ? map.getZoom() : 13;
        const targetZoom = currentZoom || 13;
        // setView without animation to avoid jumpy behavior and ensure tiles load for correct coords
        map.setView(position, targetZoom, { animate: false });
        try { map.invalidateSize && map.invalidateSize(); } catch (e) {}

        // retry centering a couple times after render/layout completes
        const retry = (delay: number) => setTimeout(() => {
          try {
            map.setView(position, targetZoom, { animate: false });
            try { map.invalidateSize && map.invalidateSize(); } catch (e) {}
          } catch (err) {}
        }, delay);
        retry(250);
        retry(800);
      }
    } catch (e) {
      // ignore
    }
  }, [position]);

  // When parent updates initialLat/initialLng (e.g., after async load), update position
  // If `suppressInitialReverse` is true, do not call reverseGeocode on mount/update.
  useEffect(() => {
    const nl = Number(initialLat as any);
    const nlng = Number(initialLng as any);
    const okLat = typeof initialLat !== 'undefined' && !Number.isNaN(nl);
    const okLng = typeof initialLng !== 'undefined' && !Number.isNaN(nlng);
    if (okLat && okLng) {
      const newPos: [number, number] = [nl, nlng];
      setPosition(newPos);
      if (!suppressInitialReverse) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          reverseGeocode(nl, nlng);
        } catch (e) {
          // ignore
        }
      }
    }
  }, [initialLat, initialLng, suppressInitialReverse]);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

  // Search addresses using Nominatim (OpenStreetMap geocoding)
  const searchAddress = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
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
        // Limit forward search to Ecuador to avoid far-away matches
        // eslint-disable-next-line no-await-in-loop
        const chunk: SearchResult[] = await geocodeClient.searchGeocode(v, { addressdetails: '1', limit: '10', 'accept-language': 'es', countrycodes: 'ec' });
        if (Array.isArray(chunk) && chunk.length > 0) {
          data = chunk;
          break;
        }
      }
      setSuggestions(data);
      setShowSuggestions(true);
    } catch (error: any) {
      setSuggestions([]);
      setShowSuggestions(false);
      // user-friendly error for failed geocode
      try {
        const msg = (error && (error.message || String(error))) ? (error.message || String(error)) : 'Unable to geocode';
        toast.error(msg);
      } catch (e) {
        try { toast.error('Unable to geocode'); } catch (e) {}
      }
    } finally {
      setLoading(false);
    }
  };

  // If parent requests opening the autocomplete with a prefilled query,
  // set the query, perform the search and show suggestions.
  useEffect(() => {
    if (openWithQuery && openWithQuery.length > 0) {
      setSearchQuery(openWithQuery);
      // trigger search immediately
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      // call searchAddress directly
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      (async () => {
        await searchAddress(openWithQuery);
        setShowSuggestions(true);
        try { inputRef.current && inputRef.current.focus(); } catch (e) { }
      })();
    }
  }, [openWithQuery]);

  const selectSuggestion = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setPosition([lat, lng]);
    setSearchQuery(result.display_name);
    setShowSuggestions(false);
    try {
      // debug: log selection and coords
      // eslint-disable-next-line no-console
      console.debug('[AddressAutocompleteOSM] selectSuggestion ->', { lat, lng, name: result.display_name });
      if (mapRef.current) {
        const map = mapRef.current as any;
        map.setView([lat, lng], 16, { animate: false });
        try { map.invalidateSize && map.invalidateSize(); } catch (e) {}
        // retry centering to ensure tiles match the new center
        setTimeout(() => { try { map.setView([lat, lng], 16, { animate: false }); map.invalidateSize && map.invalidateSize(); } catch (e) {} }, 300);
        setTimeout(() => { try { map.setView([lat, lng], 16, { animate: false }); map.invalidateSize && map.invalidateSize(); } catch (e) {} }, 900);
      }
    } catch (e) {}
    const addressData: AddressComponents = {
      address: [result.address.road, result.address.house_number].filter(Boolean).join(' ') || result.display_name,
      city:
        result.address.city ||
        result.address.town ||
        result.address.village ||
        result.address.county ||
        result.address.state ||
        (result.address as any).city_district ||
        result.address.suburb ||
        '',
      postalCode: result.address.postcode || '',
      country: result.address.country || '',
      latitude: lat,
      longitude: lng,
    };
    // mark as recently emitted and block reverseGeocode re-emits shortly after
    const now = Date.now();
    lastEmitRef.current = { lat: addressData.latitude, lng: addressData.longitude, t: now };
    blockedUntilRef.current = now + EMIT_DEDUP_MS;
    safeEmit(addressData);
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const data = await geocodeClient.reverseGeocode(lat, lng, { addressdetails: '1' });
      // Siempre actualizar el campo de dirección, aunque falten datos
      // debug
      // eslint-disable-next-line no-console
      console.debug('[AddressAutocompleteOSM] reverseGeocode result for', lat, lng, data.display_name);
      setSearchQuery(data.display_name || '');
      try { onQueryChange && onQueryChange(data.display_name || ''); } catch (err) {}
      const addr = data.address || {};
      const addressData: AddressComponents = {
        address: (addr && ([addr.road, addr.house_number].filter(Boolean).join(' '))) || data.display_name || '',
        city:
          addr.city ||
          addr.town ||
          addr.village ||
          addr.county ||
          addr.state ||
          (addr as any).city_district ||
          addr.suburb ||
          (data.display_name ? data.display_name.split(',').slice(1, 2).join('').trim() : ''),
        postalCode: (addr && (addr.postcode || addr.post_code)) || '',
        country: (addr && addr.country) || '',
        latitude: lat,
        longitude: lng,
      };
      // If we have a short-term block (user selected a suggestion), skip emitting here
      const now = Date.now();
      if (blockedUntilRef.current && now < blockedUntilRef.current) {
        // skip emitting to avoid duplicate toasts
      } else {
        // Avoid re-emitting if we recently emitted nearly-identical coordinates
        const last = lastEmitRef.current;
        if (last && coordsClose(last.lat, last.lng, lat, lng) && now - last.t < EMIT_DEDUP_MS) {
          // skip emit — already emitted recently
        } else {
          safeEmit(addressData);
        }
      }
    } catch (error: any) {
        setSearchQuery('');
        safeEmit({
          address: '',
          city: '',
          postalCode: '',
          country: '',
          latitude: lat,
          longitude: lng,
        });
        // show a toast so user knows reverse geocode failed
        try {
          const msg = (error && (error.message || String(error))) ? (error.message || String(error)) : 'Unable to reverse geocode';
          toast.error(msg);
        } catch (e) {
          try { toast.error('Unable to reverse geocode'); } catch (e) {}
        }
        // eslint-disable-next-line no-console
        console.warn('[AddressAutocompleteOSM] reverseGeocode failed for', lat, lng, error);
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
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              const v = e.target.value;
              setSearchQuery(v);
              if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
              searchTimeoutRef.current = setTimeout(() => searchAddress(v), 500);
              try { onQueryChange && onQueryChange(v); } catch (err) {}
            }}
            onBlur={async () => {
              // When user leaves the input without selecting a suggestion,
              // attempt a lightweight geocode to populate city/postal/country.
              try {
                const q = (searchQuery || '').trim();
                if (q.length < 3) return;
                // do a single, limited geocode
                const arr = await geocodeClient.searchGeocode(q, { addressdetails: '1', limit: '1', 'accept-language': 'es', countrycodes: 'ec' });
                if (!Array.isArray(arr) || arr.length === 0) return;
                const r = arr[0] as SearchResult;
                const lat = parseFloat(r.lat);
                const lng = parseFloat(r.lon);
                const addr = r.address || {};
                const addressData: AddressComponents = {
                  address: [addr.road, addr.house_number].filter(Boolean).join(' ') || r.display_name || q,
                  city:
                    addr.city || addr.town || addr.village || addr.county || addr.state || (addr as any).city_district || addr.suburb || '',
                  postalCode: addr.postcode || '',
                  country: addr.country || '',
                  latitude: lat,
                  longitude: lng,
                };
                try { onGeocodeResult && onGeocodeResult(addressData); } catch (e) {}
              } catch (e) {
                // ignore
              }
            }}
            placeholder={placeholder}
            onFocus={() => setShowSuggestions(true)}
          />
          {showSuggestions && (
            <div className="absolute w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto" style={{ zIndex: 3000 }}>
              {loading && (
                <div className="px-4 py-2 text-sm text-gray-500">Buscando...</div>
              )}
              {!loading && suggestions.length === 0 && (
                <div className="px-4 py-2 text-sm text-gray-500">No se encontraron resultados</div>
              )}
              {!loading && suggestions.map((result, index) => (
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
        <div className="rounded-md border overflow-hidden relative" style={{ zIndex: 0, height: mapHeight }}>
          <MapContainer
            center={position}
            zoom={13}
            doubleClickZoom={false}
            ref={(el: any) => { try { mapRef.current = el as L.Map; } catch (e) { mapRef.current = null; } }}
            style={{ height: '100%', width: '100%' }}
          >
            {/* Clicking the map to select a point is disabled per UX request; marker drag is used instead */}
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
