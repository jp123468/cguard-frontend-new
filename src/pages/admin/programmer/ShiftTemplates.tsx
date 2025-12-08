import { useState } from "react";
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
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Filter, EllipsisVertical, X, Edit, Trash2, Tag, Upload } from "lucide-react";
import Breadcrumb from "@/components/ui/breadcrumb";

interface ShiftTemplate {
  id: string;
  templateName: string;
  startTime: string;
  endTime: string;
  postSite: string;
  guard: string;
}

export default function ShiftTemplates() {
  const [templates, setTemplates] = useState<ShiftTemplate[]>([
    {
      id: "1",
      templateName: "Evening Shift",
      startTime: "15:00",
      endTime: "00:00",
      postSite: "",
      guard: "",
    },
    {
      id: "2",
      templateName: "Morning Shift",
      startTime: "08:00",
      endTime: "17:00",
      postSite: "",
      guard: "",
    },
    {
      id: "3",
      templateName: "Night Shift",
      startTime: "23:00",
      endTime: "08:00",
      postSite: "",
      guard: "",
    },
  ]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isNewTemplateOpen, setIsNewTemplateOpen] = useState(false);

  // New Template Form State
  const [newTemplate, setNewTemplate] = useState({
    shiftTitle: "",
    startTime: "",
    endTime: "",
    repeatShift: "",
    repeatBy: "",
    postSite: "",
    skillSet: "",
    department: "",
    guard: "",
    breaks: "",
    note: "",
    category: "",
  });

  // Filter State
  const [filters, setFilters] = useState({
    categories: "",
  });

  const handleSaveTemplate = () => {
    // Add validation and save logic here
    console.log("Saving template:", newTemplate);
    setIsNewTemplateOpen(false);
    // Reset form
    setNewTemplate({
      shiftTitle: "",
      startTime: "",
      endTime: "",
      repeatShift: "",
      repeatBy: "",
      postSite: "",
      skillSet: "",
      department: "",
      guard: "",
      breaks: "",
      note: "",
      category: "",
    });
  };

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Plantillas de turno" },
        ]}
      />
      <div className="p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="w-full md:w-48">
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Acción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="delete">Eliminar</SelectItem>
                <SelectItem value="categorize">Categorizar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-center">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar Plantilla de Turno"
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Sheet open={isNewTemplateOpen} onOpenChange={setIsNewTemplateOpen}>
                <SheetTrigger asChild>
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                    Nueva Plantilla de Turno
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                  <SheetHeader className="relative">
                    <SheetTitle>Nueva Plantilla de Turno</SheetTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0"
                      onClick={() => setIsNewTemplateOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </SheetHeader>
                  <div className="space-y-6 py-4">
                    <div className="grid gap-2">
                      <Label>Título del Turno*</Label>
                      <Input
                        value={newTemplate.shiftTitle}
                        onChange={(e) => setNewTemplate({ ...newTemplate, shiftTitle: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Hora de Inicio*</Label>
                        <Input
                          type="time"
                          value={newTemplate.startTime}
                          onChange={(e) => setNewTemplate({ ...newTemplate, startTime: e.target.value })}
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label>Hora de Fin*</Label>
                        <Input
                          type="time"
                          value={newTemplate.endTime}
                          onChange={(e) => setNewTemplate({ ...newTemplate, endTime: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Repetir Turno</Label>
                        <Select value={newTemplate.repeatShift} onValueChange={(v) => setNewTemplate({ ...newTemplate, repeatShift: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Diario</SelectItem>
                            <SelectItem value="weekly">Semanal</SelectItem>
                            <SelectItem value="monthly">Mensual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label>Repetir Por</Label>
                        <Select value={newTemplate.repeatBy} onValueChange={(v) => setNewTemplate({ ...newTemplate, repeatBy: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="day">Día</SelectItem>
                            <SelectItem value="week">Semana</SelectItem>
                            <SelectItem value="month">Mes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label>Sitio de publicación</Label>
                      <Select value={newTemplate.postSite} onValueChange={(v) => setNewTemplate({ ...newTemplate, postSite: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="catolica">Catolica</SelectItem>
                          <SelectItem value="central">Central</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Conjunto de Habilidades</Label>
                      <Select value={newTemplate.skillSet} onValueChange={(v) => setNewTemplate({ ...newTemplate, skillSet: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">Básico</SelectItem>
                          <SelectItem value="advanced">Avanzado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Departamento</Label>
                      <Select value={newTemplate.department} onValueChange={(v) => setNewTemplate({ ...newTemplate, department: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="security">Seguridad</SelectItem>
                          <SelectItem value="admin">Administración</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Guardia</Label>
                      <Select value={newTemplate.guard} onValueChange={(v) => setNewTemplate({ ...newTemplate, guard: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="jose">José Alejo Pinos</SelectItem>
                          <SelectItem value="maria">María García</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Descansos</Label>
                      <Select value={newTemplate.breaks} onValueChange={(v) => setNewTemplate({ ...newTemplate, breaks: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30min">30 minutos</SelectItem>
                          <SelectItem value="1hour">1 hora</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Nota</Label>
                      <Textarea
                        value={newTemplate.note}
                        onChange={(e) => setNewTemplate({ ...newTemplate, note: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Categoría</Label>
                      <Select value={newTemplate.category} onValueChange={(v) => setNewTemplate({ ...newTemplate, category: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="regular">Regular</SelectItem>
                          <SelectItem value="special">Especial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="outline"
                        className="flex-1 text-orange-500 border-orange-200 hover:bg-orange-50"
                        onClick={handleSaveTemplate}
                      >
                        Guardar
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 text-orange-500 border-orange-200 hover:bg-orange-50"
                        onClick={handleSaveTemplate}
                      >
                        Guardar como borrador
                      </Button>
                      <Button
                        className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                        onClick={handleSaveTemplate}
                      >
                        Guardar y Publicar
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="text-orange-500 border-orange-200 hover:bg-orange-50 hover:text-orange-600">
                    <Filter className="h-4 w-4 mr-2" /> Filtros
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[400px] sm:w-[540px]">
                  <SheetHeader className="relative">
                    <SheetTitle>Filtros</SheetTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0"
                      onClick={() => setIsFiltersOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </SheetHeader>
                  <div className="space-y-6 py-4">
                    <div className="grid gap-2">
                      <Label>Categorías</Label>
                      <Select value={filters.categories} onValueChange={(v) => setFilters({ ...filters, categories: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          <SelectItem value="regular">Regular</SelectItem>
                          <SelectItem value="special">Especial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="pt-4">
                      <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                        Filtro
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-md">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox />
                </TableHead>
                <TableHead className="font-bold text-slate-700">Nombre de la Plantilla</TableHead>
                <TableHead className="font-bold text-slate-700">Hora de Inicio</TableHead>
                <TableHead className="font-bold text-slate-700">Hora de Fin</TableHead>
                <TableHead className="font-bold text-slate-700">Sitio de publicación</TableHead>
                <TableHead className="font-bold text-slate-700">Guardia</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-[400px] text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <div className="bg-blue-50 p-6 rounded-full mb-4">
                        <svg
                          className="w-12 h-12 text-blue-200"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-slate-700 mb-1">No se encontraron resultados</h3>
                      <p className="text-sm max-w-xs">
                        No pudimos encontrar ningún elemento que coincida con su búsqueda
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <Checkbox />
                    </TableCell>
                    <TableCell className="text-blue-600">{template.templateName}</TableCell>
                    <TableCell>{template.startTime}</TableCell>
                    <TableCell>{template.endTime}</TableCell>
                    <TableCell>{template.postSite}</TableCell>
                    <TableCell>{template.guard}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <EllipsisVertical className="h-4 w-4 text-slate-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Tag className="mr-2 h-4 w-4" /> Categorizar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Upload className="mr-2 h-4 w-4" /> Publicar Turno
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="text-sm text-muted-foreground">
            Elementos por página
          </div>
          <Select defaultValue="25">
            <SelectTrigger className="w-[70px]">
              <SelectValue placeholder="25" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-sm text-muted-foreground mx-4">
            1 – 3 of 3
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" disabled>
              <span className="sr-only">Go to previous page</span>
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>
            <Button variant="outline" size="icon" disabled>
              <span className="sr-only">Go to next page</span>
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}