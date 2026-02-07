import React, { ReactNode, useState, useEffect, useRef } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Props = { title?: string; children: ReactNode; site?: any };

export default function PostSiteLayout({ title, children, site }: Props) {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const { id } = useParams();

  const sections = [
    {
      items: [
        { id: 'overview', label: t('postSites.Details.Overview', 'Overview'), path: `/post-sites/${id || ':id'}/overview` },
        { id: 'profile', label: t('postSites.Details.Profile', 'Profile'), path: `/post-sites/${id || ':id'}/profile` },
        { id: 'contacts', label: t('postSites.Details.Contacts', 'Contacts'), path: `/post-sites/${id || ':id'}/contacts` },
        { id: 'kpis', label: t('postSites.Details.KPIs', 'KPIs'), path: `/post-sites/${id || ':id'}/kpis` },
        { id: 'postOrders', label: t('postSites.Details.PostOrders', 'Post Orders'), path: `/post-sites/${id || ':id'}/post-orders` },
        { id: 'notes', label: t('postSites.Details.Notes', 'Notes'), path: `/post-sites/${id || ':id'}/notes` },
        { id: 'files', label: t('postSites.Details.Files', 'Files'), path: `/post-sites/${id || ':id'}/files` },
        { id: 'assignGuards', label: t('postSites.Details.AssignGuards', 'Assign Guards'), path: `/post-sites/${id || ':id'}/assign-guards` },
        { id: 'tasks', label: t('postSites.Details.Tasks', 'Tasks'), path: `/post-sites/${id || ':id'}/tasks` },
        { id: 'siteTours', label: t('postSites.Details.SiteTours', 'Site Tours'), path: `/post-sites/${id || ':id'}/site-tours` },
        { id: 'siteTourTags', label: t('postSites.Details.SiteTourTags', 'Site Tour Tags'), path: `/post-sites/${id || ':id'}/site-tour-tags` },
        { id: 'geoFence', label: t('postSites.Details.GeoFence', 'Geo-Fence'), path: `/post-sites/${id || ':id'}/geo-fence` },
        { id: 'assignReports', label: t('postSites.Details.AssignReports', 'Assign Reports'), path: `/post-sites/${id || ':id'}/assign-reports` },
        { id: 'checklists', label: t('postSites.Details.Checklists', 'Checklists'), path: `/post-sites/${id || ':id'}/checklists` },
        { id: 'emailReports', label: t('postSites.Details.EmailReports', 'Email Reports'), path: `/post-sites/${id || ':id'}/email-reports` },
        { id: 'settings', label: t('postSites.Details.Settings', 'Settings'), path: `/post-sites/${id || ':id'}/settings` },
      ],
    },
  ];

  const resolve = (p: string) => (id && p.includes(':id') ? p.replace(':id', id) : p);
  const flatItems = sections.flatMap(s => s.items);
  const activeItem = flatItems.find(it => {
    const path = resolve(it.path);
    return location.pathname === path || location.pathname.startsWith(path + '/') || location.pathname.endsWith(path);
  });
  const headerLabel = activeItem ? activeItem.label : (site?.companyName || site?.name || title || t('postSites.postsite', 'Post Site'));

  const navRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!activeItem || !navRef.current) return;
    try {
      // Prefer selecting the active link via data attribute for reliability
      const activeEl = navRef.current.querySelector('[data-active="true"]') as HTMLElement | null;
      if (activeEl && typeof activeEl.scrollIntoView === 'function') {
        activeEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    } catch (err) {
      // ignore any errors
    }
  }, [activeItem, id, location.pathname]);

  return (
    <AppLayout>
      <div className="flex gap-6 h-[calc(100vh-64px)] overflow-hidden">
        {/* Sidebar */}
        <aside className={`shrink-0 transition-all duration-300 ${sidebarOpen ? 'w-60 opacity-100' : 'w-0 opacity-0 pointer-events-none'}`}>
          <div className="h-full flex flex-col">
            <div className="bg-white border rounded-md p-4 m-3 flex-1 overflow-hidden">
              <div className="text-lg font-semibold mb-4">{site?.companyName || site?.name || title || t('postSites.postsite', 'Post Site')}</div>
              <nav className="text-base">
                <div ref={navRef} className="max-h-[calc(100vh-120px)] overflow-y-auto pr-3 pb-20">
                  {sections.map((section, idx) => (
                    <div key={idx} className="mb-0 pb-0">
                      <ul className="divide-y">
                        {section.items.map((it) => {
                          const path = resolve(it.path);
                          const isActive = location.pathname === path;
                          return (
                            <li key={it.id} className="bg-white">
                              <Link
                                to={path}
                                data-active={isActive ? 'true' : undefined}
                                className={`flex items-center justify-between px-5 py-3 text-sm ${
                                  isActive ? 'bg-orange-50 text-orange-600 font-medium' : 'text-gray-700 hover:bg-gray-50'
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
          <div className="bg-white rounded-md p-4 mb-4 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen((v) => !v)} className="text-gray-600 hover:text-gray-800 p-1">
                <Menu size={20} />
              </button>
              <div className="text-sm font-medium text-gray-700">{headerLabel}</div>
            </div>
            <div className="text-sm text-gray-600" />
          </div>

          <div className="pb-20">{children}</div>
        </main>
      </div>
    </AppLayout>
  );
}
