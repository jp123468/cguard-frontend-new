import { useState } from "react";
import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Filter,
  FileDown,
  FileSpreadsheet,
  ArrowDownUp,
  Search,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function PostSitePage() {
  const [openFilter, setOpenFilter] = useState(false);
  const rows: Array<never> = [];

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Sitios de publicación" },
        ]}
      />

      <section className="p-4">
        {/* Acciones superiores */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Select>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Acción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="activar">Activar</SelectItem>
                <SelectItem value="inactivar">Inactivar</SelectItem>
                <SelectItem value="eliminar">Eliminar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar Sitios de Publicación"
                className="pl-9 w-64"
                onChange={(e) => console.log("buscar:", e.target.value)}
              />
            </div>

            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => console.log("Nuevo sitio de publicación")}
            >
              <Link to="/post-sites/new">Nuevo Sitio de Publicación</Link>
            </Button>

            {/* Filtros */}
            <Sheet open={openFilter} onOpenChange={setOpenFilter}>
              <SheetTrigger asChild>
                <Button variant="outline" className="text-orange-600 border-orange-200">
                  <Filter className="mr-2 h-4 w-4" />
                  Filtros
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[400px] sm:w-[460px]">
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Categorías</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Categorías" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Estado*</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los sitios de publicación" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos los sitios de publicación</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={() => {
                      console.log("Aplicar filtros");
                      setOpenFilter(false);
                    }}
                  >
                    Filtro
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            {/* Menú superior (exportar/importar) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <EllipsisVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => console.log("Exportar PDF")}>
                  <FileDown className="mr-2 h-4 w-4" /> Exportar como PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => console.log("Exportar Excel")}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar como Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => console.log("Importar")}>
                  <ArrowDownUp className="mr-2 h-4 w-4" /> Importar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tabla */}
        <div className="mt-4 border rounded-lg overflow-hidden">
          <table className="min-w-full text-sm text-left border-collapse">
            <thead className="bg-gray-50">
              <tr className="border-b">
                <th className="px-4 py-3">
                  <Checkbox />
                </th>
                <th className="px-4 py-3 font-semibold">Sitio de publicación</th>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Correo Electrónico</th>
                <th className="px-4 py-3 font-semibold">Número de Teléfono</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {/* sin filas por defecto */}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-20">
                    <div className="flex flex-col items-center justify-center text-center">
                      <img
                        src="https://app.guardspro.com/assets/icons/custom/no-data-found.png"
                        alt="Sin datos"
                        className="h-36 mb-4"
                      />
                      <h3 className="text-lg font-semibold">No se encontraron resultados</h3>
                      <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                        No pudimos encontrar ningún elemento que coincida con su búsqueda
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Footer de tabla */}
          <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-600 bg-gray-50">
            <div className="flex items-center gap-2">
              <span>Elementos por página</span>
              <Select>
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
            <div>0 – 0 de 0</div>
          </div>
        </div>

        {/* Paginación */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Elementos por página
            <Select defaultValue="25">
              <SelectTrigger className="ml-2 h-8 w-16">
                <SelectValue placeholder="25" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            0 - 0 de 0
          </div>
        </div>
      </section>
    </AppLayout>
  );
}
