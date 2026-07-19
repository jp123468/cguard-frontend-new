import { useEffect, useMemo, useRef, useState } from 'react';
import type { Client } from '@/types/client';
import { useNavigate } from 'react-router-dom';
import useScrollToTopOnMount from '@/hooks/useScrollToTopOnMount';
import { clientService } from '@/lib/api/clientService';
import guardRatingService from '@/lib/api/guardRatingService';
import GuardRatingLevel from '@/pages/admin/security-guards/GuardRatingLevel';
import { Section, EmptyState, StatusBadge } from '@/components/kit';
import { Button } from '@/components/ui/button';
import {
  Search, Users, UserCheck, UserX, Coffee, Clock, ShieldCheck, Timer,
  Eye, MoreVertical, RefreshCw, Route as RouteIcon, Pencil, UserMinus,
} from 'lucide-react';
import { toast } from 'sonner';
import { ApiService } from '@/services/api/apiService';
import { confirmDialog } from '@/components/ui/confirmDialog';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const inputCls = 'flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-all placeholder:text-muted-foreground hover:border-ring/40 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]';

type BadgeTone = 'green' | 'blue' | 'orange' | 'red' | 'primary' | 'slate';

// ── Shape of GET /client-account/:id/personnel (clientAccountPersonnel.ts) ──
interface PersonnelActivity { type: 'ronda' | 'checkin'; label: string; time?: string; }
interface PersonnelRow {
  id: string;
  guardId: string | null;
  assignmentId?: string | null;
  stationId?: string | null;
  name: string;
  code: string | null;
  role: 'guardia' | 'supervisor' | 'patrullero' | 'operador';
  roleLabel: string;
  puesto: string | null;
  sede: string | null;
  sedeId: string | null;
  turno: { window: string; label: string | null } | null;
  estado: string;
  inicioTurno: string | null;
  ultimaActividad: PersonnelActivity | null;
  photoUrl: string | null;
}
interface RoleDistribution { key: string; label: string; count: number; pct: number; }
interface CoberturaTurno { key: string; label: string; window: string; required: number; covered: number; pct: number; }
interface Certificacion { id: string; name: string; role: string; cert: string; expiresInDays: number; photoUrl: string | null; }
interface Ausencia { id: string; name: string; turno: string | null; reason: string; tone: string; photoUrl: string | null; }
interface PersonnelKpis {
  totalAsignados: number; enTurno: number; enTurnoPct: number; fueraTurno: number; fueraTurnoPct: number;
  descanso: number; descansoPct: number; ausentes: number; ausentesPct: number; proximosVencer: number;
  cumplimientoCobertura: number; metaCobertura: number; horasMes: number;
}
interface PersonnelData {
  tz: string;
  sedes: Array<{ id: string; name: string }>;
  kpis: PersonnelKpis;
  roleDistribution: RoleDistribution[];
  total: number;
  personal: PersonnelRow[];
  coberturaTurno: CoberturaTurno[];
  certificaciones: Certificacion[];
  ausenciasHoy: Ausencia[];
  page: number;
  perPage: number;
  updatedAt: string;
}

const ESTADO_META: Record<string, { label: string; tone: BadgeTone }> = {
  en_turno:    { label: 'En turno',      tone: 'green' },
  fuera_turno: { label: 'Fuera de turno', tone: 'blue' },
  descanso:    { label: 'Descanso',      tone: 'orange' },
  ausente:     { label: 'Ausente',       tone: 'red' },
  en_ruta:     { label: 'En ruta',       tone: 'primary' },
};
const ROLE_META: Record<string, { label: string; tone: BadgeTone; color: string }> = {
  guardia:    { label: 'Guardia',    tone: 'slate',   color: '#2563eb' },
  supervisor: { label: 'Supervisor', tone: 'blue',    color: '#16a34a' },
  patrullero: { label: 'Patrullero', tone: 'primary', color: '#9333ea' },
  operador:   { label: 'Operador',   tone: 'orange',  color: '#f59e0b' },
};

// ── Pure-SVG donut ─────────────────────────────────────────────────────────
function Donut({ segments, total }: { segments: Array<{ value: number; color: string }>; total: number }) {
  const R = 52, C = 2 * Math.PI * R, sum = segments.reduce((a, s) => a + s.value, 0) || 1;
  let offset = 0;
  return (
    <div className="relative h-[150px] w-[150px] shrink-0">
      <svg viewBox="0 0 130 130" className="h-full w-full -rotate-90">
        <circle cx="65" cy="65" r={R} fill="none" stroke="currentColor" className="text-muted" strokeWidth="16" />
        {segments.map((s, i) => {
          const len = (s.value / sum) * C;
          const el = <circle key={i} cx="65" cy="65" r={R} fill="none" stroke={s.color} strokeWidth="16" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} />;
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display text-2xl font-bold leading-none">{total}</div>
        <div className="text-xs text-muted-foreground">Total</div>
      </div>
    </div>
  );
}

function Avatar({ url, name }: { url?: string | null; name: string }) {
  const initials = (name || '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return url
    ? <img src={url} alt={name} className="h-9 w-9 shrink-0 rounded-full object-cover" />
    : <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/12 text-xs font-semibold text-primary">{initials}</span>;
}

export default function ClientStaff({ client }: { client: Client }) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  useScrollToTopOnMount(containerRef);

  const [data, setData] = useState<PersonnelData | null>(null);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const [sede, setSede] = useState('todos');
  const [role, setRole] = useState('todos');
  const [estado, setEstado] = useState('todos');
  const [turno, setTurno] = useState('todos');
  const [page, setPage] = useState(1);
  const perPage = 10;

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const d = await clientService.getClientPersonnel(client.id, {
        sedeId: sede !== 'todos' ? sede : undefined,
        role: role !== 'todos' ? role : undefined,
        estado: estado !== 'todos' ? estado : undefined,
        turno: turno !== 'todos' ? turno : undefined,
        q: q.trim() || undefined,
        page, perPage,
      });
      setData(d);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  // Refetch on filter/page change (debounced for search).
  useEffect(() => { const t = setTimeout(() => load(), 250); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [q, sede, role, estado, turno, page, client.id]);
  // Live refresh.
  useEffect(() => { const t = setInterval(() => load(true), 45000); return () => clearInterval(t); /* eslint-disable-next-line */ }, [q, sede, role, estado, turno, page, client.id]);

  const dist: RoleDistribution[] = data?.roleDistribution || [];
  const sedes: Array<{ id: string; name: string }> = data?.sedes || [];
  const personal: PersonnelRow[] = data?.personal || [];

  // Per-guard client-review level, so a service issue is visible right on the
  // roster. Click → the guard's Perfil › Reseñas. Keyed by securityGuard id.
  const [ratings, setRatings] = useState<Record<string, { average: number; count: number }>>({});
  useEffect(() => {
    const ids = personal.filter((p) => p.role === 'guardia').map((p) => p.id).filter(Boolean);
    if (!ids.length) return;
    let alive = true;
    guardRatingService.summary(ids).then((m) => { if (alive) setRatings((prev) => ({ ...prev, ...m })); }).catch(() => {});
    return () => { alive = false; };
  }, [personal]);
  const total = data?.total ?? 0;
  const coberturaTurno: CoberturaTurno[] = data?.coberturaTurno || [];
  const certs: Certificacion[] = data?.certificaciones || [];
  const ausencias: Ausencia[] = data?.ausenciasHoy || [];
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const fmtUpdated = data?.updatedAt ? new Date(data.updatedAt).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

  const donutSegments = useMemo(() => dist.filter((d) => d.count > 0).map((d) => ({ value: d.count, color: ROLE_META[d.key]?.color || '#94a3b8' })), [dist]);

  const resetPage = (fn: (v: string) => void) => (v: string) => { fn(v); setPage(1); };

  const openWorker = (p: PersonnelRow) => {
    if (p.role === 'guardia') navigate(`/guards/${p.id}/resumen`);
    else navigate(`/supervisors/${p.guardId}`);
  };

  // Quitar de la estación: elimina la asignación activa (guardAssignment) —
  // el vigilante vuelve al grupo sin asignación y sus turnos futuros se borran.
  const removeFromStation = async (p: PersonnelRow) => {
    if (!p.assignmentId) { toast.error('Este trabajador no tiene una asignación activa que quitar.'); return; }
    const ok = await confirmDialog({
      title: 'Quitar de la estación',
      message: `¿Quitar a ${p.name} de "${p.puesto || 'su estación'}"? Volverá al grupo de vigilantes sin asignación y se eliminarán sus turnos futuros generados.`,
      confirmText: 'Quitar',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      const tenantId = localStorage.getItem('tenantId') || '';
      await ApiService.delete(`/tenant/${tenantId}/guard-assignment/${p.assignmentId}`);
      toast.success(`${p.name} quedó sin asignación`);
      load(true);
    } catch (e: any) {
      toast.error(e?.data?.message || e?.message || 'No se pudo quitar la asignación');
    }
  };

  if (loading && !data) return <div className="p-8 text-sm text-muted-foreground">Cargando personal asignado…</div>;

  return (
    <div ref={containerRef} className="space-y-4">
      {/* The shared client-header KPI cards (ClientsLayout) stay visible on
          this tab — no duplicate per-tab KPI row here. */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
        {/* LEFT — filters + roster table */}
        <Section title="Personal asignado" icon={<Users className="h-4 w-4" />}>
          <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
            <div className="relative col-span-2 md:col-span-3 xl:col-span-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input className={`${inputCls} pl-8`} placeholder="Buscar por nombre, ID o estación" value={q} onChange={(e) => resetPage(setQ)(e.target.value)} />
            </div>
            <select className={inputCls} value={sede} onChange={(e) => resetPage(setSede)(e.target.value)}>
              <option value="todos">Sede: Todas</option>
              {sedes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select className={inputCls} value={role} onChange={(e) => resetPage(setRole)(e.target.value)}>
              <option value="todos">Rol: Todos</option>
              <option value="guardia">Guardia</option>
              <option value="supervisor">Supervisor</option>
              <option value="patrullero">Patrullero</option>
              <option value="operador">Operador</option>
            </select>
            <select className={inputCls} value={estado} onChange={(e) => resetPage(setEstado)(e.target.value)}>
              <option value="todos">Estado: Todos</option>
              <option value="en_turno">En turno</option>
              <option value="fuera_turno">Fuera de turno</option>
              <option value="descanso">Descanso</option>
              <option value="ausente">Ausente</option>
              <option value="en_ruta">En ruta</option>
            </select>
            <select className={inputCls} value={turno} onChange={(e) => resetPage(setTurno)(e.target.value)}>
              <option value="todos">Turno: Todos</option>
              <option value="Diurno">Diurno</option>
              <option value="Vespertino">Vespertino</option>
              <option value="Nocturno">Nocturno</option>
            </select>
          </div>

          {personal.length === 0 ? (
            <EmptyState icon={<Users className="h-5 w-5" />} title="Sin personal" description="No hay personal que coincida con los filtros para este cliente." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-2 font-medium">Personal</th>
                    <th className="px-2 py-2 font-medium">Rol</th>
                    <th className="px-2 py-2 font-medium">Estación</th>
                    <th className="px-2 py-2 font-medium">Sede / Sitio</th>
                    <th className="px-2 py-2 font-medium">Turno</th>
                    <th className="px-2 py-2 font-medium">Estado</th>
                    <th className="px-2 py-2 font-medium">Inicio</th>
                    <th className="px-2 py-2 font-medium">Última actividad</th>
                    <th className="px-2 py-2 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {personal.map((p) => {
                    const em = ESTADO_META[p.estado] || ESTADO_META.fuera_turno;
                    const rm = ROLE_META[p.role] || ROLE_META.guardia;
                    return (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="px-2 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar url={p.photoUrl} name={p.name} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium truncate">{p.name}</span>
                                {p.role === 'guardia' && ratings[p.id] && (
                                  <GuardRatingLevel average={ratings[p.id].average} count={ratings[p.id].count} onClick={() => navigate(`/guards/${p.id}/reviews`)} />
                                )}
                              </div>
                              {p.code && <div className="text-xs text-muted-foreground">{p.code}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-2.5"><StatusBadge tone={rm.tone} dot={false}>{p.roleLabel || rm.label}</StatusBadge></td>
                        <td className="px-2 py-2.5">{p.puesto || <span className="text-muted-foreground">—</span>}</td>
                        <td className="px-2 py-2.5">{p.sede || <span className="text-muted-foreground">—</span>}</td>
                        <td className="px-2 py-2.5">
                          {p.turno?.window ? <div><div>{p.turno.window}</div><div className="text-xs text-muted-foreground">{p.turno.label || ''}</div></div> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-2 py-2.5"><StatusBadge tone={em.tone}>{em.label}</StatusBadge></td>
                        <td className="px-2 py-2.5 tabular-nums">{p.inicioTurno || '—'}</td>
                        <td className="px-2 py-2.5">
                          {p.ultimaActividad?.type === 'ronda' ? <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><RouteIcon className="h-3.5 w-3.5" /> {p.ultimaActividad.label || 'Ronda activa'}</span>
                            : p.ultimaActividad?.label ? <div><div className="tabular-nums">{p.ultimaActividad.time || ''}</div><div className="text-xs text-muted-foreground">{p.ultimaActividad.label}</div></div>
                            : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                        <td className="px-2 py-2.5">
                          <div className="flex justify-end gap-1 text-muted-foreground">
                            <button title="Ver detalle" onClick={() => openWorker(p)} className="rounded-md p-1.5 hover:bg-muted hover:text-foreground"><Eye className="h-3.5 w-3.5" /></button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button title="Acciones" className="rounded-md p-1.5 hover:bg-muted hover:text-foreground"><MoreVertical className="h-3.5 w-3.5" /></button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openWorker(p)}>
                                  <Eye className="mr-2 h-3.5 w-3.5" /> Ver detalle
                                </DropdownMenuItem>
                                {p.role === 'guardia' && (
                                  <DropdownMenuItem onClick={() => navigate(`/security-guards/edit/${p.id}`)}>
                                    <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
                                  </DropdownMenuItem>
                                )}
                                {p.role === 'guardia' && p.assignmentId && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-red-500 focus:text-red-500"
                                      onClick={() => void removeFromStation(p)}
                                    >
                                      <UserMinus className="mr-2 h-3.5 w-3.5" /> Quitar de la estación
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>Mostrando {total === 0 ? 0 : (page - 1) * perPage + 1} a {Math.min(page * perPage, total)} de {total} resultados</span>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border px-2 py-1 disabled:opacity-40">‹</button>
              {Array.from({ length: Math.min(5, pageCount) }).map((_, i) => {
                const n = i + 1;
                return <button key={n} onClick={() => setPage(n)} className={`grid h-7 min-w-[28px] place-items-center rounded-md px-2 text-xs font-semibold ${n === page ? 'bg-primary text-white' : 'border text-foreground'}`}>{n}</button>;
              })}
              <button disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)} className="rounded-md border px-2 py-1 disabled:opacity-40">›</button>
            </div>
          </div>
        </Section>

        {/* RIGHT — distribution + coverage + certs + absences */}
        <div className="space-y-4">
          <Section title="Distribución por rol" icon={<Users className="h-4 w-4" />}>
            <div className="flex items-center gap-4">
              <Donut segments={donutSegments} total={data?.total ?? dist.reduce((a, d) => a + d.count, 0)} />
              <div className="flex-1 space-y-2">
                {dist.map((d) => (
                  <div key={d.key} className="flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: ROLE_META[d.key]?.color || '#94a3b8' }} />{d.label}</span>
                    <span className="tabular-nums"><b>{d.count}</b> <span className="text-xs text-muted-foreground">({d.pct}%)</span></span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          <Section title="Cobertura por turno" icon={<ShieldCheck className="h-4 w-4" />}>
            <div className="space-y-3">
              {coberturaTurno.map((t) => (
                <div key={t.key}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t.label} <span className="text-xs">({t.window})</span></span>
                    <span className="tabular-nums"><b className={t.pct >= 90 ? 'text-emerald-600' : t.pct >= 60 ? 'text-orange-600' : 'text-red-600'}>{t.pct}%</b> <span className="text-xs text-muted-foreground">{t.covered} / {t.required}</span></span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted"><div className={`h-2 rounded-full ${t.pct >= 90 ? 'bg-emerald-500' : t.pct >= 60 ? 'bg-orange-500' : 'bg-red-500'}`} style={{ width: `${Math.max(2, Math.min(100, t.pct))}%` }} /></div>
                </div>
              ))}
              {coberturaTurno.length === 0 && <p className="text-sm text-muted-foreground">Sin turnos configurados.</p>}
            </div>
          </Section>

          <Section title="Certificaciones próximas a vencer" icon={<ShieldCheck className="h-4 w-4" />}
            action={<button onClick={() => navigate('/security-guards')} className="text-xs font-medium text-primary hover:underline">Ver todas</button>}>
            {certs.length === 0 ? (
              <div className="py-2 text-sm text-emerald-600">Sin certificaciones próximas a vencer.</div>
            ) : (
              <div className="divide-y">
                {certs.slice(0, 6).map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar url={c.photoUrl} name={c.name} />
                      <div><div className="text-sm font-medium">{c.name}</div><div className="text-xs text-muted-foreground">{c.cert}</div></div>
                    </div>
                    <span className={`shrink-0 text-xs font-medium ${c.expiresInDays <= 15 ? 'text-red-600' : c.expiresInDays <= 30 ? 'text-orange-600' : 'text-blue-600'}`}>{c.expiresInDays < 0 ? 'Vencida' : `Vence en ${c.expiresInDays} días`}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title={`Ausencias hoy (${ausencias.length})`} icon={<UserX className="h-4 w-4" />}>
            {ausencias.length === 0 ? (
              <div className="py-2 text-sm text-emerald-600">Sin ausencias hoy.</div>
            ) : (
              <div className="divide-y">
                {ausencias.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar url={a.photoUrl} name={a.name} />
                      <div><div className="text-sm font-medium">{a.name}</div><div className="text-xs text-muted-foreground">{a.turno || ''}</div></div>
                    </div>
                    <span className={`shrink-0 text-xs font-medium ${a.tone === 'red' ? 'text-red-600' : 'text-orange-600'}`}>{a.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><RefreshCw className="h-3.5 w-3.5" /> Los estados se actualizan en tiempo real según el check-in de guardias.</span>
        <span className="inline-flex items-center gap-2">
          {fmtUpdated && <>Última actualización: {fmtUpdated}</>}
          <button onClick={() => load()} className="inline-flex items-center gap-1 font-medium text-primary hover:underline"><RefreshCw className="h-3.5 w-3.5" /> Actualizar</button>
        </span>
      </div>
    </div>
  );
}
