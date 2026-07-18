import { useEffect, useState, useRef } from 'react';
import useScrollToTopOnMount from '@/hooks/useScrollToTopOnMount';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import IncidentMap from '@/components/IncidentMap/IncidentMap';
import { clientService } from '@/lib/api/clientService';
import { Section, StatCard, Field, Stagger, FadeIn } from '@/components/kit';
import OperationTree from './OperationTree';
import {
  MapPin, Users, Route as RouteIcon, ClipboardCheck, AlertTriangle, Clock,
  Building2, Phone, Shield, Briefcase, ChevronRight, Mail, Globe,
} from 'lucide-react';

type Overview = {
  postSitesCount: number;
  stationsCount: number;
  projectsCount: number;
  assignedCount: number;
  onsiteCount: number;
  toursLast7Days: number;
  tasksLast7Days: number;
  incidentsLast7Days: number;
  hoursLoggedSeconds: number;
};

export default function ClientOverview({ client }: { client: any }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  useScrollToTopOnMount(containerRef);

  const [ov, setOv] = useState<Overview>({
    postSitesCount: client?.postSites?.length ?? 0,
    stationsCount: 0,
    projectsCount: 0,
    assignedCount: client?.assignedGuards?.length ?? 0,
    onsiteCount: 0,
    toursLast7Days: 0,
    tasksLast7Days: 0,
    incidentsLast7Days: 0,
    hoursLoggedSeconds: 0,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!client?.id) return;
      try {
        const o = await clientService.getClientOverview(client.id);
        if (mounted && o) setOv((prev) => ({ ...prev, ...o }));
      } catch (e) {
        console.error('Error fetching client overview', e);
      }
    })();
    return () => { mounted = false; };
  }, [client?.id]);

  const hoursWorked = (() => {
    const s = Number(ov.hoursLoggedSeconds || 0);
    return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;
  })();

  const addedOn = client?.createdAt ? new Date(client.createdAt).toLocaleDateString() : '—';
  const lat = Number(client?.latitude ?? client?.lat);
  const lng = Number(client?.longitude ?? client?.lng);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  const base = `/clients/${client?.id}`;

  // Headline counts — the four things an operator wants at a glance.
  const headline: { key: string; label: string; value: number; icon: any; accent: any; to?: string }[] = [
    { key: 'sites', label: t('clients.overview.cards.postSites', 'Sitios de servicio'), value: ov.postSitesCount, icon: <Building2 />, accent: 'primary', to: `${base}/post-sites` },
    { key: 'stations', label: t('clients.overview.cards.stations', 'Estaciones'), value: ov.stationsCount, icon: <Shield />, accent: 'blue', to: `${base}/post-sites` },
    { key: 'projects', label: t('clients.overview.cards.projects', 'Proyectos'), value: ov.projectsCount, icon: <Briefcase />, accent: 'slate', to: `${base}/projects` },
    { key: 'guards', label: t('clients.overview.cards.guardsAssigned', 'Vigilantes asignados'), value: ov.assignedCount, icon: <Users />, accent: 'green' },
  ];

  // Last-7-days activity — secondary strip.
  const activity: { label: string; value: string | number; icon: any; accent: any }[] = [
    { label: t('clients.overview.cards.onsite', 'En sitio ahora'), value: ov.onsiteCount, icon: <Users />, accent: 'green' },
    { label: t('clients.overview.cards.toursCompleted', 'Rondas (7 días)'), value: ov.toursLast7Days, icon: <RouteIcon />, accent: 'slate' },
    { label: t('clients.overview.cards.tasksCompleted', 'Tareas (7 días)'), value: ov.tasksLast7Days, icon: <ClipboardCheck />, accent: 'blue' },
    { label: t('clients.overview.cards.incidents', 'Incidentes (7 días)'), value: ov.incidentsLast7Days, icon: <AlertTriangle />, accent: 'orange' },
    { label: t('clients.overview.cards.hoursWorked', 'Horas (7 días)'), value: hoursWorked, icon: <Clock />, accent: 'red' },
  ];

  return (
    <div ref={containerRef} className="space-y-6">
      {/* Headline counts — big, tappable, jump to the detail. */}
      <Stagger className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {headline.map((c) => (
          <button key={c.key} onClick={() => c.to && navigate(c.to)} className={`text-left ${c.to ? 'cursor-pointer' : 'cursor-default'}`}>
            <StatCard label={c.label} value={c.value} icon={c.icon} accent={c.accent} />
          </button>
        ))}
      </Stagger>

      {/* Activity strip (7 días) */}
      <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {activity.map((a, i) => (
          <StatCard key={i} label={a.label} value={a.value} icon={a.icon} accent={a.accent} />
        ))}
      </Stagger>

      {/* Operación: sitios → estaciones con enlaces directos. */}
      <OperationTree client={client} />

      {/* Info + ubicación */}
      <FadeIn className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Section title={t('clients.overview.generalInfo.title', 'Información general')} icon={<Building2 />}>
          <div className="space-y-3">
            <Field label={t('clients.overview.generalInfo.clientName', 'Cliente')} value={`${client?.name || '—'} ${client?.lastName || ''}`.trim()} />
            <Field
              label={t('clients.form.personType', 'Tipo de persona')}
              value={client?.personType === 'PJ' ? t('clients.form.personJuridica', 'Persona jurídica (RUC)') : t('clients.form.personNatural', 'Persona natural (Cédula)')}
            />
            <Field
              label={client?.personType === 'PJ' ? t('clients.form.ruc', 'RUC') : t('clients.form.cedula', 'Cédula')}
              value={client?.documentNumber}
            />
            <Field label={t('clients.overview.generalInfo.address', 'Dirección')} value={client?.address} />
            <Field label={t('clients.overview.generalInfo.addedOn', 'Cliente desde')} value={addedOn} />
          </div>
        </Section>

        <Section title={t('clients.overview.contactDetails.title', 'Contacto')} icon={<Phone />}>
          <div className="space-y-3">
            <Field label={t('clients.overview.contactDetails.phoneNumber', 'Teléfono')} value={client?.phoneNumber} />
            <Field label={t('clients.overview.contactDetails.fax', 'Teléfono fijo')} value={client?.landline || client?.faxNumber || client?.fax} />
            <Field label={t('clients.overview.contactDetails.email', 'Correo')} value={client?.email} />
            <Field label={t('clients.overview.contactDetails.website', 'Sitio web')} value={client?.website} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border/50 pt-4">
            <Link to={`${base}/contacts`} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent">
              {t('clients.nav.contacts', 'Contactos')} <ChevronRight className="h-3.5 w-3.5" />
            </Link>
            <Link to={`${base}/profile`} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent">
              {t('clients.nav.profile', 'Perfil')} <ChevronRight className="h-3.5 w-3.5" />
            </Link>
            <Link to={`${base}/projects`} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent">
              {t('clients.nav.projects', 'Proyectos')} <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Section>

        <Section title={t('clients.overview.location', 'Ubicación')} icon={<MapPin />}>
          {hasCoords ? (
            <div className="h-[240px] overflow-hidden rounded-xl border">
              <IncidentMap lat={lat} lng={lng} label={client?.name || 'Client location'} />
            </div>
          ) : (
            <div className="flex h-[240px] items-center justify-center rounded-xl border border-dashed bg-muted/30 text-sm text-muted-foreground">
              {t('clients.overview.noLocation', 'Sin ubicación registrada')}
            </div>
          )}
        </Section>
      </FadeIn>
    </div>
  );
}
