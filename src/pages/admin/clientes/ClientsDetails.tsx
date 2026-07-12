import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import AppLayout from '@/layouts/app-layout';
import MobileCardList from '@/components/responsive/MobileCardList';
import ClientsLayout from '@/layouts/ClientsLayout';
import { clientService } from '@/lib/api/clientService';
import ClientOverview from './components/ClientOverview/ClientOverview';
import ClientProfile from './components/ClientProfile/ClientProfile';
import ClientContacts from './components/ClientContacts/ClientContacts';
import ClientNotes from './components/ClientNotes/ClientNotes';
import ClientFiles from './components/ClientFiles/ClientFiles';
import ClientPostSites from './components/ClientPostSites/ClientPostSites';
import ClientPortal from './components/ClientPortal/ClientPortal';
import ClientUserAccess from './components/ClientUserAccess/ClientUserAccess';
import ClientEmailReports from './components/ClientEmailReports/ClientEmailReports';
import ClientProjects from './components/ClientProjects/ClientProjects';
import { toast } from 'sonner';
import { SkeletonCards, EmptyState, FadeIn } from '@/components/kit';
import { Building2 } from 'lucide-react';

export default function ClientsDetails() {
  const { id } = useParams();
  const location = useLocation();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('overview');

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    // Clear the previous client so switching :id A→B never shows A's data under
    // B's URL, and a failed B load doesn't leave A stuck on screen.
    setClient(null);
    setLoading(true);
    clientService
      .getClient(id)
      .then((data) => {
        if (!mounted) return;
        setClient(data);
      })
      .catch((err) => {
        if (!mounted) return;
        console.error('Error cargando cliente:', err);
        setClient(null);
        toast.error('No se pudo cargar cliente');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [id]);

  useEffect(() => {
    // derive active tab from pathname (e.g. /clients/:id/profile)
    if (!location || !location.pathname) return;
    const parts = location.pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    // if last part matches known tabs, set it; otherwise default to overview
    const allowed = ['overview', 'profile', 'contacts', 'notes', 'files', 'post-sites', 'portal', 'user-access', 'email-reports', 'projects'];
    if (allowed.includes(last)) {
      // normalize post-sites -> postSites and user-access -> userAccess
      const map: any = {
        'post-sites': 'postSites',
        'user-access': 'userAccess',
        'email-reports': 'emailReports',
        'portal': 'clientPortal',
        'projects': 'projects',
      };
      setActiveTab(map[last] || last);
    } else {
      setActiveTab('overview');
    }
  }, [location]);

  // When the active tab changes, ensure the visible content scrolls to the top.
  useEffect(() => {
    const doScroll = (behavior: ScrollBehavior = 'auto') => {
      try {
        // prefer content container used by ClientsLayout
        const content = document.querySelector('.flex-1.overflow-y-auto') as HTMLElement | null;
        if (content) {
          content.scrollTop = 0;
          try { content.scrollTo({ top: 0, left: 0, behavior }); } catch {}
        }
      } catch (e) {}

      try {
        const main = document.querySelector('main') as HTMLElement | null;
        if (main) {
          main.scrollTop = 0;
          try { main.scrollTo({ top: 0, left: 0, behavior }); } catch {}
        }
      } catch (e) {}

      try {
        // also attempt to bring the first heading of the new section into view
        const contentRoot = document.querySelector('.flex-1.overflow-y-auto') || document.querySelector('main') || document.body;
        if (contentRoot) {
          const heading = (contentRoot as HTMLElement).querySelector('h1,h2,h3,h4');
          if (heading && typeof (heading as HTMLElement).scrollIntoView === 'function') {
            (heading as HTMLElement).scrollIntoView({ behavior: 'auto', block: 'start' });
          }
        }
      } catch (e) {}
    };

    // immediate and delayed attempts (cover async renders)
    doScroll('auto');
    const t1 = window.setTimeout(() => doScroll('auto'), 50);
    const t2 = window.setTimeout(() => doScroll('auto'), 300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [activeTab]);

  return (
    <AppLayout>
      <ClientsLayout navKey="clients" title="clients.nav.title" client={client}>
        <div className="flex-1 flex flex-col">
          {loading ? (
            <SkeletonCards count={4} className="p-1" />
          ) : client ? (
            <>
              {activeTab === 'overview' && <ClientOverview client={client} />}
              {activeTab === 'profile' && <ClientProfile client={client} />}
              {activeTab === 'contacts' && <ClientContacts client={client} />}
              {activeTab === 'notes' && <ClientNotes client={client} />}
              {activeTab === 'files' && <ClientFiles client={client} />}
              {activeTab === 'postSites' && <ClientPostSites client={client} />}
              {activeTab === 'clientPortal' && <ClientPortal client={client} />}
              {activeTab === 'userAccess' && <ClientUserAccess client={client} />}
              {activeTab === 'emailReports' && <ClientEmailReports client={client} />}
              {activeTab === 'projects' && <ClientProjects client={client} />}
            </>
          ) : (
            <FadeIn>
              <EmptyState
                icon={<Building2 />}
                title="No se pudo cargar el cliente"
                description="Vuelve a intentarlo o revisa que el cliente exista."
              />
            </FadeIn>
          )}
        </div>
      </ClientsLayout>
    </AppLayout>
  );
}
