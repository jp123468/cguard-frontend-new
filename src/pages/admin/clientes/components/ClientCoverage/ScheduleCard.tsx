import { useEffect, useMemo, useState } from 'react';
import { clientService } from '@/lib/api/clientService';
import { Section, EmptyState, Modal } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw, UserPlus, UserMinus, Loader2 } from 'lucide-react';

const CELL: Record<string, { label: string; cls: string }> = {
  day: { label: 'D', cls: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
  night: { label: 'N', cls: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300' },
  rest: { label: 'L', cls: 'bg-muted text-muted-foreground' },
  none: { label: '·', cls: 'text-muted-foreground/40' },
};

const inputCls = 'flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-all placeholder:text-muted-foreground hover:border-ring/40 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]';
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function ScheduleCard({ clientId, sedeId }: { clientId: string; sedeId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [start, setStart] = useState<string | undefined>(undefined);
  const [guardOptions, setGuardOptions] = useState<Array<{ id: string; label: string }>>([]);

  const [editRow, setEditRow] = useState<any>(null);
  const [pickGuard, setPickGuard] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async (quiet = false) => {
    if (!sedeId) { setLoading(false); return; }
    if (!quiet) setLoading(true);
    try {
      const d = await clientService.getClientSchedule(clientId, { postSiteId: sedeId, startDate: start });
      setData(d);
    } catch { /* silent */ } finally { setLoading(false); }
  };
  useEffect(() => { setLoading(true); load(); /* eslint-disable-next-line */ }, [clientId, sedeId, start]);
  useEffect(() => { clientService.guardAutocomplete('', 300).then(setGuardOptions).catch(() => setGuardOptions([])); }, [clientId]);

  const days: any[] = data?.days || [];
  const rows: any[] = data?.rows || [];

  // Group rows by station for a station label spanning its positions.
  const grouped = useMemo(() => {
    const out: Array<{ stationName: string; rows: any[] }> = [];
    for (const r of rows) {
      const last = out[out.length - 1];
      if (last && last.stationName === r.stationName) last.rows.push(r);
      else out.push({ stationName: r.stationName, rows: [r] });
    }
    return out;
  }, [rows]);

  const shiftWindow = (deltaDays: number) => {
    const cur = data?.startDate ? new Date(`${data.startDate}T00:00:00`) : new Date();
    cur.setDate(cur.getDate() + deltaDays);
    setStart(ymd(cur));
  };

  const openEdit = (row: any) => { setEditRow(row); setPickGuard(row.guardId || ''); };
  const saveGuard = async () => {
    if (!editRow) return;
    setSaving(true);
    try {
      // Change = remove existing assignment on the position, then assign the new guard.
      if (editRow.assignmentId) await clientService.removeGuardAssignment(editRow.assignmentId);
      if (pickGuard) {
        await clientService.assignGuardToPosition({ guardId: pickGuard, stationId: editRow.stationId, positionId: editRow.positionId, isRelief: editRow.positionType === 'sacafranco' });
        toast.success('Vigilante asignado');
      } else {
        toast.success('Asignación removida');
      }
      setEditRow(null);
      await load(true);
    } catch (e: any) { toast.error(e?.response?.data?.message || 'No se pudo actualizar la asignación'); }
    finally { setSaving(false); }
  };
  const removeGuard = async () => {
    if (!editRow?.assignmentId) { setEditRow(null); return; }
    setSaving(true);
    try { await clientService.removeGuardAssignment(editRow.assignmentId); toast.success('Asignación removida'); setEditRow(null); await load(true); }
    catch { toast.error('No se pudo remover'); } finally { setSaving(false); }
  };

  const rangeLabel = data?.startDate && data?.endDate
    ? `${new Date(`${data.startDate}T00:00:00`).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })} – ${new Date(`${data.endDate}T00:00:00`).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}`
    : '';

  return (
    <Section
      title="Horarios"
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
        <EmptyState icon={<CalendarDays className="h-5 w-5" />} title="Sin horario" description="Esta sede no tiene puestos con rotación configurada. Configura las estaciones en el Programador." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 min-w-[200px] border-b bg-card px-2 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Estación · Puesto · Vigilante</th>
                  {days.map((d) => (
                    <th key={d.date} className={`border-b px-1 py-1 text-center text-[11px] font-medium ${d.isToday ? 'text-primary' : d.weekend ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
                      <div>{d.dow}</div><div className={`tabular-nums ${d.isToday ? 'font-bold' : ''}`}>{d.day}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grouped.map((g) => g.rows.map((r, ri) => (
                  <tr key={r.positionId} className="hover:bg-muted/30">
                    <td className="sticky left-0 z-10 min-w-[200px] border-b bg-card px-2 py-1.5">
                      {ri === 0 && <div className="text-xs font-semibold text-foreground">{g.stationName}</div>}
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-xs text-muted-foreground">{r.positionName}{r.positionType === 'sacafranco' ? ' · SF' : ''}</span>
                          <button onClick={() => openEdit(r)} className="block truncate text-left text-sm font-medium hover:text-primary" title="Cambiar vigilante">
                            {r.guardName || <span className="text-orange-600">Sin asignar</span>}
                          </button>
                        </div>
                        <button onClick={() => openEdit(r)} className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-primary" title="Cambiar vigilante"><UserPlus className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                    {r.cells.map((c: any) => {
                      const m = CELL[c.status] || CELL.none;
                      return <td key={c.date} className="border-b p-0.5 text-center"><span className={`grid h-7 w-full min-w-[26px] place-items-center rounded text-[11px] font-bold ${m.cls}`}>{m.label}</span></td>;
                    })}
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="grid h-4 w-4 place-items-center rounded bg-sky-500/15 text-[10px] font-bold text-sky-700">D</span> Día</span>
            <span className="inline-flex items-center gap-1.5"><span className="grid h-4 w-4 place-items-center rounded bg-indigo-500/15 text-[10px] font-bold text-indigo-700">N</span> Noche</span>
            <span className="inline-flex items-center gap-1.5"><span className="grid h-4 w-4 place-items-center rounded bg-muted text-[10px] font-bold text-muted-foreground">L</span> Libre</span>
            <span className="ml-auto">Toca un vigilante para cambiarlo.</span>
          </div>
        </>
      )}

      {/* Change-guard modal */}
      <Modal open={!!editRow} onOpenChange={(o) => { if (!o && !saving) setEditRow(null); }} title="Cambiar vigilante" icon={<UserPlus className="h-5 w-5" />} size="sm"
        footer={<><Button variant="outline" onClick={() => setEditRow(null)} disabled={saving}>Cancelar</Button>{editRow?.assignmentId && <Button variant="outline" onClick={removeGuard} disabled={saving} className="text-red-600"><UserMinus className="mr-1.5 h-4 w-4" /> Quitar</Button>}<Button onClick={saveGuard} disabled={saving || pickGuard === (editRow?.guardId || '')}>{saving ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Guardando…</> : 'Guardar'}</Button></>}>
        {editRow && (
          <div className="space-y-3">
            <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm"><span className="text-muted-foreground">{editRow.stationName} · {editRow.positionName}</span>{editRow.rotationStyleName && <span className="text-muted-foreground"> · {editRow.rotationStyleName}</span>}</div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Vigilante</label>
              <select className={inputCls} value={pickGuard} onChange={(e) => setPickGuard(e.target.value)}>
                <option value="">— Sin asignar —</option>
                {guardOptions.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
              </select>
            </div>
            <p className="text-xs text-muted-foreground">El vigilante seguirá la rotación de la estación. Cambiar reemplaza la asignación actual del puesto.</p>
          </div>
        )}
      </Modal>
    </Section>
  );
}
