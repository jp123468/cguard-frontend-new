import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { MapPin, Navigation, Clock, RotateCw, Car, Settings2, Building2 } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import GuardsLayout from '@/layouts/GuardsLayout';
import { Section, EmptyState, StatusBadge, Field, SkeletonCards } from '@/components/kit';
import { supervisorService } from '@/lib/api/supervisorService';

interface CoveragePosition {
  id: string;
  name: string;
  zone: string | null;
  rotationStyleName: string | null;
  window: string | null;
  mobileStation: { id: string; name: string } | null;
  stations: { id: string; name: string }[];
}

export default function SupervisorCoveragePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [positions, setPositions] = useState<CoveragePosition[] | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    supervisorService
      .getCoverage(id)
      .then((res) => setPositions((res?.positions ?? []) as CoveragePosition[]))
      .catch(() => toast.error('No se pudo cargar la cobertura'))
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(load, [load]);

  const manageBtn = (
    <button
      onClick={() => navigate('/supervisor-positions')}
      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted transition"
    >
      <Settings2 className="h-4 w-4" /> Gestionar puestos
    </button>
  );

  return (
    <AppLayout>
      <GuardsLayout navKey="supervisors" title="Cobertura">
        <div className="mx-auto max-w-5xl space-y-6 pb-24">
          {loading ? (
            <SkeletonCards count={2} />
          ) : !positions || positions.length === 0 ? (
            <EmptyState
              icon={<MapPin />}
              title="Sin cobertura asignada"
              description="Este supervisor no está asignado a ningún puesto."
              action={manageBtn}
            />
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  Zonas y estaciones que este supervisor cubre según sus puestos asignados.
                </p>
                {manageBtn}
              </div>

              {positions.map((p) => (
                <Section
                  key={p.id}
                  title={p.name}
                  icon={<MapPin className="h-4 w-4" />}
                  action={p.zone ? <StatusBadge tone="primary" dot={false}>{p.zone}</StatusBadge> : undefined}
                >
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Field
                        label={<span className="inline-flex items-center gap-1.5"><Navigation className="h-3.5 w-3.5" /> Zona</span>}
                        value={p.zone}
                      />
                      <Field
                        label={<span className="inline-flex items-center gap-1.5"><RotateCw className="h-3.5 w-3.5" /> Rotación</span>}
                        value={p.rotationStyleName}
                      />
                      <Field
                        label={<span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Turno</span>}
                        value={p.window}
                      />
                    </div>

                    <div>
                      <div className="cg-eyebrow mb-2 flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" /> Estaciones cubiertas
                      </div>
                      {p.stations?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {(p.stations || []).map((s) => (
                            <span
                              key={s.id}
                              className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium text-foreground"
                            >
                              <MapPin className="h-3 w-3 text-muted-foreground" /> {s.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Ninguna estación asignada a este puesto.</p>
                      )}
                    </div>

                    {p.mobileStation && (
                      <div>
                        <div className="cg-eyebrow mb-2 flex items-center gap-1.5">
                          <Car className="h-3.5 w-3.5" /> Estación móvil
                        </div>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold text-primary">
                          <Car className="h-3 w-3" /> {p.mobileStation.name}
                        </span>
                      </div>
                    )}
                  </div>
                </Section>
              ))}
            </>
          )}
        </div>
      </GuardsLayout>
    </AppLayout>
  );
}
