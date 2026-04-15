import React, { useEffect, useRef, useState } from 'react';

type MapType = 'roadmap' | 'satellite';

type AddressDetails = Record<string, any> | undefined;

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function parsePlaceAddress(place: any) {
  const components: Record<string, string> = {};
  if (!place || !place.address_components) return components;
  place.address_components.forEach((comp: any) => {
    comp.types.forEach((type: string) => {
      components[type] = comp.long_name;
    });
  });
  return components;
}

export default function GoogleMapEmbed({
  lat,
  lng,
  address,
  zoom = 15,
  className = 'w-full h-full',
  mapType = 'roadmap',
  showGeofence = false,
  geofenceRadius = 200,
  draggable = false,
  onMarkerMove,
  height,
}: {
  lat?: number;
  lng?: number;
  address?: string;
  zoom?: number;
  className?: string;
  mapType?: MapType;
  showGeofence?: boolean;
  geofenceRadius?: number;
  draggable?: boolean;
  onMarkerMove?: (lat: number, lng: number, address: string, addressDetails?: AddressDetails) => void;
  height?: string;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!mapRef.current) return;

      if (!apiKey) {
        setReady(false);
        return;
      }

      const src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      try {
        await loadScript(src);
        if (!mounted) return;
        const google = (window as any).google;
        const center = {
          lat: typeof lat === 'number' ? lat : 40.4168,
          lng: typeof lng === 'number' ? lng : -3.7038,
        };

        mapInstance.current = new google.maps.Map(mapRef.current, {
          center,
          zoom,
          mapTypeId: mapType === 'satellite' ? google.maps.MapTypeId.SATELLITE : google.maps.MapTypeId.ROADMAP,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: false,
        });

        markerRef.current = new google.maps.Marker({
          position: center,
          map: mapInstance.current,
          title: address || 'Location',
          draggable,
        });

        if (draggable && markerRef.current) {
          markerRef.current.addListener('dragend', () => {
            const position = markerRef.current.getPosition();
            if (!position) return;
            const latLng = { lat: position.lat(), lng: position.lng() };

            if (typeof onMarkerMove === 'function') {
              const geocoder = new google.maps.Geocoder();
              geocoder.geocode({ location: latLng }, (results: any[], status: string) => {
                const formatted = results && results[0]?.formatted_address ? results[0].formatted_address : '';
                const details = parsePlaceAddress(results && results[0]);
                onMarkerMove(latLng.lat, latLng.lng, formatted, details);
              });
            }
          });
        }

        if (showGeofence) {
          circleRef.current = new google.maps.Circle({
            strokeColor: '#FF0000',
            strokeOpacity: 0.6,
            strokeWeight: 2,
            fillColor: '#FF0000',
            fillOpacity: 0.1,
            map: mapInstance.current,
            center,
            radius: geofenceRadius,
          });
        }

        setReady(true);
      } catch (err) {
        console.error('Failed loading Google Maps JS API', err);
        setReady(false);
      }
    }

    init();

    return () => {
      mounted = false;
      try {
        if (markerRef.current) { markerRef.current.setMap(null); markerRef.current = null; }
        if (circleRef.current) { circleRef.current.setMap(null); circleRef.current = null; }
        mapInstance.current = null;
      } catch {}
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const google = (window as any).google;
    if (!google || !mapInstance.current) return;
    const map = mapInstance.current;
    const center = {
      lat: typeof lat === 'number' ? lat : (markerRef.current?.getPosition ? markerRef.current.getPosition().lat() : 40.4168),
      lng: typeof lng === 'number' ? lng : (markerRef.current?.getPosition ? markerRef.current.getPosition().lng() : -3.7038),
    };

    map.setCenter(center);
    map.setZoom(zoom);
    map.setMapTypeId(mapType === 'satellite' ? google.maps.MapTypeId.SATELLITE : google.maps.MapTypeId.ROADMAP);

    if (markerRef.current) {
      markerRef.current.setPosition(center);
      markerRef.current.setDraggable(draggable);
      markerRef.current.setTitle(address || 'Location');
    } else {
      markerRef.current = new google.maps.Marker({ position: center, map, draggable, title: address || 'Location' });
    }

    if (showGeofence) {
      if (circleRef.current) {
        circleRef.current.setCenter(center);
        circleRef.current.setRadius(geofenceRadius);
        circleRef.current.setMap(map);
      } else {
        circleRef.current = new google.maps.Circle({
          strokeColor: '#FF0000',
          strokeOpacity: 0.6,
          strokeWeight: 2,
          fillColor: '#FF0000',
          fillOpacity: 0.1,
          map,
          center,
          radius: geofenceRadius,
        });
      }
    } else if (circleRef.current) {
      circleRef.current.setMap(null);
    }
  }, [lat, lng, zoom, mapType, showGeofence, geofenceRadius, draggable, address]);

  if (!apiKey) {
    const coords = typeof lat === 'number' && typeof lng === 'number' ? `${lat},${lng}` : (address ? encodeURIComponent(address) : '40.4168,-3.7038');
    const tParam = mapType === 'satellite' ? '&t=k' : '';
    const src = `https://maps.google.com/maps?q=${coords}&z=${zoom}${tParam}&output=embed`;
    return (
      <div className={className} style={{ height: height ?? '100%' }}>
        <iframe
          title="Google Maps"
          src={src}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          allowFullScreen
        />
      </div>
    );
  }

  return <div ref={mapRef} className={className} style={{ height: height ?? '100%' }} />;
}
