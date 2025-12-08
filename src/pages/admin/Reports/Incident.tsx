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
  Activity,
  Calendar as CalendarIcon,
  Clock,
  Paperclip,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";

export default function Incident() {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isNewReportOpen, setIsNewReportOpen] = useState(false);

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Informe de incidente" },
        ]}
      />

      <section className="p-6">
        {/* Stats Cards */}
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Estadísticas de Informes</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border border-slate-100 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <span className="text-sm font-medium text-fuchsia-500">Informes Pendientes</span>
                <span className="mt-2 text-2xl font-bold text-fuchsia-500">0</span>
              </CardContent>
            </Card>
            <Card className="border border-slate-100 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <span className="text-sm font-medium text-emerald-500">Informes Aprobados</span>
                <span className="mt-2 text-2xl font-bold text-emerald-500">0</span>
              </CardContent>
            </Card>
            <Card className="border border-slate-100 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <span className="text-sm font-medium text-sky-500">Incidentes Abiertos</span>
                <span className="mt-2 text-2xl font-bold text-sky-500">0</span>
              </CardContent>
            </Card>
            <Card className="border border-slate-100 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <span className="text-sm font-medium text-rose-500">Incidentes Cerrados</span>
                <span className="mt-2 text-2xl font-bold text-rose-500">0</span>
              </CardContent>
            </Card>
          </div>
        </div>

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

            <Button variant="outline" size="icon" className="border-orange-200 text-orange-600">
              <Activity className="h-4 w-4" />
            </Button>

            <Sheet open={isNewReportOpen} onOpenChange={setIsNewReportOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="border-orange-200 text-orange-600">
                  Nuevo informe
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[400px] sm:w-[500px] overflow-y-auto">
                <SheetHeader className="mb-6 flex flex-row items-center justify-between border-b pb-4">
                  <SheetTitle>Nuevo informe</SheetTitle>
                </SheetHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Informe*</Label>
                    <Select>
                      <SelectTrigger><SelectValue placeholder="General Incident report" /></SelectTrigger>
                      <SelectContent><SelectItem value="general">General Incident report</SelectItem></SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cliente*</Label>
                      <Select>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent><SelectItem value="1">Cliente 1</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Sitio de publicación*</Label>
                      <Select>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent><SelectItem value="1">Sitio 1</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Guardia*</Label>
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent><SelectItem value="1">Guardia 1</SelectItem></SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Fecha añadida*</Label>
                      <div className="relative">
                        <Input type="date" className="block w-full" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Tiempo Añadido*</Label>
                      <div className="relative">
                        <Input type="time" className="block w-full" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Incidente*</Label>
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent><SelectItem value="type1">Tipo 1</SelectItem></SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Details</Label>
                    <Textarea className="min-h-[100px]" />
                  </div>

                  <div className="space-y-2">
                    <Label>Adjunto</Label>
                    <div className="flex items-center rounded-md border px-3 py-2">
                      <Input type="text" placeholder="" className="border-0 p-0 focus-visible:ring-0" readOnly />
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                      AÑADIR
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

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
                    <Label>Informe</Label>
                    <Select>
                      <SelectTrigger className="w-full"><SelectValue placeholder="General Incident report" /></SelectTrigger>
                      <SelectContent><SelectItem value="general">General Incident report</SelectItem></SelectContent>
                    </Select>
                  </div>

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

                  <div className="space-y-2">
                    <Label>Estado del informe</Label>
                    <Select>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Todo" /></SelectTrigger>
                      <SelectContent><SelectItem value="all">Todo</SelectItem></SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Estado del incidente</Label>
                    <Select>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Todo" /></SelectTrigger>
                      <SelectContent><SelectItem value="all">Todo</SelectItem></SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Nivel de Gravedad</Label>
                    <Select>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Todo" /></SelectTrigger>
                      <SelectContent><SelectItem value="all">Todo</SelectItem></SelectContent>
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
                    <Button variant="outline" className="w-full bg-orange-500 hover:bg-orange-600 text-white border-none">
                      Guardar Filtro
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
        <div className="mt-6 grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr_1fr] items-center gap-4 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
          <Checkbox className="h-4 w-4 border-slate-300" />
          <div>ID</div>
          <div>Cliente</div>
          <div>Sitio de publicación</div>
          <div>Guardia</div>
          <div>Informe</div>
          <div>Fecha/Hora</div>
          <div>Tipo de Incidente</div>
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