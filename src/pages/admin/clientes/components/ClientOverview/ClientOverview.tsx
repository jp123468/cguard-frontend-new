import { useEffect, useState, useRef } from 'react';
import useScrollToTopOnMount from '@/hooks/useScrollToTopOnMount';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import IncidentMap from '@/components/IncidentMap/IncidentMap';
import { clientService } from '@/lib/api/clientService';
import { categoryService } from '@/lib/api/categoryService';
import { Section, StatCard, Field, Stagger, FadeIn, EmptyState } from '@/components/kit';
import OperationTree from './OperationTree';
import {
  MapPin, Users, Route as RouteIcon, ClipboardCheck, AlertTriangle, Clock,
  Building2, Shield, Briefcase, ChevronRight, UserRound, Phone, Mail, Bell,
} from 'lucide-react';

type Overview = {
  postSitesCount: number; stationsCount: number; projectsCount: number;
  assignedCount: number; onsiteCount: number; toursLast7Days: number;
  tasksLast7Days: number; incidentsLast7Days: number; hoursLoggedSeconds: number;
};

const fmtDate = (d: any) => {
  if (!d) return '';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '' : dt.toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export default function ClientOverview({ client }: { client: any }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  useScrollToTopOnMount(containerRef);

  const [ov, setOv] = useState<Overview>({
    postSitesCount: client?.postSites?.length ?? 0, stationsCount: 0, projectsCount: 0,
    assignedCount: client?.assignedGuards?.length ?? 0, onsiteCount: 0, toursLast7Days: 0,
    tasksLast7Days: 0, incidentsLast7Days: 0, hoursLoggedSeconds: 0,
  });
  const [categoryNames, setCategoryNames] = useState<string[]>(Array.isArray(client?.categoryNames) ? client.categoryNames.map(String) : []);
  const [contacts, setContacts] = useState<any[]>([]);
  const [novedades, setNovedades] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!client?.id) return;
      const [o, c, inc] = await Promise.all([
        clientService.getClientOverview(client.id).catch(() => null),
        clientService.getClientContacts(client.id, { limit: 50, offset: 0 }).catch(() => null),
        clientService.getClientIncidents(client.id, { limit: 6, offset: 0 }).catch(() => null),
      ]);
      if (!mounted) return;
      if (o) setOv((prev) => ({ ...prev, ...o }));
      const cRows = Array.isArray(c) ? c : (c?.rows ?? []);
      setContacts(cRows);
      const iRows = Array.isArray(inc) ? inc : (inc?.rows ?? []);
      setNovedades(iRows);
    })();
    return () => { mounted = false; };
  }, [client?.id]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const ids = Array.isArray(client?.categoryIds) ? client.categoryIds : [];
      if (!ids.length) return;
      try {
        const resp = await categoryService.list({ filter: { module: 'clientAccount' }, limit: 1000 });
        const map = new Map<string, string>();
        (resp.rows || []).forEach((c: any) => map.set(String(c.id), c.name || ''));
        const names = ids.map((id: any) => map.get(String(id)) || '').filter(Boolean);
        if (mounted && names.length) setCategoryNames(names);
      } catch { /* keep fallback */ }
    })();
    return () => { mounted = false; };
  }, [client?.id]);

  const fullAddress = [client?.address, client?.addressLine2, [client?.city, client?.postalCode].filter(Boolean).join(' '), client?.country]
    .map((x) => (x ? String(x).trim() : '')).filter(Boolean).join(', ');
  const sectores = categoryNames.length ? categoryNames.join(', ') : '—';
  const addedOn = client?.createdAt ? new Date(client.createdAt).toLocaleDateString() : '—';
  const lat = Number(client?.latitude ?? client?.lat);
  const lng = Number(client?.longitude ?? client?.lng);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const base = `/clients/${client?.id}`;
  const isPJ = client?.personType === 'PJ';
  const primary = contacts[0] || null;

  const hoursWorked = (() => {
    const s = Number(ov.hoursLoggedSeconds || 0);
    return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;
  })();

  const headline = [
    { key: 'sites', label: t('clients.overview.cards.postSites', 'Sitios de servicio'), value: ov.postSitesCount, icon: <Building2 />, accent: 'primary', to: `${base}/post-sites` },
    { key: 'stations', label: t('clients.overview.cards.stations', 'Estaciones'), value: ov.stationsCount, icon: <Shield />, accent: 'blue', to: `${base}/post-sites` },
    { key: 'projects', label: t('clients.overview.cards.projects', 'Proyectos'), value: ov.projectsCount, icon: <Briefcase />, accent: 'slate', to: `${base}/projects` },
    { key: 'guards', label: t('clients.overview.cards.guardsAssigned', 'Vigilantes asignados'), value: ov.assignedCount, icon: <Users />, accent: 'green' },
  ] as any[];

  const activity = [
    { label: t('clients.overview.cards.onsite', 'En sitio ahora'), value: ov.onsiteCount, icon: <Users />, accent: 'green' },
    { label: t('clients.overview.cards.toursCompleted', 'Rondas (7 días)'), value: ov.toursLast7Days, icon: <RouteIcon />, accent: 'slate' },
    { label: t('clients.overview.cards.tasksCompleted', 'Tareas (7 días)'), value: ov.tasksLast7Days, icon: <ClipboardCheck />, accent: 'blue' },
    { label: t('clients.overview.cards.incidents', 'Incidentes (7 días)'), value: ov.incidentsLast7Days, icon: <AlertTriangle />, accent: 'orange' },
    { label: t('clients.overview.cards.hoursWorked', 'Horas (7 días)'), value: hoursWorked, icon: <Clock />, accent: 'red' },
  ] as any[];

  return (
    <div ref={containerRef} className="space-y-6">
      {/* 1 · At a glance */}
      <Stagger className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {headline.map((c) => (
          <button key={c.key} onClick={() => c.to && navigate(c.to)} className={`text-left ${c.to ? 'cursor-pointer' : 'cursor-default'}`}>
            <StatCard label={c.label} value={c.value} icon={c.icon} accent={c.accent} />
          </button>
        ))}
      </Stagger>

      {/* 2 · Identity + contact person + location */}
      <FadeIn className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Section title={t('clients.overview.generalInfo.title', 'Información del cliente')} icon={<Building2 />}>
          <div className="space-y-3">
            <Field label={isPJ ? t('clients.form.razonSocial', 'Razón social') : t('clients.overview.generalInfo.clientName', 'Cliente')} value={`${client?.name || '—'} ${client?.lastName || ''}`.trim()} />
            {client?.commercialName && <Field label={t('clients.form.commercialName', 'Nombre comercial')} value={client.commercialName} />}
            <Field label={t('clients.form.personType', 'Tipo de persona')} value={isPJ ? t('clients.form.personJuridica', 'Persona jurídica (RUC)') : t('clients.form.personNatural', 'Persona natural (Cédula)')} />
            <Field label={isPJ ? t('clients.form.ruc', 'RUC') : t('clients.form.cedula', 'Cédula')} value={client?.documentNumber || '—'} />
            <Field label={t('clients.form.categories', 'Sectores')} value={sectores} />
            <Field label={t('clients.form.address', 'Dirección')} value={fullAddress || '—'} />
            <Field label={t('clients.overview.generalInfo.addedOn', 'Cliente desde')} value={addedOn} />
          </div>
        </Section>

        {/* Persona de contacto — clave para personas jurídicas */}
        <Section
          title={t('clients.overview.contactPerson.title', 'Persona de contacto')}
          icon={<UserRound />}
          action={<Link to={`${base}/contacts`} className="text-xs font-medium text-primary hover:underline">{t('common.viewAll', 'Ver todos')}</Link>}
        >
          {primary ? (
            <div className="space-y-3">
              <div>
                <p className="text-base font-semibold text-foreground">{primary.name || primary.fullName || '—'}</p>
                {(primary.description || primary.role || primary.position || primary.jobTitle) && (
                  <p className="text-xs text-muted-foreground">{primary.description || primary.role || primary.position || primary.jobTitle}</p>
                )}
              </div>
              {(primary.mobile || primary.phone || primary.phoneNumber) && (
                <a href={`tel:${primary.mobile || primary.phone || primary.phoneNumber}`} className="flex items-center gap-2 text-sm text-foreground hover:text-primary">
                  <Phone className="h-4 w-4 text-muted-foreground" /> {primary.mobile || primary.phone || primary.phoneNumber}
                </a>
              )}
              {(primary.email) && (
                <a href={`mailto:${primary.email}`} className="flex items-center gap-2 text-sm text-foreground hover:text-primary">
                  <Mail className="h-4 w-4 text-muted-foreground" /> <span className="truncate">{primary.email}</span>
                </a>
              )}
              {contacts.length > 1 && (
                <p className="border-t border-border/50 pt-2 text-xs text-muted-foreground">+{contacts.length - 1} {t('clients.overview.contactPerson.more', 'contacto(s) más')}</p>
              )}
            </div>
          ) : (
            // Persona natural → the client IS the contact; show their direct line.
            (client?.phoneNumber || client?.email) ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">{t('clients.overview.contactPerson.direct', 'Contacto directo del cliente')}</p>
                {client?.phoneNumber && (
                  <a href={`tel:${client.phoneNumber}`} className="flex items-center gap-2 text-sm text-foreground hover:text-primary">
                    <Phone className="h-4 w-4 text-muted-foreground" /> {client.phoneNumber}
                  </a>
                )}
                {client?.email && (
                  <a href={`mailto:${client.email}`} className="flex items-center gap-2 text-sm text-foreground hover:text-primary">
                    <Mail className="h-4 w-4 text-muted-foreground" /> <span className="truncate">{client.email}</span>
                  </a>
                )}
                <Link to={`${base}/contacts`} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  {t('clients.overview.contactPerson.add', 'Agregar persona de contacto')} <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <EmptyState icon={<UserRound />} title={t('clients.overview.contactPerson.none', 'Sin persona de contacto') as string} description={t('clients.overview.contactPerson.addHint', 'Agrega quién es el contacto del cliente.') as string} />
            )
          )}
        </Section>

        <Section title={t('clients.overview.location', 'Ubicación')} icon={<MapPin />}>
          {hasCoords ? (
            <div className="h-[240px] overflow-hidden rounded-xl border">
              <IncidentMap lat={lat} lng={lng} label={client?.name || 'Client location'} />
            </div>
          ) : (
            <div className="flex h-[240px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed bg-muted/30 text-sm text-muted-foreground">
              <MapPin className="h-5 w-5 opacity-50" /> {t('clients.overview.noLocation', 'Sin ubicación registrada')}
            </div>
          )}
        </Section>
      </FadeIn>

      {/* 3 · Operación: sitios → estaciones */}
      <OperationTree client={client} />

      {/* 4 · Novedades recientes */}
      <Section
        title={t('clients.overview.novedades.title', 'Novedades recientes')}
        icon={<Bell />}
        action={ov.incidentsLast7Days > 0 ? <Link to={`${base}/post-sites`} className="text-xs font-medium text-primary hover:underline">{t('common.viewAll', 'Ver todas')}</Link> : undefined}
      >
        {novedades.length === 0 ? (
          <EmptyState icon={<Bell />} title={t('clients.overview.novedades.none', 'Sin novedades recientes') as string} description={t('clients.overview.novedades.noneHint', 'Aquí verás los incidentes y reportes de este cliente.') as string} />
        ) : (
          <ul className="divide-y divide-border/50">
            {novedades.map((n: any, i: number) => {
              const title = n.title || n.name || n.incidentType?.name || n.type || t('clients.overview.novedades.item', 'Novedad');
              const station = n.stationName || n.station?.stationName || n.postSiteName || n.postSite?.companyName || '';
              const when = fmtDate(n.createdAt || n.incidentAt || n.dateTime || n.date);
              const sev = String(n.severity || n.priority || '').toLowerCase();
              const sevTone = sev.includes('alt') || sev.includes('high') || sev.includes('crit') ? 'bg-red-500/12 text-red-600'
                : sev.includes('med') ? 'bg-orange-500/12 text-orange-600' : 'bg-muted text-muted-foreground';
              return (
                <li key={n.id || i} className="flex items-start gap-3 py-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600">
                    <AlertTriangle className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{title}</p>
                      {sev && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${sevTone}`}>{sev}</span>}
                    </div>
                    {(n.description) && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{n.description}</p>}
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                      {station && <span className="inline-flex items-center gap-1"><Shield className="h-3 w-3" /> {station}</span>}
                      {when && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {when}</span>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {/* 5 · Actividad operativa (7 días) */}
      <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {activity.map((a, i) => (
          <StatCard key={i} label={a.label} value={a.value} icon={a.icon} accent={a.accent} />
        ))}
      </Stagger>
    </div>
  );
}
