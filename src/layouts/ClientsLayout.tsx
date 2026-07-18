import { ReactNode, useEffect, useState } from 'react';
import clientsNav from '@/data/clients-nav.json';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Plus, Pencil, Calendar, AlertTriangle, FileText, UserCog, Clock as ClockIcon,
  Building2, Users, UserRound, Route as RouteIcon, Clock, ShieldCheck, Shield, ChevronRight,
  Home, MapPin, Contact, LayoutGrid, Target, BarChart3, File, DollarSign, Briefcase,
  IdCard, StickyNote, Folder, KeyRound, Mail,
} from 'lucide-react';

const TAB_ICONS: Record<string, any> = {
  Home, MapPin, Contact, FileText, LayoutGrid, Users, Target, AlertTriangle,
  BarChart3, File, DollarSign, Building2, Briefcase, IdCard, StickyNote, Folder, KeyRound, Mail,
};
import { Button } from '@/components/ui/button';
import { clientService } from '@/lib/api/clientService';

type Props = { navKey: string; title?: string; children: ReactNode; client?: any };

type Ov = {
  postSitesCount: number; stationsCount: number; projectsCount: number;
  assignedCount: number; onsiteCount: number; toursLast7Days: number;
  incidentsLast7Days: number; hoursLoggedSeconds: number;
  accountExecutiveName?: string | null; tenantTimezone?: string | null;
};

const ACCENT: Record<string, string> = {
  primary: 'bg-primary/12 text-primary', blue: 'bg-blue-500/12 text-blue-600',
  green: 'bg-emerald-500/12 text-emerald-600', orange: 'bg-orange-500/12 text-orange-600',
  red: 'bg-red-500/12 text-red-600', slate: 'bg-muted text-muted-foreground', violet: 'bg-violet-500/12 text-violet-600',
};

function KpiCard({ icon, value, label, accent = 'primary', to, sub, navigate }: any) {
  return (
    <button
      onClick={() => to && navigate(to)}
      className={`flex flex-col rounded-2xl border border-border bg-card p-4 text-left transition-shadow ${to ? 'cursor-pointer hover:shadow-md' : 'cursor-default'}`}
    >
      <span className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${ACCENT[accent] || ACCENT.primary} [&_svg]:size-[18px]`}>{icon}</span>
      <span className="text-2xl font-bold leading-none tracking-tight text-foreground tabular-nums">{value}</span>
      <span className="mt-1 text-xs text-muted-foreground">{label}</span>
      {sub && <span className="mt-1.5 text-[11px] font-medium text-primary">{sub}</span>}
    </button>
  );
}

export default function ClientsLayout({ navKey, title, children, client }: Props) {
  const { t } = useTranslation();
  const cfg: any = (clientsNav as any)[navKey] || null;
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [ov, setOv] = useState<Ov | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!client?.id) return;
      const o = await clientService.getClientOverview(client.id).catch(() => null);
      if (mounted && o) setOv(o);
    })();
    return () => { mounted = false; };
  }, [client?.id]);

  const hiddenIds = ['profile', 'notes', 'files', 'userAccess', 'emailReports'];
  const resolvePathWithId = (path: string) => (id && path.includes(':id') ? path.replace(':id', id) : path);
  const items: any[] = (cfg?.sections || []).flatMap((s: any) => s.items || []).filter((it: any) => !hiddenIds.includes(it.id));

  const displayName = client?.commercialName || client?.companyName
    ? (client?.commercialName || client?.companyName)
    : (client?.name || client?.firstName)
      ? `${client?.name || client?.firstName}${(client?.lastName || client?.surname) ? ' ' + (client?.lastName || client?.surname) : ''}`
      : t(cfg?.title ?? title ?? 'clients.nav.title');
  const logo = Array.isArray(client?.logoUrl) ? client.logoUrl[0]?.downloadUrl : null;
  let h = 0; const nm = String(displayName || '?');
  for (let i = 0; i < nm.length; i++) h = (h * 31 + nm.charCodeAt(i)) >>> 0;
  const hue = [28, 205, 150, 265, 340, 95, 180, 12][h % 8];

  const risk = String(client?.riskLevel || '').toLowerCase();
  const riskTone = risk.includes('alt') ? 'bg-red-500/12 text-red-600' : risk.includes('med') ? 'bg-orange-500/12 text-orange-600' : risk ? 'bg-emerald-500/12 text-emerald-600' : '';
  const hoursWorked = (() => {
    const s = Number(ov?.hoursLoggedSeconds || 0);
    return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;
  })();
  const base = `/clients/${client?.id}`;
  const fmtD = (d: any) => (d ? new Date(d).toLocaleDateString() : null);

  const kpis = [
    { icon: <Building2 />, value: ov?.postSitesCount ?? '—', label: t('clients.overview.cards.postSites', 'Sedes activas'), accent: 'blue', to: `${base}/post-sites`, sub: t('common.viewDetail', 'Ver detalle') },
    { icon: <Shield />, value: ov?.stationsCount ?? '—', label: t('clients.overview.cards.stations', 'Estaciones'), accent: 'primary', to: `${base}/post-sites`, sub: t('common.viewDetail', 'Ver detalle') },
    { icon: <Users />, value: ov?.assignedCount ?? '—', label: t('clients.overview.cards.guardsAssigned', 'Vigilantes asignados'), accent: 'green', sub: t('clients.overview.cards.viewStaff', 'Ver personal'), to: `${base}/post-sites` },
    { icon: <UserRound />, value: ov?.onsiteCount ?? '—', label: t('clients.overview.cards.onsite', 'En turno ahora'), accent: 'green', sub: t('clients.overview.cards.now', 'En este momento') },
    { icon: <AlertTriangle />, value: ov?.incidentsLast7Days ?? '—', label: t('clients.overview.cards.incidents', 'Incidentes (7 días)'), accent: 'orange', to: '/dispatch-tickets', sub: t('clients.overview.cards.viewIncidents', 'Ver incidentes') },
    { icon: <RouteIcon />, value: ov?.toursLast7Days ?? '—', label: t('clients.overview.cards.toursCompleted', 'Rondas (7 días)'), accent: 'violet' },
    { icon: <Clock />, value: hoursWorked, label: t('clients.overview.cards.hoursWorked', 'Horas (7 días)'), accent: 'red' },
    { icon: <ShieldCheck />, value: client?.active ? t('common.active', 'Activo') : t('common.archived', 'Inactivo'), label: t('clients.overview.cards.contract', 'Contrato'), accent: client?.active ? 'green' : 'slate', sub: client?.contractEndDate ? `${t('clients.contractEnd', 'Hasta')} ${fmtD(client.contractEndDate)}` : undefined },
  ];

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-4 px-4 py-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/clients" className="hover:text-primary">{t('clients.nav.title', 'Clientes')}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="truncate font-medium text-foreground">{displayName}</span>
      </div>

      {/* Header card */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            {logo ? (
              <img src={logo} alt="" className="h-16 w-16 shrink-0 rounded-2xl border bg-white object-cover" />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold" style={{ backgroundColor: `hsl(${hue} 70% 92%)`, color: `hsl(${hue} 60% 32%)` }}>
                {nm.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold tracking-tight text-foreground">{displayName}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                {client?.active !== undefined && (
                  <span className={`inline-flex items-center gap-1 font-medium ${client.active ? 'text-emerald-600' : 'text-red-500'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${client.active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    {client.active ? t('common.active', 'Activo') : t('common.archived', 'Archivado')}
                  </span>
                )}
                {client?.personType && (
                  <span className="rounded-full bg-muted px-2.5 py-0.5 font-medium text-muted-foreground">
                    {client.personType === 'PJ' ? t('clients.corporate', 'Cliente corporativo') : t('clients.individual', 'Cliente particular')}
                  </span>
                )}
                {client?.code && (
                  <span className="text-muted-foreground">{t('clients.code', 'Código')}: <span className="font-medium text-foreground">{client.code}</span></span>
                )}
                {risk && (
                  <span className={`rounded-full px-2.5 py-0.5 font-semibold capitalize ${riskTone}`}>
                    {t('clients.risk', 'Riesgo')}: {client.riskLevel}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                {client?.contractDate && (
                  <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {t('clients.contractStart', 'Inicio de contrato')}: <span className="text-foreground">{fmtD(client.contractDate)}</span></span>
                )}
                {(() => {
                  // Only meaningful for a persona jurídica (the company title ≠ the
                  // rep person). For a persona natural the client IS the person.
                  if (client?.personType !== 'PJ') return null;
                  const rep = `${client?.legalRepFirstName || client?.name || ''} ${client?.legalRepLastName || client?.lastName || ''}`.trim();
                  return rep ? (
                    <span className="inline-flex items-center gap-1.5"><UserCog className="h-3.5 w-3.5" /> {t('clients.accountExec', 'Representante legal')}: <span className="text-foreground">{rep}</span></span>
                  ) : null;
                })()}
                {ov?.tenantTimezone && (
                  <span className="inline-flex items-center gap-1.5"><ClockIcon className="h-3.5 w-3.5" /> {t('clients.timezone', 'Zona horaria')}: <span className="text-foreground">{ov.tenantTimezone}</span></span>
                )}
              </div>
            </div>
          </div>
          {client?.id && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/clients/edit/${client.id}`)}><Pencil className="mr-1 h-4 w-4" /> {t('clients.editClient', 'Editar cliente')}</Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/post-sites/new')}><Plus className="mr-1 h-4 w-4" /> {t('clients.hero.newSite', 'Crear sede')}</Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/dispatch-tickets/new')}><AlertTriangle className="mr-1 h-4 w-4" /> {t('clients.newIncident', 'Crear incidente')}</Button>
              <Button variant="brand" size="sm" onClick={() => navigate(`${base}/email-reports`)}><FileText className="mr-1 h-4 w-4" /> {t('clients.generateReport', 'Generar reporte')}</Button>
            </div>
          )}
        </div>
      </div>

      {/* KPI row — hidden on the coverage tab, which renders its own live KPIs */}
      {!location.pathname.endsWith('/coverage') && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
          {kpis.map((k, i) => <KpiCard key={i} {...k} navigate={navigate} />)}
        </div>
      )}

      {/* Tabs */}
      <div className="overflow-x-auto">
        <nav className="flex min-w-max items-center gap-1 border-b border-border">
          {items.map((it) => {
            const path = resolvePathWithId(it.path);
            const active = location.pathname === path;
            const badge = it.id === 'postSites' ? ov?.postSitesCount : undefined;
            const Icon = it.icon ? TAB_ICONS[it.icon] : null;
            return (
              <Link key={it.id} to={path} className={`relative flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2.5 text-sm font-medium transition-colors ${active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                {Icon && <Icon className="h-4 w-4" />}
                {t(it.label)}
                {typeof badge === 'number' && badge > 0 && (
                  <span className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${active ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>{badge}</span>
                )}
                {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </nav>
      </div>

      <div>{children}</div>
    </div>
  );
}
