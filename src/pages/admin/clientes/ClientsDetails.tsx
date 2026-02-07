import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import AppLayout from '@/layouts/app-layout';
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
import { toast } from 'sonner';

export default function ClientsDetails() {
  const { id } = useParams();
  const location = useLocation();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('overview');

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    clientService
      .getClient(id)
      .then((data) => {
        if (!mounted) return;
        setClient(data);
      })
      .catch((err) => {
        console.error('Error cargando cliente:', err);
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
    const allowed = ['overview', 'profile', 'contacts', 'notes', 'files', 'post-sites', 'portal', 'user-access', 'email-reports'];
    if (allowed.includes(last)) {
      // normalize post-sites -> postSites and user-access -> userAccess
      const map: any = {
        'post-sites': 'postSites',
        'user-access': 'userAccess',
        'email-reports': 'emailReports',
        'portal': 'clientPortal'
      };
      setActiveTab(map[last] || last);
    } else {
      setActiveTab('overview');
    }
  }, [location]);

  return (
    <AppLayout>
      <ClientsLayout navKey="clients" title="clients.nav.title" client={client}>
        <div className="flex-1 flex flex-col">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-500">Cargando...</div>
            </div>
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
            </>
          ) : (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-500">No se pudo cargar el cliente</div>
            </div>
          )}
        </div>
      </ClientsLayout>
    </AppLayout>
  );
}
