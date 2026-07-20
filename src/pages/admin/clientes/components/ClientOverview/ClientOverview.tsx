import { useEffect, useState, useRef } from 'react';
import { clientDisplayName } from '@/lib/clientName';
import type { Client } from '@/types/client';
import useScrollToTopOnMount from '@/hooks/useScrollToTopOnMount';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import IncidentMap from '@/components/IncidentMap/IncidentMap';
import { clientService } from '@/lib/api/clientService';
import { Section, EmptyState } from '@/components/kit';
import {
  MapPin, Users, Building2, Shield, AlertTriangle, Route as RouteIcon, Clock,
  UserRound, Phone, Mail, ChevronRight, Bell, Activity, FileCheck, ShieldCheck,
  LogIn, LogOut, UserCheck, UserX, CheckCircle2, Repeat,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

// ── Shapes from the overview / operation / activity / contacts endpoints ──
interface StationLite { id: string; guards?: Array<{ id: string }>; }
// Unified-activity event (clientAccountActivity.ts).
interface ActivityEvent {
  id: string; type: string; at: string; title: string;
  subtitle: string | null; actor: string | null; tone: string;
}
// A client contact row (contacts endpoint) — many optional label fields.
interface ContactLite {
  id?: string; name?: string; fullName?: string; description?: string; role?: string;
  position?: string; mobile?: string; phone?: string; email?: string;
}

// Icon + accent per unified-activity event type.
const ACT_META: Record<string, { icon: LucideIcon; cls: string }> = {
  clock_in:    { icon: LogIn,        cls: 'bg-emerald-500/10 text-emerald-600' },
  clock_out:   { icon: LogOut,       cls: 'bg-muted text-muted-foreground' },
  incident:    { icon: AlertTriangle,cls: 'bg-orange-500/10 text-orange-600' },
  visitor_in:  { icon: UserCheck,    cls: 'bg-blue-500/10 text-blue-600' },
  visitor_out: { icon: UserX,        cls: 'bg-muted text-muted-foreground' },
  task_done:   { icon: CheckCircle2, cls: 'bg-emerald-500/10 text-emerald-600' },
  ronda_done:  { icon: RouteIcon,    cls: 'bg-primary/10 text-primary' },
  passdown:    { icon: Repeat,       cls: 'bg-blue-500/10 text-blue-600' },
};

type Overview = {
  postSitesCount: number; stationsCount: number; projectsCount: number;
  assignedCount: number; onsiteCount: number; toursLast7Days: number;
  tasksLast7Days: number; incidentsLast7Days: number; hoursLoggedSeconds: number;
  incidentsBySite?: Record<string, number>;
};
type Site = { id: string; name: string; address?: string; city?: string; active?: boolean; stations: StationLite[] };

const fmtTime = (d: string | number | Date) => {
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '' : dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};
const fmtDateTime = (d: string | number | Date) => {
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '' : dt.toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export default function ClientOverview({ client }: { client: Client & { lat?: number | string; lng?: number | string; latitude?: number | string; longitude?: number | string } }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  useScrollToTopOnMount(containerRef);

  const [ov, setOv] = useState<Overview>({
    postSitesCount: 0, stationsCount: 0, projectsCount: 0, assignedCount: 0,
    onsiteCount: 0, toursLast7Days: 0, tasksLast7Days: 0, incidentsLast7Days: 0, hoursLoggedSeconds: 0,
  });
  const [sites, setSites] = useState<Site[]>([]);
  const [contacts, setContacts] = useState<ContactLite[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!client?.id) return;
      const [o, op, c, act] = await Promise.all([
        clientService.getClientOverview(client.id).catch(() => null),
        clientService.getOperation(client.id).catch(() => ({ sites: [], looseStations: [] })),
        clientService.getClientContacts(client.id, { limit: 50, offset: 0 }).catch(() => null),
        clientService.getClientActivity(client.id, { limit: 12 }).catch(() => ({ rows: [] })),
      ]);
      if (!mounted) return;
      if (o) setOv((prev) => ({ ...prev, ...o }));
      const allSites: Site[] = [...(op?.sites || [])];
      if (op?.looseStations?.length) {
        allSites.push({ id: '__loose__', name: t('clients.overview.otherStations', 'Estaciones sin sede'), stations: op.looseStations });
      }
      setSites(allSites);
      setContacts(Array.isArray(c) ? c : (c?.rows ?? []));
      setActivity(Array.isArray(act?.rows) ? act.rows : []);
    })();
    return () => { mounted = false; };
  }, [client?.id]);

  const lat = Number(client?.latitude ?? client?.lat);
  const lng = Number(client?.longitude ?? client?.lng);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const base = `/clients/${client?.id}`;
  const isPJ = client?.personType === 'PJ';
  const primary = contacts[0] || null;


  // Per-site rollups for the "Estado de sedes" table. Incident counts come
  // from the overview endpoint's REAL 7-day aggregate keyed by postSiteId —
  // the old logic counted inside the last-8 feed matched by NAME, so a busy
  // sede systematically showed 0.
  const incidentsBySite: Record<string, number> = ov.incidentsBySite || {};
  const siteRows = sites.map((s) => {
    const guards = new Set<string>();
    (s.stations || []).forEach((st) => (st.guards || []).forEach((g) => guards.add(String(g.id))));
    const incCount = incidentsBySite[String(s.id)] ?? 0;
    return {
      id: s.id, name: s.name, address: s.address || s.city || '',
      stations: (s.stations || []).length, guards: guards.size, incidents: incCount,
      estado: guards.size > 0 ? 'operativa' : 'sin-operacion',
    };
  });

  // Real, derived alerts (no fabricated numbers).
  const alerts: { icon: ReactNode; label: string; sub: string; tone: string }[] = [];
  const uncovered = siteRows.filter((s) => s.estado === 'sin-operacion' && s.id !== '__loose__');
  if (uncovered.length) alerts.push({ icon: <Shield />, label: t('clients.overview.alerts.uncovered', 'Sedes sin cobertura'), sub: uncovered.map((s) => s.name).slice(0, 2).join(', ') + (uncovered.length > 2 ? '…' : ''), tone: 'crit' });
  if (ov.incidentsLast7Days > 0) alerts.push({ icon: <AlertTriangle />, label: t('clients.overview.alerts.openIncidents', 'Incidentes recientes'), sub: `${ov.incidentsLast7Days} ${t('clients.overview.alerts.last7', 'en los últimos 7 días')}`, tone: 'att' });
  if (ov.projectsCount > 0) alerts.push({ icon: <FileCheck />, label: t('clients.overview.alerts.projects', 'Proyectos activos'), sub: `${ov.projectsCount} ${t('clients.overview.alerts.inProgress', 'en curso')}`, tone: 'info' });


  return (
    <div ref={containerRef} className="space-y-5">
      {/* Two columns: operations (map + sites table) · contact + alerts + activity */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Section title={t('clients.overview.opsMap', 'Mapa de operaciones')} icon={<MapPin />}>
            {hasCoords ? (
              <div className="h-[300px] overflow-hidden rounded-xl border">
                <IncidentMap lat={lat} lng={lng} label={clientDisplayName(client, 'Client location')} />
              </div>
            ) : (
              <div className="flex h-[300px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed bg-muted/30 text-sm text-muted-foreground">
                <MapPin className="h-5 w-5 opacity-50" /> {t('clients.overview.noLocation', 'Sin ubicación registrada')}
              </div>
            )}
          </Section>

          <Section
            title={t('clients.overview.sedesStatus', 'Estado de sedes')}
            icon={<Building2 />}
            action={<Link to={`${base}/post-sites`} className="text-xs font-medium text-primary hover:underline">{t('common.viewAll', 'Ver todas')}</Link>}
          >
            {siteRows.length === 0 ? (
              <EmptyState icon={<Building2 />} title={t('clients.overview.noSedes', 'Sin sedes registradas') as string} description={t('clients.overview.noSedesHint', 'Crea la primera sede de este cliente.') as string} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">{t('clients.overview.tbl.sede', 'Sede')}</th>
                      <th className="py-2 pr-3 font-medium">{t('clients.overview.tbl.stations', 'Estaciones')}</th>
                      <th className="py-2 pr-3 font-medium">{t('clients.overview.tbl.guards', 'Vigilantes')}</th>
                      <th className="py-2 pr-3 font-medium">{t('clients.overview.tbl.status', 'Estado')}</th>
                      <th className="py-2 pr-3 text-right font-medium">{t('clients.overview.tbl.incidents', 'Incidentes')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siteRows.map((s) => (
                      <tr
                        key={s.id}
                        className={`border-b border-border/40 last:border-0 ${s.id !== '__loose__' ? 'cursor-pointer hover:bg-accent/40' : ''}`}
                        onClick={() => s.id !== '__loose__' && navigate(`${base}/post-sites`)}
                      >
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">{s.name}</p>
                              {s.address && <p className="truncate text-[11px] text-muted-foreground">{s.address}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 pr-3 tabular-nums text-muted-foreground">{s.stations}</td>
                        <td className="py-2.5 pr-3 tabular-nums text-muted-foreground">{s.guards}</td>
                        <td className="py-2.5 pr-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.estado === 'operativa' ? 'bg-emerald-500/12 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                            {s.estado === 'operativa' ? t('clients.overview.status.operativa', 'Operativa') : t('clients.overview.status.sinOp', 'Sin operación')}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">
                          <span className={s.incidents > 0 ? 'font-semibold text-red-600' : 'text-muted-foreground'}>{s.incidents}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>

        <div className="space-y-5">
          {/* Persona de contacto */}
          <Section
            title={t('clients.overview.contactPerson.title', 'Persona de contacto')}
            icon={<UserRound />}
            action={<Link to={`${base}/contacts`} className="text-xs font-medium text-primary hover:underline">{t('common.viewAll', 'Ver todos')}</Link>}
          >
            {primary ? (
              <div className="space-y-2.5">
                <div>
                  <p className="text-base font-semibold text-foreground">{primary.name || primary.fullName || '—'}</p>
                  {(primary.description || primary.role || primary.position) && (
                    <p className="text-xs text-muted-foreground">{primary.description || primary.role || primary.position}</p>
                  )}
                </div>
                {(primary.mobile || primary.phone) && (
                  <a href={`tel:${primary.mobile || primary.phone}`} className="flex items-center gap-2 text-sm text-foreground hover:text-primary">
                    <Phone className="h-4 w-4 text-muted-foreground" /> {primary.mobile || primary.phone}
                  </a>
                )}
                {primary.email && (
                  <a href={`mailto:${primary.email}`} className="flex items-center gap-2 text-sm text-foreground hover:text-primary">
                    <Mail className="h-4 w-4 text-muted-foreground" /> <span className="truncate">{primary.email}</span>
                  </a>
                )}
                {contacts.length > 1 && <p className="border-t border-border/50 pt-2 text-xs text-muted-foreground">+{contacts.length - 1} {t('clients.overview.contactPerson.more', 'contacto(s) más')}</p>}
              </div>
            ) : (client?.phoneNumber || client?.email) ? (
              <div className="space-y-2.5">
                <p className="text-xs text-muted-foreground">{t('clients.overview.contactPerson.direct', 'Contacto directo del cliente')}</p>
                {client?.phoneNumber && <a href={`tel:${client.phoneNumber}`} className="flex items-center gap-2 text-sm text-foreground hover:text-primary"><Phone className="h-4 w-4 text-muted-foreground" /> {client.phoneNumber}</a>}
                {client?.email && <a href={`mailto:${client.email}`} className="flex items-center gap-2 text-sm text-foreground hover:text-primary"><Mail className="h-4 w-4 text-muted-foreground" /> <span className="truncate">{client.email}</span></a>}
                {isPJ && (
                  <Link to={`${base}/contacts`} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    {t('clients.overview.contactPerson.add', 'Agregar persona de contacto')} <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            ) : (
              <EmptyState icon={<UserRound />} title={t('clients.overview.contactPerson.none', 'Sin persona de contacto') as string} description={t('clients.overview.contactPerson.addHint', 'Agrega quién es el contacto del cliente.') as string} />
            )}
          </Section>

          {/* Alertas y pendientes */}
          <Section title={t('clients.overview.alerts.title', 'Alertas y pendientes')} icon={<Bell />}>
            {alerts.length === 0 ? (
              <EmptyState icon={<ShieldCheck />} title={t('clients.overview.alerts.none', 'Todo en orden') as string} description={t('clients.overview.alerts.noneHint', 'No hay pendientes para este cliente.') as string} />
            ) : (
              <ul className="space-y-2.5">
                {alerts.map((a, i) => {
                  const tone = a.tone === 'crit' ? 'text-red-600' : a.tone === 'att' ? 'text-orange-600' : 'text-blue-600';
                  const bg = a.tone === 'crit' ? 'bg-red-500/10 text-red-600' : a.tone === 'att' ? 'bg-orange-500/10 text-orange-600' : 'bg-blue-500/10 text-blue-600';
                  return (
                    <li key={i} className="flex items-start gap-3">
                      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bg}`}>{a.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{a.label}</p>
                        <p className="truncate text-xs text-muted-foreground">{a.sub}</p>
                      </div>
                      <span className={`shrink-0 text-[11px] font-semibold ${tone}`}>
                        {a.tone === 'crit' ? t('clients.overview.alerts.critical', 'Crítico') : a.tone === 'att' ? t('clients.overview.alerts.attention', 'Atención') : t('clients.overview.alerts.info', 'Info')}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          {/* Actividad reciente — timeline unificado (marcas, incidentes,
              visitas, tareas, rondas, relevos) del personal en las sedes del cliente. */}
          <Section title={t('clients.overview.recent.title', 'Actividad reciente')} icon={<Activity />}>
            {activity.length === 0 ? (
              <EmptyState icon={<Activity />} title={t('clients.overview.recent.none', 'Sin actividad reciente') as string} description={t('clients.overview.recent.noneHint', 'Aquí verás la actividad del personal en las sedes del cliente: turnos, incidentes, visitas, tareas y rondas.') as string} />
            ) : (
              <ul className="space-y-3">
                {activity.map((n, i: number) => {
                  const meta = ACT_META[n.type] || { icon: Activity, cls: 'bg-muted text-muted-foreground' };
                  const Icon = meta.icon;
                  return (
                    <li key={n.id || i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className={`mt-1 flex h-7 w-7 items-center justify-center rounded-full ${meta.cls}`}><Icon className="h-3.5 w-3.5" /></span>
                        {i < activity.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
                      </div>
                      <div className="min-w-0 flex-1 pb-1">
                        <p className="truncate text-sm font-medium text-foreground">{n.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {n.subtitle && <span>{n.subtitle} · </span>}
                          {n.actor && <span>{n.actor} · </span>}
                          {fmtDateTime(n.at) || fmtTime(n.at)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
