/**
 * Layout del detalle de estación — SIN sidebar interno.
 * El viejo menú lateral secundario (columna anticuada) se reemplaza por una
 * fila de CARDS de navegación horizontales bajo el hero: mismas secciones,
 * mismo lenguaje visual de la plataforma (tarjetas redondeadas + dorado),
 * contenido a ancho completo.
 */
import React, { ReactNode, useEffect, useRef } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  ChevronLeft, LayoutDashboard, DoorOpen, Users, CalendarClock,
  ClipboardList, Route, QrCode, History, Package, Car, AlertTriangle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Props = { title?: string; children: ReactNode; station?: any };

export default function StationLayout({ title, children, station }: Props) {
  const { t } = useTranslation();
  const location = useLocation();
  const { postSiteId, stationId } = useParams();
  const navRef = useRef<HTMLDivElement | null>(null);

  const base = `/post-sites/${postSiteId || ':postSiteId'}/stations/${stationId || ':stationId'}`;

  const items = [
    { id: 'overview',   label: t('station.details.overview',   'Vista General'),        icon: LayoutDashboard, path: `${base}/overview` },
    { id: 'visitors',   label: t('station.details.visitors',   'Visitantes'),           icon: DoorOpen,        path: `${base}/visitors` },
    { id: 'guards',     label: t('station.details.guards',     'Vigilantes'),           icon: Users,           path: `${base}/guards` },
    { id: 'shifts',     label: t('station.details.shifts',     'Turnos'),               icon: CalendarClock,   path: `${base}/shifts` },
    { id: 'orders',     label: t('station.details.orders',     'Consignas'),            icon: ClipboardList,   path: `${base}/orders` },
    { id: 'site-tours', label: t('station.details.siteTours',  'Rondas'),               icon: Route,           path: `${base}/site-tours` },
    { id: 'etiquetas',  label: t('station.details.patrolQr',   'QR de Rondas'),         icon: QrCode,          path: `${base}/etiquetas` },
    { id: 'tag-scans',  label: t('station.details.rondaHistory', 'Historial'),          icon: History,         path: `${base}/tag-scans` },
    { id: 'inventory',  label: t('station.details.inventory',  'Inventario'),           icon: Package,         path: `${base}/inventory` },
    { id: 'parking',    label: t('station.details.parking',    'Parking'),              icon: Car,             path: `${base}/parking` },
    { id: 'incidents',  label: t('station.details.incidents',  'Incidencias'),          icon: AlertTriangle,   path: `${base}/incidents` },
  ];

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  // Keep the active card visible when landing deep in the list.
  useEffect(() => {
    try {
      const el = navRef.current?.querySelector('[data-active="true"]') as HTMLElement | null;
      el?.scrollIntoView({ block: 'nearest', inline: 'center' });
    } catch { /* ignore */ }
  }, [location.pathname]);

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden">
        {/* Barra de navegación: regreso + cards de sección (scroll horizontal) */}
        <div className="shrink-0 px-4 pt-3">
          <div className="flex items-center gap-2">
            <Link
              to={`/post-sites/${postSiteId}/stations`}
              className="flex shrink-0 items-center gap-1 rounded-xl border bg-card px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              title={t('station.details.backToStations', 'Volver a Puestos')}
            >
              <ChevronLeft size={16} />
            </Link>
            <div
              ref={navRef}
              className="flex flex-1 items-center gap-2 overflow-x-auto pb-1 pt-1 [-ms-overflow-style:none] [scrollbar-width:thin]"
            >
              {items.map((it) => {
                const active = isActive(it.path);
                const Icon = it.icon;
                return (
                  <Link
                    key={it.id}
                    to={it.path}
                    data-active={active ? 'true' : undefined}
                    className={`flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all ${
                      active
                        ? 'border-primary/50 bg-primary/10 text-primary shadow-sm'
                        : 'border-border bg-card text-muted-foreground hover:-translate-y-px hover:border-primary/30 hover:text-foreground'
                    }`}
                  >
                    <Icon size={15} className={active ? '' : 'opacity-70'} />
                    {it.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Contenido a ancho completo */}
        <main className="flex-1 overflow-y-auto">
          <div className="pb-20">{children}</div>
        </main>
      </div>
    </AppLayout>
  );
}
