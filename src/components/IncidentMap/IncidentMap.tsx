import React from 'react';
import GoogleMapEmbed from '@/components/GoogleMap/GoogleMapEmbed';

export default function IncidentMap({ lat, lng, label }: { lat?: number; lng?: number; label?: string }) {
  if (!lat || !lng) return null;

  return (
    <div className="w-full h-64 rounded-md overflow-hidden mb-4">
      <GoogleMapEmbed lat={lat} lng={lng} zoom={15} />
    </div>
  );
}
