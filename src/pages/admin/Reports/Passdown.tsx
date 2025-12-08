"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  MoreVertical,
  FileText,
  FileSpreadsheet,
  Printer,
  Mail,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";

import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";

export default function Passdown() {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Registros de Entrega" },
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
                className="w-64 pl-9"
                placeholder="Buscar informe"
              />
            </div>

            <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="border-orange-200 text-orange-600">
                  <Filter className="mr-2 h-4 w-4" />
                  Filtros
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[400px] sm:w-[460px] overflow-y-auto">
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

                  <div className="space-y-2 pt-2">
                    <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                      Filtro
                    </Button>
                  </div>
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

        {/* Table Header */}
        <div className="mt-6 grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_auto] items-center gap-4 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
          <Checkbox className="h-4 w-4 border-slate-300" />
          <div>ID</div>
          <div>Fecha/Hora</div>
          <div>Cliente</div>
          <div>Sitio de publicación</div>
          <div>Guardia</div>
          <div className="flex justify-end"><MoreVertical className="h-4 w-4 opacity-0" /></div>
        </div>

        {/* Table / Empty State */}
        <div className="overflow-hidden border-t border-slate-200 bg-white">
          <div className="flex flex-col items-center justify-center text-center py-20">
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

          {/* Pagination Footer */}
          <div className="flex items-center justify-between border-t bg-white px-4 py-3 text-sm text-gray-600">
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
      </section>
    </AppLayout>
  );
}