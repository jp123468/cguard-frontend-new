import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  EllipsisVertical,
  Filter as FilterIcon,
  FileDown,
  FileSpreadsheet,
  Printer,
  Mail,
  Search,
} from "lucide-react";

// Validaciones (zod) y tipos
import {
  dispatcherFiltersSchema,
  type DispatcherFilters,
  defaultDispatcherFilters,
  toDateTimeRange,
} from "@/lib/validators/dispatcher-filters";

export default function DispatcherPage() {
  const [openFilter, setOpenFilter] = useState(false);

  // Estado local de filtros (validado con zod al aplicar)
  const [filters, setFilters] = useState<DispatcherFilters>(
    defaultDispatcherFilters
  );

  // Tabla: sin datos por defecto
  const rows: Array<never> = [];

  // Rango de fecha/hora ya combinado (si aplica)
  const builtRange = useMemo(() => toDateTimeRange(filters), [filters]);

  const aplicarFiltros = () => {
    // Valida con zod y actualiza (muestra errores en consola si los hay)
    const parse = dispatcherFiltersSchema.safeParse(filters);
    if (!parse.success) {
      console.error("Errores de validación:", parse.error.flatten());
      return;
    }
    // Aquí disparas tu fetch con "parse.data" o con "builtRange"
    console.log("Aplicando filtros:", parse.data);
    console.log("Rango construido:", builtRange);
    setOpenFilter(false);
  };

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Lista de Despachos" },
        ]}
      />

      <section className="p-6">
        {/* Acciones superiores */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Acción (izquierda) */}
          <div className="flex items-center gap-2">
            <Select onValueChange={(v) => console.log("Acción:", v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Acción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eliminar">Eliminar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Derecha: buscador, nuevo, filtros, menú */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="w-72 pl-9"
                placeholder="Buscar despacho"
                onChange={(e) => console.log("buscar:", e.target.value)}
              />
            </div>

            <Button
              className="bg-orange-500 text-white hover:bg-orange-600"
              asChild
            >
              <Link to="/dispatch-tickets/new">Nuevo Despacho</Link>
            </Button>

            {/* Filtros */}
            <Sheet open={openFilter} onOpenChange={setOpenFilter}>
              <SheetTrigger asChild>
                <Button variant="outline" className="border-orange-200 text-orange-600">
                  <FilterIcon className="mr-2 h-4 w-4" />
                  Filtros
                </Button>
              </SheetTrigger>

              <SheetContent side="right" className="w-[400px] sm:w-[460px]">
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-5">
                  {/* Cliente */}
                  <div className="space-y-2">
                    <Label>
                      Cliente <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={filters.clientId ?? ""}
                      onValueChange={(v) =>
                        setFilters((s) => ({ ...s, clientId: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Usa IDs reales; no valores vacíos */}
                        <SelectItem value="cli-1">Cliente A</SelectItem>
                        <SelectItem value="cli-2">Cliente B</SelectItem>
                        <SelectItem value="cli-3">Cliente C</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sitio de publicación */}
                  <div className="space-y-2">
                    <Label>
                      Sitio de publicación <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={filters.siteId ?? ""}
                      onValueChange={(v) =>
                        setFilters((s) => ({ ...s, siteId: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar sitio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="site-1">Sede Norte</SelectItem>
                        <SelectItem value="site-2">Sede Centro</SelectItem>
                        <SelectItem value="site-3">Sede Sur</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Estado */}
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select
                      value={filters.status}
                      onValueChange={(v) =>
                        setFilters((s) => ({
                          ...s,
                          status: v as DispatcherFilters["status"],
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">Todo</SelectItem>
                        <SelectItem value="abierto">Abierto</SelectItem>
                        <SelectItem value="en_proceso">En proceso</SelectItem>
                        <SelectItem value="cerrado">Cerrado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Rango de fechas y horas */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Desde la Fecha</Label>
                      <Input
                        type="date"
                        value={filters.fromDate ?? ""}
                        onChange={(e) =>
                          setFilters((s) => ({ ...s, fromDate: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Hora</Label>
                      <Input
                        type="time"
                        value={filters.fromTime ?? ""}
                        onChange={(e) =>
                          setFilters((s) => ({ ...s, fromTime: e.target.value }))
                        }
                        placeholder="00:00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Hasta la Fecha</Label>
                      <Input
                        type="date"
                        value={filters.toDate ?? ""}
                        onChange={(e) =>
                          setFilters((s) => ({ ...s, toDate: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Hora</Label>
                      <Input
                        type="time"
                        value={filters.toTime ?? ""}
                        onChange={(e) =>
                          setFilters((s) => ({ ...s, toTime: e.target.value }))
                        }
                        placeholder="23:59"
                      />
                    </div>
                  </div>

                  {/* Archivados */}
                  <div className="flex items-center gap-2 pt-1">
                    <Checkbox
                      id="archived"
                      checked={filters.includeArchived}
                      onCheckedChange={(v) =>
                        setFilters((s) => ({
                          ...s,
                          includeArchived: Boolean(v),
                        }))
                      }
                    />
                    <Label htmlFor="archived" className="cursor-pointer">
                      Mostrar datos archivados
                    </Label>
                  </div>

                  {/* Botón aplicar */}
                  <Button
                    className="w-full bg-orange-500 text-white hover:bg-orange-600"
                    onClick={aplicarFiltros}
                  >
                    Filtro
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            {/* Menú superior (exportar / imprimir / enviar) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Más acciones">
                  <EllipsisVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuItem onClick={() => console.log("Exportar PDF")}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Exportar como PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => console.log("Exportar Excel")}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Exportar como Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => console.log("Enviar por correo")}>
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar Informe por Correo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tabla */}
        <div className="mt-4 overflow-hidden rounded-lg border">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-gray-50">
              <tr className="border-b">
                <th className="px-4 py-3">
                  <Checkbox />
                </th>
                <th className="px-4 py-3 font-semibold">ID de Ticket</th>
                <th className="px-4 py-3 font-semibold">Fecha/Hora</th>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Sitio de publicación</th>
                <th className="px-4 py-3 font-semibold">Tipo de Llamador</th>
                <th className="px-4 py-3 font-semibold">Tipo de Incidente</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-20">
                    <div className="flex flex-col items-center justify-center text-center">
                      <img
                        src="https://app.guardspro.com/assets/icons/custom/no-data-found.png"
                        alt="Sin datos"
                        className="mb-4 h-36"
                      />
                      <h3 className="text-lg font-semibold">
                        No se encontraron resultados
                      </h3>
                      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                        No pudimos encontrar ningún elemento que coincida con su
                        búsqueda
                      </p>
                    </div>
                  </td>
                </tr>
              )}
              {/* Aquí mapear filas cuando haya datos */}
            </tbody>
          </table>

          {/* Footer de tabla */}
          <div className="flex items-center justify-between bg-gray-50 px-4 py-3 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span>Elementos por página</span>
              <Select defaultValue="25" onValueChange={(v) => console.log("pp:", v)}>
                <SelectTrigger className="h-8 w-20">
                  <SelectValue placeholder="25" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>0 of 0</div>
          </div>
        </div>
      </section>
    </AppLayout>
  );
}
