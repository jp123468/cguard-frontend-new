import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import IncidentMap from '@/components/IncidentMap/IncidentMap';
import { clientService } from '@/lib/api/clientService';

export default function ClientOverview({ client }: { client: any }) {
  const { t } = useTranslation();

  const [postSitesCount, setPostSitesCount] = useState<number>(client?.postSites?.length ?? 0);
  const [guardsAssigned, setGuardsAssigned] = useState<number>(client?.assignedGuards?.length ?? client?.assignedSecurityGuardsCount ?? 0);
  const [incidents, setIncidents] = useState<number>(client?.stats?.incidents ?? 0);
  const tasksCompleted = client?.stats?.tasksCompleted ?? 0;
  const toursCompleted = client?.stats?.toursCompleted ?? 0;
  const hoursWorked = client?.stats?.hoursWorked ?? '00:00';

  const addedOn = client?.createdAt ? new Date(client.createdAt).toLocaleDateString() : '-';

  // Parse coordinates (accept common keys lat/lng or latitude/longitude)
  const lat = client?.latitude !== undefined && client?.latitude !== null
    ? Number(client.latitude)
    : (client?.lat !== undefined && client?.lat !== null ? Number(client.lat) : NaN);
  const lng = client?.longitude !== undefined && client?.longitude !== null
    ? Number(client.longitude)
    : (client?.lng !== undefined && client?.lng !== null ? Number(client.lng) : NaN);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  useEffect(() => {
    let mounted = true;
    async function loadCounts() {
      if (!client || !client.id) return;
      try {
        // Post sites count
        const ps = await clientService.getClientPostSites(client.id, { limit: 1, offset: 0 });
        if (!mounted) return;
        setPostSitesCount(ps?.count || 0);

        // Guards assigned count (lightweight)
        const gsCount = await clientService.getClientGuardsCount(client.id);
        if (!mounted) return;
        setGuardsAssigned(gsCount || 0);

        // Incidents last 7 days
        const today = new Date();
        const start = new Date();
        start.setDate(today.getDate() - 7);
        const inc = (await clientService.getClientIncidents(client.id, { limit: 1, offset: 0, filter: { dateRange: [start.toISOString(), today.toISOString()] } })) as unknown as { count?: number } | null;
        if (!mounted) return;
        setIncidents(inc?.count ?? 0);
      } catch (e) {
        // non-blocking: keep existing numbers on error
        console.error('Error fetching client overview counts', e);
      }
    }
    loadCounts();
    return () => { mounted = false; };
  }, [client?.id]);

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-md p-4">
        <h3 className="text-lg font-semibold mb-4">{t('clients.nav.overview') || 'Resumen'}</h3>
        <div className="mb-6">
          {hasCoords ? (
            <IncidentMap lat={lat} lng={lng} label={client?.name || 'Client location'} />
          ) : (
            <div className="w-full h-64 flex items-center justify-center bg-gray-50 border border-dashed rounded-md text-gray-400">
              No location data available
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border rounded-md bg-white text-center">
            <div className="text-sm text-gray-500">{t('clients.overview.cards.postSites')}</div>
            <div className="text-2xl font-bold text-orange-500">{postSitesCount}</div>
          </div>
          <div className="p-4 border rounded-md bg-white text-center">
            <div className="text-sm text-gray-500">{t('clients.overview.cards.guardsAssigned')}</div>
            <div className="text-2xl font-bold text-blue-600">{guardsAssigned}</div>
          </div>
          <div className="p-4 border rounded-md bg-white text-center">
            <div className="text-sm text-gray-500">{t('clients.overview.cards.toursCompleted')}</div>
            <div className="text-2xl font-bold text-gray-800">{toursCompleted}</div>
          </div>
          <div className="p-4 border rounded-md bg-white text-center">
            <div className="text-sm text-gray-500">{t('clients.overview.cards.tasksCompleted')}</div>
            <div className="text-2xl font-bold text-blue-600">{tasksCompleted}</div>
          </div>
          <div className="p-4 border rounded-md bg-white text-center">
            <div className="text-sm text-gray-500">{t('clients.overview.cards.incidents')}</div>
            <div className="text-2xl font-bold text-orange-500">{incidents}</div>
          </div>
          <div className="p-4 border rounded-md bg-white text-center">
            <div className="text-sm text-gray-500">{t('clients.overview.cards.hoursWorked')}</div>
            <div className="text-2xl font-bold text-red-500">{hoursWorked}</div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border rounded-md p-4">
          <h4 className="text-sm font-semibold mb-3">{t('clients.overview.generalInfo.title')}</h4>
          <div className="text-sm text-gray-600">
            <div className="mb-3">
              <div className="text-xs text-gray-400">{t('clients.overview.generalInfo.clientName')}</div>
              <div className="font-medium">{client?.name || '-'} {client?.lastName || ''}</div>
            </div>
            <div className="mb-3">
              <div className="text-xs text-gray-400">{t('clients.overview.generalInfo.address')}</div>
              <div className="font-medium">{client?.address || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">{t('clients.overview.generalInfo.addedOn')}</div>
              <div className="font-medium">{addedOn}</div>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-md p-4">
          <h4 className="text-sm font-semibold mb-3">{t('clients.overview.contactDetails.title')}</h4>
          <div className="text-sm text-gray-600">
            <div className="mb-3">
              <div className="text-xs text-gray-400">{t('clients.overview.contactDetails.phoneNumber')}</div>
              <div className="font-medium">{client?.phoneNumber || '--'}</div>
            </div>
            <div className="mb-3">
              <div className="text-xs text-gray-400">{t('clients.overview.contactDetails.fax')}</div>
              <div className="font-medium">{client?.fax || '--'}</div>
            </div>
            <div className="mb-3">
              <div className="text-xs text-gray-400">{t('clients.overview.contactDetails.email')}</div>
              <div className="font-medium">{client?.email || '--'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">{t('clients.overview.contactDetails.website')}</div>
              <div className="font-medium">{client?.website || '--'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
