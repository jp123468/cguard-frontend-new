import { ReactNode, useEffect, useState } from 'react';
import clientsNav from '@/data/clients-nav.json';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { postSiteService } from '@/lib/api/postSiteService';

type Props = {
  navKey: string;
  title?: string;
  children: ReactNode;
  client?: any;
};

/**
 * Client detail shell — a compact identity header + a horizontal TAB strip
 * (replaces the old vertical secondary sidebar, which duplicated navigation
 * and pushed the content into a narrow column). Sub-pages render below the tabs.
 */
export default function ClientsLayout({ navKey, title, children, client }: Props) {
  const { t } = useTranslation();
  const [postSitesCount, setPostSitesCount] = useState<number | undefined>(undefined);
  const cfg: any = (clientsNav as any)[navKey] || null;
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Sub-pages not yet part of the streamlined flow — hidden from the tabs.
  const hiddenIds = ['notes', 'files', 'clientPortal', 'userAccess', 'emailReports'];

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

  return (
    <div className="mx-auto flex h-[calc(100vh-64px)] w-full max-w-[1400px] flex-col gap-4 overflow-hidden px-4 pt-4">
      {/* Identity header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/clients')}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title={t('common.back', 'Volver') as string}
          aria-label={t('common.back', 'Volver') as string}
        >
          <ArrowLeft size={18} />
        </button>
        {logo ? (
          <img src={logo} alt="" className="h-11 w-11 shrink-0 rounded-xl border bg-white object-cover" />
        ) : (
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-bold"
            style={{ backgroundColor: `hsl(${hue} 70% 92%)`, color: `hsl(${hue} 60% 32%)` }}
          >
            {nm.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold leading-tight tracking-tight text-foreground">{displayName}</h1>
          {client?.active !== undefined && (
            <span className={`text-xs font-medium ${client.active ? 'text-emerald-600' : 'text-red-500'}`}>
              {client.active ? t('common.active', 'Activo') : t('common.archived', 'Archivado')}
            </span>
          )}
        </div>
      </div>

      {/* Horizontal tab strip */}
      <div className="-mb-px overflow-x-auto">
        <nav className="flex min-w-max items-center gap-1 border-b border-border">
          {items.map((it) => {
            const path = resolvePathWithId(it.path);
            const active = location.pathname === path;
            const badge = it.id === 'postSites' ? postSitesCount : undefined;
            return (
              <Link
                key={it.id}
                to={path}
                className={`relative flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t(it.label)}
                {typeof badge === 'number' && badge > 0 && (
                  <span className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${active ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                    {badge}
                  </span>
                )}
                {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </nav>
      </div>

      {client?.id && (
        <FetchPostSitesCount clientId={client.id} initial={client?.postSites?.length ?? client?.postSiteIds?.length ?? client?.postSitesCount} onCount={(c: number) => setPostSitesCount(c)} />
      )}

      <div className="flex-1 overflow-auto pb-6">{children}</div>
    </div>
  );
}

function FetchPostSitesCount({ clientId, initial, onCount }: { clientId: string; initial?: number; onCount: (c: number) => void }) {
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        if (typeof initial === 'number' && initial > 0) { onCount(initial); return; }
        const resp = await postSiteService.list({ clientId }, { limit: 1, offset: 0 });
        if (!mounted) return;
        onCount(resp.count || 0);
      } catch (e) { /* ignore */ }
    }
    load();
    return () => { mounted = false; };
  }, [clientId, initial, onCount]);
  return null;
}
