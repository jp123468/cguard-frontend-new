import { useState, useEffect, useMemo } from 'react';
import { Shield, User, Sun, Moon } from 'lucide-react';
import { ApiService } from '@/services/api/apiService';
import { getTenantTimezone } from '@/utils/tenantLocation';

/** Tenant-tz date key + hour of a shift start. */
function localParts(iso: string | Date): { dateKey: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: getTenantTimezone(), year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', hour12: false,
  }).formatToParts(new Date(iso));
  const g = (t: string) => parts.find(p => p.type === t)?.value || '';
  let h = parseInt(g('hour'), 10);
  if (h === 24) h = 0; // some engines render midnight as 24
  return { dateKey: `${g('year')}-${g('month')}-${g('day')}`, hour: h };
}

interface RosterCard { id: string; name: string; pattern: Record<string, 'day' | 'night'>; role?: { label: string; isRelief: boolean }; }

/** Shape of the shift "events" this roster consumes (subset produced by StationShifts). */
interface RosterEvent { guardId?: string; guardName?: string; start: string | Date; }

/**
 * "Equipo del puesto" — a card per assigned vigilante (fijos + sacafranco) showing
 * their role and their actual turno/horario as a 14-day día/noche/descanso strip,
 * derived from the generated shifts. Sacafrancos are flagged + sorted last.
 */
export default function StationRoster({ stationId, tenantId, events, guardColorMap }: {
  stationId: string;
  tenantId: string;
  events: RosterEvent[];
  guardColorMap: Record<string, { accent: string; bg: string; text: string }>;
}) {
  const [roles, setRoles] = useState<Record<string, { label: string; isRelief: boolean }>>({});

  useEffect(() => {
    let alive = true;
    ApiService.get(`/tenant/${tenantId}/guard-assignments?stationId=${encodeURIComponent(stationId)}&status=active`)
      .then((res: any) => {
        const list = Array.isArray(res) ? res : (res?.rows || res?.data || []);
        const m: Record<string, { label: string; isRelief: boolean }> = {};
        for (const a of list) {
          const gid = String(a.guardId || a.guard?.id || '');
          if (!gid) continue;
          const isRelief = !!a.isRelief || a.position?.type === 'sacafranco';
          m[gid] = { label: a.position?.name || (isRelief ? 'Sacafranco' : 'Fijo'), isRelief };
        }
        if (alive) setRoles(m);
      })
      .catch(() => { /* roles optional */ });
    return () => { alive = false; };
  }, [stationId, tenantId]);

  const days = useMemo(() => {
    const out: string[] = [];
    const d = new Date(); d.setHours(0, 0, 0, 0);
    for (let i = 0; i < 14; i++) out.push(new Date(d.getTime() + i * 86400000).toISOString().slice(0, 10));
    return out;
  }, []);

  const roster = useMemo<RosterCard[]>(() => {
    const byGuard: Record<string, RosterCard> = {};
    for (const ev of events) {
      const gid = String(ev.guardId || '');
      if (!gid || gid === 'unknown') continue;
      const { dateKey, hour } = localParts(ev.start);
      const kind: 'day' | 'night' = hour >= 6 && hour < 18 ? 'day' : 'night';
      (byGuard[gid] = byGuard[gid] || { id: gid, name: ev.guardName || 'Vigilante', pattern: {} }).pattern[dateKey] = kind;
    }
    return Object.values(byGuard)
      .map((v) => ({ ...v, role: roles[v.id] }))
      .sort((a, b) => (a.role?.isRelief ? 1 : 0) - (b.role?.isRelief ? 1 : 0) || a.name.localeCompare(b.name));
  }, [events, roles]);

  if (roster.length === 0) return null;

  return (
    <div className="mb-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Equipo del puesto</h4>
        <div className="flex items-center gap-2.5 text-[9px] text-muted-foreground">
          <span className="inline-flex items-center gap-0.5"><Sun size={9} className="text-amber-400" /> Día</span>
          <span className="inline-flex items-center gap-0.5"><Moon size={9} className="text-indigo-400" /> Noche</span>
          <span className="inline-flex items-center gap-0.5"><span className="inline-block h-2 w-2 rounded-sm bg-muted/40" /> Descanso</span>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {roster.map((g) => {
          const color = guardColorMap[g.id] || { accent: 'var(--primary)', bg: 'rgba(200,134,10,0.08)', text: 'inherit' };
          const isSf = g.role?.isRelief;
          const accent = isSf ? '#10b981' : color.accent;
          return (
            <div key={g.id} className="w-[228px] shrink-0 rounded-xl border border-border/30 bg-card p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                  style={{ background: isSf ? 'rgba(16,185,129,0.15)' : color.bg, color: accent }}>
                  {g.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{g.name}</p>
                  <p className="flex items-center gap-1 text-[10px] font-medium" style={{ color: accent }}>
                    {isSf ? <Shield size={10} /> : <User size={10} />}
                    {g.role?.label || (isSf ? 'Sacafranco' : 'Fijo')}
                  </p>
                </div>
              </div>
              {/* 14-day turno strip */}
              <div className="mt-2.5 flex gap-0.5">
                {days.map((d) => {
                  const k = g.pattern[d];
                  const cls = k === 'day' ? 'bg-amber-400/80' : k === 'night' ? 'bg-indigo-400/80' : 'bg-muted/30';
                  const lab = k === 'day' ? 'D' : k === 'night' ? 'N' : 'L';
                  return (
                    <div key={d} title={`${d}: ${k === 'day' ? 'Día' : k === 'night' ? 'Noche' : 'Descanso'}`}
                      className={`flex h-5 flex-1 items-center justify-center rounded-sm text-[8px] font-bold ${k ? 'text-white/95' : 'text-muted-foreground/50'} ${cls}`}>
                      {lab}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
