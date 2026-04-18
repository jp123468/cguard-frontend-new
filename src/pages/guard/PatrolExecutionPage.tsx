import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import patrolService from '@/lib/api/patrolService';
import userService from '@/lib/api/userService';
import CheckpointAction from '@/components/supervisor/CheckpointAction';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import inventoryService from '@/lib/api/inventoryService';

export default function PatrolExecutionPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [patrol, setPatrol] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scannedOk, setScannedOk] = useState(false);
  const [inventoryNote, setInventoryNote] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const u = await userService.fetchCurrentUser();
        setCurrentUser(u);
      } catch (e) {}
    })();
  }, []);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    (async () => {
      try {
        const p = await patrolService.find(id as string);
        if (!mounted) return;
        setPatrol(p?.data || p);
      } catch (e: any) {
        toast.error('Error cargando patrulla');
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  if (!patrol) return <div className="p-6">Cargando patrulla...</div>;

  const checkpoints = patrol.checkpoints || [];
  const cp = checkpoints[currentIndex];

  const handleResult = (resp: any) => {
    if (resp && resp.validLocation) {
      setScannedOk(true);
      toast.success('Llegada validada, registra el inventario y finaliza');
    } else {
      setScannedOk(false);
      toast.error('Ubicación no válida');
    }
  };

  const handleFinish = async () => {
    try {
      // Save inventory check to backend as inventoryHistory linked to patrol/checkpoint
      const payload: any = {
        inventoryCheckedDate: new Date().toISOString(),
        isComplete: true,
        observation: inventoryNote,
        patrol: patrol.id,
        patrolCheckpoint: cp?.id,
        // optional: shiftOrigin or inventoryOrigin can be set if available
      };

      await inventoryService.createHistory(payload);

      toast.success('Puesto finalizado y guardado');
      setInventoryNote('');
      setScannedOk(false);
      const next = currentIndex + 1;
      if (next >= checkpoints.length) {
        toast.success('Ruta completada');
        navigate('/vehicle-patrol/routes');
      } else {
        setCurrentIndex(next);
      }
    } catch (e) {
      toast.error('Error finalizando puesto');
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Ejecución patrulla: {patrol.name || patrol.id}</h2>
      <Card>
        <CardContent>
          <div className="mb-4">
            <div className="text-sm font-medium">Punto actual</div>
            <div className="text-lg">{cp?.name || cp?.address || 'Sin nombre'}</div>
            <div className="text-sm text-muted-foreground">{cp?.address}</div>
          </div>

          <div className="mb-4">
            <CheckpointAction
              patrolId={patrol.id}
              scannedBy={currentUser?.id}
              proximityThresholdMeters={100}
              onResult={handleResult}
            />
          </div>

          {scannedOk && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium">Control / Inventario</label>
                <textarea className="w-full border rounded p-2" rows={4} value={inventoryNote} onChange={(e) => setInventoryNote(e.target.value)} />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleFinish}>Finalizar puesto</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
