import { useState, useEffect } from "react";
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
import { Filter } from "lucide-react";
import Breadcrumb from "@/components/ui/breadcrumb";

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

  // Sin datos de prueba, igual que en SecurityGuardsPage
  const [rows, setRows] = useState<LiveTrackingRow[]>([]);

  useEffect(() => {
    // Aquí puedes cargar datos reales:
    // fetch("/api/live-tracking")
    //   .then(r => r.json())
    //   .then(data => setRows(data));
  }, []);

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Seguimiento en vivo" },
        ]}
      />

      <div className="p-4">
        <section>
          {/* Barra superior */}
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-4">
              {/* Tipo de mapa */}
              <div>
                <p className="text-xs text-gray-500 mb-1">Tipo de Mapa</p>
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
              <label className="flex items-center gap-2 cursor-pointer mt-2 sm:mt-5">
                <Checkbox
                  checked={showGeofence}
                  onCheckedChange={(v) => setShowGeofence(Boolean(v))}
                />
                <span className="text-sm text-gray-700">Mostrar Geovalla</span>
              </label>
            </div>

            {/* Botón Filtros (Sheet lateral) */}
            <Sheet open={openFilter} onOpenChange={setOpenFilter}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="text-orange-600 border-orange-200"
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
                    <Label>Sitio de publicación*</Label>
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
                    <Label>Guardia*</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar guardia" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="jose">José Alejo Pinos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox />
                    <span className="text-sm text-gray-700">
                      Mostrar datos archivados
                    </span>
                  </label>

                  <Button
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
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
          </div>

          {/* Contenedor del mapa + tabla */}
          <div className="mt-4 border rounded-lg overflow-hidden">
            {/* Mapa */}
            <div className="w-full h-[380px] bg-gray-100">
              {/* Aquí va tu componente de Google Maps */}
            </div>

            {/* Tabla debajo del mapa */}
            <table className="min-w-full text-sm text-left border-collapse">
              <thead className="bg-gray-50">
                <tr className="border-b">
                  <th className="px-4 py-3 font-semibold">Guardia</th>
                  <th className="px-4 py-3 font-semibold">
                    Sitio de publicación
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
                    <tr key={row.id} className="border-b hover:bg-gray-50">
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
                    <td colSpan={6} className="py-20">
                      <div className="flex flex-col items-center justify-center text-center">
                        <img
                          src="https://app.guardspro.com/assets/icons/custom/no-data-found.png"
                          alt="Sin datos"
                          className="h-36 mb-4"
                        />
                        <h3 className="text-lg font-semibold">
                          No se encontraron resultados
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                          No pudimos encontrar ningún elemento que coincida con
                          su búsqueda
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
