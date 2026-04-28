import React, { useEffect, useRef, useState } from 'react';

type MapType = 'roadmap' | 'satellite';

type AddressDetails = Record<string, any> | undefined;

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
        // If google maps already initialized, resolve immediately
        if ((window as any).google && (window as any).google.maps) return resolve();
        // Script tag exists but maps may still be initializing — resolve here
        // and let waitForGoogleMaps poll for the global to be ready.
        return resolve();
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function waitForGoogleMaps(timeout = 5000, interval = 200) {
  const start = Date.now();
  return new Promise<void>((resolve, reject) => {
    const check = () => {
      if ((window as any).google && (window as any).google.maps) return resolve();
      if (Date.now() - start > timeout) return reject(new Error('Google Maps not available after loading script'));
      setTimeout(check, interval);
    };
    check();
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
  markers,
  zoom = 15,
  className = 'w-full h-full',
  mapType = 'roadmap',
  showGeofence = false,
  geofenceRadius = 200,
  draggable = false,
  onMarkerMove,
  height,
  centerRequest,
  enableClickToSet,
  onMapClick,
  onReady,
}: {
  lat?: number;
  lng?: number;
  address?: string;
  markers?: Array<{ id: string; lat: number; lng: number; label?: string; role?: string }>;
  zoom?: number;
  className?: string;
  mapType?: MapType;
  showGeofence?: boolean;
  geofenceRadius?: number;
  draggable?: boolean;
  onMarkerMove?: (lat: number, lng: number, address: string, addressDetails?: AddressDetails) => void;
  height?: string;
  centerRequest?: number;
  enableClickToSet?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  onReady?: () => void;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
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
        // some environments may have an existing script tag but the global
        // `google.maps` may still not be ready; wait a short time for it.
        await waitForGoogleMaps(6000, 250);
        if (!mounted) return;
        const google = (window as any).google;
        if (!google || !google.maps) {
          throw new Error('Google Maps API did not initialize');
        }
        // Determine a better initial center when no explicit coords are provided.
        async function determineCenter() {
          // 1) If markers present, use first marker
          if (Array.isArray(markers) && markers.length > 0) {
            const m = markers[0];
            if (typeof m.lat === 'number' && typeof m.lng === 'number') return { lat: m.lat, lng: m.lng, zoom: zoom };
          }

          // 2) If direct coordinates passed, use them
          if (typeof lat === 'number' && typeof lng === 'number') return { lat: lat as number, lng: lng as number, zoom };

          // 3) Try geocoding an address (if provided)
          if (address) {
            try {
              const geocoder = new google.maps.Geocoder();
              const results = await new Promise<any[]>((resolve, reject) => {
                geocoder.geocode({ address }, (res: any, status: string) => (status === 'OK' ? resolve(res) : reject(status)));
              });
              if (results && results[0] && results[0].geometry && results[0].geometry.location) {
                const loc = results[0].geometry.location;
                return { lat: loc.lat(), lng: loc.lng(), zoom: 15 };
              }
            } catch (e) {
              // ignore and continue to next fallback
            }
          }

          // 4) Try browser geolocation as a last-resort (gives approximate client/user location)
          if (navigator && (navigator as any).geolocation) {
            try {
              const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
                (navigator as any).geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
              );
              return { lat: pos.coords.latitude, lng: pos.coords.longitude, zoom: 12 };
            } catch (e) {
              // ignore
            }
          }

          // 5) Read optional env default client coords
          const defLat = parseFloat((import.meta as any).env?.VITE_DEFAULT_CLIENT_LAT);
          const defLng = parseFloat((import.meta as any).env?.VITE_DEFAULT_CLIENT_LNG);
          if (!Number.isNaN(defLat) && !Number.isNaN(defLng)) return { lat: defLat, lng: defLng, zoom: 12 };

          // 6) final fallback to a reasonable default (Madrid)
          return { lat: 40.4168, lng: -3.7038, zoom: 12 };
        }

        const c = await determineCenter();
        const center = { lat: c.lat, lng: c.lng };
        const initialZoom = c.zoom ?? (typeof lat === 'number' && typeof lng === 'number' ? zoom : 12);

        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        mapInstance.current = new google.maps.Map(mapRef.current, {
          center,
          zoom: initialZoom,
          mapTypeId: mapType === 'satellite' ? google.maps.MapTypeId.SATELLITE : google.maps.MapTypeId.ROADMAP,
          mapTypeControl: !isMobile,
          mapTypeControlOptions: { position: google.maps.ControlPosition.TOP_LEFT },
          zoomControl: !isMobile,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: isMobile ? 'greedy' : 'auto',
        });

        // Adjust controls when viewport resizes to avoid overlap on small screens
        const onResize = () => {
          try {
            const mobileNow = window.innerWidth < 768;
            if (mapInstance.current) {
              mapInstance.current.setOptions({ mapTypeControl: !mobileNow, zoomControl: !mobileNow });
            }
          } catch (e) {
            // ignore
          }
        };
        window.addEventListener('resize', onResize);

        // If click-to-set mode is enabled, attach listener
        if (typeof enableClickToSet === 'boolean' && enableClickToSet) {
          mapInstance.current.addListener('click', (ev: any) => {
            try {
              const ll = ev.latLng;
              const lat = ll.lat();
              const lng = ll.lng();
              if (markerRef.current) {
                try { markerRef.current.setPosition({ lat, lng }); } catch {}
              } else {
                try { markerRef.current = new google.maps.Marker({ position: { lat, lng }, map: mapInstance.current }); } catch {}
              }
              if (typeof onMapClick === 'function') onMapClick(lat, lng);
            } catch (err) {
              console.warn('Map click handler error', err);
            }
          });
          // change cursor to crosshair to indicate clickable
          if (mapRef.current) mapRef.current.style.cursor = 'crosshair';
        } else if (mapRef.current) {
          mapRef.current.style.cursor = '';
        }

        // Create marker for single-location mode only when no markers list is provided
        try {
          if (!Array.isArray(markers) || markers.length === 0) {
            if (google.maps.marker && (google.maps.marker as any).AdvancedMarkerElement) {
              // single main marker (for single-location mode)
              // @ts-ignore
              markerRef.current = new google.maps.marker.AdvancedMarkerElement({
                position: center,
                map: mapInstance.current,
                title: address || 'Location',
              });
            } else {
              markerRef.current = new google.maps.Marker({
                position: center,
                map: mapInstance.current,
                title: address || 'Location',
                draggable,
              });
            }
          } else {
            // Do not create a main/center marker when an explicit markers list is provided
            markerRef.current = null;
          }
        } catch (markerErr) {
          console.warn('Marker creation failed or omitted', markerErr);
          markerRef.current = null;
        }

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
        try { onReady?.(); } catch {}
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

  // Manage multiple markers when `markers` prop is provided
  useEffect(() => {
    const google = (window as any).google;
    if (!google || !mapInstance.current) return;

    const desired = markers || [];
    const existing = markersRef.current || {};

    const keep = new Set<string>();

    desired.forEach((m) => {
      if (!m || typeof m.lat !== 'number' || typeof m.lng !== 'number') return;
      keep.add(m.id);
      if (existing[m.id]) {
        // update
        try { existing[m.id].setPosition({ lat: m.lat, lng: m.lng }); } catch {}
        try { existing[m.id].setTitle(m.label || m.id); } catch {}
      } else {
        // create marker
        try {
          const icon = {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: m.role === 'supervisor' ? '#2563eb' : '#059669',
            fillOpacity: 1,
            strokeWeight: 1,
            strokeColor: '#fff',
          } as any;

          const mk = new google.maps.Marker({
            position: { lat: m.lat, lng: m.lng },
            map: mapInstance.current,
            title: m.label || m.id,
            icon,
          });
          markersRef.current[m.id] = mk;
        } catch (e) {
          console.warn('Failed to create marker', e);
        }
      }
    });

    // remove old markers
    Object.keys(existing).forEach((id) => {
      if (!keep.has(id)) {
        try { existing[id].setMap(null); } catch {}
        delete existing[id];
      }
    });

    markersRef.current = existing;
  }, [markers]);

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
      // Only create a main marker if no explicit markers list was provided
      if (!Array.isArray(markers) || markers.length === 0) {
        try {
          markerRef.current = new google.maps.Marker({ position: center, map, draggable, title: address || 'Location' });
        } catch (e) {
          console.warn('Failed to create fallback main marker', e);
          markerRef.current = null;
        }
      }
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

  // Allow forced recenter when `centerRequest` changes (useful for manual centering from parent)
  useEffect(() => {
    if (centerRequest == null) return;
    const google = (window as any).google;
    if (!google || !mapInstance.current) return;
    if (typeof lat !== 'number' || typeof lng !== 'number') return;
    try {
      const center = { lat, lng };
      mapInstance.current.panTo(center);
      if (markerRef.current) markerRef.current.setPosition(center);
      if (showGeofence && circleRef.current) circleRef.current.setCenter(center);
      console.debug('[GoogleMapEmbed] centered to', center, 'via centerRequest');
    } catch (err) {
      console.warn('Failed to pan map on centerRequest', err);
    }
  }, [centerRequest]);

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
