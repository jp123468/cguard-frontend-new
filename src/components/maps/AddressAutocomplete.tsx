import React, { useRef, useEffect, useState } from 'react';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, AlertCircle } from 'lucide-react';
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
  suppressInitialReverse = false,
  onQueryChange,
  onGeocodeResult,
  countryCodes,
}: AddressAutocompleteProps) {
  const { isLoaded, loadError, google } = useGoogleMaps();
  const inputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (openWithQuery && openWithQuery.length > 0) {
      if (inputRef.current) inputRef.current.value = openWithQuery;
      inputRef.current?.focus();
      onQueryChange?.(openWithQuery);
    }
  }, [openWithQuery, onQueryChange]);

  useEffect(() => {
    if (!isLoaded || !google || !inputRef.current) return;

    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: countryCodes ? { country: countryCodes } : undefined,
      fields: ['address_components', 'geometry', 'formatted_address', 'name'],
      types: ['geocode', 'establishment'],
    });

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current.getPlace();
      if (!place || !place.geometry) {
        console.warn('No geometry for selected place');
        return;
      }
      handlePlaceSelect(place);
    });

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded, google, countryCodes]);

  useEffect(() => {
    if (!isLoaded || !google || !showMap || !mapRef.current) return;

    const biz = getTenantLocation();
    const lat = initialLat ?? biz?.lat ?? -0.2295;
    const lng = initialLng ?? biz?.lng ?? -78.5236;
    const center = new google.maps.LatLng(lat, lng);

    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center,
      zoom: initialLat !== undefined && initialLng !== undefined ? 15 : 5,
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

    markerRef.current.addListener('gmp-dragend', () => {
      const pos = markerRef.current?.position;
      if (!pos) return;
      const lat = typeof (pos as any).lat === 'function' ? (pos as any).lat() : (pos as any).lat;
      const lng = typeof (pos as any).lng === 'function' ? (pos as any).lng() : (pos as any).lng;
      geocodePosition(new google.maps.LatLng(lat, lng));
    });

    if (!suppressInitialReverse && initialLat !== undefined && initialLng !== undefined) {
      geocodePosition(center, false);
    }

    return () => {
      if (markerRef.current) {
        try { markerRef.current.map = null; } catch { /* ignore */ }
        markerRef.current = null;
      }
    };
  }, [isLoaded, google, showMap, initialLat, initialLng, suppressInitialReverse]);

  const handlePlaceSelect = (place: any) => {
    const addressComponents = extractAddressComponents(place);
    if (!addressComponents) return;

    onAddressSelect(addressComponents);
    onGeocodeResult?.(addressComponents);
    const location = place.geometry.location;

    const label = place.formatted_address || place.name || '';
    if (inputRef.current) inputRef.current.value = label;
    onQueryChange?.(label);

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setCenter(location);
      mapInstanceRef.current.setZoom(15);
      markerRef.current.position = location;
    }
  };

  const geocodePosition = (position: any, emit = true) => {
    if (!google) return;
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: position }, (results: any[], status: string) => {
      if (status === 'OK' && results && results.length > 0) {
        const place = results[0];
        const addressComponents = extractAddressComponents({
          ...place,
          geometry: { location: position },
        });
        if (!addressComponents) return;

        if (inputRef.current) inputRef.current.value = place.formatted_address || addressComponents.address;
        onQueryChange?.(place.formatted_address || addressComponents.address);
        if (emit) {
          onAddressSelect(addressComponents);
          onGeocodeResult?.(addressComponents);
        }
      }
    });
  };

  const extractAddressComponents = (place: any): AddressComponents | null => {
    if (!place || !place.address_components) return null;

    let streetNumber = '';
    let route = '';
    let city = '';
    let postalCode = '';
    let country = '';

    place.address_components.forEach((component: any) => {
      const types: string[] = component.types || [];
      if (types.includes('street_number')) streetNumber = component.long_name;
      if (types.includes('route')) route = component.long_name;
      if (types.includes('locality')) city = component.long_name;
      if (types.includes('postal_code')) postalCode = component.long_name;
      if (types.includes('country')) country = component.long_name;
      if (!city && types.includes('administrative_area_level_2')) city = component.long_name;
      if (!city && types.includes('administrative_area_level_1')) city = component.long_name;
    });

    const address = [route, streetNumber].filter(Boolean).join(' ') || place.formatted_address || place.name || '';
    const latitude = place.geometry.location.lat();
    const longitude = place.geometry.location.lng();

    return {
      address: address.substring(0, 200),
      city: city.substring(0, 100),
      postalCode: postalCode.substring(0, 20),
      country: country.substring(0, 100),
      latitude,
      longitude,
    };
  };

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

        geocodePosition(location);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('No se pudo obtener la ubicación actual');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

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
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            ref={inputRef}
            type="text"
            defaultValue={defaultValue}
            onChange={(e) => onQueryChange?.(e.target.value)}
            placeholder={placeholder}
            className="w-full"
          />
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
        <div
          ref={mapRef}
          style={{ height: mapHeight }}
          className="w-full rounded-md border overflow-hidden"
        />
      )}

      {showMap && (
        <p className="text-xs text-muted-foreground">
          💡 Puedes arrastrar el marcador en el mapa para ajustar la ubicación exacta
        </p>
      )}
    </div>
  );
}
