import React, { useRef, useEffect } from 'react';
import { useTranslation } from "react-i18next";
import { Link } from 'react-router-dom';
import IncidentMap from "@/components/IncidentMap/IncidentMap";
import { useState } from 'react';
import { ApiService } from '@/services/api/apiService';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ServiceTypeBadge } from "@/components/post-sites/ServiceTypeBadge";
import useScrollToTopOnMount from '@/hooks/useScrollToTopOnMount';
import {
  Users, ShieldCheck, Route, ClipboardCheck, AlertTriangle, Clock,
  Building2, MapPin, Phone, Mail, Briefcase, Pencil, MapIcon,
  ExternalLink, Activity, SlidersHorizontal,
} from 'lucide-react';

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

  const [assignedCount, setAssignedCount] = useState<number>(0);
  const [onsiteCount, setOnsiteCount] = useState<number>(0);
  const [toursCount, setToursCount] = useState<number>(0);
  const [tasksCount, setTasksCount] = useState<number>(0);
  const [incidentsCount, setIncidentsCount] = useState<number>(0);
  const [hoursLogged, setHoursLogged] = useState<string>('00:00');

  // Each stat: icon + a soft accent colour. Values stay in `foreground` for
  // readability; only the icon chip carries colour.
  const stats = [
    { id: 'assigned',  label: t('postSites.overview.Stats.guardsAssigned'),    value: assignedCount,  icon: Users,          accent: 'text-blue-600 bg-blue-600/10' },
    { id: 'onsite',    label: t('postSites.overview.Stats.guardOnSite'),       value: onsiteCount,    icon: ShieldCheck,    accent: 'text-[#C8860A] bg-[#C8860A]/10' },
    { id: 'tours',     label: t('postSites.overview.Stats.toursCompleted'),    value: toursCount,     icon: Route,          accent: 'text-emerald-600 bg-emerald-600/10' },
    { id: 'tasks',     label: t('postSites.overview.Stats.tasksCompleted'),    value: tasksCount,     icon: ClipboardCheck, accent: 'text-indigo-600 bg-indigo-600/10' },
    { id: 'incidents', label: t('postSites.overview.Stats.incidentsReported'), value: incidentsCount, icon: AlertTriangle,  accent: 'text-rose-600 bg-rose-600/10' },
    { id: 'hrs',       label: t('postSites.overview.Stats.hoursLogged'),       value: hoursLogged,    icon: Clock,          accent: 'text-slate-600 bg-slate-500/10' },
  ];

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
        let onsite = 0;
        let hoursSeconds = 0;
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        for (const sh of (shifts || [])) {
          const startStr = sh.start || sh.shiftStart || sh.startTime || sh.start_time || sh.startAt || sh.startDate;
          const endStr = sh.end || sh.shiftEnd || sh.endTime || sh.end_time || sh.finishTimeInDay || sh.finish_time || sh.finish;
          const s = startStr ? +new Date(startStr) : NaN;
          const e = endStr ? +new Date(endStr) : NaN;
          if (!isNaN(s) && !isNaN(e)) {
            if (s <= now && now <= e) onsite += 1;
            if ((s >= sevenDaysAgo) || (e >= sevenDaysAgo)) {
              hoursSeconds += Math.max(0, (e - s) / 1000);
            }
          }
        }
        if (mounted) {
          setOnsiteCount(onsite);
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

  // ── Derived site identity fields (tolerant of varied API field names). ──
  const siteName = site?.businessName || site?.companyName || site?.name || t('postSites.postsite', 'Post Site');
  const address = site?.address || site?.companyAddress || site?.secondAddress ||
    [site?.city, site?.country].filter(Boolean).join(', ');
  const clientName = site?.clientAccountName || site?.client?.name || site?.clientAccount?.name ||
    (typeof site?.client === 'string' ? site?.client : '');
  const phone = site?.contactPhone || site?.phone || '';
  const email = site?.contactEmail || site?.email || '';
  const isActive = site?.active !== false && site?.status !== 'inactive';
  const serviceType = site?.serviceType;

  const lat = site?.latitud ?? site?.latitude ?? site?.lat ?? (site?.location && site.location.lat);
  const lng = site?.longitud ?? site?.longitude ?? site?.lng ?? (site?.location && site.location.lng);
  const latNum = Number(lat);
  const lngNum = Number(lng);
  const hasCoords = lat != null && lng != null && !isNaN(latNum) && !isNaN(lngNum);
  const mapsUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : '';

  return (
    <div ref={containerRef} className="space-y-6">
      {/* ── Site identity header ─────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4 min-w-0">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#C8860A]/10 text-[#C8860A]">
                <Building2 className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-foreground truncate">{siteName}</h2>
                  <Badge variant={isActive ? 'default' : 'secondary'}>
                    {isActive ? t('common.active', 'Activo') : t('common.inactive', 'Inactivo')}
                  </Badge>
                  {serviceType ? <ServiceTypeBadge value={serviceType} /> : null}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                  {address ? (
                    <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 shrink-0" />{address}</span>
                  ) : null}
                  {clientName ? (
                    <span className="inline-flex items-center gap-1.5"><Briefcase className="h-4 w-4 shrink-0" />{clientName}</span>
                  ) : null}
                  {phone ? (
                    <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 hover:text-foreground"><Phone className="h-4 w-4 shrink-0" />{phone}</a>
                  ) : null}
                  {email ? (
                    <a href={`mailto:${email}`} className="inline-flex items-center gap-1.5 hover:text-foreground"><Mail className="h-4 w-4 shrink-0" />{email}</a>
                  ) : null}
                </div>
              </div>
            </div>
            {site?.id ? (
              <Link to={`/post-sites/${site.id}/edit`} className="shrink-0">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Pencil className="h-4 w-4" />
                  {t('common.edit', 'Editar')}
                </Button>
              </Link>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center gap-2 px-1">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t('postSites.overview.Stats.title')}
          </h3>
          <span className="text-xs text-muted-foreground/70">· {t('postSites.overview.last7days', 'últimos 7 días')}</span>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.id} className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${s.accent}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-2xl font-semibold leading-tight text-foreground">{s.value}</div>
                    <div className="truncate text-xs text-muted-foreground">{s.label}</div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── Location map ─────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <MapIcon className="h-4.5 w-4.5 text-muted-foreground" style={{ width: 18, height: 18 }} />
              {t('postSites.overview.Map.title')}
            </h3>
            {address ? (
              <a href={mapsUrl} target="_blank" rel="noreferrer"
                 className="inline-flex items-center gap-1.5 text-sm text-[#C8860A] hover:underline">
                {t('postSites.overview.Map.openInMaps', 'Abrir en Google Maps')}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>

          {hasCoords ? (
            <div className="h-80 overflow-hidden rounded-xl border border-border">
              <IncidentMap lat={latNum} lng={lngNum} label={siteName} />
            </div>
          ) : (
            <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 text-center text-muted-foreground">
              <MapPin className="h-7 w-7 opacity-50" />
              <p className="text-sm">{t('postSites.overview.Map.noCoords', 'Este sitio no tiene coordenadas configuradas.')}</p>
              {address ? (
                <a href={mapsUrl} target="_blank" rel="noreferrer" className="text-sm text-[#C8860A] hover:underline">
                  {t('postSites.overview.Map.openInMaps', 'Abrir en Google Maps')}
                </a>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Latest activity ──────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Activity className="h-4.5 w-4.5 text-muted-foreground" style={{ width: 18, height: 18 }} />
              {t('postSites.overview.LatestActivity')}
            </h3>
            <Sheet open={openFilter} onOpenChange={setOpenFilter}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <SlidersHorizontal className="h-4 w-4" />
                  {t('postSites.overview.Filters', 'Filtros')}
                  {selectedTypes.length > 0 ? (
                    <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">{selectedTypes.length}</Badge>
                  ) : null}
                </Button>
              </SheetTrigger>

              <SheetContent side="right" className="w-[400px] sm:w-[460px] z-[9999]">
                <SheetHeader>
                  <SheetTitle>{t('postSites.overview.Filters', 'Filtros')}</SheetTitle>
                </SheetHeader>

                <div className="mt-4 space-y-4">
                  <div className="text-sm text-muted-foreground">{t('postSites.overview.FilterHelp', 'Selecciona filtros para la vista.')}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">{t('postSites.overview.Filter.fromDate', 'From Date')}</label>
                      <input type="date" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">{t('postSites.overview.Filter.toDate', 'To Date')}</label>
                      <input type="date" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">{t('postSites.overview.Filter.type', 'Type')}</label>
                    <div className="mt-2 max-h-60 overflow-auto rounded-md border border-border bg-card p-2">
                      {typeKeys.map((key) => (
                        <label key={key} className="flex cursor-pointer items-center gap-3 rounded px-2 py-2 hover:bg-muted/40">
                          <Checkbox checked={selectedTypes.includes(key)} onCheckedChange={() => toggleType(key)} />
                          <span className="text-sm text-foreground">{t(`postSites.overview.types.${key}`)}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    {selectedTypes.length > 0 ? (
                      <Button variant="ghost" size="sm" onClick={() => setSelectedTypes([])}>
                        {t('common.clear', 'Limpiar')}
                      </Button>
                    ) : null}
                    <Button size="sm" className="bg-[#C8860A] text-white hover:bg-[#b3780a]" onClick={() => setOpenFilter(false)}>
                      {t('common.apply', 'Filtrar')}
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="mt-6 flex flex-col items-center justify-center gap-2 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Activity className="h-6 w-6" />
            </div>
            <p className="text-sm text-muted-foreground">{t('postSites.overview.noActivity', 'Sin actividad por ahora.')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
