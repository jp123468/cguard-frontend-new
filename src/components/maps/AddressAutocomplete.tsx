import React, { useRef, useEffect } from 'react';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, AlertCircle, Search } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getTenantLocation } from '@/utils/tenantLocation';

export interface AddressComponents {
  address: string;
  addressLine2?: string;
  city: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface AddressAutocompleteProps {
  onAddressSelect: (address: AddressComponents) => void;
  defaultValue?: string;
  placeholder?: string;
  showMap?: boolean;
  mapHeight?: string;
  initialLat?: number;
  initialLng?: number;
  openWithQuery?: string;
  suppressInitialReverse?: boolean;
  onQueryChange?: (query: string) => void;
  onGeocodeResult?: (address: AddressComponents) => void;
  countryCodes?: string[];
}

export default function AddressAutocomplete({
  onAddressSelect,
  defaultValue = '',
  placeholder = 'Buscar dirección...',
  showMap = true,
  mapHeight = '300px',
  initialLat,
  initialLng,
  openWithQuery,
  onQueryChange,
  onGeocodeResult,
  countryCodes,
}: AddressAutocompleteProps) {
  const { isLoaded, loadError, google } = useGoogleMaps();

  // Container for the PlaceAutocompleteElement web component
  const pacContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const pacElementRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const dragDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Last resolved address from autocomplete selection — carried forward on drag
  const lastAddressRef = useRef<AddressComponents | null>(null);

  // ── PlaceAutocompleteElement setup ───────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || !google || !pacContainerRef.current) return;
    if (pacElementRef.current) return; // already mounted

    const places = google.maps.places;
    if (!places?.PlaceAutocompleteElement) {
      console.warn('PlaceAutocompleteElement not available — check Maps API version');
      return;
    }

    const pac = new places.PlaceAutocompleteElement({
      componentRestrictions: countryCodes ? { country: countryCodes } : undefined,
      types: ['geocode', 'establishment'],
    });

    // Size to fill the flex container and match our input style
    Object.assign(pac.style, {
      width: '100%',
      height: '40px',
      fontSize: '14px',
    });
    if (placeholder) (pac as any).placeholder = placeholder;

    // Seed the input if a query was passed (TenantJoinModal usage)
    if (openWithQuery) {
      try { (pac as any).value = openWithQuery; } catch { /* ignore */ }
    }

    pacContainerRef.current.appendChild(pac);
    pacElementRef.current = pac;

    const handler = async (event: any) => {
      const place = event.place;
      if (!place) return;
      try {
        await place.fetchFields({
          fields: ['addressComponents', 'formattedAddress', 'location', 'displayName'],
        });
      } catch (err) {
        console.error('[AddressAutocomplete] fetchFields error:', err);
        return;
      }

      const components = extractAddressComponents(place);
      if (!components) return;

      lastAddressRef.current = components;
      onAddressSelect(components);
      onGeocodeResult?.(components);
      onQueryChange?.(place.formattedAddress ?? '');

      if (mapInstanceRef.current && markerRef.current && place.location) {
        mapInstanceRef.current.setCenter(place.location);
        mapInstanceRef.current.setZoom(15);
        markerRef.current.position = place.location;
      }
    };

    pac.addEventListener('gmp-placeselect', handler);

    return () => {
      pac.removeEventListener('gmp-placeselect', handler);
      if (dragDebounceRef.current) clearTimeout(dragDebounceRef.current);
      try {
        if (pacContainerRef.current?.contains(pac)) {
          pacContainerRef.current.removeChild(pac);
        }
      } catch { /* ignore */ }
      pacElementRef.current = null;
    };
  }, [isLoaded, google, countryCodes]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Map setup ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || !google || !showMap || !mapRef.current) return;

    const biz = getTenantLocation();
    const lat = initialLat ?? biz?.lat ?? -0.2295;
    const lng = initialLng ?? biz?.lng ?? -78.5236;
    const center = new google.maps.LatLng(lat, lng);

    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center,
      zoom: initialLat !== undefined && initialLng !== undefined ? 15 : 12,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: false,
      mapId: 'DEMO_MAP_ID',
    });

    markerRef.current = new google.maps.marker.AdvancedMarkerElement({
      map: mapInstanceRef.current,
      position: center,
      gmpDraggable: true,
    });

    // Debounced drag handler — no reverse-geocoding (Geocoding API not required)
    markerRef.current.addListener('gmp-dragend', () => {
      if (dragDebounceRef.current) clearTimeout(dragDebounceRef.current);
      dragDebounceRef.current = setTimeout(() => {
        const pos = markerRef.current?.position;
        if (!pos) return;
        const newLat = typeof (pos as any).lat === 'function' ? (pos as any).lat() : (pos as any).lat;
        const newLng = typeof (pos as any).lng === 'function' ? (pos as any).lng() : (pos as any).lng;
        // Carry forward the last resolved address, update only coordinates
        const updated: AddressComponents = {
          ...(lastAddressRef.current ?? { address: '', city: '', postalCode: '', country: '' }),
          latitude: newLat,
          longitude: newLng,
        };
        lastAddressRef.current = updated;
        onAddressSelect(updated);
        onGeocodeResult?.(updated);
      }, 300);
    });

    return () => {
      if (dragDebounceRef.current) clearTimeout(dragDebounceRef.current);
      if (markerRef.current) {
        try { markerRef.current.map = null; } catch { /* ignore */ }
        markerRef.current = null;
      }
    };
  }, [isLoaded, google, showMap, initialLat, initialLng]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helper: extract address fields from new Places API place object ───────
  const extractAddressComponents = (place: any): AddressComponents | null => {
    if (!place?.location) return null;

    let streetNumber = '';
    let route = '';
    let city = '';
    let postalCode = '';
    let country = '';

    const components: any[] = place.addressComponents ?? [];
    components.forEach((comp: any) => {
      const types: string[] = comp.types ?? [];
      // New Places API uses longText/shortText; legacy uses long_name/short_name
      const long = comp.longText ?? comp.long_name ?? '';
      if (types.includes('street_number')) streetNumber = long;
      if (types.includes('route')) route = long;
      if (types.includes('locality')) city = long;
      if (types.includes('postal_code')) postalCode = long;
      if (types.includes('country')) country = long;
      if (!city && types.includes('administrative_area_level_2')) city = long;
      if (!city && types.includes('administrative_area_level_1')) city = long;
    });

    const address =
      [route, streetNumber].filter(Boolean).join(' ') ||
      place.formattedAddress ||
      place.displayName?.text ||
      '';

    const lat = typeof place.location.lat === 'function'
      ? place.location.lat()
      : place.location.lat;
    const lng = typeof place.location.lng === 'function'
      ? place.location.lng()
      : place.location.lng;

    return {
      address: address.substring(0, 200),
      city: city.substring(0, 100),
      postalCode: postalCode.substring(0, 20),
      country: country.substring(0, 100),
      latitude: lat,
      longitude: lng,
    };
  };

  // ── Geolocation (no reverse-geocoding — just move the pin) ─────────────────
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('La geolocalización no está soportada en este navegador');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const location = new google.maps.LatLng(lat, lng);

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setCenter(location);
          mapInstanceRef.current.setZoom(15);
          markerRef.current.position = location;
        }

        // Update coords in the form (address text unchanged)
        const updated: AddressComponents = {
          ...(lastAddressRef.current ?? { address: '', city: '', postalCode: '', country: '' }),
          latitude: lat,
          longitude: lng,
        };
        lastAddressRef.current = updated;
        onAddressSelect(updated);
        onGeocodeResult?.(updated);
      },
      (error) => {
        console.error('[AddressAutocomplete] Geolocation error:', error);
        alert('No se pudo obtener la ubicación actual');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error al cargar Google Maps. Verifica que la API key esté configurada correctamente.
        </AlertDescription>
      </Alert>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center gap-2 p-4 border rounded-md">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Cargando Google Maps...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search row — styled like a prominent search bar */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
          {/* The PlaceAutocompleteElement is appended here via useEffect */}
          <div
            ref={pacContainerRef}
            style={{ minHeight: '40px', paddingLeft: '2rem' }}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleUseCurrentLocation}
          className="flex items-center gap-1.5 shrink-0 border-gray-300 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700 transition-colors"
        >
          <MapPin className="h-4 w-4" />
          <span className="hidden sm:inline text-sm">Mi ubicación</span>
        </Button>
      </div>

      {showMap && (
        <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm">
          <div
            ref={mapRef}
            style={{ height: mapHeight }}
            className="w-full"
          />
          <p className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-500 bg-gray-50 border-t border-gray-100">
            <MapPin className="h-3 w-3 text-amber-500 shrink-0" />
            Arrastra el marcador rojo para ajustar la ubicación exacta
          </p>
        </div>
      )}
    </div>
  );
}

