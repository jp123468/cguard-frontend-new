import { useEffect, useState } from "react";
import Breadcrumb from "@/components/ui/breadcrumb";
import AppLayout from "@/layouts/app-layout";
import WidgetsBoard from "./WidgetsBoard";
import { clientService } from "@/lib/api/clientService";
import { postSiteService } from "@/lib/api/postSiteService";
import securityGuardService from "@/lib/api/securityGuardService";
import userService from "@/lib/api/userService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

// Empty state component
function EmptyState() {
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
      <h3 className="text-lg font-medium text-gray-700">No se encontraron resultados</h3>
      <p className="mt-1 text-sm text-gray-500">
        No pudimos encontrar ningún elemento que coincida con su búsqueda
      </p>
    </div>
  );
}

export default function DashboardPage() {
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

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Actividades" },
        ]}
      />

      <div className="p-6 space-y-6">
        {/* Widget Manager Button */}
        <div className="flex justify-end">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="border-orange-200 text-orange-600 hover:bg-orange-50">
                Gestionar Widgets
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
                  <span className="text-sm">Cuadro de Estadísticas</span>
                </label>
                <label htmlFor="widget-tracker" className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer">
                  <Checkbox
                    id="widget-tracker"
                    checked={visibleWidgets.tracker}
                    onCheckedChange={(v) => toggleWidget("tracker", v as boolean)}
                  />
                  <span className="text-sm">Guardias Activos</span>
                </label>
                <label htmlFor="widget-activity" className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer">
                  <Checkbox
                    id="widget-activity"
                    checked={visibleWidgets.activity}
                    onCheckedChange={(v) => toggleWidget("activity", v as boolean)}
                  />
                  <span className="text-sm">Última Actividad</span>
                </label>
                <label htmlFor="widget-timeLog" className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer">
                  <Checkbox
                    id="widget-timeLog"
                    checked={visibleWidgets.timeLog}
                    onCheckedChange={(v) => toggleWidget("timeLog", v as boolean)}
                  />
                  <span className="text-sm">Reloj de Tiempo</span>
                </label>
                <label htmlFor="widget-checkIn" className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer">
                  <Checkbox
                    id="widget-checkIn"
                    checked={visibleWidgets.checkIn}
                    onCheckedChange={(v) => toggleWidget("checkIn", v as boolean)}
                  />
                  <span className="text-sm">Registro</span>
                </label>
                <label htmlFor="widget-checkOut" className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer">
                  <Checkbox
                    id="widget-checkOut"
                    checked={visibleWidgets.checkOut}
                    onCheckedChange={(v) => toggleWidget("checkOut", v as boolean)}
                  />
                  <span className="text-sm">Salida</span>
                </label>
                <label htmlFor="widget-incidents" className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer">
                  <Checkbox
                    id="widget-incidents"
                    checked={visibleWidgets.incidents}
                    onCheckedChange={(v) => toggleWidget("incidents", v as boolean)}
                  />
                  <span className="text-sm">Últimos Incidentes</span>
                </label>
                <label htmlFor="widget-reports" className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer">
                  <Checkbox
                    id="widget-reports"
                    checked={visibleWidgets.reports}
                    onCheckedChange={(v) => toggleWidget("reports", v as boolean)}
                  />
                  <span className="text-sm">Informes Estándar</span>
                </label>
                <label htmlFor="widget-tours" className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer">
                  <Checkbox
                    id="widget-tours"
                    checked={visibleWidgets.tours}
                    onCheckedChange={(v) => toggleWidget("tours", v as boolean)}
                  />
                  <span className="text-sm">Últimos Recorridos por el Sitio</span>
                </label>
                <label htmlFor="widget-scans" className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer">
                  <Checkbox
                    id="widget-scans"
                    checked={visibleWidgets.scans}
                    onCheckedChange={(v) => toggleWidget("scans", v as boolean)}
                  />
                  <span className="text-sm">Últimas etiquetas escaneadas</span>
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
              <CardTitle className="text-lg font-medium">Rastreador en Vivo</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  Mostrar Geovalla
                </Button>
                <Button variant="outline" size="sm">
                  Satélite
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Google Maps Placeholder */}
              <div className="w-full h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Mapa de Google Maps aquí</p>
              </div>

              {/* Tracker Table */}
              <div className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Imagen</TableHead>
                      <TableHead>Guardia</TableHead>
                      <TableHead>Sitio de publicación</TableHead>
                      <TableHead>Última Actualización</TableHead>
                      <TableHead>Estado de la Batería</TableHead>
                      <TableHead>Velocidad (MPH)</TableHead>
                      <TableHead>Última Ubicación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={8}>
                        <EmptyState />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Last Activity */}
        {visibleWidgets.activity && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-medium">Última Actividad</CardTitle>
              <Button variant="link" className="text-orange-600 hover:text-orange-700">
                Ver Todo
              </Button>
            </CardHeader>
            <CardContent>
              <EmptyState />
            </CardContent>
          </Card>
        )}

        {/* Time Log */}
        {visibleWidgets.timeLog && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-medium">Reloj de Tiempo</CardTitle>
              <span className="text-sm text-orange-600">0 Entradas</span>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Guardia</TableHead>
                    <TableHead>Sitio de publicación</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Turno/Descanso Nombre</TableHead>
                    <TableHead>Hora de Fichaje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={6}>
                      <EmptyState />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Check In / Check Out Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Registros */}
          {visibleWidgets.checkIn && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-medium">Registros</CardTitle>
                <span className="text-sm text-orange-600">0 Entradas</span>
              </CardHeader>
              <CardContent>
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
                        <EmptyState />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Salidas registradas */}
          {visibleWidgets.checkOut && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-medium">Salidas registradas</CardTitle>
                <span className="text-sm text-orange-600">0 Entradas</span>
              </CardHeader>
              <CardContent>
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
                        <EmptyState />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Últimos Incidentes */}
        {visibleWidgets.incidents && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-medium">Últimos Incidentes</CardTitle>
              <Button variant="link" className="text-orange-600 hover:text-orange-700">
                Ver Todo
              </Button>
            </CardHeader>
            <CardContent>
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
                      <EmptyState />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Informes Estándar */}
        {visibleWidgets.reports && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-medium">Informes Estándar</CardTitle>
              <Button variant="link" className="text-orange-600 hover:text-orange-700">
                Ver Todo
              </Button>
            </CardHeader>
            <CardContent>
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
                      <EmptyState />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Últimos Recorridos por el Sitio */}
        {visibleWidgets.tours && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-medium">Últimos Recorridos por el Sitio</CardTitle>
              <Button variant="link" className="text-orange-600 hover:text-orange-700">
                Ver Todo
              </Button>
            </CardHeader>
            <CardContent>
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
                      <EmptyState />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Últimas etiquetas escaneadas */}
        {visibleWidgets.scans && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-medium">Últimas etiquetas escaneadas</CardTitle>
              <Button variant="link" className="text-orange-600 hover:text-orange-700">
                Ver Todo
              </Button>
            </CardHeader>
            <CardContent>
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
                      <EmptyState />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}