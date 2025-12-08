import { useState, useMemo, useCallback, useEffect } from "react";
import AppLayout from "@/layouts/app-layout";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import {
  Search,
  Filter,
  MoreVertical,
  FileDown,
  FileSpreadsheet,
  Printer,
  Mail,
  TrendingUp,
  CalendarDays,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  ChevronsUpDown,
} from "lucide-react";

import Breadcrumb from "@/components/ui/breadcrumb";

type TimeRecordType = "Turno" | "Descanso";

interface TimeRecord {
  id: string;
  guard: string;
  client: string;
  site: string;
  type: TimeRecordType;
  clockIn: string;
  clockOut: string;
  duration: string;
}

export default function TimeRecorder() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  const [showStats, setShowStats] = useState(true);
  const [openNewEntry, setOpenNewEntry] = useState(false);
  const [openFilter, setOpenFilter] = useState(false);

  // Estado principal SIN datos de prueba
  const [records, setRecords] = useState<TimeRecord[]>([]);

  useEffect(() => {
    // Aquí podrás cargar tus datos reales:
    // fetch("/api/time-records").then(r => r.json()).then(data => setRecords(data));
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  const filteredRecords = useMemo(() => {
    if (!searchQuery) return records;
    const q = searchQuery.toLowerCase();
    return records.filter(
      (r) =>
        r.guard.toLowerCase().includes(q) ||
        r.client.toLowerCase().includes(q) ||
        r.site.toLowerCase().includes(q)
    );
  }, [records, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage, itemsPerPage]);

  // selección
  const handleSelectRecord = useCallback((id: string, checked: boolean) => {
    setSelectedRecords((prev) =>
      checked ? [...prev, id] : prev.filter((v) => v !== id)
    );
  }, []);

  const allOnPageSelected =
    paginatedRecords.length > 0 &&
    paginatedRecords.every((r) => selectedRecords.includes(r.id));

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      setSelectedRecords((prev) => {
        const idsOnPage = paginatedRecords.map((r) => r.id);
        if (checked) {
          return Array.from(new Set([...prev, ...idsOnPage]));
        }
        return prev.filter((id) => !idsOnPage.includes(id));
      });
    },
    [paginatedRecords]
  );

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Registro de tiempo" },
        ]}
      />

      <div className="p-4 space-y-4">
        {/* Estadísticas (toggleable) */}
        {showStats && (
          <section className="border rounded-2xl bg-white px-6 py-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              Estadísticas de Registros de Tiempo
            </h2>

            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              <div className="border rounded-2xl px-4 py-3 flex flex-col justify-between">
                <p className="text-sm font-medium text-pink-500">
                  Horas de Turno Pendientes
                </p>
                <p className="mt-3 text-2xl font-bold text-pink-500">0</p>
              </div>

              <div className="border rounded-2xl px-4 py-3 flex flex-col justify-between">
                <p className="text-sm font-medium text-emerald-500">
                  Horas de Turno Aprobadas
                </p>
                <p className="mt-3 text-2xl font-bold text-emerald-500">0</p>
              </div>

              <div className="border rounded-2xl px-4 py-3 flex flex-col justify-between">
                <p className="text-sm font-medium text-gray-500">
                  Total de Horas de Turno
                </p>
                <p className="mt-3 text-2xl font-bold text-gray-500">0</p>
              </div>

              <div className="border rounded-2xl px-4 py-3 flex flex-col justify-between">
                <p className="text-sm font-medium text-sky-500">
                  Horas de Descanso Pendientes
                </p>
                <p className="mt-3 text-2xl font-bold text-sky-500">0</p>
              </div>

              <div className="border rounded-2xl px-4 py-3 flex flex-col justify-between">
                <p className="text-sm font-medium text-red-400">
                  Horas de Descanso Aprobadas
                </p>
                <p className="mt-3 text-2xl font-bold text-red-400">0</p>
              </div>

              <div className="border rounded-2xl px-4 py-3 flex flex-col justify-between">
                <p className="text-sm font-medium text-sky-500">
                  Total de Horas de Descanso
                </p>
                <p className="mt-3 text-2xl font-bold text-sky-500">0</p>
              </div>
            </div>
          </section>
        )}

        {/* Controles superiores */}
        <section className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Select>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Acción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aprobar">Aprobar</SelectItem>
                <SelectItem value="rechazar">Rechazar</SelectItem>
                <SelectItem value="eliminar">Eliminar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Buscador */}
            <div className="relative w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar registro de tiempo"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Mostrar información (toggle stats) */}
            <Button
              variant="outline"
              className="border-orange-200 text-orange-600"
              onClick={() => setShowStats((prev) => !prev)}
              title={showStats ? "Ocultar información" : "Mostrar información"}
            >
              <TrendingUp className="h-4 w-4" />
            </Button>

            {/* Nueva entrada */}
            <Sheet open={openNewEntry} onOpenChange={setOpenNewEntry}>
              <SheetTrigger asChild>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                  Nueva entrada
                </Button>
              </SheetTrigger>

              <SheetContent
                side="right"
                className="w-[420px] sm:w-[460px] overflow-y-auto"
              >
                <SheetHeader className="mb-4">
                  <SheetTitle>Nuevo registro de tiempo</SheetTitle>
                </SheetHeader>

                <div className="space-y-5">
                  {/* Cliente / Sitio / Guardia */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Cliente*</p>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="central">central (+1 otro)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">
                        Sitio de publicación*
                      </p>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Sitio de publicación" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="catolica">
                            Catolica (+2 otros)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">Guardia*</p>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Guardia" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="jose">José Alejo Pinos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Tipo */}
                  <div>
                    <p className="text-sm font-medium mb-2">Tipo*</p>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="turno">Turno</SelectItem>
                        <SelectItem value="descanso">Descanso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Entrada */}
                  <div>
                    <p className="text-sm font-medium mb-2">Entrada*</p>
                    <div className="grid grid-cols-[1.6fr,0.9fr] gap-3">
                      <div className="relative">
                        <Input placeholder="Fecha" />
                        <CalendarDays className="absolute right-2 top-2.5 h-4 w-4 text-gray-500" />
                      </div>
                      <div className="relative">
                        <Input placeholder="En*" />
                        <Clock className="absolute right-2 top-2.5 h-4 w-4 text-gray-500" />
                      </div>
                    </div>
                  </div>

                  {/* Salida */}
                  <div>
                    <p className="text-sm font-medium mb-2">Salida</p>
                    <div className="grid grid-cols-[1.6fr,0.9fr] gap-3">
                      <div className="relative">
                        <Input placeholder="Fecha" />
                        <CalendarDays className="absolute right-2 top-2.5 h-4 w-4 text-gray-500" />
                      </div>
                      <div className="relative">
                        <Input placeholder="En" />
                        <Clock className="absolute right-2 top-2.5 h-4 w-4 text-gray-500" />
                      </div>
                    </div>
                  </div>

                  {/* Notas */}
                  <div>
                    <p className="text-sm font-medium mb-2">Notas de entrada</p>
                    <Textarea rows={3} />
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Notas de salida</p>
                    <Textarea rows={3} />
                  </div>

                  {/* Botón + */}
                  <div className="pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-dashed w-16 justify-center"
                    >
                      <Plus className="h-4 w-4 text-orange-500" />
                    </Button>
                  </div>

                  {/* Botón Añadir */}
                  <div className="pt-2 pb-4 flex justify-end">
                    <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                      AÑADIR
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Filtros */}
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
                className="w-[400px] sm:w-[440px] overflow-y-auto"
              >
                <Tabs defaultValue="filters" className="mt-2">
                  <TabsList className="w-full justify-start border-b rounded-none bg-transparent px-0 pb-0">
                    <TabsTrigger
                      value="filters"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 px-0 mr-6 pb-2"
                    >
                      Filtros
                    </TabsTrigger>
                    <TabsTrigger
                      value="saved"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 px-0 pb-2"
                    >
                      Filtros Guardados
                    </TabsTrigger>
                  </TabsList>

                  {/* TAB FILTROS */}
                  <TabsContent value="filters" className="pt-4">
                    <div className="space-y-5">
                      <div>
                        <p className="text-sm font-medium mb-2">Cliente*</p>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="central (+1 otro)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="central">central (+1 otro)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">
                          Sitio de publicación*
                        </p>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Catolica (+2 otros)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="catolica">
                              Catolica (+2 otros)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">Guardia*</p>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="José Alejo Pinos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="jose">José Alejo Pinos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">
                          Conjunto de Habilidades
                        </p>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Conjunto de Habilidades" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">Departamento</p>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Departamento" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">Tipo de entrada</p>
                        <Select defaultValue="both">
                          <SelectTrigger>
                            <SelectValue placeholder="Tipo de entrada" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="both">Ambos</SelectItem>
                            <SelectItem value="turno">Turno</SelectItem>
                            <SelectItem value="descanso">Descanso</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Desde la fecha */}
                      <div>
                        <p className="text-sm font-medium mb-2">Desde la Fecha</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="relative">
                            <Input defaultValue="Nov 11, 2025" />
                            <CalendarDays className="absolute right-2 top-2.5 h-4 w-4 text-gray-500" />
                          </div>
                          <Input defaultValue="00:00" />
                        </div>
                      </div>

                      {/* Hasta la fecha */}
                      <div>
                        <p className="text-sm font-medium mb-2">Hasta la Fecha</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="relative">
                            <Input defaultValue="Nov 17, 2025" />
                            <CalendarDays className="absolute right-2 top-2.5 h-4 w-4 text-gray-500" />
                          </div>
                          <Input defaultValue="23:59" />
                        </div>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox />
                        <span className="text-sm text-gray-700">
                          Mostrar datos archivados
                        </span>
                      </label>

                      <div className="space-y-3 pt-2 pb-5">
                        <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                          Filtro
                        </Button>
                        <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                          Guardar Filtro
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  {/* TAB FILTROS GUARDADOS */}
                  <TabsContent value="saved" className="pt-4">
                    <p className="text-sm text-gray-500">
                      Aún no tienes filtros guardados.
                    </p>
                  </TabsContent>
                </Tabs>
              </SheetContent>
            </Sheet>

            {/* Menú exportación */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5 text-gray-700" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem onClick={() => console.log("PDF")}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Exportar como PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => console.log("Excel")}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Exportar como Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => console.log("Print")}>
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => console.log("Mail")}>
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar Informe por Correo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </section>

        {/* Tabla + estado vacío */}
        <section className="border rounded-lg overflow-hidden bg-white">
          <table className="min-w-full text-sm text-left border-collapse">
            <thead className="bg-gray-50 text-gray-600">
              <tr className="border-b">
                <th className="px-4 py-3">
                  <Checkbox
                    checked={allOnPageSelected}
                    onCheckedChange={(v) => handleSelectAll(Boolean(v))}
                    aria-label="Seleccionar todos los registros"
                  />
                </th>
                <th className="px-4 py-3 font-semibold">Guardia</th>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Sitio de publicación</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold">Fichado</th>
                <th className="px-4 py-3 font-semibold">Desfichado</th>
                <th className="px-4 py-3 font-semibold flex items-center gap-1">
                  Duración
                  <ChevronsUpDown className="h-4 w-4 text-gray-400" />
                </th>
              </tr>
            </thead>

            <tbody>
              {paginatedRecords.length > 0 ? (
                paginatedRecords.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedRecords.includes(r.id)}
                        onCheckedChange={(v) =>
                          handleSelectRecord(r.id, Boolean(v))
                        }
                      />
                    </td>
                    <td className="px-4 py-3">{r.guard}</td>
                    <td className="px-4 py-3">{r.client}</td>
                    <td className="px-4 py-3">{r.site}</td>
                    <td className="px-4 py-3">{r.type}</td>
                    <td className="px-4 py-3">{r.clockIn}</td>
                    <td className="px-4 py-3">{r.clockOut}</td>
                    <td className="px-4 py-3">{r.duration}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-20">
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
                        No pudimos encontrar ningún elemento que coincidiera con
                        su búsqueda
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Paginación */}
          <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-600 bg-gray-50">
            <div className="flex items-center gap-2">
              <span>Elementos por página</span>
              <Select
                value={String(itemsPerPage)}
                onValueChange={(v) => setItemsPerPage(Number(v))}
              >
                <SelectTrigger className="h-8 w-20">
                  <SelectValue placeholder={itemsPerPage.toString()} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span>
                {filteredRecords.length > 0
                  ? `${(currentPage - 1) * itemsPerPage + 1} - ${Math.min(
                      currentPage * itemsPerPage,
                      filteredRecords.length
                    )} de ${filteredRecords.length}`
                  : "0 of 0"}
              </span>
              <div className="flex items-center">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-r-none"
                  disabled={currentPage === 1}
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-l-none border-l-0"
                  disabled={currentPage >= totalPages}
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
