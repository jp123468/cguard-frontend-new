import { useState, useEffect, useCallback } from 'react';
import { X, Shield, CheckCircle2, CalendarDays, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ApiService } from '@/services/api/apiService';
import { getTenantTimezone } from '@/utils/tenantLocation';

/** Local (tenant-tz) YYYY-MM-DD for a shift start. */
function localDateKey(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: getTenantTimezone(), year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(iso));
  const g = (t: string) => parts.find(p => p.type === t)?.value || '';
  return `${g('year')}-${g('month')}-${g('day')}`;
}

const today = () => new Date().toISOString().slice(0, 10);

interface Candidate { id: string; name: string; busy: Set<string>; freeForGaps: number; busyOnGaps: number; }

/**
 * Assign a Sacafranco (relief) to cover the fijos' rest-day gaps. Shows each
 * candidate as a card with the next-14-day availability strip — the station's gap
 * days are highlighted, and days the guard already works (at any station) are marked
 * busy — so you pick someone free on the days you need.
 */
export default function SacafrancoAssignModal({
  open, onClose, stationId, tenantId, gapDates, onAssigned,
}: {
  open: boolean;
  onClose: () => void;
  stationId: string;
  tenantId: string;
  gapDates: string[]; // station rest-day gap dates (YYYY-MM-DD), next ~14 days
  onAssigned: () => void;
}) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);

  const days = (() => {
    const out: string[] = [];
    const d = new Date(); d.setHours(0, 0, 0, 0);
    for (let i = 0; i < 14; i++) { out.push(new Date(d.getTime() + i * 86400000).toISOString().slice(0, 10)); }
    return out;
  })();
  const gapSet = new Set(gapDates);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [guardsRes, asgRes, shiftsRes] = await Promise.all([
        ApiService.get(`/tenant/${tenantId}/security-guard/autocomplete?limit=200`),
        ApiService.get(`/tenant/${tenantId}/guard-assignments?status=active`),
        ApiService.get(`/tenant/${tenantId}/shift?limit=999`),
      ]);
      const guards = Array.isArray(guardsRes) ? guardsRes : (guardsRes?.rows || []);
      const asg = Array.isArray(asgRes) ? asgRes : (asgRes?.rows || []);
      const shifts = Array.isArray(shiftsRes) ? shiftsRes : (shiftsRes?.rows || []);

      // A guard with an active rotation (fijo or relief) can't take another.
      const occupied = new Set<string>(
        asg.filter((a: any) => a.positionId || a.isRelief)
          .map((a: any) => String(a.guardId || a.guard?.id || '')).filter(Boolean),
      );
      // Busy dates per guard (works somewhere that day).
      const busyBy: Record<string, Set<string>> = {};
      for (const sh of shifts) {
        const gid = String(sh.guardId || sh.guard?.id || '');
        if (!gid || !sh.startTime) continue;
        (busyBy[gid] = busyBy[gid] || new Set()).add(localDateKey(sh.startTime));
      }
      const cands: Candidate[] = guards
        .map((g: any) => ({ id: String(g.guardId || g.id || ''), name: g.fullName || g.label || g.name || 'Vigilante' }))
        .filter((g: any) => g.id && !occupied.has(g.id))
        .map((g: any) => {
          const busy = busyBy[g.id] || new Set<string>();
          const busyOnGaps = gapDates.filter(d => busy.has(d)).length;
          return { ...g, busy, busyOnGaps, freeForGaps: gapDates.length - busyOnGaps };
        })
        .sort((a: Candidate, b: Candidate) => b.freeForGaps - a.freeForGaps || a.busy.size - b.busy.size);
      setCandidates(cands);
    } catch {
      /* api client toasts */
    } finally { setLoading(false); }
  }, [tenantId, gapDates]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const assign = async (g: Candidate) => {
    setAssigning(g.id);
    try {
      // Ensure the station has a Sacafranco position to assign into.
      const posRes: any = await ApiService.get(`/tenant/${tenantId}/station/${stationId}/positions`);
      const posList = Array.isArray(posRes) ? posRes : (posRes?.rows || []);
      let sf = posList.find((p: any) => p.type === 'sacafranco');
      if (!sf) {
        const created: any = await ApiService.post(`/tenant/${tenantId}/station/${stationId}/positions`, {
          data: { name: 'Sacafranco', type: 'sacafranco', startTime: '07:00', endTime: '19:00', platoonOffset: 0, sortOrder: 2, guardsNeeded: 1 },
        });
        sf = created?.data || created;
      }
      await ApiService.post(`/tenant/${tenantId}/guard-assignment`, {
        data: { guardId: g.id, stationId, positionId: sf.id, startDate: today(), isRelief: true },
      });
      toast.success(`${g.name} asignado como sacafranco — cubrirá los descansos de los fijos`);
      onAssigned();
      onClose();
    } catch (e: any) {
      toast.error(e?.data?.message || e?.message || 'No se pudo asignar el sacafranco');
    } finally { setAssigning(null); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl border border-border/40 bg-card shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border/20 px-5 py-4">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-emerald-500" />
            <div>
              <h3 className="text-base font-semibold text-foreground">Asignar sacafranco</h3>
              <p className="text-[11px] text-muted-foreground">Cubre los días de descanso de los fijos. Más disponibles primero.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted/40"><X size={18} /></button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 border-b border-border/10 px-5 py-2 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-red-500/40" /> Día a cubrir (descanso fijo)</span>
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-amber-500/50" /> Ocupado en otro puesto</span>
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-emerald-500/40" /> Libre</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="animate-spin" /></div>
          ) : candidates.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No hay vigilantes disponibles (todos tienen una rotación activa).</p>
          ) : candidates.map((g) => (
            <div key={g.id} className="rounded-xl border border-border/30 bg-background/40 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500 text-sm font-bold">
                    {g.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{g.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      <CalendarDays size={11} className="inline mr-1" />
                      Libre {g.freeForGaps}/{gapDates.length} días a cubrir{g.busyOnGaps > 0 ? ` · ocupado ${g.busyOnGaps}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => assign(g)}
                  disabled={!!assigning}
                  className="flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {assigning === g.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  Asignar
                </button>
              </div>
              {/* 14-day availability strip */}
              <div className="mt-2 flex gap-0.5">
                {days.map((d) => {
                  const isGap = gapSet.has(d);
                  const isBusy = g.busy.has(d);
                  const cls = isBusy ? 'bg-amber-500/50' : isGap ? 'bg-red-500/40' : 'bg-emerald-500/25';
                  return <div key={d} title={`${d}${isGap ? ' · descanso fijo' : ''}${isBusy ? ' · ocupado' : ''}`} className={`h-4 flex-1 rounded-sm ${cls}`} />;
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
