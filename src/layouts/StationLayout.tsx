import React, { ReactNode, useState, useEffect, useRef } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Menu, ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Props = { title?: string; children: ReactNode; station?: any };

export default function StationLayout({ title, children, station }: Props) {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const { postSiteId, stationId } = useParams();
  const navRef = useRef<HTMLDivElement | null>(null);

  const base = `/post-sites/${postSiteId || ':postSiteId'}/stations/${stationId || ':stationId'}`;

  const sections = [
    {
      items: [
        { id: 'overview',   label: t('station.details.overview',   'Vista General'),         path: `${base}/overview` },
        { id: 'visitors',   label: t('station.details.visitors',   'Gestión de Visitantes'), path: `${base}/visitors` },
        { id: 'guards',     label: t('station.details.guards',     'Vigilantes Asignados'),    path: `${base}/guards` },
        { id: 'shifts',     label: t('station.details.shifts',     'Turnos'),                path: `${base}/shifts` },
        { id: 'orders',     label: t('station.details.orders',     'Consignas específicas'), path: `${base}/orders` },
        { id: 'site-tours', label: t('station.details.siteTours',  'Rondas de Seguridad'),   path: `${base}/site-tours` },
        { id: 'etiquetas',  label: t('station.details.patrolQr',  'Generar QR de Rondas'),     path: `${base}/etiquetas` },
        { id: 'tag-scans',  label: t('station.details.rondaHistory', 'Historial de Rondas'),   path: `${base}/tag-scans` },
        { id: 'inventory',  label: t('station.details.inventory',  'Inventario'),            path: `${base}/inventory` },
        { id: 'parking',    label: t('station.details.parking',    'Gestión de Parking'),    path: `${base}/parking` },
        { id: 'incidents',  label: t('station.details.incidents',  'Incidencias'),           path: `${base}/incidents` },
      ],
    },
  ];

  const flatItems = sections.flatMap(s => s.items);
  const activeItem = flatItems.find(it =>
    location.pathname === it.path || location.pathname.startsWith(it.path + '/')
  );

  const headerLabel = activeItem
    ? activeItem.label
    : (station?.name || station?.stationName || title || t('station.details.title', 'Puesto'));

  useEffect(() => {
    if (!activeItem || !navRef.current) return;
    try {
      const activeEl = navRef.current.querySelector('[data-active="true"]') as HTMLElement | null;
      if (activeEl) activeEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    } catch {}
  }, [activeItem, location.pathname]);

  return (
    <AppLayout>
      <div className="flex gap-6 h-[calc(100vh-64px)] overflow-hidden">
        {/* Sidebar */}
        <aside className={`shrink-0 transition-all duration-300 ${sidebarOpen ? 'w-60 opacity-100' : 'w-0 opacity-0 pointer-events-none'}`}>
          <div className="h-full flex flex-col">
            <div className="bg-card border border-border rounded-md p-4 m-3 flex-1 overflow-hidden">
              <Link
                to={`/post-sites/${postSiteId}/stations`}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-[#C8860A] mb-3"
              >
                <ChevronLeft size={14} />
                {t('station.details.backToStations', 'Volver a Puestos')}
              </Link>
              <div className="text-lg font-semibold mb-4 truncate">
                {station?.name || station?.stationName || title || t('station.details.title', 'Puesto')}
              </div>
              <nav className="text-base">
                <div ref={navRef} className="max-h-[calc(100vh-160px)] overflow-y-auto pr-3 pb-20">
                  {sections.map((section, idx) => (
                    <div key={idx} className="mb-0 pb-0">
                      <ul className="divide-y">
                        {section.items.map((it) => {
                          const isActive =
                            location.pathname === it.path ||
                            location.pathname.startsWith(it.path + '/');
                          return (
                            <li key={it.id} className="bg-card">
                              <Link
                                to={it.path}
                                data-active={isActive ? 'true' : undefined}
                                className={`flex items-center justify-between px-5 py-3 text-sm ${
                                  isActive
                                    ? 'bg-[#C8860A]/10 text-[#C8860A] font-medium'
                                    : 'text-foreground hover:bg-accent'
                                }`}
                              >
                                <span>{it.label}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </nav>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="bg-card border-b border-border rounded-md p-4 mb-4 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(v => !v)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <Menu size={20} />
              </button>
              <div className="text-sm font-medium text-foreground">{headerLabel}</div>
            </div>
            <div className="text-sm text-muted-foreground" />
          </div>
          <div className="pb-20">{children}</div>
        </main>
      </div>
    </AppLayout>
  );
}
