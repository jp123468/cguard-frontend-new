import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppLayout from '@/layouts/app-layout';
import GuardsLayout from '@/layouts/GuardsLayout';
import { Section, EmptyState } from '@/components/kit';
import securityGuardService from '@/lib/api/securityGuardService';
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import type { ScheduleSnapshot } from '../../guardDetailTypes';

const CELL: Record<string, { label: string; cls: string }> = {
  day: { label: 'D', cls: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
  night: { label: 'N', cls: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300' },
  rest: { label: 'L', cls: 'bg-muted text-muted-foreground' },
  none: { label: '·', cls: 'text-muted-foreground/40' },
};

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Horario — read-only rotation grid (D/N/L) for a single vigilante across all
 * their stations/positions. Rotation is configured on the station, so there is
 * no CRUD here. Mirrors the client ScheduleCard grid. :id = securityGuard id.
 */
export default function GuardHorarioPage() {
  const { id = '' } = useParams();
  const [data, setData] = useState<ScheduleSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [start, setStart] = useState<string | undefined>(undefined);

  const load = async (quiet = false) => {
    if (!id) { setLoading(false); return; }
    if (!quiet) setLoading(true);
    try {
      const d = await securityGuardService.getSchedule(id, { startDate: start });
      setData(d);
    } catch { /* silent */ } finally { setLoading(false); }
  };
  useEffect(() => { setLoading(true); load(); /* eslint-disable-next-line */ }, [id, start]);

  const days = data?.days || [];
  const rows = data?.rows || [];

  const shiftWindow = (deltaDays: number) => {
    const cur = data?.startDate ? new Date(`${data.startDate}T00:00:00`) : new Date();
    cur.setDate(cur.getDate() + deltaDays);
    setStart(ymd(cur));
  };

  const rangeLabel = data?.startDate && data?.endDate
    ? `${new Date(`${data.startDate}T00:00:00`).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })} – ${new Date(`${data.endDate}T00:00:00`).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}`
    : '';

  return (
    <AppLayout>
      <GuardsLayout navKey="keep-safe" title="guards.nav.horario">
        <div className="mx-auto max-w-5xl pb-24">
          <Section
            title="Horario"
            icon={<CalendarDays className="h-4 w-4" />}
            action={
              <div className="flex items-center gap-1.5">
                <span className="hidden text-xs text-muted-foreground sm:inline">{rangeLabel}</span>
                <button onClick={() => shiftWindow(-14)} className="rounded-md border p-1 text-muted-foreground hover:bg-muted" title="Quincena anterior"><ChevronLeft className="h-4 w-4" /></button>
                <button onClick={() => setStart(undefined)} className="rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-muted">Hoy</button>
                <button onClick={() => shiftWindow(14)} className="rounded-md border p-1 text-muted-foreground hover:bg-muted" title="Quincena siguiente"><ChevronRight className="h-4 w-4" /></button>
                <button onClick={() => load()} className="rounded-md border p-1 text-muted-foreground hover:bg-muted" title="Actualizar"><RefreshCw className="h-4 w-4" /></button>
              </div>
            }
          >
            {loading && !data ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Cargando horario…</div>
            ) : rows.length === 0 ? (
              <EmptyState
                icon={<CalendarDays className="h-5 w-5" />}
                title="Sin horario"
                description="Este vigilante no tiene puestos con rotación configurada."
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-10 min-w-[220px] border-b bg-card px-2 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Puesto · Cliente</th>
                        {days.map((d) => (
                          <th key={d.date} className={`border-b px-1 py-1 text-center text-[11px] font-medium ${d.isToday ? 'text-primary' : d.weekend ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
                            <div>{d.dow}</div><div className={`tabular-nums ${d.isToday ? 'font-bold' : ''}`}>{d.day}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.assignmentId || r.positionId} className="hover:bg-muted/30">
                          <td className="sticky left-0 z-10 min-w-[220px] border-b bg-card px-2 py-1.5">
                            <div className="text-sm font-semibold text-foreground">
                              {r.stationName}
                              <span className="font-normal text-muted-foreground"> · {r.positionName}{r.positionType === 'sacafranco' ? ' · SF' : ''}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {[r.sedeName, r.clientName].filter(Boolean).join(' · ')}
                              {r.rotationStyleName ? <span className="text-muted-foreground/70"> · {r.rotationStyleName}</span> : null}
                            </div>
                          </td>
                          {(r.cells || []).map((c) => {
                            const m = CELL[c.status] || CELL.none;
                            return <td key={c.date} className="border-b p-0.5 text-center"><span className={`grid h-7 w-full min-w-[26px] place-items-center rounded text-[11px] font-bold ${m.cls}`}>{m.label}</span></td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><span className="grid h-4 w-4 place-items-center rounded bg-sky-500/15 text-[10px] font-bold text-sky-700">D</span> Día</span>
                  <span className="inline-flex items-center gap-1.5"><span className="grid h-4 w-4 place-items-center rounded bg-indigo-500/15 text-[10px] font-bold text-indigo-700">N</span> Noche</span>
                  <span className="inline-flex items-center gap-1.5"><span className="grid h-4 w-4 place-items-center rounded bg-muted text-[10px] font-bold text-muted-foreground">L</span> Libre</span>
                  <span className="ml-auto">La rotación se configura en la estación.</span>
                </div>
              </>
            )}
          </Section>
        </div>
      </GuardsLayout>
    </AppLayout>
  );
}
