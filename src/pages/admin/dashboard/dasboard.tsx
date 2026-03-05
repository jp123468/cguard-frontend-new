import { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import Breadcrumb from "@/components/ui/breadcrumb";
import AppLayout from "@/layouts/app-layout";
import WidgetsBoard from "./WidgetsBoard";
import { clientService } from "@/lib/api/clientService";
import { postSiteService } from "@/lib/api/postSiteService";
import securityGuardService from "@/lib/api/securityGuardService";
import userService from "@/lib/api/userService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import GoogleMapEmbed from '@/components/GoogleMap/GoogleMapEmbed';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import MobileCardList from '@/components/responsive/MobileCardList';

// Empty state component
function EmptyState({ title, description, alt }: { title: string; description: string; alt?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4">
        <svg
          className="mx-auto h-24 w-24 text-gray-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-700">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">
        {description}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [showGeofence, setShowGeofence] = useState(false);
  const [visibleWidgets, setVisibleWidgets] = useState({
    stats: true,
    tracker: true,
    activity: true,
    timeLog: true,
    checkIn: true,
    checkOut: true,
    incidents: true,
    reports: true,
    tours: true,
    scans: true,
  });

  const [data, setData] = useState({ clientes: 0, sitios: 0, guardias: 0, equipo: 0, registros: 0, fichados: 0 });
  const [loadingStats, setLoadingStats] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  const toggleWidget = (key: string, checked: boolean) => {
    setVisibleWidgets((prev) => ({ ...prev, [key]: checked }));
  };

  useEffect(() => {
    let mounted = true;
    const getCount = (res: any) => {
      if (!res) return 0;
      return res.total ?? res.count ?? (Array.isArray(res.rows) ? res.rows.length : 0);
    };

    (async () => {
      setLoadingStats(true);
      try {
        const [clientsRes, sitesRes, guardsRes, usersRes] = await Promise.all([
          // request minimal page to let backend return totals
          clientService.getClients({}, { limit: 1, offset: 0 }),
          postSiteService.list({ limit: 1, offset: 0 } as any),
          securityGuardService.list({ limit: 1, offset: 0 } as any),
          userService.listUsers(),
        ]);

        if (!mounted) return;

        const clientes = getCount(clientsRes);
        const sitios = getCount(sitesRes);
        const guardias = getCount(guardsRes);
        const equipo = Array.isArray(usersRes) ? usersRes.length : getCount(usersRes);

        setData((d) => ({ ...d, clientes, sitios, guardias, equipo }));
      } catch (e) {
        console.error('Error loading dashboard stats', e);
      } finally {
        if (mounted) setLoadingStats(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  // Try to obtain the user's current position (for dashboard map centering)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    let mounted = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!mounted) return;
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        console.warn('Geolocation not available or permission denied', err);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
    return () => { mounted = false; };
  }, []);

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: t('dashboard.title'), path: "/dashboard" },
          { label: t('activity.title') },
        ]}
      />

      <div className="p-6 space-y-6">
        {/* Widget Manager Button */}
        <div className="flex justify-end">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="border-orange-200 text-orange-600 hover:bg-orange-50">
                {t('dashboard.manageWidgets')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3">
              <div className="space-y-2">
                <label htmlFor="widget-stats" className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer">
                  <Checkbox
                    id="widget-stats"
                    checked={visibleWidgets.stats}
                    onCheckedChange={(v) => toggleWidget("stats", v as boolean)}
                  />
                  <span className="text-sm">{t('dashboard.popover.widgets.stats')}</span>
                </label>
                <label htmlFor="widget-tracker" className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer">
                  <Checkbox
                    id="widget-tracker"
                    checked={visibleWidgets.tracker}
                    onCheckedChange={(v) => toggleWidget("tracker", v as boolean)}
                  />
                  <span className="text-sm">{t('dashboard.popover.widgets.tracker')}</span>
                </label>
                <label htmlFor="widget-activity" className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer">
                  <Checkbox
                    id="widget-activity"
                    checked={visibleWidgets.activity}
                    onCheckedChange={(v) => toggleWidget("activity", v as boolean)}
                  />
                  <span className="text-sm">{t('dashboard.popover.widgets.activity')}</span>
                </label>
                <label htmlFor="widget-timeLog" className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer">
                  <Checkbox
                    id="widget-timeLog"
                    checked={visibleWidgets.timeLog}
                    onCheckedChange={(v) => toggleWidget("timeLog", v as boolean)}
                  />
                  <span className="text-sm">{t('dashboard.popover.widgets.timeLog')}</span>
                </label>
                <label htmlFor="widget-checkIn" className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer">
                  <Checkbox
                    id="widget-checkIn"
                    checked={visibleWidgets.checkIn}
                    onCheckedChange={(v) => toggleWidget("checkIn", v as boolean)}
                  />
                  <span className="text-sm">{t('dashboard.popover.widgets.checkIn')}</span>
                </label>
                <label htmlFor="widget-checkOut" className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer">
                  <Checkbox
                    id="widget-checkOut"
                    checked={visibleWidgets.checkOut}
                    onCheckedChange={(v) => toggleWidget("checkOut", v as boolean)}
                  />
                  <span className="text-sm">{t('dashboard.popover.widgets.checkOut')}</span>
                </label>
                <label htmlFor="widget-incidents" className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer">
                  <Checkbox
                    id="widget-incidents"
                    checked={visibleWidgets.incidents}
                    onCheckedChange={(v) => toggleWidget("incidents", v as boolean)}
                  />
                  <span className="text-sm">{t('dashboard.popover.widgets.incidents')}</span>
                </label>
                <label htmlFor="widget-reports" className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer">
                  <Checkbox
                    id="widget-reports"
                    checked={visibleWidgets.reports}
                    onCheckedChange={(v) => toggleWidget("reports", v as boolean)}
                  />
                  <span className="text-sm">{t('dashboard.popover.widgets.reports')}</span>
                </label>
                <label htmlFor="widget-tours" className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer">
                  <Checkbox
                    id="widget-tours"
                    checked={visibleWidgets.tours}
                    onCheckedChange={(v) => toggleWidget("tours", v as boolean)}
                  />
                  <span className="text-sm">{t('dashboard.popover.widgets.tours')}</span>
                </label>
                <label htmlFor="widget-scans" className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer">
                  <Checkbox
                    id="widget-scans"
                    checked={visibleWidgets.scans}
                    onCheckedChange={(v) => toggleWidget("scans", v as boolean)}
                  />
                  <span className="text-sm">{t('dashboard.popover.widgets.scans')}</span>
                </label>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Stats Cards */}
        {visibleWidgets.stats && (
          <WidgetsBoard data={data} />
        )}

        {/* Live Tracker Map */}
        {visibleWidgets.tracker && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-medium">{t('dashboard.page.liveTracker')}</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant={showGeofence ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowGeofence((s) => !s)}
                >
                  {showGeofence ? t('dashboard.page.hideGeofence') : t('dashboard.page.showGeofence')}
                </Button>
                <Button
                  variant={mapType === 'satellite' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMapType((t) => (t === 'roadmap' ? 'satellite' : 'roadmap'))}
                >
                  {mapType === 'satellite' ? t('dashboard.page.roadmap') : t('dashboard.page.satellite')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Google Maps */}
              <div className="w-full h-[400px] rounded-lg overflow-hidden">
                <GoogleMapEmbed
                  className="w-full h-full"
                  mapType={mapType}
                  showGeofence={showGeofence}
                  lat={userCoords?.lat}
                  lng={userCoords?.lng}
                />
              </div>

              {/* Tracker Table */}
              <div className="mt-4">
                <div className="md:block hidden overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('dashboard.table.headers.index')}</TableHead>
                        <TableHead>{t('dashboard.table.headers.image')}</TableHead>
                        <TableHead>{t('dashboard.table.headers.guard')}</TableHead>
                        <TableHead>{t('dashboard.table.headers.postSite')}</TableHead>
                        <TableHead>{t('dashboard.table.headers.lastUpdate')}</TableHead>
                        <TableHead>{t('dashboard.table.headers.battery')}</TableHead>
                        <TableHead>{t('dashboard.table.headers.speed')}</TableHead>
                        <TableHead>{t('dashboard.table.headers.lastLocation')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={8}>
                          <EmptyState title={t('dashboard.page.noData')} description={t('dashboard.page.noTrackerData')} />
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div className="md:hidden">
                  <MobileCardList
                    items={[]}
                    loading={false}
                    emptyMessage={t('dashboard.page.noTrackerData') as string}
                    renderCard={(it: any) => (
                      <div className="p-4 bg-white border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-semibold">{it.guard || '-'}</div>
                            <div className="text-xs text-gray-500">{it.postSite || '-'}</div>
                          </div>
                          <div className="text-xs text-gray-500 text-right">
                            <div>{it.lastUpdate || '-'}</div>
                            <div className="mt-1">{it.battery || '-'} • {it.speed || '-'}</div>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-600">{it.lastLocation || '-'}</div>
                      </div>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Last Activity */}
        {visibleWidgets.activity && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-medium">{t('dashboard.page.lastActivity')}</CardTitle>
              <Button variant="link" className="text-orange-600 hover:text-orange-700">
                {t('dashboard.page.viewAll')}
              </Button>
            </CardHeader>
            <CardContent>
              <EmptyState title={t('dashboard.page.noData')} description={t('dashboard.page.noActivityData')} />
            </CardContent>
          </Card>
        )}

        {/* Time Log */}
        {visibleWidgets.timeLog && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-medium">{t('dashboard.page.timeLog')}</CardTitle>
              <span className="text-sm text-orange-600">{t('dashboard.page.entriesCount', { count: 0 })}</span>
            </CardHeader>
            <CardContent>
              <div>
                <div className="md:block hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('dashboard.table.headers.index')}</TableHead>
                        <TableHead>{t('dashboard.table.headers.guard')}</TableHead>
                        <TableHead>{t('dashboard.table.headers.postSite')}</TableHead>
                        <TableHead>{t('dashboard.table.headers.type')}</TableHead>
                        <TableHead>{t('dashboard.table.headers.shiftName')}</TableHead>
                        <TableHead>{t('dashboard.table.headers.time')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={6}>
                          <EmptyState title={t('dashboard.page.noData')} description={t('dashboard.page.noTimeLogData')} />
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div className="md:hidden">
                  <MobileCardList
                    items={[]}
                    loading={false}
                    emptyMessage={t('dashboard.page.noTimeLogData') as string}
                    renderCard={(it: any) => (
                      <div className="p-4 bg-white border rounded-lg">
                        <div className="text-sm font-semibold">{it.guard || '-'}</div>
                        <div className="text-xs text-gray-500">{it.postSite || '-'}</div>
                        <div className="mt-2 text-xs text-gray-600">{it.time || '-'}</div>
                      </div>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Check In / Check Out Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Registros */}
          {visibleWidgets.checkIn && (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-medium">{t('dashboard.page.checkIns')}</CardTitle>
                <span className="text-sm text-orange-600">{t('dashboard.page.entriesCount', { count: 0 })}</span>
              </CardHeader>
              <CardContent>
                <div className="md:block hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Guardia</TableHead>
                        <TableHead>Sitio de publicación</TableHead>
                        <TableHead>Hora de Registro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={4}>
                          <EmptyState title={t('dashboard.page.noData')} description={t('dashboard.page.noCheckInData')} />
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div className="md:hidden">
                  <MobileCardList
                    items={[]}
                    loading={false}
                    emptyMessage={t('dashboard.page.noCheckInData') as string}
                    renderCard={(it: any) => (
                      <div className="p-4 bg-white border rounded-lg">
                        <div className="text-sm font-semibold">{it.guard || '-'}</div>
                        <div className="text-xs text-gray-500">{it.postSite || '-'}</div>
                        <div className="mt-2 text-xs text-gray-600">{it.time || '-'}</div>
                      </div>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Salidas registradas */}
          {visibleWidgets.checkOut && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-medium">{t('dashboard.page.checkOuts')}</CardTitle>
                <span className="text-sm text-orange-600">{t('dashboard.page.entriesCount', { count: 0 })}</span>
              </CardHeader>
              <CardContent>
                <div className="md:block hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Guardia</TableHead>
                        <TableHead>Sitio de publicación</TableHead>
                        <TableHead>Hora de Salida</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={4}>
                          <EmptyState title={t('dashboard.page.noData')} description={t('dashboard.page.noCheckOutData')} />
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div className="md:hidden">
                  <MobileCardList
                    items={[]}
                    loading={false}
                    emptyMessage={t('dashboard.page.noCheckOutData') as string}
                    renderCard={(it: any) => (
                      <div className="p-4 bg-white border rounded-lg">
                        <div className="text-sm font-semibold">{it.guard || '-'}</div>
                        <div className="text-xs text-gray-500">{it.postSite || '-'}</div>
                        <div className="mt-2 text-xs text-gray-600">{it.time || '-'}</div>
                      </div>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Últimos Incidentes */}
        {visibleWidgets.incidents && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-medium">{t('dashboard.page.incidents')}</CardTitle>
              <Button variant="link" className="text-orange-600 hover:text-orange-700">
                {t('dashboard.page.viewAll')}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="md:block hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Incidente</TableHead>
                      <TableHead>Sitio de publicación</TableHead>
                      <TableHead>Guardia</TableHead>
                      <TableHead>Fecha/Hora del Incidente</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={6}>
                        <EmptyState title={t('dashboard.page.noData')} description={t('dashboard.page.noIncidentsData')} />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden">
                <MobileCardList items={[]} loading={false} emptyMessage={t('dashboard.page.noIncidentsData') as string} renderCard={(it:any) => (
                  <div className="p-4 bg-white border rounded-lg">
                    <div className="text-sm font-semibold">{it.title || '-'}</div>
                    <div className="text-xs text-gray-500">{it.postSite || '-'}</div>
                    <div className="mt-2 text-xs text-gray-600">{it.date || '-'}</div>
                  </div>
                )} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Informes Estándar */}
        {visibleWidgets.reports && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-medium">{t('dashboard.page.reports')}</CardTitle>
              <Button variant="link" className="text-orange-600 hover:text-orange-700">
                {t('dashboard.page.viewAll')}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="md:block hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Sitio de publicación</TableHead>
                      <TableHead>Guardia</TableHead>
                      <TableHead>Informe</TableHead>
                      <TableHead>Informe Fecha/Hora</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={6}>
                        <EmptyState title={t('dashboard.page.noData')} description={t('dashboard.page.noReportsData')} />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden">
                <MobileCardList items={[]} loading={false} emptyMessage={t('dashboard.page.noReportsData') as string} renderCard={(it:any) => (
                  <div className="p-4 bg-white border rounded-lg">
                    <div className="text-sm font-semibold">{it.report || '-'}</div>
                    <div className="text-xs text-gray-500">{it.postSite || '-'}</div>
                    <div className="mt-2 text-xs text-gray-600">{it.date || '-'}</div>
                  </div>
                )} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Últimos Recorridos por el Sitio */}
        {visibleWidgets.tours && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-medium">{t('dashboard.page.tours')}</CardTitle>
              <Button variant="link" className="text-orange-600 hover:text-orange-700">
                {t('dashboard.page.viewAll')}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="md:block hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Recorrido Nombre</TableHead>
                      <TableHead>Sitio de publicación</TableHead>
                      <TableHead>Guardia</TableHead>
                      <TableHead>Hora de Inicio</TableHead>
                      <TableHead>Hora de Fin</TableHead>
                      <TableHead>Etiqueta Perdida</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={7}>
                        <EmptyState title={t('dashboard.page.noData')} description={t('dashboard.page.noToursData')} />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden">
                <MobileCardList items={[]} loading={false} emptyMessage={t('dashboard.page.noToursData') as string} renderCard={(it:any) => (
                  <div className="p-4 bg-white border rounded-lg">
                    <div className="text-sm font-semibold">{it.name || '-'}</div>
                    <div className="text-xs text-gray-500">{it.postSite || '-'}</div>
                    <div className="mt-2 text-xs text-gray-600">{it.start || '-'} — {it.end || '-'}</div>
                  </div>
                )} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Últimas etiquetas escaneadas */}
        {visibleWidgets.scans && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-medium">{t('dashboard.page.scans')}</CardTitle>
              <Button variant="link" className="text-orange-600 hover:text-orange-700">
                {t('dashboard.page.viewAll')}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="md:block hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Punto de control</TableHead>
                      <TableHead>Sitio de publicación</TableHead>
                      <TableHead>Guardia</TableHead>
                      <TableHead>Fecha y hora del escaneo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={4}>
                        <EmptyState title={t('dashboard.page.noData')} description={t('dashboard.page.noScansData')} />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden">
                <MobileCardList items={[]} loading={false} emptyMessage={t('dashboard.page.noScansData') as string} renderCard={(it:any) => (
                  <div className="p-4 bg-white border rounded-lg">
                    <div className="text-sm font-semibold">{it.point || '-'}</div>
                    <div className="text-xs text-gray-500">{it.postSite || '-'}</div>
                    <div className="mt-2 text-xs text-gray-600">{it.date || '-'}</div>
                  </div>
                )} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}