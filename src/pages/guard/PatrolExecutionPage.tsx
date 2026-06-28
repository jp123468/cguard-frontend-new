import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Route, ClipboardList, Loader2 } from 'lucide-react';
import patrolService from '@/lib/api/patrolService';
import userService from '@/lib/api/userService';
import CheckpointAction from '@/components/supervisor/CheckpointAction';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import inventoryService from '@/lib/api/inventoryService';
import { PageContainer, PageHeader, Section, StatusBadge } from '@/components/kit';

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

  if (!patrol) return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );

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
    <PageContainer width="narrow">
      <PageHeader
        icon={<Route />}
        title={`Ejecución patrulla: ${patrol.name || patrol.id}`}
        subtitle="Valida tu llegada y registra el inventario en cada punto"
        badges={
          checkpoints.length > 0 ? (
            <StatusBadge tone="primary" dot={false}>
              Punto {currentIndex + 1} de {checkpoints.length}
            </StatusBadge>
          ) : undefined
        }
      />

      <Section title="Punto actual" icon={<MapPin />}>
        <div className="mb-4">
          <div className="text-lg font-semibold text-foreground">{cp?.name || cp?.address || 'Sin nombre'}</div>
          {cp?.address && <div className="text-sm text-muted-foreground mt-0.5">{cp.address}</div>}
        </div>

        <div className="mb-2">
          <CheckpointAction
            patrolId={patrol.id}
            scannedBy={currentUser?.id}
            proximityThresholdMeters={100}
            onResult={handleResult}
          />
        </div>
      </Section>

      {scannedOk && (
        <Section title="Control / Inventario" icon={<ClipboardList />}>
          <div className="space-y-3">
            <textarea
              className="w-full rounded-lg border border-input bg-background p-2.5 text-sm resize-none focus:border-primary focus:ring-2 focus:ring-primary/25 focus:outline-none transition-colors"
              rows={4}
              value={inventoryNote}
              onChange={(e) => setInventoryNote(e.target.value)}
            />
            <div className="flex justify-end">
              <Button variant="brand" onClick={handleFinish}>Finalizar puesto</Button>
            </div>
          </div>
        </Section>
      )}
    </PageContainer>
  );
}
