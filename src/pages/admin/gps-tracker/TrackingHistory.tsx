import { useState } from "react";
import AppLayout from "@/layouts/app-layout";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import {
  Filter,
  MoreVertical,
  CalendarDays,
  FileSpreadsheet,
} from "lucide-react";

import Breadcrumb from "@/components/ui/breadcrumb";

export default function TrackingHistoryPage() {
  const [openFilter, setOpenFilter] = useState(false);

  return (
    <AppLayout>
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Historial de seguimiento" },
        ]}
      />

      <div className="p-4">
        {/* Controles superiores */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-6 flex-wrap">
            {/* Tipo de mapa */}
            <div>
              <p className="text-xs text-gray-500 mb-1">Tipo de Mapa</p>
              <Select defaultValue="satellite">
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Satélite" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="roadmap">Hoja de Ruta</SelectItem>
                  <SelectItem value="satellite">Satélite</SelectItem>
                  <SelectItem value="hybrid">Híbrido</SelectItem>
                  <SelectItem value="terrain">Terreno</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Mostrar geovalla */}
            <label className="flex items-center gap-2 cursor-pointer mt-2 sm:mt-6">
              <Checkbox defaultChecked />
              <span className="text-sm text-gray-700">Mostrar Geovalla</span>
            </label>
          </div>

          {/* Botones: Filtros y menú */}
          <div className="flex items-center gap-2">
            {/* Botón filtros */}
            <Sheet open={openFilter} onOpenChange={setOpenFilter}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="text-orange-600 border-orange-300"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filtros
                </Button>
              </SheetTrigger>

              <SheetContent
                side="right"
                className="w-[380px] sm:w-[420px] overflow-y-auto"
              >
                <SheetHeader>
                  <SheetTitle className="text-lg font-semibold">
                    Filtros
                  </SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                  {/* Cliente */}
                  <div>
                    <label className="text-sm font-medium block mb-2">
                      Cliente*
                    </label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="central (+1 otro)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="central">Central</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sitio publicación */}
                  <div>
                    <label className="text-sm font-medium block mb-2">
                      Sitio de publicación*
                    </label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Catolica (+2 otros)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="catolica">Católica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Guardia */}
                  <div>
                    <label className="text-sm font-medium block mb-2">
                      Guardia*
                    </label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar Guardia" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="jose">José Alejo Pinos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Desde la fecha */}
                  <div>
                    <label className="text-sm font-medium block mb-2">
                      Desde la Fecha
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <Input defaultValue="Nov 17, 2025" />
                        <CalendarDays className="absolute right-2 top-2.5 h-4 w-4 text-gray-500" />
                      </div>

                      <Input defaultValue="00:00" />
                    </div>
                  </div>

                  {/* Hasta la fecha */}
                  <div>
                    <label className="text-sm font-medium block mb-2">
                      Hasta la Fecha
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <Input defaultValue="Nov 17, 2025" />
                        <CalendarDays className="absolute right-2 top-2.5 h-4 w-4 text-gray-500" />
                      </div>

                      <Input defaultValue="23:59" />
                    </div>
                  </div>

                  {/* Checkbox archivados */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox />
                    <span className="text-sm text-gray-700">
                      Mostrar datos archivados
                    </span>
                  </label>

                  {/* Botón Filtro */}
                  <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                    Filtro
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            {/* Menú Exportar */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5 text-gray-700" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Exportar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mapa + panel derecho en un solo contenedor */}
        <div className="mt-4 flex border rounded-lg overflow-hidden h-[400px]">
          {/* Mapa izquierda */}
          <div className="flex-[2] bg-gray-200">
            {/* Aquí va tu Google Maps */}
          </div>

          {/* Panel derecho: Acción / Fecha/Hora */}
          <div className="flex-[1] bg-white border-l flex flex-col">
            {/* Header tipo tabla */}
            <div className="bg-gray-50 border-b px-4 py-3 text-sm font-semibold text-gray-700 flex">
              <span className="flex-1">Acción</span>
              <span className="flex-1">Fecha/Hora</span>
            </div>

            {/* Contenido vacío centrado */}
            <div className="flex-1 flex items-center justify-center px-4">
              <div className="flex flex-col items-center text-center">
                <img
                  src="https://app.guardspro.com/assets/icons/custom/no-data-found.png"
                  className="h-32 mb-3"
                  alt="nodata"
                />
                <h3 className="text-lg font-semibold">
                  No se encontraron resultados
                </h3>
                <p className="text-sm text-gray-500 max-w-xs mt-1">
                  No pudimos encontrar ningún elemento que coincida con su
                  búsqueda
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
