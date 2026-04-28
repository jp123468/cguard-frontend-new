import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '@/utils/loadGoogleMaps';
import { getTenantLocation } from '@/utils/tenantLocation';

type MapType = 'roadmap' | 'satellite';

type AddressDetails = Record<string, any> | undefined;

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

      try {
        await loadGoogleMaps();
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

          // 6) final fallback — use business location or generic Ecuador center
          const biz = getTenantLocation();
          if (biz) return { lat: biz.lat, lng: biz.lng, zoom: 12 };
          return { lat: -0.2295, lng: -78.5236, zoom: 12 };
        }

        const c = await determineCenter();
        const center = { lat: c.lat, lng: c.lng };
        const initialZoom = c.zoom ?? (typeof lat === 'number' && typeof lng === 'number' ? zoom : 12);

        mapInstance.current = new google.maps.Map(mapRef.current, {
          center,
          zoom: initialZoom,
          mapTypeId: mapType === 'satellite' ? 'satellite' : 'roadmap',
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: false,
          mapId: 'DEMO_MAP_ID',
        });

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
                try { markerRef.current = new google.maps.marker.AdvancedMarkerElement({ position: { lat, lng }, map: mapInstance.current }); } catch {}
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
            markerRef.current = new google.maps.marker.AdvancedMarkerElement({
              position: center,
              map: mapInstance.current,
              title: address || 'Location',
              gmpDraggable: draggable,
            });
          } else {
            // Do not create a main/center marker when an explicit markers list is provided
            markerRef.current = null;
          }
        } catch (markerErr) {
          console.warn('Marker creation failed or omitted', markerErr);
          markerRef.current = null;
        }

        if (draggable && markerRef.current) {
          markerRef.current.addListener('gmp-dragend', () => {
            const pos = markerRef.current.position as any;
            if (!pos) return;
            const latLng = {
              lat: typeof pos.lat === 'function' ? pos.lat() : (pos.lat as number),
              lng: typeof pos.lng === 'function' ? pos.lng() : (pos.lng as number),
            };

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
        if (markerRef.current) { try { markerRef.current.map = null; } catch { /* ignore */ } markerRef.current = null; }
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
        // update (supports both Marker and AdvancedMarkerElement)
        try {
          if (typeof existing[m.id].setPosition === 'function') {
            existing[m.id].setPosition({ lat: m.lat, lng: m.lng });
          } else {
            existing[m.id].position = { lat: m.lat, lng: m.lng };
          }
        } catch {}
        try {
          if (typeof existing[m.id].setTitle === 'function') {
            existing[m.id].setTitle(m.label || m.id);
          } else {
            existing[m.id].title = m.label || m.id;
          }
        } catch {}
      } else {
        // create marker
        try {
          let mk: any;
          {
            const color = m.role === 'supervisor' ? '#2563eb' : '#059669';
            const dot = document.createElement('div');
            dot.style.cssText = `width:14px;height:14px;background:${color};border-radius:50%;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4);`;
            mk = new google.maps.marker.AdvancedMarkerElement({
              position: { lat: m.lat, lng: m.lng },
              map: mapInstance.current,
              title: m.label || m.id,
              content: dot,
            });
          }
          markersRef.current[m.id] = mk;
        } catch (e) {
          console.warn('Failed to create marker', e);
        }
      }
    });

    // remove old markers
    Object.keys(existing).forEach((id) => {
      if (!keep.has(id)) {
        try {
          if (typeof existing[id].setMap === 'function') {
            existing[id].setMap(null);
          } else {
            existing[id].map = null;
          }
        } catch {}
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
      lat: typeof lat === 'number' ? lat : (markerRef.current?.getPosition ? markerRef.current.getPosition().lat() : (getTenantLocation()?.lat ?? -0.2295)),
      lng: typeof lng === 'number' ? lng : (markerRef.current?.getPosition ? markerRef.current.getPosition().lng() : (getTenantLocation()?.lng ?? -78.5236)),
    };

    map.setCenter(center);
    map.setZoom(zoom);
    map.setMapTypeId(mapType === 'satellite' ? 'satellite' : 'roadmap');

    if (markerRef.current) {
      markerRef.current.position = center;
      markerRef.current.gmpDraggable = draggable;
      markerRef.current.title = address || 'Location';
    } else {
      // Only create a main marker if no explicit markers list was provided
      if (!Array.isArray(markers) || markers.length === 0) {
        try {
          markerRef.current = new google.maps.marker.AdvancedMarkerElement({ position: center, map, gmpDraggable: draggable, title: address || 'Location' });
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
      if (markerRef.current) markerRef.current.position = center;
      if (showGeofence && circleRef.current) circleRef.current.setCenter(center);
      console.debug('[GoogleMapEmbed] centered to', center, 'via centerRequest');
    } catch (err) {
      console.warn('Failed to pan map on centerRequest', err);
    }
  }, [centerRequest]);

  if (!apiKey) {
    const bizFallback = getTenantLocation();
    const coords = typeof lat === 'number' && typeof lng === 'number' ? `${lat},${lng}` : (address ? encodeURIComponent(address) : `${bizFallback?.lat ?? -0.2295},${bizFallback?.lng ?? -78.5236}`);
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
