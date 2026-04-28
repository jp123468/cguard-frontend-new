import React, { useState } from 'react';
import patrolLogService from '@/lib/api/patrolLogService';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type Props = {
  patrolId: string;
  scannedBy: string; // user id
  proximityThresholdMeters?: number;
  onResult?: (resp: any) => void;
  label?: string;
};

const getCurrentPosition = (): Promise<GeolocationPosition> =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000 });
  });

export default function CheckpointAction({ patrolId, scannedBy, proximityThresholdMeters = 100, onResult, label = 'Marcar llegada' }: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const pos = await getCurrentPosition();
      const payload = {
        patrol: patrolId,
        scannedBy,
        scanTime: new Date().toISOString(),
        latitude: String(pos.coords.latitude),
        longitude: String(pos.coords.longitude),
        proximityThresholdMeters,
      } as any;

      const resp = await patrolLogService.create(payload);
      if (resp && resp.validLocation) {
        toast.success('Llegada validada');
      } else {
        toast.error('Ubicación no válida o demasiado lejana');
      }
      onResult && onResult(resp);
    } catch (e: any) {
      console.error('CheckpointAction error', e);
      toast.error(String(e?.message || e?.toString() || 'Error registrando llegada'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleClick} disabled={loading} className="bg-[#C8860A] text-white hover:bg-[#B37809]">
      {loading ? 'Enviando...' : label}
    </Button>
  );
}
