"use client";

import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Filter,
  MoreVertical,
  FileText,
  FileSpreadsheet,
  Printer,
  Mail,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";

import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";

export default function CheckInOut() {
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Informe de registro de entrada/salida" },
        ]}
      />

      <section className="p-6">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Select>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Acción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="delete">Eliminar</SelectItem>
                <SelectItem value="archive">Archivar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="w-72 pl-9"
                placeholder="Buscar informe"
              />
            </div>

            <Button
              className="bg-orange-500 text-white hover:bg-orange-600"
              onClick={() => setIsNewEntryOpen(true)}
            >
              Nueva entrada
            </Button>

            <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="border-orange-200 text-orange-600">
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
                    <Label>Cliente *</Label>
                    <Select>
                      <SelectTrigger className="w-full"><SelectValue placeholder="central (+1 otro)" /></SelectTrigger>
                      <SelectContent><SelectItem value="1">central</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Sitio de publicación *</Label>
                    <Select>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Catolica (+2 otros)" /></SelectTrigger>
                      <SelectContent><SelectItem value="1">Catolica</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Guardia *</Label>
                    <Select>
                      <SelectTrigger className="w-full"><SelectValue placeholder="José Alejo Pinos" /></SelectTrigger>
                      <SelectContent><SelectItem value="1">José Alejo Pinos</SelectItem></SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Desde la Fecha</Label>
                      <div className="relative">
                        <Input value="Nov 17, 2025" readOnly className="pr-8" />
                        <CalendarIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Hora*</Label>
                      <Input value="00:00" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Hasta la Fecha</Label>
                      <div className="relative">
                        <Input value="Nov 23, 2025" readOnly className="pr-8" />
                        <CalendarIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Hora*</Label>
                      <Input value="23:59" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Checkbox id="archived" />
                    <Label htmlFor="archived" className="text-sm font-normal text-slate-600">Mostrar datos archivados</Label>
                  </div>

                  <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                    Filtro
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem className="gap-2">
                  <FileText className="h-4 w-4 text-slate-500" /> Exportar como PDF
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-slate-500" /> Exportar como Excel
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2">
                  <Printer className="h-4 w-4 text-slate-500" /> Imprimir
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2">
                  <Mail className="h-4 w-4 text-slate-500" /> Enviar Informe por Correo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Table */}
        <div className="mt-4 overflow-hidden rounded-lg border">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-gray-50">
              <tr className="border-b">
                <th className="px-4 py-3">
                  <Checkbox />
                </th>
                <th className="px-4 py-3 font-semibold text-slate-700">Cliente</th>
                <th className="px-4 py-3 font-semibold text-slate-700">
                  <div className="flex items-center gap-1 cursor-pointer">
                    Sitio de publicación <span className="text-xs">↑</span>
                  </div>
                </th>
                <th className="px-4 py-3 font-semibold text-slate-700">Guardia</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Registrado</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Dado de salida</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Duración</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {/* Empty State */}
              <tr>
                <td colSpan={8} className="py-20">
                  <div className="flex flex-col items-center justify-center text-center">
                    <img
                      src="https://app.guardspro.com/assets/icons/custom/no-data-found.png"
                      alt="Sin datos"
                      className="mb-4 h-36"
                    />
                    <h3 className="text-lg font-semibold text-slate-700">No se encontraron resultados</h3>
                    <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                      No pudimos encontrar ningún elemento que coincida con su búsqueda
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between bg-gray-50 px-4 py-3 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span>Elementos por página</span>
              <Select defaultValue="25">
                <SelectTrigger className="h-8 w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <span>0 of 0</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" disabled className="h-8 w-8"><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" disabled className="h-8 w-8"><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        </div>

        {/* New Entry Modal */}
        <Dialog open={isNewEntryOpen} onOpenChange={setIsNewEntryOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
            <DialogHeader className="px-6 py-4 border-b flex flex-row items-center justify-between">
              <DialogTitle className="text-base font-normal text-slate-700">Añadir informe</DialogTitle>
              {/* Close button is automatic */}
            </DialogHeader>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-slate-500">Cliente*</Label>
                  <Select>
                    <SelectTrigger className="w-full"><SelectValue placeholder="" /></SelectTrigger>
                    <SelectContent><SelectItem value="1">Cliente 1</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-500">Sitio de publicación*</Label>
                  <Select>
                    <SelectTrigger className="w-full"><SelectValue placeholder="" /></SelectTrigger>
                    <SelectContent><SelectItem value="1">Sitio 1</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-500">Guardia*</Label>
                <Select>
                  <SelectTrigger className="w-full"><SelectValue placeholder="" /></SelectTrigger>
                  <SelectContent><SelectItem value="1">Guardia 1</SelectItem></SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <Label className="text-slate-500">Registrarse*</Label>
                    <div className="relative">
                      <Input className="pr-10" />
                      <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                  <div className="w-1/3 space-y-2">
                    <Label className="text-slate-500">En*</Label>
                    <div className="relative">
                      <Input className="pr-10" />
                      <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <Label className="text-slate-500">Salir</Label>
                    <div className="relative">
                      <Input className="pr-10" />
                      <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                  <div className="w-1/3 space-y-2">
                    <Label className="text-slate-500">En</Label>
                    <div className="relative">
                      <Input className="pr-10" />
                      <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Latitud de registro</Label>
                  <Input defaultValue="0.0" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Longitud de registro</Label>
                  <Input defaultValue="0.0" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Latitud de salida</Label>
                  <Input defaultValue="0.0" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Longitud de salida</Label>
                  <Input defaultValue="0.0" />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-slate-600 font-medium">Haga clic en el mapa para obtener Latitud y Longitud</Label>
                <div className="flex gap-4">
                  <Input placeholder="Dirección" className="flex-1" />
                  <Button variant="outline" className="text-orange-500 border-orange-200">Ubicación en el Mapa</Button>
                </div>

                {/* Map Placeholder */}
                <div className="w-full h-64 bg-slate-100 rounded border border-slate-200 relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                    <MapPin className="h-8 w-8 mb-2" />
                    <span className="sr-only">Mapa</span>
                  </div>
                  {/* Mocking the map controls seen in image */}
                  <div className="absolute top-4 left-4 bg-white rounded shadow p-1 flex">
                    <button className="px-3 py-1 text-sm font-medium bg-white shadow-sm rounded">Mapa</button>
                    <button className="px-3 py-1 text-sm font-medium text-slate-500">Satélite</button>
                  </div>
                  <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <button className="bg-white p-2 rounded shadow text-slate-600"><div className="w-4 h-4 border-2 border-slate-400" /></button>
                    <button className="bg-white p-2 rounded shadow text-slate-600"><div className="w-4 h-4 rounded-full border-2 border-slate-400" /></button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="w-48">
                    <Label className="text-xs text-slate-400 mb-1 block">Ubicación</Label>
                    <Select defaultValue="register">
                      <SelectTrigger><SelectValue placeholder="Registrarse" /></SelectTrigger>
                      <SelectContent><SelectItem value="register">Registrarse</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="geofence" checked />
                    <Label htmlFor="geofence" className="text-slate-600">Mostrar Geovalla</Label>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t">
              <Button className="bg-orange-500 hover:bg-orange-600 text-white">GUARDAR</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </AppLayout>
  );
}