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
  const [sidebarOpen, setSidebarOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 768 : true));
  const [isLargeScreen, setIsLargeScreen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 768 : true));
  const [postSitesCount, setPostSitesCount] = useState<number | undefined>(undefined);
  const cfg: any = (clientsNav as any)[navKey] || null;
  const { id } = useParams();
  const location = useLocation();
  // Temporarily hide these client nav items visually
  const hiddenIds = ['notes', 'files', 'clientPortal', 'userAccess', 'emailReports'];

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

  // Keep sidebar responsive: auto-open on large screens, auto-close on small screens
  useEffect(() => {
    const onResize = () => {
      const large = window.innerWidth >= 768;
      setIsLargeScreen(large);
      if (large) setSidebarOpen(true);
      else setSidebarOpen(false);
    };
    try {
      onResize();
      window.addEventListener('resize', onResize);
    } catch (e) {}
    return () => { try { window.removeEventListener('resize', onResize); } catch (e) {} };
  }, []);

  // Scrolling is handled by Consumers to avoid hook ordering problems during HMR.

    const sidebarClass = isLargeScreen
      ? `shrink-0 transition-all duration-300 ${sidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 pointer-events-none'}`
      : `${sidebarOpen ? 'fixed inset-y-0 left-0 w-64 z-40' : 'hidden'}`;

    return (
    <div className="flex gap-4 h-[calc(100vh-64px)] overflow-hidden">
      {!isLargeScreen && sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-30" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={sidebarClass}>
        <div className="h-full flex flex-col">
          <div className="bg-card border border-border rounded-md p-3 m-3 flex-1 overflow-hidden">
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
                    {section.label ? <div className="text-xs text-muted-foreground uppercase mb-3">{section.label}</div> : null}
                    <ul className="divide-y">
                      {section.items?.map((it: any) => {
                        const resolvedPath = resolvePathWithId(it.path);
                        const isActive = location.pathname === resolvedPath;
                        const initialBadge = it.id === 'postSites'
                          ? (client?.postSites?.length ?? client?.postSiteIds?.length ?? client?.postSitesCount ?? undefined)
                          : undefined;
                        const badgeCount = it.id === 'postSites' ? (postSitesCount ?? initialBadge ?? 0) : undefined;
                        // If this item is in the hidden list, render an HTML comment instead
                        if (hiddenIds.includes(it.id)) {
                          const comment = `<!-- hidden:${it.id} ${t(it.label)} -->`;
                          return (
                            <li key={it.id} className="bg-card" dangerouslySetInnerHTML={{ __html: comment }} />
                          );
                        }

                        return (
                          <li key={it.id} className="bg-card">
                            <Link
                              to={resolvedPath}
                              className={`flex items-center justify-between px-4 py-3 text-sm ${isActive ? 'bg-[#C8860A]/10 text-[#C8860A] font-medium' : 'text-foreground hover:bg-accent'} `}
                            >
                              <span className="text-sm">{t(it.label)}</span>
                              {typeof badgeCount === 'number' && (
                                <span className="ml-3 inline-flex items-center justify-center min-w-[20px] h-6 px-2 text-sm font-semibold rounded-md bg-[#C8860A] text-white">{badgeCount}</span>
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

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-card border-b border-border rounded-md p-4 mb-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-muted-foreground hover:text-foreground p-1"
              title={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              <Menu
                size={20}
                className={`transition-transform duration-300 ${sidebarOpen ? 'rotate-0' : '-rotate-90'}`}
              />
            </button>
            <div className="text-sm font-medium text-foreground">{getActiveLabel() || (title ? t(title) : '')}</div>
          </div>
          <div className="text-sm text-muted-foreground"></div>
        </div>

        <div className="flex-1 overflow-auto pb-6">{children}</div>
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
