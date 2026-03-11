import React from 'react';
// import GoogleMapEmbed from '@/components/GoogleMap/GoogleMapEmbed';
import OSMMapEmbed from '@/components/maps/OSMMapEmbed';

export default function IncidentMap({ lat, lng, label }: { lat?: number; lng?: number; label?: string }) {
  if (!lat || !lng) return null;

  // Si en el futuro se quiere usar Google Maps, descomentar la línea de abajo y comentar OSMMapEmbed
  // return (
  //   <div className="w-full h-64 rounded-md overflow-hidden mb-4">
  //     <GoogleMapEmbed lat={lat} lng={lng} zoom={15} />
  //   </div>
  // );

  // Por ahora, usar OpenStreetMap (Leaflet)
  return (
    <div className="w-full h-64 rounded-md overflow-hidden mb-4">
      <OSMMapEmbed lat={lat} lng={lng} zoom={15} />
    </div>
  );
}
