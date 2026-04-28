import React, { useRef, useEffect } from 'react';
import { useTranslation } from "react-i18next";
import IncidentMap from "@/components/IncidentMap/IncidentMap";
import { useState } from 'react';
import { ApiService } from '@/services/api/apiService';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import useScrollToTopOnMount from '@/hooks/useScrollToTopOnMount';

export default function PostSiteOverview({ site }: { site?: any }) {
  const { t } = useTranslation();
  const [openFilter, setOpenFilter] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  useScrollToTopOnMount(containerRef);

  const typeKeys = [
    'callOffRequest','checkList','checkedIn','checkedOut','clockedIn','clockedOut',
    'companyPolicy','dispatch','exchangeShift','geoFence','guardAvailability','guardIdle',
    'guardDeviceFall','incidentReport','lowBattery','openShiftConfirmation','panicAlert',
    'parkingManager','passdownReport','postOrder','shiftConfirmation','siteTour','standardReport',
    'taskReport','timeOff','vehiclePatrol','watchModeReport'
  ];

  const toggleType = (key: string) => {
    setSelectedTypes((s) =>
      s.includes(key) ? s.filter((x) => x !== key) : [...s, key]
    );
  };
  const stats = [
    { id: 'assigned', label: t('postSites.overview.Stats.guardsAssigned'), value: 0, color: 'text-blue-600' },
    { id: 'onsite', label: t('postSites.overview.Stats.guardOnSite'), value: 0, color: 'text-[#C8860A]' },
    { id: 'tours', label: t('postSites.overview.Stats.toursCompleted'), value: 0, color: 'text-gray-600' },
    { id: 'tasks', label: t('postSites.overview.Stats.tasksCompleted'), value: 0, color: 'text-blue-600' },
    { id: 'incidents', label: t('postSites.overview.Stats.incidentsReported'), value: 0, color: 'text-[#C8860A]' },
    { id: 'hrs', label: t('postSites.overview.Stats.hoursLogged'), value: '00:00', color: 'text-red-500' },
  ];

  const [assignedCount, setAssignedCount] = useState<number>(0);
  const [onsiteCount, setOnsiteCount] = useState<number>(0);
  const [toursCount, setToursCount] = useState<number>(0);
  const [tasksCount, setTasksCount] = useState<number>(0);
  const [incidentsCount, setIncidentsCount] = useState<number>(0);
  const [hoursLogged, setHoursLogged] = useState<string>('00:00');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
        const postSiteId = site?.id || '';
        if (!tenantId || !postSiteId) return;

        // Prefer backend-provided overview counters (single request)
        try {
          const overview: any = await ApiService.get(`/tenant/${tenantId}/post-site/${postSiteId}/overview`, { toast: { silentError: true } } as any);
          if (overview && (typeof overview.assignedCount !== 'undefined')) {
            if (mounted) {
              setAssignedCount(Number(overview.assignedCount || 0));
              setOnsiteCount(Number(overview.onsiteCount || 0));
              setToursCount(Number(overview.toursLast7Days || 0));
              setTasksCount(Number(overview.tasksLast7Days || 0));
              setIncidentsCount(Number(overview.incidentsLast7Days || 0));
              const secs = Number(overview.hoursLoggedSeconds || 0);
              const hrs = Math.floor(secs / 3600);
              const mins = Math.floor((secs % 3600) / 60);
              setHoursLogged(`${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}`);
            }
            return; // done
          }
        } catch (e) {
          // fallback to legacy aggregation below
        }

        // 2) Shifts — used for onsite count and hours logged
        let shifts: any[] = [];
        try {
          const shiftsResp: any = await ApiService.get(`/tenant/${tenantId}/shift?postSiteId=${encodeURIComponent(postSiteId)}&limit=999`, { headers: { 'Cache-Control': 'no-cache' } } as any);
          shifts = Array.isArray(shiftsResp) ? shiftsResp : (shiftsResp && (shiftsResp.rows || shiftsResp.data)) ? (shiftsResp.rows || shiftsResp.data) : [];
        } catch (e) {
          // fallback to post-site shifts endpoint
          try {
            const resp2: any = await ApiService.get(`/tenant/${tenantId}/post-site/${postSiteId}/shifts`, { toast: { silentError: true } } as any);
            shifts = Array.isArray(resp2) ? resp2 : (resp2 && (resp2.rows || resp2.data)) ? (resp2.rows || resp2.data) : [];
          } catch (e2) { shifts = []; }
        }

        const now = Date.now();
        // onsite: count shifts where now between start and end if timestamps available
        let onsite = 0;
        let hoursSeconds = 0;
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        for (const sh of (shifts || [])) {
          // try multiple possible fields
          const startStr = sh.start || sh.shiftStart || sh.startTime || sh.start_time || sh.startAt || sh.startDate;
          const endStr = sh.end || sh.shiftEnd || sh.endTime || sh.end_time || sh.finishTimeInDay || sh.finish_time || sh.finish;
          const s = startStr ? +new Date(startStr) : NaN;
          const e = endStr ? +new Date(endStr) : NaN;
          if (!isNaN(s) && !isNaN(e)) {
            if (s <= now && now <= e) onsite += 1;
            // sum durations for shifts that started within last 7 days (or ended within)
            if ((s >= sevenDaysAgo) || (e >= sevenDaysAgo)) {
              hoursSeconds += Math.max(0, (e - s) / 1000);
            }
          }
        }
        if (mounted) {
          setOnsiteCount(onsite);
          // convert seconds to HH:MM
          const hrs = Math.floor(hoursSeconds / 3600);
          const mins = Math.floor((hoursSeconds % 3600) / 60);
          setHoursLogged(`${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}`);
        }

        // 3) Tours completed in last 7 days — use tags as proxy
        try {
          const tagsResp: any = await ApiService.get(`/tenant/${tenantId}/post-site/${encodeURIComponent(postSiteId)}/site-tour-tags?limit=999`);
          const tags = Array.isArray(tagsResp) ? tagsResp : (tagsResp && (tagsResp.rows || tagsResp.data)) ? (tagsResp.rows || tagsResp.data) : [];
          const recentTags = (tags || []).filter((t: any) => {
            const c = t.createdAt || t.created_at || t.timestamp || t.date;
            if (!c) return false;
            const tms = +new Date(c);
            return !isNaN(tms) && tms >= sevenDaysAgo;
          });
          if (mounted) setToursCount(recentTags.length);
        } catch (e) { if (mounted) setToursCount(0); }

        // 4) Incidents in last 7 days
        try {
          const incResp: any = await ApiService.get(`/tenant/${tenantId}/incident?postSiteId=${encodeURIComponent(postSiteId)}&limit=999`);
          const rows = Array.isArray(incResp) ? incResp : (incResp && (incResp.rows || incResp.data)) ? (incResp.rows || incResp.data) : [];
          const recent = (rows || []).filter((r: any) => {
            const c = r.createdAt || r.created_at || r.incidentAt || r.date;
            if (!c) return false;
            const tms = +new Date(c);
            return !isNaN(tms) && tms >= sevenDaysAgo;
          });
          if (mounted) setIncidentsCount(recent.length);
        } catch (e) { if (mounted) setIncidentsCount(0); }

        // 5) Tasks completed last 7 days — try couple endpoints
        try {
          let tasksRows: any[] = [];
          try {
            const tResp: any = await ApiService.get(`/tenant/${tenantId}/post-site/${postSiteId}/tasks`, { toast: { silentError: true } } as any);
            tasksRows = Array.isArray(tResp) ? tResp : (tResp && (tResp.rows || tResp.data)) ? (tResp.rows || tResp.data) : [];
          } catch (e) {
            try {
              const t2: any = await ApiService.get(`/tenant/${tenantId}/task?postSiteId=${encodeURIComponent(postSiteId)}&limit=999`, { toast: { silentError: true } } as any);
              tasksRows = Array.isArray(t2) ? t2 : (t2 && (t2.rows || t2.data)) ? (t2.rows || t2.data) : [];
            } catch (e2) { tasksRows = []; }
          }

          const recentTasks = (tasksRows || []).filter((it: any) => {
            const fin = it.completedAt || it.finishedAt || it.closedAt || it.completed_at || it.finished_at || it.closed_at || it.updatedAt || it.updated_at;
            if (!fin) return false;
            const tms = +new Date(fin);
            return !isNaN(tms) && tms >= sevenDaysAgo;
          });
          if (mounted) setTasksCount(recentTasks.length);
        } catch (e) { if (mounted) setTasksCount(0); }

      } catch (err) {
        console.error('Failed loading overview counters', err);
      }
    })();
    return () => { mounted = false; };
  }, [site]);

  return (
    <div ref={containerRef} className="space-y-6">
      <div className="bg-white border rounded-md p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">{t('postSites.overview.Stats.title')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.map((s) => (
            <div key={s.id} className="p-6 bg-white rounded-lg border border-gray-100 flex flex-col items-center text-center">
              <div className={`text-sm mb-3 ${s.color}`}>{s.label}</div>
              <div className={`text-3xl font-semibold ${s.color}`}>
                {s.id === 'assigned' ? assignedCount
                  : s.id === 'onsite' ? onsiteCount
                  : s.id === 'tours' ? toursCount
                  : s.id === 'tasks' ? tasksCount
                  : s.id === 'incidents' ? incidentsCount
                  : hoursLogged}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border rounded-md p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{t('postSites.overview.Map.title')}</h3>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">{t('postSites.overview.Map.MapType')}</div>
            <select className="border rounded px-3 py-1 text-sm">
              <option>{t('postSites.overview.Map.Roadmap')}</option>
              <option>{t('postSites.overview.Map.Satellite')}</option>
              <option>{t('postSites.overview.Map.Hybrid')}</option>
            </select>

            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" className="form-checkbox h-5 w-8" />
              <span>{t('postSites.overview.Map.GeoFence')}</span>
            </label>
          </div>
        </div>

        {(() => {
          const lat = site?.latitud ?? site?.latitude ?? site?.lat ?? (site?.location && site.location.lat);
          const lng = site?.longitud ?? site?.longitude ?? site?.lng ?? (site?.location && site.location.lng);
          const address = site?.address || site?.secondAddress || site?.companyAddress || '';

          if (lat && lng) {
            const latNum = Number(lat);
            const lngNum = Number(lng);
            if (!isNaN(latNum) && !isNaN(lngNum)) {
              return (
                <div className="h-72 rounded-md overflow-hidden mb-2">
                  <IncidentMap lat={latNum} lng={lngNum} label={site?.companyName || site?.name || 'Client location'} />
                </div>
              );
            }
          }

          if (address) {
            const search = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
            return (
              <div className="h-72 bg-gray-100 rounded-md overflow-hidden mb-2 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div>No coordinates available for this site.</div>
                  <a href={search} target="_blank" rel="noreferrer" className="text-blue-600 underline mt-2 inline-block">Open in Google Maps</a>
                </div>
              </div>
            );
          }

          return (
            <div className="h-72 bg-gray-100 rounded-md overflow-hidden mb-2 flex items-center justify-center text-gray-500">Mapa (no hay datos)</div>
          );
        })()}
      </div>

      <div className="bg-white border rounded-md p-6 shadow-sm">
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-md font-medium">{t('postSites.overview.LatestActivity')}</h4>
            <Sheet open={openFilter} onOpenChange={setOpenFilter}>
              <SheetTrigger asChild>
                <button className="text-sm bg-white border rounded px-3 py-1">{t('postSites.overview.Filters', 'Filtros')}</button>
              </SheetTrigger>

              <SheetContent side="right" className="w-[400px] sm:w-[460px] z-[9999]">
                <SheetHeader>
                  <SheetTitle>{t('postSites.overview.Filters', 'Filtros')}</SheetTitle>
                </SheetHeader>

                <div className="mt-4 space-y-4">
                  <div className="text-sm text-gray-600">{t('postSites.overview.FilterHelp', 'Selecciona filtros para la vista.')}</div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500">{t('postSites.overview.Filter.fromDate', 'From Date')}</label>
                    <input type="date" className="w-full border rounded px-3 py-2" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500">{t('postSites.overview.Filter.toDate', 'To Date')}</label>
                    <input type="date" className="w-full border rounded px-3 py-2" />
                  </div>

                  <div>
                    <label className="text-sm font-medium">{t('postSites.overview.Filter.type', 'Type')}</label>
                    <div className="mt-2 max-h-60 overflow-auto border rounded p-2 bg-white">
                      {typeKeys.map((key) => (
                        <label key={key} className="flex items-center gap-3 py-2 px-2 hover:bg-gray-50 rounded">
                          <Checkbox checked={selectedTypes.includes(key)} onCheckedChange={() => toggleType(key)} />
                          <span className="text-sm text-gray-700">{t(`postSites.overview.types.${key}`)}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-4">
                    <button onClick={() => setOpenFilter(false)} className="px-4 py-2 bg-[#C8860A] text-white rounded-md">{t('common.apply', 'Filtrar')}</button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="mt-4 text-sm text-gray-600">{t('postSites.overview.noActivity', 'No activity yet.')}</div>
        </div>
      </div>
    </div>
  );
}
