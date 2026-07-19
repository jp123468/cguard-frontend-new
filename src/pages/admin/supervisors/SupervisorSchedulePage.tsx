import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CalendarClock, Sun, Moon, MapPin, Settings2 } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import GuardsLayout from '@/layouts/GuardsLayout';
import { Section, EmptyState, StatusBadge, SkeletonCards } from '@/components/kit';
import { supervisorService } from '@/lib/api/supervisorService';

interface ScheduleRow {
  date: string | null;
  start: string | null;
  end: string | null;
  kind: 'day' | 'night' | string;
  position: { id: string; name: string; zone: string | null } | null;
}

function fmtTime(v: string | null): string {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

function fmtDateHeading(v: string): string {
  // v is a YYYY-MM-DD string — parse as local date to avoid tz drift.
  const [y, m, d] = v.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  if (isNaN(date.getTime())) return v;
  const s = date.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function SupervisorSchedulePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ScheduleRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    supervisorService
      .getSchedule(id)
      .then((res) => setRows((res?.rows ?? []) as ScheduleRow[]))
      .catch(() => toast.error('No se pudo cargar el horario'))
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(load, [load]);

  const manageBtn = (
    <button
      onClick={() => navigate('/supervisor-positions')}
      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted transition"
    >
      <Settings2 className="h-4 w-4" /> Configurar rotación
    </button>
  );

  // Group upcoming shifts by date, preserving chronological order.
  const groups: { date: string; rows: ScheduleRow[] }[] = [];
  for (const r of rows ?? []) {
    const key = r.date ?? '—';
    let g = groups.find((x) => x.date === key);
    if (!g) {
      g = { date: key, rows: [] };
      groups.push(g);
    }
    g.rows.push(r);
  }

  return (
    <AppLayout>
      <GuardsLayout navKey="supervisors" title="Horario">
        <div className="mx-auto max-w-5xl space-y-6 pb-24">
          {loading ? (
            <SkeletonCards count={3} />
          ) : !rows || rows.length === 0 ? (
            <EmptyState
              icon={<CalendarClock />}
              title="Sin horario generado"
              description="Depende del puesto asignado y su rotación. La rotación (día/noche) se configura en el puesto."
              action={manageBtn}
            />
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  Próximos turnos generados a partir del puesto asignado y su rotación.
                </p>
                {manageBtn}
              </div>

              {groups.map((g) => (
                <Section key={g.date} title={g.date === '—' ? 'Sin fecha' : fmtDateHeading(g.date)} icon={<CalendarClock className="h-4 w-4" />}>
                  <div className="space-y-2">
                    {g.rows.map((r, i) => {
                      const night = r.kind === 'night';
                      return (
                        <div
                          key={i}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/50 px-4 py-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <StatusBadge tone={night ? 'blue' : 'orange'} dot={false}>
                              {night ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                              {night ? 'Noche' : 'Día'}
                            </StatusBadge>
                            <span className="text-sm font-semibold tabular-nums">
                              {fmtTime(r.start)} – {fmtTime(r.end)}
                            </span>
                          </div>
                          {r.position && (
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">
                                {r.position.name}
                                {r.position.zone ? ` · ${r.position.zone}` : ''}
                              </span>
                            </span>
                          )}
                        </div>
                      );
                    })}
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
