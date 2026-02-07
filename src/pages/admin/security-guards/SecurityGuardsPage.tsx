import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/layouts/app-layout";

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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

import {
  EllipsisVertical,
  Filter,
  FileDown,
  FileSpreadsheet,
  ArrowDownUp,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Tag,
  Archive,
  RotateCw,
  Send,
  Copy,
  Trash,
} from "lucide-react";
import { Link } from "react-router-dom";
import Breadcrumb from "@/components/ui/breadcrumb";
import securityGuardService from "@/lib/api/securityGuardService";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { usePermissions } from '@/hooks/usePermissions';

// Tipos para los security-guards
type GuardStatus = "Activo" | "Pendiente" | "Invitado" | "Archivado";

interface SecurityGuard {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: GuardStatus;
  raw?: any; // Para detalles
}

export default function SecurityGuardsPage() {
  const { hasPermission } = usePermissions();
  const [openFilter, setOpenFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGuards, setSelectedGuards] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  // Mostrar guardias activos por defecto; el usuario puede cambiar el filtro.
  const [filterStatus, setFilterStatus] = useState<string>("activos");
  // Filtros adicionales (controlados) para permitir "Limpiar filtros"
  const [filterCategory, setFilterCategory] = useState<string>("todas");
  const [filterClient, setFilterClient] = useState<string>("todos");
  const [filterSite, setFilterSite] = useState<string>("todos");
  const [filterSkills, setFilterSkills] = useState<string>("todos");
  const [filterDepartment, setFilterDepartment] = useState<string>("todos");

  // Estado principal SIN datos de prueba
  const [guards, setGuards] = useState<SecurityGuard[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsGuard, setDetailsGuard] = useState<SecurityGuard | null>(null);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [guardToArchive, setGuardToArchive] = useState<SecurityGuard | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [guardToDelete, setGuardToDelete] = useState<SecurityGuard | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [guardToRestore, setGuardToRestore] = useState<SecurityGuard | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<string | null>(null);
  const [bulkActionTargetIds, setBulkActionTargetIds] = useState<string[]>([]);
  const [bulkActionValue, setBulkActionValue] = useState<string>("");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  // Export helpers
  function exportCSV(list: SecurityGuard[]) {
    const rows = list.map((g) => ({ name: g.name, email: g.email, phone: g.phone, status: g.status }));
    const header = ["name", "email", "phone", "status"];
    const csv = [header.join(",")]
      .concat(rows.map((r) => `${escapeCsv(r.name)},${escapeCsv(r.email)},${escapeCsv(r.phone)},${escapeCsv(r.status)}`))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `guardias_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function escapeCsv(v: any) {
    if (v == null) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  function exportPDF(list: SecurityGuard[]) {
    const htmlRows = list
      .map((g) => `<tr><td>${escapeHtml(g.name)}</td><td>${escapeHtml(g.email)}</td><td>${escapeHtml(g.phone)}</td><td>${escapeHtml(g.status)}</td></tr>`)
      .join("\n");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Guardias</title><style>table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px}</style></head><body><h2>Guardias</h2><table><thead><tr><th>Nombre</th><th>Correo</th><th>Teléfono</th><th>Estado</th></tr></thead><tbody>${htmlRows}</tbody></table></body></html>`;
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("No se pudo abrir la ventana de impresión");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    // Give browser a moment to render then trigger print
    setTimeout(() => {
      try { w.print(); } catch (e) { console.error(e); }
    }, 500);
  }

  // Try backend export first; fallback to client export helpers above
  async function exportFromBackend(format: "excel" | "csv" | "pdf") {
    try {
      const blob = await securityGuardService.export(format);
      const ext = format === "csv" ? "csv" : format === "pdf" ? "pdf" : "xlsx";
      const filename = `guardias_${new Date().toISOString().slice(0,10)}.${ext}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return true;
    } catch (err) {
      console.warn("Backend export failed, falling back to client export:", err);
      return false;
    }
  }

  function downloadFallback(format: "csv" | "pdf" | "excel", list: SecurityGuard[]) {
    if (format === "csv" || format === "excel") exportCSV(list);
    else exportPDF(list);
  }

  function escapeHtml(s: any) {
    if (s == null) return "";
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // Ejemplo de dónde cargar datos reales:
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    // Build params according to selected filterStatus so backend can return matching items
    let params: Record<string, any> | undefined = undefined;
    if (filterStatus === "archivados") {
      params = { "filter[archived]": "true" };
    } else if (filterStatus === "activos") {
      // backend may support a status filter; try common param name
      params = { "filter[status]": "active" };
    } else if (filterStatus === "pendientes") {
      params = { "filter[status]": "pending" };
    } else if (filterStatus === "invitados") {
      params = { "filter[status]": "invited" };
    }

    securityGuardService
      .list(params)
      .then((data) => {
        if (!mounted) return;
        // Algunos endpoints devuelven { rows, count } u otras formas
        const normalize = (item: any): SecurityGuard => {
          const guardObj = item.guard ?? {};
          const id = guardObj.id ?? item.guardId ?? item.id ?? "";
          const name =
            (guardObj.firstName && guardObj.lastName)
              ? `${guardObj.firstName} ${guardObj.lastName}`
              : item.fullName ?? `${guardObj.firstName ?? ""} ${guardObj.lastName ?? ""}`.trim();
          // Prefer nested guard email/phone when present, fall back to top-level fields
          const email = guardObj.email ?? item.email ?? "";
          const phone =
            guardObj.phone ?? guardObj.phoneNumber ?? item.guard?.phoneNumber ?? item.phoneNumber ?? item.phone ?? item.mobile ?? "";
          const status: GuardStatus = ((): GuardStatus => {
            const s = (guardObj.status ?? item.status ?? "").toString().toLowerCase();
            if (s === "active" || s === "activo") return "Activo";
            if (s === "invited" || s === "invitado") return "Invitado";
            if (s === "pending" || s === "pendiente") return "Pendiente";
            if (s === "archived" || s === "archivado") return "Archivado";
            if (typeof item.isOnDuty === "boolean") return item.isOnDuty ? "Activo" : "Pendiente";
            return "Pendiente";
          })();

          return {
            id,
            name: name || "-",
            email,
            phone,
            status,
            raw: item,
          };
        };

        if (Array.isArray(data)) setGuards(data.map(normalize));
        else if (data && Array.isArray((data as any).rows)) setGuards((data as any).rows.map(normalize));
        else setGuards([]);
      })
      .catch((err) => {
        if (!mounted) return;
        console.error("Error cargando guardias:", err);
        setError(String(err?.message || err));
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [filterStatus]);

  // Reiniciar página cuando cambie criterio de búsqueda o tamaño de página
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  // Filtrado por búsqueda
  const filteredGuards = useMemo(() => {
    let list = guards;

    // Apply status filter
    if (filterStatus && filterStatus !== "todos") {
      list = list.filter((g) => {
        if (filterStatus === "activos") return g.status === "Activo";
        if (filterStatus === "pendientes") return g.status === "Pendiente";
        if (filterStatus === "invitados") return g.status === "Invitado";
        if (filterStatus === "archivados") return g.status === "Archivado";
        return true;
      });
    }

    if (!searchQuery) return list;
    const lowerQuery = searchQuery.toLowerCase();
    return list.filter(
      (g) =>
        g.name.toLowerCase().includes(lowerQuery) ||
        g.email.toLowerCase().includes(lowerQuery) ||
        g.phone.includes(searchQuery)
    );
  }, [guards, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredGuards.length / itemsPerPage));

  // Paginado
  const paginatedGuards = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredGuards.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredGuards, currentPage, itemsPerPage]);

  // Selección individual
  const handleSelectGuard = useCallback((guardId: string, checked: boolean) => {
    setSelectedGuards((prev) =>
      checked ? [...prev, guardId] : prev.filter((id) => id !== guardId)
    );
  }, []);

  // Seleccionar/deseleccionar todos EN LA PÁGINA ACTUAL
  const allOnPageSelected =
    paginatedGuards.length > 0 &&
    paginatedGuards.every((g) => selectedGuards.includes(g.id));

  const handleSelectAllGuards = useCallback((checked: boolean) => {
    setSelectedGuards((prev) => {
      const idsOnPage = paginatedGuards.map((g) => g.id);
      if (checked) {
        const merged = new Set([...prev, ...idsOnPage]);
        return Array.from(merged);
        } else {
        return prev.filter((id) => !idsOnPage.includes(id));
      }
    });
  }, [paginatedGuards]);

  // Badges de estado
  const renderStatus = useCallback((status: GuardStatus) => {
    switch (status) {
      case "Activo":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            Activo
          </Badge>
        );
      case "Pendiente":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            Pendiente
          </Badge>
        );
      case "Invitado":
        return (
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
            Invitado
          </Badge>
        );
      case "Archivado":
        return (
          <Badge className="bg-gray-200 text-gray-700">
            Archivado
          </Badge>
        );
      default:
        return null;
    }
  }, []);

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "security-guards" },
        ]}
      />
      <div className="p-4">
        <section className="">
          {/* Acciones superiores */}
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Select
                value={bulkActionValue}
                onValueChange={(v) => {
                  // set and immediately clear to avoid leaving the option selected
                  setBulkActionValue(v);
                  if (selectedGuards.length === 0) {
                    toast.error("Selecciona al menos un guardia");
                    setBulkActionValue("");
                    return;
                  }

                  // Permission checks for bulk actions
                  if (v === 'eliminar' && !hasPermission('securityGuardDestroy')) {
                    toast.error('No tienes permiso para eliminar guardias');
                    setBulkActionValue("");
                    return;
                  }
                  if ((v === 'archivar' || v === 'restaurar' || v === 'mover') && !hasPermission('securityGuardEdit')) {
                    toast.error('No tienes permiso para modificar guardias');
                    setBulkActionValue("");
                    return;
                  }

                  const ids = selectedGuards.map((sid) => {
                    const g = guards.find((x) => x.id === sid);
                    return g?.raw?.id || sid;
                  });

                  setBulkActionTargetIds(ids);
                  setBulkActionType(v);
                  setBulkActionDialogOpen(true);
                  // clear selection so UI shows placeholder
                  setBulkActionValue("");
                }}
                disabled={bulkActionLoading}
              >
                <SelectTrigger className="w-40" disabled={selectedGuards.length === 0}>
                  <SelectValue placeholder="Acción" />
                </SelectTrigger>
                <SelectContent>
                  {selectedGuards.length > 0 && selectedGuards.some((sid) => (guards.find((g) => g.id === sid)?.status === "Archivado")) ? (
                    <>
                      <SelectItem value="restaurar">Restaurar</SelectItem>
                      <SelectItem value="eliminar">Eliminar</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="archivar">Archivar</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar guardia"
                  className="pl-9 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {hasPermission('securityGuardCreate') && (
                <Button className="bg-orange-500 hover:bg-orange-600 text-white" asChild>
                  <Link to="/security-guards/new">Nuevo Guardia</Link>
                </Button>
              )}

              {/* Filtros */}
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

                  <div className="mt-6 space-y-4">
                    <div className="space-y-2">
                      <Label>Categorías</Label>
                      <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v)}>
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
                      <Select value={filterClient} onValueChange={(v) => setFilterClient(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Sitio de publicación</Label>
                      <Select value={filterSite} onValueChange={(v) => setFilterSite(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sitio de publicación" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Conjunto de Habilidades</Label>
                      <Select value={filterSkills} onValueChange={(v) => setFilterSkills(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Conjunto de Habilidades" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Departamento</Label>
                      <Select value={filterDepartment} onValueChange={(v) => setFilterDepartment(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Departamento" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Estado*</Label>
                      <Select
                        value={filterStatus}
                        onValueChange={(v) => {
                          setFilterStatus(v);
                          // Apply immediately and close the filter sheet
                          setOpenFilter(false);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos los Guardias" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos los Guardias</SelectItem>
                          <SelectItem value="activos">Activos</SelectItem>
                          <SelectItem value="pendientes">Pendientes</SelectItem>
                          <SelectItem value="invitados">Invitados</SelectItem>
                          <SelectItem value="archivados">Archivados</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    

                    <Button
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                      onClick={() => {
                        // Aplica tus filtros reales aquí
                        setOpenFilter(false);
                      }}
                    >
                      Filtro
                    </Button>
                    <Button
                      className="w-full bg-white text-black border hover:bg-gray-50"
                      onClick={() => {
                        // Limpiar filtros: resetear filtros controlados y mantener la hoja abierta
                        setFilterCategory("todas");
                        setFilterClient("todos");
                        setFilterSite("todos");
                        setFilterSkills("todos");
                        setFilterDepartment("todos");
                        setFilterStatus("activos");
                      }}
                    >
                      Limpiar filtros
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
                    <DropdownMenuItem onClick={async () => { if (!(await exportFromBackend('pdf'))) downloadFallback('pdf', filteredGuards); }}>
                      <FileDown className="mr-2 h-4 w-4" /> Exportar como PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={async () => { if (!(await exportFromBackend('excel'))) downloadFallback('excel', filteredGuards); }}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar como Excel
                    </DropdownMenuItem>
                    {hasPermission('securityGuardImport') && (
                      <DropdownMenuItem onClick={() => setImportDialogOpen(true)}>
                        <ArrowDownUp className="mr-2 h-4 w-4" /> Importar
                      </DropdownMenuItem>
                    )}
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
                    <Checkbox
                      checked={allOnPageSelected}
                      onCheckedChange={(v) =>
                        handleSelectAllGuards(Boolean(v))
                      }
                      aria-label="Seleccionar todos los guardias de esta página"
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold">Nombre</th>
                  <th className="px-4 py-3 font-semibold">Correo Electrónico</th>
                  <th className="px-4 py-3 font-semibold">Número de Móvil</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {paginatedGuards.length > 0 ? (
                  paginatedGuards.map((guard) => (
                    <tr key={guard.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={selectedGuards.includes(guard.id)}
                          onCheckedChange={(v) =>
                            handleSelectGuard(guard.id, Boolean(v))
                          }
                          aria-label={`Seleccionar ${guard.name}`}
                        />
                      </td>
                      <td className="px-4 py-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                          {(guard.name?.trim()?.[0] ?? "G").toUpperCase()}
                        </div>
                        <div
                          role="link"
                          tabIndex={0}
                          className="flex-1 cursor-pointer select-none text-blue-600 hover:underline"
                          onClick={() => {
                            const realId = guard.raw?.id || guard.id;
                            navigate(`/guards/${realId}/overview`);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              const realId = guard.raw?.id || guard.id;
                              navigate(`/guards/${realId}/overview`);
                            }
                          }}
                          aria-label={`Abrir resumen de ${guard.name}`}
                        >
                          {guard.name}
                        </div>
                      </td>
                      <td className="px-4 py-3">{guard.email}</td>
                      <td className="px-4 py-3">{guard.phone}</td>
                      <td className="px-4 py-3">{renderStatus(guard.status)}</td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <EllipsisVertical className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {guard.status === "Pendiente" ? (
                              <>
                                <DropdownMenuItem
                                  onClick={async () => {
                                    try {
                                      // Placeholder: implement real resend logic if available
                                      console.log("Resend invite for", guard);
                                      toast.success("Invitación reenviada");
                                    } catch (err) {
                                      console.error(err);
                                      toast.error("Error reenviando invitación");
                                    }
                                  }}
                                >
                                  <Send className="mr-2 h-4 w-4" /> Reenviar Invitación
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={async () => {
                                    try {
                                      const link =
                                        guard.raw?.inviteLink ||
                                        `${window.location.origin}/guard/registration?code=${encodeURIComponent(
                                          guard.raw?.inviteCode || guard.raw?.code || guard.id
                                        )}`;
                                      await navigator.clipboard.writeText(link);
                                      toast.success("Enlace de registro copiado");
                                    } catch (err) {
                                      console.error(err);
                                      toast.error("No se pudo copiar el enlace");
                                    }
                                  }}
                                >
                                  <Copy className="mr-2 h-4 w-4" /> Copiar enlace de registro
                                </DropdownMenuItem>

                                {hasPermission('securityGuardDestroy') && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setGuardToDelete(guard);
                                      setDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash className="mr-2 h-4 w-4" /> Remover
                                  </DropdownMenuItem>
                                )}
                              </>
                            ) : (
                              <>
                                {hasPermission('securityGuardRead') && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const realId = guard.raw?.id || guard.id;
                                      navigate(`/guards/${realId}/overview`);
                                    }}
                                  >
                                    <Eye className="mr-2 h-4 w-4" /> Ver Detalles
                                  </DropdownMenuItem>
                                )}
                                {guard.status === "Archivado" ? (
                                  <>
                                    {hasPermission('securityGuardEdit') && (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setGuardToRestore(guard);
                                          setRestoreDialogOpen(true);
                                        }}
                                      >
                                        <RotateCw className="mr-2 h-4 w-4" /> Restaurar
                                      </DropdownMenuItem>
                                    )}
                                    {hasPermission('securityGuardDestroy') && (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setGuardToDelete(guard);
                                          setDeleteDialogOpen(true);
                                        }}
                                      >
                                        <Archive className="mr-2 h-4 w-4" /> Eliminar permanentemente
                                      </DropdownMenuItem>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    {hasPermission('securityGuardEdit') && (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setGuardToArchive(guard);
                                          setArchiveDialogOpen(true);
                                        }}
                                      >
                                        <Archive className="mr-2 h-4 w-4" /> Archivar
                                      </DropdownMenuItem>
                                    )}
                                  </>
                                )}
                              </>
                            )}
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

            {/* Paginación (única) */}
            <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-600 bg-gray-50">
              <div className="flex items-center gap-2">
                <span>Elementos por página</span>
                <Select
                  value={String(itemsPerPage)}
                  onValueChange={(value) => setItemsPerPage(Number(value))}
                >
                  <SelectTrigger className="h-8 w-20">
                    <SelectValue placeholder={String(itemsPerPage)} />
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
                <div>
                  {filteredGuards.length > 0
                    ? `${(currentPage - 1) * itemsPerPage + 1} - ${Math.min(
                        currentPage * itemsPerPage,
                        filteredGuards.length
                      )} de ${filteredGuards.length}`
                    : "0 – 0 de 0"}
                </div>
                <div className="flex items-center">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="h-8 w-8 rounded-r-none"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(p + 1, totalPages))
                    }
                    disabled={currentPage >= totalPages}
                    className="h-8 w-8 rounded-l-none border-l-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      {/* Modal de detalles del guardia */}
      {/* Diálogo de confirmación para archivar guardia */}
      <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archivar guardia</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            ¿Estás seguro que deseas archivar este guardia? Esta acción se puede revertir desde el filtro.
          </DialogDescription>
          <div className="mt-4">
            <div className="text-sm text-gray-700">
              <strong>Nombre:</strong> {guardToArchive?.name ?? "-"}
            </div>
            <div className="text-sm text-gray-700">{guardToArchive?.email ?? ""}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveDialogOpen(false)} disabled={archiveLoading}>
              Cancelar
            </Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={async () => {
                if (!guardToArchive) return;
                setArchiveLoading(true);
                try {
                  const realId = guardToArchive.raw?.id || guardToArchive.id;
                  // Prevent archiving if guard is currently on duty
                  const isOnDuty = guardToArchive.raw?.isOnDuty ?? guardToArchive.raw?.onDuty ?? false;
                  if (isOnDuty) {
                    toast.error("No se puede archivar: el guardia está actualmente en servicio.");
                    setArchiveLoading(false);
                    return;
                  }
                  await securityGuardService.archive([realId]);
                  // mark as archived in UI
                  setGuards((prev) =>
                    prev.map((g) =>
                      g.id === guardToArchive.id ? { ...g, status: "Archivado", raw: { ...g.raw, status: "archived" } } : g
                    )
                  );
                  toast.success("Guardia archivado");
                  setArchiveDialogOpen(false);
                } catch (err: any) {
                  console.error("Error archivando guardia:", err);
                  toast.error("Error archivando guardia: " + (err?.message || String(err)));
                } finally {
                  setArchiveLoading(false);
                }
              }}
              disabled={archiveLoading}
            >
              {archiveLoading ? "Archivando…" : "Archivar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Diálogo para eliminar permanentemente (solo si está archivado) */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar guardia permanentemente</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            {guardToDelete?.status === "Pendiente" ? (
              <>
                Esta acción eliminará permanentemente al guardia pendiente. No podrá recuperarse después de eliminarlo.
              </>
            ) : (
              <>
                Esta acción eliminará permanentemente al guardia. Asegúrate de que el guardia esté archivado y no esté en servicio.
              </>
            )}
          </DialogDescription>
          <div className="mt-4">
            <div className="text-sm text-gray-700">
              <strong>Nombre:</strong> {guardToDelete?.name ?? "-"}
            </div>
            <div className="text-sm text-gray-700">{guardToDelete?.email ?? ""}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleteLoading}>
              Cancelar
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={async () => {
                if (!guardToDelete) return;
                setDeleteLoading(true);
                try {
                  const realId = guardToDelete.raw?.id || guardToDelete.id;
                  try {
                    await securityGuardService.destroy([realId]);
                  } catch (err: any) {
                    const msg = (err?.message || String(err || "")).toString().toLowerCase();
                    if (msg.includes("debe ser archivado") || msg.includes("must be archived")) {
                      // Backend requires archived before delete — try to archive then delete
                      try {
                        await securityGuardService.archive([realId]);
                        await securityGuardService.destroy([realId]);
                      } catch (innerErr) {
                        throw innerErr;
                      }
                    } else {
                      throw err;
                    }
                  }

                  setGuards((prev) => prev.filter((g) => g.id !== guardToDelete.id));
                  toast.success("Guardia eliminado permanentemente");
                  setDeleteDialogOpen(false);
                } catch (err: any) {
                  console.error("Error eliminando guardia:", err);
                } finally {
                  setDeleteLoading(false);
                }
              }}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Eliminando…" : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Diálogo para restaurar guardia (si está archivado) */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurar guardia</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            ¿Deseas restaurar este guardia? La acción lo devolverá al estado activo.
          </DialogDescription>
          <div className="mt-4">
            <div className="text-sm text-gray-700">
              <strong>Nombre:</strong> {guardToRestore?.name ?? "-"}
            </div>
            <div className="text-sm text-gray-700">{guardToRestore?.email ?? ""}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)} disabled={restoreLoading}>
              Cancelar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={async () => {
                if (!guardToRestore) return;
                setRestoreLoading(true);
                try {
                  const realId = guardToRestore.raw?.id || guardToRestore.id;
                  await securityGuardService.restore([realId]);
                  // mark as active in UI
                  setGuards((prev) =>
                    prev.map((g) => (g.id === guardToRestore.id ? { ...g, status: "Activo", raw: { ...g.raw, status: "active" } } : g))
                  );
                  toast.success("Guardia restaurado");
                  setRestoreDialogOpen(false);
                } catch (err: any) {
                  console.error("Error restaurando guardia:", err);
                  toast.error("Error restaurando guardia: " + (err?.message || String(err)));
                } finally {
                  setRestoreLoading(false);
                }
              }}
              disabled={restoreLoading}
            >
              {restoreLoading ? "Restaurando…" : "Restaurar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Diálogo de confirmación para acciones masivas */}
      <Dialog open={bulkActionDialogOpen} onOpenChange={setBulkActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkActionType === "archivar"
                ? "Archivar guardias"
                : bulkActionType === "restaurar"
                ? "Restaurar guardias"
                : bulkActionType === "eliminar"
                ? "Eliminar guardias"
                : "Confirmar acción"}
            </DialogTitle>
          </DialogHeader>
          <DialogDescription>
            {bulkActionType === "archivar" && (
              <>
                ¿Estás seguro de que deseas archivar {selectedGuards.length} guardia(s)? Esta acción se puede revertir desde el filtro de archivados.
              </>
            )}
            {bulkActionType === "restaurar" && (
              <>
                ¿Deseas restaurar {selectedGuards.length} guardia(s)? Estos guardias volverán al estado activo.
              </>
            )}
            {bulkActionType === "eliminar" && (
              <>
                Esta acción eliminará permanentemente {selectedGuards.length} guardia(s). ¿Deseas continuar?
              </>
            )}
          </DialogDescription>
          <div className="mt-4">
            <div className="text-sm text-gray-700">
              <strong>Guardias seleccionados:</strong> {selectedGuards.length}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkActionDialogOpen(false)} disabled={bulkActionLoading}>
              Cancelar
            </Button>
            <Button
              className={bulkActionType === "eliminar" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-orange-500 hover:bg-orange-600 text-white"}
              onClick={async () => {
                setBulkActionLoading(true);
                try {
                  const ids = bulkActionTargetIds;
                  if (bulkActionType === "archivar") {
                    await securityGuardService.archive(ids);
                    setGuards((prev) =>
                      prev.map((g) => (selectedGuards.includes(g.id) ? { ...g, status: "Archivado", raw: { ...g.raw, status: "archived" } } : g))
                    );
                    toast.success("Guardias archivados");
                  } else if (bulkActionType === "restaurar") {
                    await securityGuardService.restore(ids);
                    setGuards((prev) =>
                      prev.map((g) => (selectedGuards.includes(g.id) ? { ...g, status: "Activo", raw: { ...g.raw, status: "active" } } : g))
                    );
                    toast.success("Guardias restaurados");
                  } else if (bulkActionType === "eliminar") {
                    await securityGuardService.destroy(ids);
                    setGuards((prev) => prev.filter((g) => !selectedGuards.includes(g.id)));
                    toast.success("Guardias eliminados permanentemente");
                  }
                  setSelectedGuards([]);
                  setBulkActionDialogOpen(false);
                } catch (err) {
                  console.error("Error ejecutando acción masiva:", err);
                } finally {
                  setBulkActionLoading(false);
                  setBulkActionType(null);
                  setBulkActionTargetIds([]);
                  setBulkActionValue("");
                }
              }}
              disabled={bulkActionLoading}
            >
              {bulkActionLoading ? "Procesando…" : bulkActionType === "eliminar" ? "Eliminar" : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {detailsOpen && detailsGuard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="button"
          tabIndex={0}
          aria-label="Cerrar modal"
          onClick={(e) => {
            // Solo cerrar si el click es en el fondo, no en el modal
            if (e.target === e.currentTarget) setDetailsOpen(false);
          }}
          onKeyDown={(e) => {
            // Allow Escape to close and Enter/Space when overlay is focused
            if (e.key === "Escape") {
              setDetailsOpen(false);
              return;
            }
            if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
              e.preventDefault();
              setDetailsOpen(false);
            }
          }}
          onTouchStart={(e) => {
            // Support touch devices: close when tapping on backdrop
            if (e.target === e.currentTarget) setDetailsOpen(false);
          }}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-xl w-full p-6 sm:p-10 relative border border-gray-200 animate-fade-in"
            role="dialog"
            aria-modal="true"
          >
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl font-bold"
              onClick={() => setDetailsOpen(false)}
              aria-label="Cerrar"
              style={{ lineHeight: 1 }}
            >
              ×
            </button>
            <h2 className="text-xl sm:text-2xl font-bold mb-1 text-center">Detalles del Guardia</h2>
            <div className="mb-4 text-xs sm:text-sm text-gray-500 text-center">Información detallada del guardia seleccionado.</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mb-6">
              <div>
                <div className="font-semibold text-gray-700 text-sm">Nombre</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.guard?.firstName ?? "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">Apellidos</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.guard?.lastName ?? "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">Correo</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.guard?.email ?? detailsGuard.email ?? "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">Teléfono</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.guard?.phoneNumber ?? detailsGuard.phone ?? "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">Cédula</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.governmentId ?? "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">Credencial Guardia</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.guardCredentials ?? "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">Dirección</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.address ?? "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">Fecha de nacimiento</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.birthDate ?? "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">Lugar de nacimiento</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.birthPlace ?? "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">Estado civil</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.maritalStatus ?? "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">Tipo de sangre</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.bloodType ?? "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">Instrucción académica</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.academicInstruction ?? "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">Contrato</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.hiringContractDate ?? "-"}</div>
              </div>
              <div className="sm:col-span-2">
                <div className="font-semibold text-gray-700 text-sm">Género</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.gender ?? "-"}</div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <Button
                variant="outline"
                onClick={() => setDetailsOpen(false)}
                className="text-sm px-4 py-1"
              >
                Cerrar
              </Button>
              {hasPermission('securityGuardEdit') && (
                <Button
                  className="bg-orange-500 hover:bg-orange-600 text-white text-sm px-4 py-1"
                  onClick={() => {
                    setDetailsOpen(false);
                    const realId = detailsGuard.raw?.id || detailsGuard.id;
                    navigate(`/security-guards/edit/${realId}`);
                  }}
                >
                  Editar
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import dialog (styled like clients import) */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Guardias desde Excel</DialogTitle>
            <DialogDescription>Sube un archivo .xlsx/.xls/.csv para importar guardias.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Antes de cargar, asegúrese de:</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>El archivo debe ser formato .xlsx, .xls o .csv</li>
                <li>
                  <strong>Columnas obligatorias:</strong> Nombre, Correo, Teléfono, Estado, Cédula, Fecha Contrato, Género, Tipo Sangre, Credenciales, Fecha Nac., Lugar Nac., Estado Civ., Educación, Dirección
                </li>
              </ul>
              <Button
                variant="link"
                className="px-0 text-orange-500"
                onClick={() => {
                  const csvContent = `Nombre,Correo,Teléfono,Estado,Cédula,Fecha Contrato,Género,Tipo Sangre,Credenciales,Fecha Nac.,Lugar Nac.,Estado Civ.,Educación,Dirección\nFrank Mendoza,frankmendoza12@gmail.com,+593123456789,Activo,12345678888,30/11/2025,Femenino,AB-,7878787887878usahuia,10/6/2004,Pastocalle,Casado,Universidad,Calle principal`;
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const url = window.URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = 'plantilla-guardias.csv';
                  link.click();
                  window.URL.revokeObjectURL(url);
                  toast.success('Plantilla descargada');
                }}
              >
                Descargar plantilla de ejemplo
              </Button>
            </div>

            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                className="hidden"
                id="guard-file-upload"
              />
              <label htmlFor="guard-file-upload" className="cursor-pointer block">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 0l-3 3m3-3 3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-muted-foreground font-medium">{importFile ? importFile.name : 'Explorar tu archivo Excel aquí....'}</p>
                <p className="text-xs text-muted-foreground mt-1">Click para seleccionar</p>
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setImportDialogOpen(false)} disabled={importLoading}>
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  if (!importFile) {
                    toast.error('Selecciona un archivo');
                    return;
                  }

                  if (importFile.size === 0) {
                    toast.error('El archivo está vacío');
                    return;
                  }

                  // Validate CSV/XLSX client-side to avoid sending empty or malformed files
                  const requiredHeaders = [
                    'Nombre','Correo','Teléfono','Estado','Cédula','Fecha Contrato','Género','Tipo Sangre','Credenciales','Fecha Nac.','Lugar Nac.','Estado Civ.','Educación','Dirección'
                  ];

                  const lowerName = importFile.name.toLowerCase();
                  if (lowerName.endsWith('.csv')) {
                    try {
                      // Try decode as UTF-8 first, fallback to windows-1252 / latin1 if headers look mojibake
                      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
                        const fr = new FileReader();
                        fr.onload = () => resolve(fr.result as ArrayBuffer);
                        fr.onerror = () => reject(fr.error);
                        fr.readAsArrayBuffer(importFile);
                      });

                      const tryDecode = (buf: ArrayBuffer, encoding: string) => {
                        try {
                          const dec = new TextDecoder(encoding as any);
                          return dec.decode(buf);
                        } catch (e) {
                          return null;
                        }
                      };

                      let text = tryDecode(arrayBuffer, 'utf-8') ?? '';

                      const firstLineUtf = (text.split(/\r?\n/)[0] || '').trim();
                      const headersUtf = firstLineUtf.split(',').map((h) => h.replace(/^"|"$/g, '').trim());
                      const hasRequiredUtf = requiredHeaders.every((rh) => headersUtf.some((hh) => hh.toLowerCase() === rh.toLowerCase()));

                      if (!hasRequiredUtf) {
                        // Try windows-1252 (common for Excel/CSV saved on Windows)
                        const alt = tryDecode(arrayBuffer, 'windows-1252') ?? tryDecode(arrayBuffer, 'iso-8859-1');
                        if (alt) {
                          text = alt;
                        }
                      }

                      const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
                      if (lines.length <= 1) {
                        toast.error('El CSV no contiene filas de datos');
                        return;
                      }
                      const firstLine = (lines[0] || '').trim();
                      const headers = firstLine.split(',').map((h) => h.replace(/^"|"$/g, '').trim());
                      const missing = requiredHeaders.filter((h) => !headers.some((hh) => hh.toLowerCase() === h.toLowerCase()));
                      if (missing.length > 0) {
                        console.debug('CSV headers found:', headers);
                        toast.error(`Faltan columnas obligatorias: ${missing.join(', ')}. Si tu archivo contiene acentos, guarda como UTF-8 o intenta abrirlo en Excel y volver a exportar en UTF-8.`);
                        return;
                      }
                      console.debug('CSV preview lines:', lines.slice(0, 5));
                    } catch (err) {
                      console.error('Error leyendo CSV para validación:', err);
                      toast.error('No se pudo validar el archivo CSV antes de subir. Asegúrate del formato.');
                      return;
                    }
                  } else if (lowerName.endsWith('.xls') || lowerName.endsWith('.xlsx')) {
                    try {
                      const arrBuf = await new Promise<ArrayBuffer>((resolve, reject) => {
                        const fr = new FileReader();
                        fr.onload = () => resolve(fr.result as ArrayBuffer);
                        fr.onerror = () => reject(fr.error);
                        fr.readAsArrayBuffer(importFile);
                      });
                      const wb = XLSX.read(arrBuf, { type: 'array' });
                      const sheetName = wb.SheetNames[0];
                      const sheet = wb.Sheets[sheetName];
                      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[];
                      if (!rows || rows.length <= 1) {
                        toast.error('El archivo Excel no contiene filas de datos válidas');
                        return;
                      }
                      console.debug('Excel preview rows:', rows.slice(0, 5));
                    } catch (err) {
                      console.error('Error leyendo Excel para validación:', err);
                      toast.error('No se pudo validar el archivo Excel antes de subir. Asegúrate del formato.');
                      return;
                    }
                  } else {
                    console.debug('Archivo con extensión no reconocida:', importFile.name, importFile.type);
                  }

                  setImportLoading(true);
                  const toastId = toast.loading('Procesando archivo...');
                  try {
                    // Prepare file to upload: normalize headers (remove accents, trim, lowercase)
                    const normalizeHeader = (h: string) =>
                      h
                        .normalize("NFD")
                        .replace(/\p{Diacritic}/gu, "")
                        .replace(/[\s]+/g, " ")
                        .trim();

                    const normalizeCsvContent = (csvText: string) => {
                      // Remove UTF-8 BOM if present
                      let text = csvText.replace(/^\uFEFF/, "");

                      const rawLines = text.split(/\r?\n/).filter((l) => l !== undefined && l !== null);
                      if (rawLines.length === 0) return text;

                      const headerLine = (rawLines[0] || "").trim();

                      // detect delimiter by choosing the one with the most columns in header
                      const delimiters = [",", ";", "\t", "|"];
                      let delim = ",";
                      let bestCount = -1;
                      for (const d of delimiters) {
                        const count = headerLine.split(d).length - 1;
                        if (count > bestCount) {
                          bestCount = count;
                          delim = d;
                        }
                      }

                      const parseLine = (line: string) => {
                        // Basic split on detected delimiter. This does not fully handle
                        // quoted delimiters but works for common exports from Excel/Sheets.
                        const parts = line.split(delim);
                        return parts.map((p) => p.replace(/^"|"$/g, "").trim());
                      };

                      const headers = parseLine(headerLine).map((h) => normalizeHeader(h));

                      const rest = rawLines.slice(1).map((line) => {
                        if (!line) return "";
                        const cols = parseLine(line);
                        // Re-join using comma for backend consistency
                        return cols.join(",");
                      });

                      // Log detection results for debugging
                      try {
                        console.debug("[SecurityGuardsPage] CSV normalize: detected delimiter=", JSON.stringify(delim), "headers=", headers);
                        console.debug("[SecurityGuardsPage] CSV normalize: sample lines=", [headerLine].concat(rest).slice(0, 5));
                      } catch (e) {
                        /* ignore logging errors */
                      }

                      return [headers.join(",")].concat(rest).join("\n");
                    };

                    let uploadFile: File | Blob = importFile;

                    const lowerName = importFile.name.toLowerCase();
                    if (lowerName.endsWith('.csv')) {
                      // read as text (we already validated earlier but re-read to create normalized blob)
                      const text = await new Promise<string>((resolve, reject) => {
                        const fr = new FileReader();
                        fr.onload = () => resolve(String(fr.result ?? ''));
                        fr.onerror = () => reject(fr.error);
                        fr.readAsText(importFile, 'utf-8');
                      }).catch(() => {
                        // fallback to latin1
                        return new Promise<string>((resolve, reject) => {
                          const fr = new FileReader();
                          fr.onload = () => resolve(String(fr.result ?? ''));
                          fr.onerror = () => reject(fr.error);
                          try { fr.readAsText(importFile, 'windows-1252'); } catch { fr.readAsText(importFile); }
                        });
                      });

                      const normalized = normalizeCsvContent(text);
                      // parse to objects for preview
                      try {
                        const wbPreview = XLSX.read(normalized, { type: 'string' });
                        const objs = XLSX.utils.sheet_to_json(wbPreview.Sheets[wbPreview.SheetNames[0]], { defval: '' }) as any[];
                        console.debug('Parsed CSV rows (preview):', objs.slice(0, 5));
                      } catch (e) {
                        console.debug('No se pudo parsear preview CSV:', e);
                      }
                      uploadFile = new Blob([normalized], { type: 'text/csv' });
                    } else if (lowerName.endsWith('.xls') || lowerName.endsWith('.xlsx')) {
                      // convert first sheet to CSV and normalize headers
                      const arrBuf = await new Promise<ArrayBuffer>((resolve, reject) => {
                        const fr = new FileReader();
                        fr.onload = () => resolve(fr.result as ArrayBuffer);
                        fr.onerror = () => reject(fr.error);
                        fr.readAsArrayBuffer(importFile);
                      });
                      const wb = XLSX.read(arrBuf, { type: 'array' });
                      const sheetName = wb.SheetNames[0];
                      const sheet = wb.Sheets[sheetName];
                      let csv = XLSX.utils.sheet_to_csv(sheet);
                      csv = normalizeCsvContent(csv);
                      try {
                        const wbPreview = XLSX.read(csv, { type: 'string' });
                        const objs = XLSX.utils.sheet_to_json(wbPreview.Sheets[wbPreview.SheetNames[0]], { defval: '' }) as any[];
                        console.debug('Parsed Excel->CSV rows (preview):', objs.slice(0, 5));
                      } catch (e) {
                        console.debug('No se pudo parsear preview Excel->CSV:', e);
                      }
                      uploadFile = new Blob([csv], { type: 'text/csv' });
                    }

                    // Log FormData preview (file size and type)
                    try {
                      const fd = new FormData();
                      fd.append('file', uploadFile as Blob, importFile.name);
                      console.debug('FormData preview:', { fileName: importFile.name, size: (uploadFile as Blob).size, type: (uploadFile as Blob).type });
                    } catch (e) {
                      console.debug('No se pudo crear preview FormData:', e);
                    }

                    // Debug: log what we'll send to the backend
                    try {
                      const blob = uploadFile as Blob;
                      let sample = '<binary or non-text>';
                      if (blob && blob.size && /text|csv|plain/.test(blob.type || '')) {
                        try {
                          // read first KB of text safely
                          sample = String(await blob.slice(0, 1024).text()).slice(0, 1024);
                        } catch (err) {
                          sample = '<unable to read sample>';
                        }
                      }

                      console.log('[SecurityGuardsPage] Import payload preview', {
                        originalName: importFile?.name,
                        originalType: importFile?.type,
                        uploadType: blob.type,
                        uploadSize: blob.size,
                        sample,
                      });
                    } catch (e) {
                      console.log('[SecurityGuardsPage] Error building import preview', e);
                    }

                    // Pass filename explicitly so backend receives a proper file name when a Blob was used
                    const result = await securityGuardService.import(uploadFile as any, importFile?.name);
                    toast.dismiss(toastId);
                    toast.success('Importación completada');
                    // Optionally process result if backend returns details
                    setImportDialogOpen(false);
                    setImportFile(null);
                    // reload list
                    setLoading(true);
                    try {
                      const data = await securityGuardService.list();
                      if (Array.isArray(data)) {
                        const normalize = (item: any): SecurityGuard => {
                          const guardObj = item.guard ?? {};
                          const id = guardObj.id ?? item.guardId ?? item.id ?? "";
                          const name = (item.fullName ?? `${guardObj.firstName ?? ""} ${guardObj.lastName ?? ""}`.trim()) || "-";
                          const email = guardObj.email ?? item.email ?? "";
                          const phone = guardObj.phone ?? guardObj.phoneNumber ?? item.guard?.phoneNumber ?? item.phoneNumber ?? item.phone ?? item.mobile ?? "";
                          const status: GuardStatus = ((): GuardStatus => {
                            const s = ((guardObj.status ?? item.status ?? "")).toString().toLowerCase();
                            if (s === "active" || s === "activo") return "Activo";
                            if (s === "invited" || s === "invitado") return "Invitado";
                            if (s === "pending" || s === "pendiente") return "Pendiente";
                            if (s === "archived" || s === "archivado") return "Archivado";
                            return "Pendiente";
                          })();
                          return { id, name, email, phone, status, raw: item };
                        };
                        setGuards(data.map(normalize));
                      }
                    } catch (e) {
                      console.error('Error recargando guardias:', e);
                    } finally {
                      setLoading(false);
                    }
                  } catch (error: any) {
                    toast.dismiss(toastId);
                    console.error('Error importando guardias:', error);
                    const msg = error?.details || error?.response?.data?.message || error?.message || 'Error al importar';
                    toast.error(msg);
                  } finally {
                    setImportLoading(false);
                  }
                }}
                disabled={!importFile || importLoading}
              >
                {importLoading ? 'Importando...' : 'Importar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}