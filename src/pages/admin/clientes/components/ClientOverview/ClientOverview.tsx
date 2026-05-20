import React, { useEffect, useState, useRef } from 'react';
import useScrollToTopOnMount from '@/hooks/useScrollToTopOnMount';
import { useTranslation } from 'react-i18next';
import IncidentMap from '@/components/IncidentMap/IncidentMap';
import { clientService } from '@/lib/api/clientService';
import MobileCardList from '@/components/responsive/MobileCardList';

export default function ClientOverview({ client }: { client: any }) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  useScrollToTopOnMount(containerRef);

  const [postSitesCount, setPostSitesCount] = useState<number>(client?.postSites?.length ?? 0);
  const [guardsAssigned, setGuardsAssigned] = useState<number>(client?.assignedGuards?.length ?? client?.assignedSecurityGuardsCount ?? 0);
  const [incidents, setIncidents] = useState<number>(client?.stats?.incidents ?? 0);
  const [tasksCompleted, setTasksCompleted] = useState<number>(client?.stats?.tasksCompleted ?? 0);
  const [toursCompleted, setToursCompleted] = useState<number>(client?.stats?.toursCompleted ?? 0);
  const [hoursWorked, setHoursWorked] = useState<string>(client?.stats?.hoursWorked ?? '00:00');

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
        // Use single overview endpoint (backend provides aggregated numbers)
        const overview = await clientService.getClientOverview(client.id);
        if (!mounted) return;
        setPostSitesCount(overview?.postSitesCount ?? overview?.postSites?.length ?? 0);
        setGuardsAssigned(overview?.assignedCount ?? overview?.assignedGuards?.length ?? 0);
        setIncidents(overview?.incidentsLast7Days ?? overview?.incidents ?? 0);
        // Map other values for display (keep existing fallbacks)
        // toursCompleted and tasksCompleted may come from overview's last7days counters
        // hoursLoggedSeconds -> format to HH:MM
        const secs = Number(overview?.hoursLoggedSeconds || 0);
        const hh = Math.floor(secs / 3600).toString().padStart(2, '0');
        const mm = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
        const hhmm = `${hh}:${mm}`;
        // set local vars used in render
        // toursCompleted and tasksCompleted are not stateful here; we keep using client prop if present
        (/* no-op: keep existing state variables */ null as any);
        // update hoursWorked display via local variable by using state setter (not present) — reuse existing local const by mutating via ref is unnecessary
        // Simpler: assign to client object fields so render picks them up
        if (overview) {
          setToursCompleted(overview.toursLast7Days ?? (client as any).stats?.toursCompleted ?? 0);
          setTasksCompleted(overview.tasksLast7Days ?? (client as any).stats?.tasksCompleted ?? 0);
          setHoursWorked(hhmm);
        }
      } catch (e) {
        // non-blocking: keep existing numbers on error
        console.error('Error fetching client overview counts', e);
      }
    }
    loadCounts();
    return () => { mounted = false; };
  }, [client?.id]);

  return (
    <div ref={containerRef} className="space-y-6">
      {/* Mobile compact summary */}
      <div className="md:hidden">
        <MobileCardList
          items={client ? [client] : []}
          loading={false}
          emptyMessage={t('clients.empty.title') as string}
          renderCard={(c: any) => (
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">{t('clients.overview.generalInfo.clientName')}</div>
                  <div className="font-medium">{c?.name} {c?.lastName || ''}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">{t('clients.overview.cards.postSites')}</div>
                  <div className="font-semibold text-[#C8860A]">{postSitesCount}</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>{t('clients.overview.cards.guardsAssigned')}: <span className="font-medium text-blue-600">{guardsAssigned}</span></div>
                <div>{t('clients.overview.cards.incidents')}: <span className="font-medium text-[#C8860A]">{incidents}</span></div>
                <div>{t('clients.overview.cards.toursCompleted')}: <span className="font-medium">{toursCompleted}</span></div>
                <div>{t('clients.overview.cards.hoursWorked')}: <span className="font-medium text-red-500">{hoursWorked}</span></div>
              </div>
            </div>
          )}
        />
      </div>
      <div className="bg-card border rounded-md p-4">
        <h3 className="text-lg font-semibold mb-4">{t('clients.nav.overview') || 'Resumen'}</h3>
        <div className="mb-6">
          {hasCoords ? (
            <IncidentMap lat={lat} lng={lng} label={client?.name || 'Client location'} />
          ) : (
            <div className="w-full h-64 flex items-center justify-center bg-muted/30 border border-dashed rounded-md text-muted-foreground">
              No location data available
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border rounded-md bg-card text-center">
            <div className="text-sm text-muted-foreground">{t('clients.overview.cards.postSites')}</div>
            <div className="text-2xl font-bold text-[#C8860A]">{postSitesCount}</div>
          </div>
          <div className="p-4 border rounded-md bg-card text-center">
            <div className="text-sm text-muted-foreground">{t('clients.overview.cards.guardsAssigned')}</div>
            <div className="text-2xl font-bold text-blue-600">{guardsAssigned}</div>
          </div>
          <div className="p-4 border rounded-md bg-card text-center">
            <div className="text-sm text-muted-foreground">{t('clients.overview.cards.toursCompleted')}</div>
            <div className="text-2xl font-bold text-foreground">{toursCompleted}</div>
          </div>
          <div className="p-4 border rounded-md bg-card text-center">
            <div className="text-sm text-muted-foreground">{t('clients.overview.cards.tasksCompleted')}</div>
            <div className="text-2xl font-bold text-blue-600">{tasksCompleted}</div>
          </div>
          <div className="p-4 border rounded-md bg-card text-center">
            <div className="text-sm text-muted-foreground">{t('clients.overview.cards.incidents')}</div>
            <div className="text-2xl font-bold text-[#C8860A]">{incidents}</div>
          </div>
          <div className="p-4 border rounded-md bg-card text-center">
            <div className="text-sm text-muted-foreground">{t('clients.overview.cards.hoursWorked')}</div>
            <div className="text-2xl font-bold text-red-500">{hoursWorked}</div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border rounded-md p-4">
          <h4 className="text-sm font-semibold mb-3">{t('clients.overview.generalInfo.title')}</h4>
          <div className="text-sm text-foreground/70">
            <div className="mb-3">
              <div className="text-xs text-muted-foreground">{t('clients.overview.generalInfo.clientName')}</div>
              <div className="font-medium">{client?.name || '-'} {client?.lastName || ''}</div>
            </div>
            <div className="mb-3">
              <div className="text-xs text-muted-foreground">{t('clients.form.personType', 'Tipo de persona')}</div>
              <div className="font-medium">{client?.personType === 'PJ' ? t('clients.form.personJuridica', 'Persona jurídica (RUC)') : t('clients.form.personNatural', 'Persona natural (Cédula)')}</div>
            </div>
            <div className="mb-3">
              <div className="text-xs text-muted-foreground">{client?.personType === 'PJ' ? t('clients.form.ruc', 'RUC') : t('clients.form.cedula', 'Cédula')}</div>
              <div className="font-medium">{client?.documentNumber || '-'}</div>
            </div>
            <div className="mb-3">
              <div className="text-xs text-muted-foreground">{t('clients.overview.generalInfo.address')}</div>
              <div className="font-medium">{client?.address || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t('clients.overview.generalInfo.addedOn')}</div>
              <div className="font-medium">{addedOn}</div>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-md p-4">
          <h4 className="text-sm font-semibold mb-3">{t('clients.overview.contactDetails.title')}</h4>
          <div className="text-sm text-foreground/70">
            <div className="mb-3">
              <div className="text-xs text-muted-foreground">{t('clients.overview.contactDetails.phoneNumber')}</div>
              <div className="font-medium">{client?.phoneNumber || '--'}</div>
            </div>
            <div className="mb-3">
              <div className="text-xs text-muted-foreground">{t('clients.overview.contactDetails.fax')}</div>
              <div className="font-medium">{client?.landline || client?.faxNumber || client?.fax || '--'}</div>
            </div>
            <div className="mb-3">
              <div className="text-xs text-muted-foreground">{t('clients.overview.contactDetails.email')}</div>
              <div className="font-medium">{client?.email || '--'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t('clients.overview.contactDetails.website')}</div>
              <div className="font-medium">{client?.website || '--'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


