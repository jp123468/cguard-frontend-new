import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MobileCardList from '@/components/responsive/MobileCardList';
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
  Copy,
  Send,
  Archive,
  RotateCw,
  Trash,
} from "lucide-react";
import { Link } from "react-router-dom";
import * as XLSX from 'xlsx';
import { usePermissions } from '@/hooks/usePermissions';
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import securityGuardService from '@/lib/api/securityGuardService';
import { clientService } from '@/lib/api/clientService';
import { postSiteService } from '@/lib/api/postSiteService';
import { categoryService } from '@/lib/api/categoryService';
// Fallback local Breadcrumb component (avoid missing module error)
interface BreadcrumbItem { label: string; path?: string; }
const Breadcrumb: React.FC<{ items: BreadcrumbItem[] }> = ({ items }) => (
  <nav className="py-2" aria-label="breadcrumb">
    <ol className="flex flex-wrap gap-2 text-sm text-gray-600">
      {items.map((it, idx) => (
        <li key={idx} className="flex items-center">
          {it.path ? (
            <a href={it.path} className="text-blue-600 hover:underline">{it.label}</a>
          ) : (
            <span>{it.label}</span>
          )}
          {idx < items.length - 1 && <span className="mx-2">/</span>}
        </li>
      ))}
    </ol>
  </nav>
);
// Tipos para los security-guards
type GuardStatus = "Activo" | "Pendiente" | "Archivado" | "Invitado";

interface SecurityGuard {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: GuardStatus;
  raw?: any; // Para detalles
}

export default function SecurityGuardsPage() {
  const { t } = useTranslation();
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
  // Options loaded from backend for filters
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);
  const [availableClients, setAvailableClients] = useState<any[]>([]);
  const [availablePostSites, setAvailablePostSites] = useState<any[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);

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
      toast.error(t('guards.list.toasts.printWindowOpenError', 'No se pudo abrir la ventana de impresión'));
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

  // Ejemplo de dónde cargar datos reales: carga lista desde backend cuando cambian filtros relevantes
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
    } else if (filterStatus === "todos") {
      // Request all statuses including archived: ask for ALL and archived
      // Backend will interpret 'ALL,archived' to include both active and soft-deleted rows
      params = { "filter[status]": "ALL,archived" };
    } else if (filterStatus === "pendientes") {
      params = { "filter[status]": "pending" };
    } else if (filterStatus === "invitados") {
      params = { "filter[status]": "invited" };
    }

    // Additional filters
    if (!params) params = {};
    if (filterCategory && filterCategory !== "todas") params["filter[categoryIds]"] = filterCategory;
    if (filterClient && filterClient !== "todos") params["filter[clientId]"] = filterClient;
    if (filterSite && filterSite !== "todos") params["filter[postSiteId]"] = filterSite;
    if (filterSkills && filterSkills !== "todos") params["filter[skills]"] = filterSkills;
    if (filterDepartment && filterDepartment !== "todos") params["filter[department]"] = filterDepartment;
    if (searchQuery) params["q"] = searchQuery;

    securityGuardService
      .list(params)
      .then((data: any) => {
        // Debugging: log raw response to help diagnose status mismatches
        try {
          console.debug('[SecurityGuardsPage] raw list response:', data);
        } catch (e) {
          // ignore
        }
        if (!mounted) return;
        // Algunos endpoints devuelven { rows, count } u otras formas
        const normalize = (item: any): SecurityGuard => {
          const guardObj = item.guard ?? {};
          // Prefer the securityGuard record id (item.id). Some API responses
          // include nested `guard` (user) objects where `guard.id` is the user id;
          // using that value as the list `id` causes actions that expect the
          // securityGuard record id (delete/restore) to fail with not-found.
          const id = item.id ?? guardObj.id ?? item.guardId ?? "";
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
            if (s === "invited" || s === "invitado") return "Pendiente";
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

        let normalizedList: SecurityGuard[] = [];
        if (Array.isArray(data)) normalizedList = data.map(normalize);
        else if (data && Array.isArray((data as any).rows)) normalizedList = (data as any).rows.map(normalize);
        else normalizedList = [];

        // Log normalized entries and highlight those that map to 'Pendiente'
        try {
          console.debug('[SecurityGuardsPage] normalized guards:', normalizedList);
          const pending = normalizedList.filter((g) => g.status === 'Pendiente');
          if (pending.length) {
            console.debug('[SecurityGuardsPage] guards with Pendiente status (raw):', pending.map((g) => ({ id: g.id, name: g.name, email: g.email, raw: g.raw })));
          }
        } catch (e) {
          // ignore logging errors
        }

        setGuards(normalizedList);
      })
      .catch((err: any) => {
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
  }, [filterStatus, filterCategory, filterClient, filterSite, filterSkills, filterDepartment, searchQuery]);

  // Load filter options when sheet opens
  useEffect(() => {
    if (openFilter) {
      setLoadingFilters(true);
      Promise.all([
        clientService.getClients(),
        postSiteService.list({}, { limit: 100, offset: 0 }),
        categoryService.list(),
      ])
        .then(([clientsRes, postSitesRes, categoriesRes]) => {
          setAvailableClients(clientsRes.rows ?? []);
          // postSiteService.list returns { rows, count }
          setAvailablePostSites(postSitesRes.rows ?? []);
          // categoryService.list returns { rows }
          setAvailableCategories(categoriesRes.rows ?? []);
        })
        .catch((err) => {
          console.error('Error loading filter options', err);
        })
        .finally(() => setLoadingFilters(false));
    }
  }, [openFilter]);

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
        // Backwards-compatibility: map legacy "Invitado" to "Pendiente" badge
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            Pendiente
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
          { label: t('sidebar.panel', 'Panel de control'), path: "/dashboard" },
          { label: t('guards.list.pageTitle', 'Guardias') },
        ]}
      />
      {error && (
        <div className="p-4 my-2 rounded-md bg-red-50 text-red-800">
          {t('guards.list.error.loading', 'Error cargando guardias: {{msg}}', { msg: error })}
        </div>
      )}
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
                    toast.error(t('guards.list.toasts.selectAtLeastOne', 'Selecciona al menos un guardia'));
                    setBulkActionValue("");
                    return;
                  }

                  // Permission checks for bulk actions
                  if (v === 'eliminar' && !hasPermission('securityGuardDestroy')) {
                    toast.error(t('guards.list.toasts.noPermissionDelete', 'No tienes permiso para eliminar guardias'));
                    setBulkActionValue("");
                    return;
                  }
                  if ((v === 'archivar' || v === 'restaurar' || v === 'mover') && !hasPermission('securityGuardEdit')) {
                    toast.error(t('guards.list.toasts.noPermissionEdit', 'No tienes permiso para modificar guardias'));
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
                  <SelectValue placeholder={t('actions.action', 'Acción')} />
                </SelectTrigger>
                <SelectContent>
                  {selectedGuards.length > 0 && selectedGuards.some((sid) => (guards.find((g) => g.id === sid)?.status === "Archivado")) ? (
                    <>
                      <SelectItem value="restaurar">{t('guards.list.actions.restore', 'Restaurar')}</SelectItem>
                      <SelectItem value="eliminar">{t('actions.delete', 'Eliminar')}</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="archivar">{t('guards.list.actions.archive', 'Archivar')}</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('guards.list.searchPlaceholder', 'Buscar guardia')}
                  className="pl-9 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {hasPermission('securityGuardCreate') && (
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white" asChild>
                  <Link to="/security-guards/new">{t('guards.list.newGuard', 'Nuevo Guardia')}</Link>
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
                    {t('guards.list.filters', 'Filtros')}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[400px] sm:w-[460px]">
                  <SheetHeader>
                    <SheetTitle>{t('guards.list.filters', 'Filtros')}</SheetTitle>
                  </SheetHeader>

                  <div className="mt-6 space-y-4">
                    <div className="space-y-2">
                      <Label>{t('guards.list.filter.categories', 'Categorías')}</Label>
                      <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Categorías" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todas">{t('guards.list.filter.categoriesAll', 'Todas')}</SelectItem>
                            {availableCategories.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t('guards.list.filter.client', 'Cliente')}</Label>
                      <Select value={filterClient} onValueChange={(v) => setFilterClient(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">{t('guards.list.filter.clientAll', 'Todos')}</SelectItem>
                          {availableClients.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {(() => {
                                const fullFromFields = c.fullName ?? c.full_name ?? c.fullname;
                                if (fullFromFields && String(fullFromFields).trim()) return String(fullFromFields).trim();
                                const first = c.firstName ?? c.first_name ?? '';
                                const last = c.lastName ?? c.last_name ?? '';
                                if (first && last) return `${first} ${last}`.trim();
                                if (!first && last && c.name) return `${c.name} ${last}`.trim();
                                if (first && !last) return first;
                                if (!first && last) return last;
                                // If `name` looks like a full name (contains space), prefer it
                                if (c.name && String(c.name).includes(' ')) return c.name;
                                return c.name ?? c.companyName ?? c.fullName ?? c.label ?? c.email ?? c.id;
                              })()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t('guards.list.filter.site', 'Sitio de publicación')}</Label>
                      <Select value={filterSite} onValueChange={(v) => setFilterSite(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sitio de publicación" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">{t('guards.list.filter.siteAll', 'Todos')}</SelectItem>
                          {availablePostSites.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>{s.name ?? s.companyName ?? s.id}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t('guards.list.filter.skills', 'Conjunto de Habilidades')}</Label>
                      <Select value={filterSkills} onValueChange={(v) => setFilterSkills(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Conjunto de Habilidades" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">{t('guards.list.filter.skillsAll', 'Todos')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t('guards.list.filter.department', 'Departamento')}</Label>
                      <Select value={filterDepartment} onValueChange={(v) => setFilterDepartment(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Departamento" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">{t('guards.list.filter.departmentAll', 'Todos')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t('guards.list.filter.status', 'Estado*')}</Label>
                      <Select
                        value={filterStatus}
                        onValueChange={(v) => {
                          setFilterStatus(v);
                          // Apply immediately and close the filter sheet
                          setOpenFilter(false);
                        }}
                      >
                          <SelectTrigger>
                          <SelectValue placeholder={t('guards.list.filter.statusAllPlaceholder', 'Todos los Guardias')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">{t('guards.list.filter.statusAll', 'Todos los Guardias')}</SelectItem>
                          <SelectItem value="activos">{t('guards.list.filter.statusActive', 'Activos')}</SelectItem>
                          <SelectItem value="pendientes">{t('guards.list.filter.statusPending', 'Pendientes')}</SelectItem>
                          <SelectItem value="archivados">{t('guards.list.filter.statusArchived', 'Archivados')}</SelectItem>
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
                      {t('guards.list.applyFilters', 'Filtro')}
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
                      {t('guards.list.clearFilters', 'Limpiar filtros')}
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
                      <FileDown className="mr-2 h-4 w-4" /> {t('guards.list.export.pdf', 'Exportar como PDF')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={async () => { if (!(await exportFromBackend('excel'))) downloadFallback('excel', filteredGuards); }}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" /> {t('guards.list.export.excel', 'Exportar como Excel')}
                    </DropdownMenuItem>
                    {hasPermission('securityGuardImport') && (
                      <DropdownMenuItem onClick={() => setImportDialogOpen(true)}>
                        <ArrowDownUp className="mr-2 h-4 w-4" /> {t('guards.list.import', 'Importar')}
                      </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Tabla */}
          <div className="mt-4 border rounded-lg overflow-hidden">
            <div className="mt-2">
              <div className="md:block hidden">
                <table className="min-w-full text-sm text-left border-collapse">
              <thead className="bg-gray-50">
                <tr className="border-b">
                  <th className="px-4 py-3">
                    <Checkbox
                      checked={allOnPageSelected}
                      onCheckedChange={(v) =>
                        handleSelectAllGuards(Boolean(v))
                      }
                      aria-label={t('guards.list.selectAllAria', 'Seleccionar todos los guardias de esta página')}
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold">{t('guards.list.table.name', 'Nombre')}</th>
                  <th className="px-4 py-3 font-semibold">{t('guards.list.table.email', 'Correo Electrónico')}</th>
                  <th className="px-4 py-3 font-semibold">{t('guards.list.table.phone', 'Número de Móvil')}</th>
                  <th className="px-4 py-3 font-semibold">{t('guards.list.table.status', 'Estado')}</th>
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
                          aria-label={t('guards.list.selectAria', 'Seleccionar {{name}}', { name: guard.name })}
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
                          aria-label={t('guards.list.openOverviewAria', 'Abrir resumen de {{name}}', { name: guard.name })}
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
                                      // Build minimal payload for resend: prefer guard id if available, otherwise email/contact
                                      const payload: any = {};
                                      if (guard.raw?.guard && guard.raw.guard.id) {
                                        payload.guard = guard.raw.guard.id;
                                      } else if (guard.email) {
                                        payload.contact = guard.email;
                                      } else if (guard.raw?.contact) {
                                        payload.contact = guard.raw.contact;
                                      }
                                      // Include names when available
                                      if (guard.raw?.guard?.firstName || guard.raw?.firstName) {
                                        payload.firstName = guard.raw?.guard?.firstName || guard.raw?.firstName;
                                      }
                                      if (guard.raw?.guard?.lastName || guard.raw?.lastName) {
                                        payload.lastName = guard.raw?.guard?.lastName || guard.raw?.lastName;
                                      }

                                      await securityGuardService.resendInvite(payload);
                                      toast.success(t('guards.list.toasts.inviteResent', 'Invitación reenviada'));
                                      // Refresh list
                                      try {
                                        const refreshed = await securityGuardService.list();
                                        const normalize = (item: any) => {
                                          const guardObj = item.guard ?? {};
                                          const id = item.id ?? guardObj.id ?? item.guardId ?? "";
                                          const name =
                                            (guardObj.firstName && guardObj.lastName)
                                              ? `${guardObj.firstName} ${guardObj.lastName}`
                                              : item.fullName ?? `${guardObj.firstName ?? ""} ${guardObj.lastName ?? ""}`.trim();
                                          const email = guardObj.email ?? item.email ?? "";
                                          const phone =
                                            guardObj.phone ?? guardObj.phoneNumber ?? item.guard?.phoneNumber ?? item.phoneNumber ?? item.phone ?? item.mobile ?? "";
                                          const status: GuardStatus = ((): GuardStatus => {
                                            const s = (guardObj.status ?? item.status ?? "").toString().toLowerCase();
                                            if (s === "active" || s === "activo") return "Activo";
                                            if (s === "invited" || s === "invitado") return "Pendiente";
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

                                        if (Array.isArray(refreshed)) setGuards(refreshed.map(normalize));
                                        else if (refreshed && Array.isArray((refreshed as any).rows)) setGuards((refreshed as any).rows.map(normalize));
                                      } catch (e) {
                                        // ignore refresh errors
                                      }
                                    } catch (err) {
                                      console.error(err);
                                      toast.error(t('guards.list.toasts.inviteResendError', 'Error reenviando invitación'));
                                    }
                                  }}
                                >
                                  <Send className="mr-2 h-4 w-4" /> {t('guards.list.actions.resendInvite','Reenviar Invitación')}
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
                                    <Trash className="mr-2 h-4 w-4" /> {t('guards.list.actions.remove','Remover')}
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
                                    <Eye className="mr-2 h-4 w-4" /> {t('guards.list.actions.viewDetails','Ver Detalles')}
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
                                        <RotateCw className="mr-2 h-4 w-4" /> {t('guards.list.actions.restore','Restaurar')}
                                      </DropdownMenuItem>
                                    )}
                                    {hasPermission('securityGuardDestroy') && (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setGuardToDelete(guard);
                                          setDeleteDialogOpen(true);
                                        }}
                                      >
                                        <Archive className="mr-2 h-4 w-4" /> {t('guards.list.actions.deletePermanently','Eliminar permanentemente')}
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
                                        <Archive className="mr-2 h-4 w-4" /> {t('guards.list.actions.archive','Archivar')}
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
                          {t('guards.list.empty.title', 'No se encontraron resultados')}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                          {t('guards.list.empty.description', 'No pudimos encontrar ningún elemento que coincida con su búsqueda')}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
                </table>
              </div>

              <div className="md:hidden">
                <MobileCardList
                  items={paginatedGuards || []}
                  loading={false}
                  emptyMessage={t('guards.list.noData', { defaultValue: 'No guards found' }) as string}
                  renderCard={(g: any) => (
                    <div className="p-4 bg-white border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">{(g.name?.trim()?.[0] ?? 'G').toUpperCase()}</div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold">{g.name}</div>
                          <div className="text-xs text-gray-500">{g.email}</div>
                        </div>
                        <div className="text-xs text-gray-500 text-right">{g.status}</div>
                      </div>
                    </div>
                  )}
                />
              </div>
            </div>

            {/* Paginación (única) */}
            <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-600 bg-gray-50">
              <div className="flex items-center gap-2">
                <span>{t('guards.list.pagination.itemsPerPage', 'Elementos por página')}</span>
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
                  {filteredGuards.length > 0 ? (
                    t('guards.list.pagination.range', '{{start}} - {{end}} de {{total}}', {
                      start: (currentPage - 1) * itemsPerPage + 1,
                      end: Math.min(currentPage * itemsPerPage, filteredGuards.length),
                      total: filteredGuards.length,
                    })
                  ) : (
                    t('guards.list.pagination.emptyRange', '0 – 0 de 0')
                  )}
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
            <DialogTitle>{t('guards.list.dialog.archive.title', 'Archivar guardia')}</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            {t('guards.list.dialog.archive.description', '¿Estás seguro que deseas archivar este guardia? Esta acción se puede revertir desde el filtro.')}
          </DialogDescription>
          <div className="mt-4">
            <div className="text-sm text-gray-700">
              <strong>{t('guards.list.labels.name', 'Nombre')}:</strong> {guardToArchive?.name ?? "-"}
            </div>
            <div className="text-sm text-gray-700">{guardToArchive?.email ?? ""}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveDialogOpen(false)} disabled={archiveLoading}>
              {t('actions.cancel', 'Cancelar')}
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
                    toast.error(t('guards.list.toasts.archiveOnDutyError', 'No se puede archivar: el guardia está actualmente en servicio.'));
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
                  toast.success(t('guards.list.toasts.archived', 'Guardia archivado'));
                  setArchiveDialogOpen(false);
                } catch (err: any) {
                  console.error("Error archivando guardia:", err);
                  toast.error(t('guards.list.toasts.archiveError', 'Error archivando guardia: {{msg}}', { msg: err?.message || String(err) }));
                } finally {
                  setArchiveLoading(false);
                }
              }}
              disabled={archiveLoading}
            >
              {archiveLoading ? t('guards.list.buttons.archiving', 'Archivando…') : t('guards.list.actions.archive', 'Archivar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Diálogo para eliminar permanentemente (solo si está archivado) */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('guards.list.dialog.delete.title', 'Eliminar guardia permanentemente')}</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            {guardToDelete?.status === "Pendiente" ? (
              <>{t('guards.list.dialog.delete.description.pending', 'Esta acción eliminará permanentemente al guardia pendiente. No podrá recuperarse después de eliminarlo.')}</>
            ) : (
              <>{t('guards.list.dialog.delete.description.default', 'Esta acción eliminará permanentemente al guardia. Asegúrate de que el guardia esté archivado y no esté en servicio.')}</>
            )}
          </DialogDescription>
          <div className="mt-4">
            <div className="text-sm text-gray-700">
              <strong>{t('guards.list.labels.name', 'Nombre')}:</strong> {guardToDelete?.name ?? "-"}
            </div>
            <div className="text-sm text-gray-700">{guardToDelete?.email ?? ""}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleteLoading}>
              {t('actions.cancel', 'Cancelar')}
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
                  toast.success(t('guards.list.toasts.deleteSuccess', 'Guardia eliminado permanentemente'));
                  setDeleteDialogOpen(false);
                } catch (err: any) {
                  console.error("Error eliminando guardia:", err);
                  // Show user-friendly error
                  try {
                    toast.error(t('guards.list.toasts.deleteError', 'No se pudo eliminar el guardia: {{msg}}', { msg: err?.message || String(err) }));
                  } catch (e) {
                    // ignore toast failures
                  }
                } finally {
                  setDeleteLoading(false);
                }
              }}
              disabled={deleteLoading}
            >
              {deleteLoading ? t('guards.list.buttons.deleting', 'Eliminando…') : t('actions.delete', 'Eliminar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Diálogo para restaurar guardia (si está archivado) */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('guards.list.dialog.restore.title', 'Restaurar guardia')}</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            {t('guards.list.dialog.restore.description', '¿Deseas restaurar este guardia? La acción lo devolverá al estado activo.')}
          </DialogDescription>
          <div className="mt-4">
            <div className="text-sm text-gray-700">
              <strong>{t('guards.list.labels.name', 'Nombre')}:</strong> {guardToRestore?.name ?? "-"}
            </div>
            <div className="text-sm text-gray-700">{guardToRestore?.email ?? ""}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)} disabled={restoreLoading}>
              {t('actions.cancel', 'Cancelar')}
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
                  toast.success(t('guards.list.toasts.restoreSuccess', 'Guardia restaurado'));
                  setRestoreDialogOpen(false);
                } catch (err: any) {
                  console.error("Error restaurando guardia:", err);
                  toast.error(t('guards.list.toasts.restoreError', 'Error restaurando guardia: {{msg}}', { msg: err?.message || String(err) }));
                } finally {
                  setRestoreLoading(false);
                }
              }}
              disabled={restoreLoading}
            >
              {restoreLoading ? t('guards.list.buttons.restoring', 'Restaurando…') : t('guards.list.actions.restore', 'Restaurar')}
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
                ? t('guards.list.dialog.bulk.archiveTitle', 'Archivar guardias')
                : bulkActionType === "restaurar"
                ? t('guards.list.dialog.bulk.restoreTitle', 'Restaurar guardias')
                : bulkActionType === "eliminar"
                ? t('guards.list.dialog.bulk.deleteTitle', 'Eliminar guardias')
                : t('guards.list.dialog.bulk.confirmTitle', 'Confirmar acción')}
            </DialogTitle>
          </DialogHeader>
          <DialogDescription>
            {bulkActionType === "archivar" && (
              <>{t('guards.list.dialog.bulk.archiveDescription', '¿Estás seguro de que deseas archivar {{count}} guardia(s)? Esta acción se puede revertir desde el filtro de archivados.', { count: selectedGuards.length })}</>
            )}
            {bulkActionType === "restaurar" && (
              <>{t('guards.list.dialog.bulk.restoreDescription', '¿Deseas restaurar {{count}} guardia(s)? Estos guardias volverán al estado activo.', { count: selectedGuards.length })}</>
            )}
            {bulkActionType === "eliminar" && (
              <>{t('guards.list.dialog.bulk.deleteDescription', 'Esta acción eliminará permanentemente {{count}} guardia(s). ¿Deseas continuar?', { count: selectedGuards.length })}</>
            )}
          </DialogDescription>
          <div className="mt-4">
            <div className="text-sm text-gray-700">
              <strong>{t('guards.list.labels.selectedGuards', 'Guardias seleccionados')}: </strong>
              {selectedGuards.length}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkActionDialogOpen(false)} disabled={bulkActionLoading}>
              {t('actions.cancel', 'Cancelar')}
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
                    toast.success(t('guards.list.toasts.bulkArchived', 'Guardias archivados'));
                  } else if (bulkActionType === "restaurar") {
                    await securityGuardService.restore(ids);
                    setGuards((prev) =>
                      prev.map((g) => (selectedGuards.includes(g.id) ? { ...g, status: "Activo", raw: { ...g.raw, status: "active" } } : g))
                    );
                    toast.success(t('guards.list.toasts.bulkRestored', 'Guardias restaurados'));
                  } else if (bulkActionType === "eliminar") {
                    await securityGuardService.destroy(ids);
                    setGuards((prev) => prev.filter((g) => !selectedGuards.includes(g.id)));
                    toast.success(t('guards.list.toasts.bulkDeleted', 'Guardias eliminados permanentemente'));
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
              {bulkActionLoading ? t('guards.list.buttons.processing', 'Procesando…') : bulkActionType === "eliminar" ? t('actions.delete', 'Eliminar') : t('actions.confirm', 'Confirmar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {detailsOpen && detailsGuard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="button"
          tabIndex={0}
          aria-label={t('guards.list.aria.closeModal', 'Cerrar modal')}
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
              aria-label={t('actions.close', 'Cerrar')}
              style={{ lineHeight: 1 }}
            >
              ×
            </button>
            <h2 className="text-xl sm:text-2xl font-bold mb-1 text-center">{t('guards.list.details.title', 'Detalles del Guardia')}</h2>
            <div className="mb-4 text-xs sm:text-sm text-gray-500 text-center">{t('guards.list.details.description', 'Información detallada del guardia seleccionado.')}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mb-6">
              <div>
                <div className="font-semibold text-gray-700 text-sm">{t('guards.list.details.fields.firstName', 'Nombre')}</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.guard?.firstName ?? "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">{t('guards.list.details.fields.lastName', 'Apellidos')}</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.guard?.lastName ?? "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">{t('guards.list.details.fields.email', 'Correo')}</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.guard?.email ?? detailsGuard.email ?? "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">{t('guards.list.details.fields.phone', 'Teléfono')}</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.guard?.phoneNumber ?? detailsGuard.phone ?? "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">{t('guards.list.details.fields.governmentId', 'Cédula')}</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.governmentId ?? "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">{t('guards.list.details.fields.guardCredentials', 'Credencial Guardia')}</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.guardCredentials ?? "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">{t('guards.list.details.fields.address', 'Dirección')}</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.address ?? "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">{t('guards.list.details.fields.birthDate', 'Fecha de nacimiento')}</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.birthDate ?? "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">{t('guards.list.details.fields.birthPlace', 'Lugar de nacimiento')}</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.birthPlace ?? "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">{t('guards.list.details.fields.maritalStatus', 'Estado civil')}</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.maritalStatus ?? "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">{t('guards.list.details.fields.bloodType', 'Tipo de sangre')}</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.bloodType ?? "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">{t('guards.list.details.fields.academicInstruction', 'Instrucción académica')}</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.academicInstruction ?? "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">{t('guards.list.details.fields.hiringContractDate', 'Contrato')}</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.hiringContractDate ?? "-"}</div>
              </div>
              <div className="sm:col-span-2">
                <div className="font-semibold text-gray-700 text-sm">{t('guards.list.details.fields.gender', 'Género')}</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.gender ?? "-"}</div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <Button
                variant="outline"
                onClick={() => setDetailsOpen(false)}
                className="text-sm px-4 py-1"
              >
                {t('actions.close', 'Cerrar')}
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
                  {t('actions.edit', 'Editar')}
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
            <DialogTitle>{t('guards.list.importDialog.title', 'Importar Guardias desde Excel')}</DialogTitle>
            <DialogDescription>{t('guards.list.importDialog.description', 'Sube un archivo .xlsx/.xls/.csv para importar guardias.')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">{t('guards.list.import.howTo', 'Antes de cargar, asegúrese de:')}</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>{t('guards.list.importDialog.fileFormat', 'El archivo debe ser formato .xlsx, .xls o .csv')}</li>
                <li>
                  <strong>{t('guards.list.importDialog.requiredColumnsLabel', 'Columnas obligatorias:')}</strong> {t('guards.list.importDialog.requiredColumns', 'Nombre, Correo, Teléfono, Estado, Cédula, Fecha Contrato, Género, Tipo Sangre, Credenciales, Fecha Nac., Lugar Nac., Estado Civ., Educación, Dirección')}
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
                  toast.success(t('guards.list.importDialog.templateDownloaded', 'Plantilla descargada'));
                }}
              >
                {t('guards.list.importDialog.downloadTemplate', 'Descargar plantilla de ejemplo')}
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
                <p className="text-sm text-muted-foreground font-medium">{importFile ? importFile.name : t('guards.list.importDialog.browsePlaceholder', 'Explorar tu archivo Excel aquí....')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('guards.list.importDialog.clickToSelect', 'Click para seleccionar')}</p>
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setImportDialogOpen(false)} disabled={importLoading}>
                {t('actions.cancel', 'Cancelar')}
              </Button>
              <Button
                onClick={async () => {
                  if (!importFile) {
                    toast.error(t('guards.list.importDialog.errors.selectFile', 'Selecciona un archivo'));
                    return;
                  }

                  if (importFile.size === 0) {
                    toast.error(t('guards.list.importDialog.errors.emptyFile', 'El archivo está vacío'));
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
                        toast.error(t('guards.list.importDialog.errors.emptyCsvRows', 'El CSV no contiene filas de datos'));
                        return;
                      }
                      const firstLine = (lines[0] || '').trim();
                      const headers = firstLine.split(',').map((h) => h.replace(/^"|"$/g, '').trim());
                      const missing = requiredHeaders.filter((h) => !headers.some((hh) => hh.toLowerCase() === h.toLowerCase()));
                      if (missing.length > 0) {
                        console.debug('CSV headers found:', headers);
                        toast.error(t('guards.list.importDialog.errors.missingColumns', 'Faltan columnas obligatorias: {{columns}}. Si tu archivo contiene acentos, guarda como UTF-8 o intenta abrirlo en Excel y volver a exportar en UTF-8.', { columns: missing.join(', ') }));
                        return;
                      }
                      console.debug('CSV preview lines:', lines.slice(0, 5));
                    } catch (err) {
                      console.error('Error leyendo CSV para validación:', err);
                        toast.error(t('guards.list.importDialog.errors.csvValidationFailed', 'No se pudo validar el archivo CSV antes de subir. Asegúrate del formato.'));
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
                        toast.error(t('guards.list.importDialog.errors.emptyExcelRows', 'El archivo Excel no contiene filas de datos válidas'));
                        return;
                      }
                      console.debug('Excel preview rows:', rows.slice(0, 5));
                      } catch (err) {
                      console.error('Error leyendo Excel para validación:', err);
                      toast.error(t('guards.list.importDialog.errors.excelValidationFailed', 'No se pudo validar el archivo Excel antes de subir. Asegúrate del formato.'));
                      return;
                    }
                  } else {
                    console.debug('Archivo con extensión no reconocida:', importFile.name, importFile.type);
                  }

                  setImportLoading(true);
                  const toastId = toast.loading(t('guards.list.importDialog.processing', 'Procesando archivo...'));
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
                    toast.success(t('guards.list.importDialog.completed', 'Importación completada'));
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
                            if (s === "invited" || s === "invitado") return "Pendiente";
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
                {importLoading ? t('guards.list.importDialog.importing', 'Importando...') : t('guards.list.importDialog.import', 'Importar')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}