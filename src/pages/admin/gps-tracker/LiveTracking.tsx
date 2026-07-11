import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import AppLayout from "@/layouts/app-layout";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Filter, MapPinned, MapPin, Route as RouteIcon, CheckCircle2, Clock } from "lucide-react";
import Breadcrumb from "@/components/ui/breadcrumb";
import { PageContainer, PageHeader, Section, EmptyState, StatusBadge } from "@/components/kit";
import routeService from "@/lib/api/routeService";
import RouteTrackingMap, { type RouteStopMarker } from "./RouteTrackingMap";

const DOW_NUM: Record<string, number> = {
  sun: 0, sunday: 0, dom: 0, domingo: 0,
  mon: 1, monday: 1, lun: 1, lunes: 1,
  tue: 2, tuesday: 2, mar: 2, martes: 2,
  wed: 3, wednesday: 3, mie: 3, "mié": 3, miercoles: 3, "miércoles": 3,
  thu: 4, thursday: 4, jue: 4, jueves: 4,
  fri: 5, friday: 5, vie: 5, viernes: 5,
  sat: 6, saturday: 6, sab: 6, "sáb": 6, sabado: 6, "sábado": 6,
};

/** Whether a route is scheduled to run on the given weekday (no schedule = daily). */
function scheduledOn(route: any, weekday: number): boolean {
  let days = route.days;
  if (typeof days === "string") { try { days = JSON.parse(days); } catch { days = null; } }
  if (!Array.isArray(days) || days.length === 0) return true;
  return days.some((d: any) => {
    if (typeof d === "number") return d === weekday;
    const n = DOW_NUM[String(d).toLowerCase().trim()];
    return n === weekday;
  });
}

const parseCoord = (v: any): number | null => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export default function LiveTrackingPage() {
  const [openFilter, setOpenFilter] = useState(false);
  const [mapType, setMapType] = useState<"roadmap" | "satellite" | "hybrid" | "terrain">("roadmap");
  const [showGeofence, setShowGeofence] = useState(true);

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [routes, setRoutes] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [routeFilter, setRouteFilter] = useState<string>("all");
  const [showAll, setShowAll] = useState(false);

  const weekday = useMemo(() => new Date(`${date}T12:00:00`).getDay(), [date]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [r, runRes] = await Promise.all([
          routeService.list({ limit: 300 }),
          routeService.runs(date).catch(() => []),
        ]);
        if (!mounted) return;
        setRoutes(r?.rows ?? []);
        setRuns(runRes || []);
      } catch (e: any) {
        if (mounted) toast.error(e?.message || "No se pudieron cargar las rutas");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [date]);

  const isDone = (routeId: string) => runs.some((x) => x.routeId === routeId && x.status === "completed");

  // Routes visible on the map/table: scheduled-today (or all), then the picked route.
  const visibleRoutes = useMemo(() => {
    let list = showAll ? routes : routes.filter((r) => scheduledOn(r, weekday));
    if (routeFilter !== "all") list = list.filter((r) => String(r.id) === routeFilter);
    return list;
  }, [routes, showAll, weekday, routeFilter]);

  // Flatten each route's points that carry valid coordinates into map markers.
  const stops = useMemo<RouteStopMarker[]>(() => {
    const out: RouteStopMarker[] = [];
    visibleRoutes.forEach((route) => {
      const done = isDone(route.id);
      (route.points || []).forEach((p: any, idx: number) => {
        const lat = parseCoord(p.lat);
        const lng = parseCoord(p.lng);
        if (lat == null || lng == null) return;
        out.push({
          id: `${route.id}:${p.id ?? p.siteId ?? idx}`,
          routeId: String(route.id),
          routeName: route.name || "Ruta",
          siteName: p.siteName || p.address || p.siteId || `Parada ${idx + 1}`,
          address: p.address || "",
          lat,
          lng,
          order: p.order ?? idx + 1,
          done,
        });
      });
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleRoutes, runs]);

  const totalPoints = visibleRoutes.reduce((n, r) => n + (r.points?.length || 0), 0);

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Seguimiento en vivo" },
        ]}
      />

      <PageContainer width="wide" className="p-4">
        <PageHeader
          icon={<MapPinned />}
          title="Seguimiento en vivo"
          subtitle="Ubicación de las paradas de las rutas de patrulla y su estado del día."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
              <Sheet open={openFilter} onOpenChange={setOpenFilter}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="text-primary border-primary/30">
                    <Filter className="mr-2 h-4 w-4" />
                    Filtros
                  </Button>
                </SheetTrigger>

                <SheetContent side="right" className="w-[400px] sm:w-[460px]">
                  <SheetHeader>
                    <SheetTitle>Filtros</SheetTitle>
                  </SheetHeader>

                  <div className="mt-6 space-y-5">
                    <div className="space-y-2">
                      <Label>Ruta</Label>
                      <Select value={routeFilter} onValueChange={setRouteFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todas las rutas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las rutas</SelectItem>
                          {routes.map((r) => (
                            <SelectItem key={r.id} value={String(r.id)}>
                              {r.name || r.id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={showAll} onCheckedChange={(v) => setShowAll(Boolean(v))} />
                      <span className="text-sm text-foreground">
                        Mostrar todas las rutas (no solo las del día)
                      </span>
                    </label>

                    <Button
                      className="w-full bg-primary hover:bg-primary/90 text-white"
                      onClick={() => setOpenFilter(false)}
                    >
                      Aplicar
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          }
        />

        {/* Controles del mapa */}
        <Section title="Mapa" icon={<MapPin />}>
          <div className="flex flex-wrap items-end gap-4">
            {/* Tipo de mapa */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Tipo de Mapa</p>
              <Select value={mapType} onValueChange={(v) => setMapType(v as typeof mapType)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Hoja de Ruta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="roadmap">Hoja de Ruta</SelectItem>
                  <SelectItem value="satellite">Satélite</SelectItem>
                  <SelectItem value="hybrid">Híbrido</SelectItem>
                  <SelectItem value="terrain">Terreno</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Mostrar Geovalla */}
            <label className="flex items-center gap-2 cursor-pointer pb-2">
              <Checkbox
                checked={showGeofence}
                onCheckedChange={(v) => setShowGeofence(Boolean(v))}
              />
              <span className="text-sm text-foreground">Mostrar Geovalla</span>
            </label>

            <div className="ml-auto flex items-center gap-4 pb-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <RouteIcon className="h-3.5 w-3.5 text-[color:var(--primary)]" />
                {visibleRoutes.length} rutas · {totalPoints} paradas
              </span>
            </div>
          </div>

          {/* Contenedor del mapa + tabla */}
          <div className="mt-4 border rounded-2xl overflow-hidden">
            {/* Mapa */}
            <RouteTrackingMap
              stops={stops}
              mapType={mapType}
              showGeofence={showGeofence}
              height={380}
            />

            {/* Tabla debajo del mapa */}
            <table className="min-w-full text-sm text-left border-collapse">
              <thead className="bg-muted/30">
                <tr className="border-b">
                  <th className="px-4 py-3 font-semibold">Ruta</th>
                  <th className="px-4 py-3 font-semibold">Puesto de seguridad</th>
                  <th className="px-4 py-3 font-semibold">Dirección</th>
                  <th className="px-4 py-3 font-semibold">Parada</th>
                  <th className="px-4 py-3 font-semibold">Pasadas</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                </tr>
              </thead>

              <tbody>
                {stops.length > 0 ? (
                  stops.map((s) => {
                    const route = visibleRoutes.find((r) => String(r.id) === s.routeId);
                    const point = (route?.points || []).find(
                      (p: any, idx: number) => `${route.id}:${p.id ?? p.siteId ?? idx}` === s.id,
                    );
                    return (
                      <tr key={s.id} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-3">{s.routeName}</td>
                        <td className="px-4 py-3">{s.siteName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{s.address || "—"}</td>
                        <td className="px-4 py-3">#{s.order}</td>
                        <td className="px-4 py-3">
                          {point?.scheduledHits != null ? point.scheduledHits : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {s.done ? (
                            <StatusBadge tone="green">
                              <CheckCircle2 className="mr-1 h-3 w-3" /> Completada
                            </StatusBadge>
                          ) : (
                            <StatusBadge tone="orange">
                              <Clock className="mr-1 h-3 w-3" /> Pendiente
                            </StatusBadge>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12">
                      <EmptyState
                        icon={<MapPin />}
                        title={loading ? "Cargando rutas…" : "No se encontraron paradas"}
                        description={
                          loading
                            ? "Obteniendo las rutas de patrulla del día."
                            : "No hay rutas con paradas geolocalizadas para esta fecha. Agrega ubicaciones a los puestos de la ruta para verlas aquí."
                        }
                        className="border-0"
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>
      </PageContainer>
    </AppLayout>
  );
}
