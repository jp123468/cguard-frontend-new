import React, { ReactNode, useEffect, useState } from 'react';
import clientsNav from '@/data/clients-nav.json';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { postSiteService } from '@/lib/api/postSiteService';

type Props = {
  navKey: string;
  title?: string;
  children: ReactNode;
  client?: any;
};

export default function ClientsLayout({ navKey, title, children, client }: Props) {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [postSitesCount, setPostSitesCount] = useState<number | undefined>(undefined);
  const cfg: any = (clientsNav as any)[navKey] || null;
  const { id } = useParams();
  const location = useLocation();

  const getActiveLabel = () => {
    if (!cfg || !cfg.sections) return null;
    for (const section of cfg.sections) {
      if (!section.items) continue;
      for (const it of section.items) {
        const resolvedPath = resolvePathWithId(it.path);
        if (location.pathname === resolvedPath) return t(it.label);
      }
    }
    return null;
  };

  const resolvePathWithId = (path: string) => {
    if (id && path.includes(':id')) {
      return path.replace(':id', id);
    }
    return path;
  };

    return (
    <div className="flex gap-4 h-[calc(100vh-64px)] overflow-hidden">
      <div className={`shrink-0 transition-all duration-300 ${sidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 pointer-events-none'}`}>
        <div className="h-full flex flex-col">
          <div className="bg-white border rounded-md p-3 m-3 flex-1 overflow-hidden">
            <div className="text-base font-semibold mb-3">{
              client?.companyName
                ? client.companyName
                : (client?.name || client?.firstName)
                  ? `${client?.name || client?.firstName}${(client?.lastName || client?.surname) ? ' ' + (client?.lastName || client?.surname) : ''}`
                  : t(cfg?.title ?? title)
            }</div>
            <nav className="text-base">
              <div className="max-h-[calc(100vh-120px)] overflow-y-auto pr-3">
                {cfg?.sections?.map((section: any, idx: number) => (
                  <div key={idx} className="mb-0 pb-0">
                    {section.label ? <div className="text-xs text-gray-500 uppercase mb-3">{section.label}</div> : null}
                    <ul className="divide-y">
                      {section.items?.map((it: any) => {
                        const resolvedPath = resolvePathWithId(it.path);
                        const isActive = location.pathname === resolvedPath;
                        const initialBadge = it.id === 'postSites'
                          ? (client?.postSites?.length ?? client?.postSiteIds?.length ?? client?.postSitesCount ?? undefined)
                          : undefined;
                        const badgeCount = it.id === 'postSites' ? (postSitesCount ?? initialBadge ?? 0) : undefined;
                        return (
                          <li key={it.id} className="bg-white">
                            <Link
                              to={resolvedPath}
                              className={`flex items-center justify-between px-4 py-3 text-sm ${isActive ? 'bg-orange-50 text-orange-600 font-medium' : 'text-gray-700 hover:bg-gray-50'} `}
                            >
                              <span className="text-sm">{t(it.label)}</span>
                              {typeof badgeCount === 'number' && (
                                <span className="ml-3 inline-flex items-center justify-center min-w-[20px] h-6 px-2 text-sm font-semibold rounded-md bg-orange-600 text-white">{badgeCount}</span>
                              )}
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
      </div>

      {/* Fetch post sites count if needed */}
      {client?.id && (
        <FetchPostSitesCount clientId={client.id} initial={client?.postSites?.length ?? client?.postSiteIds?.length ?? client?.postSitesCount} onCount={(c: number) => setPostSitesCount(c)} />
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="bg-white rounded-md p-4 mb-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-600 hover:text-gray-800 p-1"
              title={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              <Menu
                size={20}
                className={`transition-transform duration-300 ${sidebarOpen ? 'rotate-0' : '-rotate-90'}`}
              />
            </button>
            <div className="text-sm font-medium text-gray-700">{getActiveLabel() || (title ? t(title) : '')}</div>
          </div>
          <div className="text-sm text-gray-600"></div>
        </div>

        <div className="pb-6">{children}</div>
      </div>
    </div>
  );
}

function FetchPostSitesCount({ clientId, initial, onCount }: { clientId: string; initial?: number; onCount: (c: number) => void }) {
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        // If initial is provided and > 0, prefer it
        if (typeof initial === 'number' && initial > 0) {
          onCount(initial);
          return;
        }
        const resp = await postSiteService.list({ clientId }, { limit: 1, offset: 0 });
        if (!mounted) return;
        onCount(resp.count || 0);
      } catch (e) {
        // ignore
      }
    }
    load();
    return () => { mounted = false; };
  }, [clientId, initial, onCount]);
  return null;
}
