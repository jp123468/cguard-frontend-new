import { useState } from "react";
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
import { Filter, MapPinned, MapPin } from "lucide-react";
import Breadcrumb from "@/components/ui/breadcrumb";
import { PageContainer, PageHeader, Section, EmptyState } from "@/components/kit";

interface LiveTrackingRow {
  id: string;
  guardName: string;
  site: string;
  lastUpdate: string;
  batteryStatus: string;
  speedMph: number | null;
  lastLocation: string;
}

export default function LiveTrackingPage() {
  const [openFilter, setOpenFilter] = useState(false);
  const [mapType, setMapType] = useState("roadmap");
  const [showGeofence, setShowGeofence] = useState(true);

  // TODO: wire to the real live-tracking API. Until then the table renders the
  // empty state. (`setRows` is retained for when the fetch is implemented.)
  const [rows] = useState<LiveTrackingRow[]>([]);

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
          subtitle="Ubicación en tiempo real de tus vigilantes en servicio."
          actions={
            <Sheet open={openFilter} onOpenChange={setOpenFilter}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="text-primary border-primary/30"
                >
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
                    <Label>Cliente*</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="central">Central</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Puesto de seguridad*</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar sitio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="catolica">Católica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Vigilante*</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar vigilante" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="jose">José Alejo Pinos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox />
                    <span className="text-sm text-foreground">
                      Mostrar datos archivados
                    </span>
                  </label>

                  <Button
                    className="w-full bg-primary hover:bg-primary/90 text-white"
                    onClick={() => {
                      // Aplica tus filtros reales aquí
                      setOpenFilter(false);
                    }}
                  >
                    Filtro
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          }
        />

        {/* Controles del mapa */}
        <Section title="Mapa" icon={<MapPin />}>
          <div className="flex flex-wrap items-end gap-4">
            {/* Tipo de mapa */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Tipo de Mapa</p>
              <Select value={mapType} onValueChange={setMapType}>
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
          </div>

          {/* Contenedor del mapa + tabla */}
          <div className="mt-4 border rounded-2xl overflow-hidden">
            {/* Mapa */}
            <div className="w-full h-[380px] bg-muted">
              {/* Aquí va tu componente de Google Maps */}
            </div>

            {/* Tabla debajo del mapa */}
            <table className="min-w-full text-sm text-left border-collapse">
              <thead className="bg-muted/30">
                <tr className="border-b">
                  <th className="px-4 py-3 font-semibold">Vigilante</th>
                  <th className="px-4 py-3 font-semibold">
                    Puesto de seguridad
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Última Actualización
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Estado de la Batería
                  </th>
                  <th className="px-4 py-3 font-semibold">Velocidad (MPH)</th>
                  <th className="px-4 py-3 font-semibold">Última Ubicación</th>
                </tr>
              </thead>

              <tbody>
                {rows.length > 0 ? (
                  rows.map((row) => (
                    <tr key={row.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3">{row.guardName}</td>
                      <td className="px-4 py-3">{row.site}</td>
                      <td className="px-4 py-3">{row.lastUpdate}</td>
                      <td className="px-4 py-3">{row.batteryStatus}</td>
                      <td className="px-4 py-3">
                        {row.speedMph != null ? row.speedMph : "--"}
                      </td>
                      <td className="px-4 py-3">{row.lastLocation}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12">
                      <EmptyState
                        icon={<MapPin />}
                        title="No se encontraron resultados"
                        description="No pudimos encontrar ningún elemento que coincida con su búsqueda."
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
