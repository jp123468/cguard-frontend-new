// src/pages/Breaks.tsx
import { useCallback, useMemo, useState } from "react";
import AppLayout from "@/layouts/app-layout";

import Breadcrumb from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import {
  Search,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";

type BreakType = "Pagado" | "No pagado";
type BreakMode = "Manual" | "Automático";

interface BreakItem {
  id: string;
  name: string;
  type: BreakType;
  duration: string; // ej: "0:15"
  mode: BreakMode;
}

export default function Breaks() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBreaks, setSelectedBreaks] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Datos principales (inicialmente vacío, se llena desde el formulario "Nuevo descanso" o desde tu API)
  const [breaks, setBreaks] = useState<BreakItem[]>([]);

  // Sheet "Nuevo descanso"
  const [openNewBreak, setOpenNewBreak] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<BreakType | "">("");
  const [newDuration, setNewDuration] = useState("");
  const [newGuard, setNewGuard] = useState("");
  const [newTimesPerDay, setNewTimesPerDay] = useState("");
  const [beforeAlert, setBeforeAlert] = useState("");
  const [afterAlert, setAfterAlert] = useState("");
  const [autoStart, setAutoStart] = useState(false);
  const [manualAllowed, setManualAllowed] = useState(true);

  // Filtro por búsqueda
  const filteredBreaks = useMemo(() => {
    if (!searchQuery) return breaks;
    const q = searchQuery.toLowerCase();
    return breaks.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.type.toLowerCase().includes(q) ||
        b.mode.toLowerCase().includes(q)
    );
  }, [breaks, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredBreaks.length / itemsPerPage));

  // Paginación
  const paginatedBreaks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredBreaks.slice(start, start + itemsPerPage);
  }, [filteredBreaks, currentPage, itemsPerPage]);

  // Resetea página cuando cambia tamaño de página o búsqueda
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Selección
  const handleSelectBreak = useCallback((id: string, checked: boolean) => {
    setSelectedBreaks((prev) =>
      checked ? [...prev, id] : prev.filter((bId) => bId !== id)
    );
  }, []);

  const allOnPageSelected =
    paginatedBreaks.length > 0 &&
    paginatedBreaks.every((b) => selectedBreaks.includes(b.id));

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      const idsOnPage = paginatedBreaks.map((b) => b.id);
      setSelectedBreaks((prev) => {
        if (checked) {
          const merged = new Set([...prev, ...idsOnPage]);
          return Array.from(merged);
        }
        return prev.filter((id) => !idsOnPage.includes(id));
      });
    },
    [paginatedBreaks]
  );

  // Acción masiva (solo "eliminar" por ahora)
  const handleBulkAction = (value: string) => {
    if (value === "eliminar" && selectedBreaks.length > 0) {
      setBreaks((prev) => prev.filter((b) => !selectedBreaks.includes(b.id)));
      setSelectedBreaks([]);
    }
  };

  // Guardar nuevo descanso (solo front por ahora)
  const handleAddBreak = () => {
    if (!newName || !newType || !newDuration) {
      // aquí puedes poner un toast si quieres
      return;
    }

    const newBreak: BreakItem = {
      id: Date.now().toString(),
      name: newName,
      type: newType as BreakType,
      duration: newDuration,
      mode: autoStart ? "Automático" : "Manual",
    };

    setBreaks((prev) => [...prev, newBreak]);
    setOpenNewBreak(false);

    // Reset form
    setNewName("");
    setNewType("");
    setNewDuration("");
    setNewGuard("");
    setNewTimesPerDay("");
    setBeforeAlert("");
    setAfterAlert("");
    setAutoStart(false);
    setManualAllowed(true);
  };

  const handleDeleteSingle = (id: string) => {
    setBreaks((prev) => prev.filter((b) => b.id !== id));
    setSelectedBreaks((prev) => prev.filter((bId) => bId !== id));
  };

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Descansos" },
        ]}
      />

      <div className="p-4">
        {/* Barra superior */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          {/* Acción masiva */}
          <div className="w-full sm:w-auto">
            <Select onValueChange={handleBulkAction}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Acción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eliminar">Eliminar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Buscar + Nuevo descanso */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar descanso"
                className="pl-9"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>

            <Sheet open={openNewBreak} onOpenChange={setOpenNewBreak}>
              <SheetTrigger asChild>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                  Nuevo descanso
                </Button>
              </SheetTrigger>

              {/* Sheet Nuevo descanso */}
              <SheetContent
                side="right"
                className="w-[380px] sm:w-[420px] overflow-y-auto"
              >
                <SheetHeader>
                  <SheetTitle>Nuevo descanso</SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-5 pb-6">
                  {/* Nombre del descanso */}
                  <div>
                    <Label className="mb-2 block">Nombre del descanso*</Label>
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Ej. Lunch"
                    />
                  </div>

                  {/* Tipo */}
                  <div>
                    <Label className="mb-2 block">Tipo de Descanso*</Label>
                    <Select
                      value={newType}
                      onValueChange={(val) => setNewType(val as BreakType)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pagado">Pagado</SelectItem>
                        <SelectItem value="No pagado">No pagado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Duración */}
                  <div>
                    <Label className="mb-2 block">Duración*</Label>
                    <Input
                      value={newDuration}
                      onChange={(e) => setNewDuration(e.target.value)}
                      placeholder="0:30"
                    />
                  </div>

                  {/* Guardia */}
                  <div>
                    <Label className="mb-2 block">Guardia</Label>
                    <Input
                      value={newGuard}
                      onChange={(e) => setNewGuard(e.target.value)}
                      placeholder="Opcional"
                    />
                  </div>

                  {/* Número de veces */}
                  <div>
                    <Label className="mb-2 block">
                      Número de veces que se puede tomar el descanso*
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={newTimesPerDay}
                      onChange={(e) => setNewTimesPerDay(e.target.value)}
                      placeholder="Ej. 1"
                    />
                  </div>

                  {/* Alertas */}
                  <div>
                    <Label className="mb-2 block">
                      Enviar alerta de notificación antes de que termine el
                      descanso
                    </Label>
                    <Input
                      value={beforeAlert}
                      onChange={(e) => setBeforeAlert(e.target.value)}
                      placeholder="Ej. 5 minutos antes"
                    />
                  </div>

                  <div>
                    <Label className="mb-2 block">
                      Enviar alerta de notificación después de que termine el
                      descanso
                    </Label>
                    <Input
                      value={afterAlert}
                      onChange={(e) => setAfterAlert(e.target.value)}
                      placeholder="Ej. 5 minutos después"
                    />
                  </div>

                  {/* Checks */}
                  <div className="space-y-3 pt-2">
                    <label className="flex items-center gap-2">
                      <Checkbox
                        checked={autoStart}
                        onCheckedChange={(v) =>
                          setAutoStart(Boolean(v))
                        }
                      />
                      <span className="text-sm text-gray-700">
                        Inicio automático
                      </span>
                    </label>

                    <label className="flex items-center gap-2">
                      <Checkbox
                        checked={manualAllowed}
                        onCheckedChange={(v) =>
                          setManualAllowed(Boolean(v))
                        }
                      />
                      <span className="text-sm text-gray-700">
                        Permitir que el guardia inicie y termine el descanso
                        manualmente
                      </span>
                    </label>
                  </div>

                  {/* Botón Añadir */}
                  <div className="pt-4">
                    <Button
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                      onClick={handleAddBreak}
                    >
                      AÑADIR
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Tabla */}
        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full text-sm text-left border-collapse">
            <thead className="bg-slate-50 text-gray-700">
              <tr className="border-b">
                <th className="px-4 py-3">
                  <Checkbox
                    checked={allOnPageSelected}
                    onCheckedChange={(v) => handleSelectAll(Boolean(v))}
                    aria-label="Seleccionar todos"
                  />
                </th>
                <th className="px-4 py-3 font-semibold">Nombre del descanso</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold">Duración</th>
                <th className="px-4 py-3 font-semibold">Automático/Manual</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>

            <tbody>
              {paginatedBreaks.length > 0 ? (
                paginatedBreaks.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedBreaks.includes(item.id)}
                        onCheckedChange={(v) =>
                          handleSelectBreak(item.id, Boolean(v))
                        }
                        aria-label={`Seleccionar ${item.name}`}
                      />
                    </td>
                    <td className="px-4 py-3">{item.name}</td>
                    <td className="px-4 py-3">{item.type}</td>
                    <td className="px-4 py-3">{item.duration}</td>
                    <td className="px-4 py-3">{item.mode}</td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem
                            onClick={() =>
                              console.log("Editar descanso", item.id)
                            }
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteSingle(item.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-20">
                    <div className="flex flex-col items-center justify-center text-center">
                      <img
                        src="https://app.guardspro.com/assets/icons/custom/no-data-found.png"
                        alt="Sin datos"
                        className="h-32 mb-3"
                      />
                      <h3 className="text-lg font-semibold">
                        No se encontraron resultados
                      </h3>
                      <p className="text-sm text-gray-500 max-w-xs mt-1">
                        No pudimos encontrar ningún elemento que coincida con su
                        búsqueda
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Paginación */}
          <div className="flex flex-wrap items-center justify-end gap-4 px-4 py-3 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span>Elementos por página</span>
              <Select
                value={String(itemsPerPage)}
                onValueChange={(val) => {
                  setItemsPerPage(Number(val));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              {filteredBreaks.length > 0
                ? `${(currentPage - 1) * itemsPerPage + 1} – ${Math.min(
                    currentPage * itemsPerPage,
                    filteredBreaks.length
                  )} of ${filteredBreaks.length}`
                : "0 of 0"}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
