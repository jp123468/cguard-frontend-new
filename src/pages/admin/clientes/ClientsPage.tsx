  import { useState, useEffect, useMemo, useRef } from "react";
  import { useTranslation } from "react-i18next";
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
  Eye,
  Tag,
  Archive,
  Trash,
  RotateCcw,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { clientService } from "@/lib/api/clientService";
type Client = any;

type ClientFilters = {
  active?: boolean;
  email?: string;
  phoneNumber?: string;
  city?: string;
  country?: string;
  category?: string;
  name?: string;
  lastName?: string;
};

import { categoryService, type Category } from "@/lib/api/categoryService";
import CategoryManagerDialog from "@/components/categories/CategoryManagerDialog";
import { ClientDetailsDialog } from "@/components/clients/ClientDetailsDialog";
import { BulkActionsSelect, type BulkAction } from "@/components/table/BulkActionsSelect";
import { DataTable, type Column } from "@/components/table/DataTable";
import type { RowAction } from "@/components/table/RowActionsMenu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CategorySelect } from "@/components/categories/CategorySelect";
import { ImportDialog } from "@/components/clients/ImportDialog";
import { usePermissions } from "@/hooks/usePermissions";
// Local replacement for missing hook: useDebouncedValue
function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const handler = window.setTimeout(() => setDebounced(value), delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debounced;
}

const getServerErrorMessage = (error: any, defaultMessage = "Error") => {
  try {
    return (
      error?.response?.data?.message ??
      error?.message ??
      defaultMessage
    );
  } catch {
    return defaultMessage;
  }
};

export default function ClientesPage() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const [openFilter, setOpenFilter] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [openCategoryManager, setOpenCategoryManager] = useState(false);
  const [openClientDetails, setOpenClientDetails] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<ClientFilters>({ active: true });
  const [bulkKey, setBulkKey] = useState(0);
  // Sorting state
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);
  const [openMoveDialog, setOpenMoveDialog] = useState(false);
  const [moveCategories, setMoveCategories] = useState<string[]>([]);
  const [moveLoading, setMoveLoading] = useState(false);
  const [openCategorizeDialog, setOpenCategorizeDialog] = useState(false);
  const [categorizeClientId, setCategorizeClientId] = useState<string | null>(null);
  const [categorizeClientName, setCategorizeClientName] = useState<string>("");
  const [categorizeCategories, setCategorizeCategories] = useState<string[]>([]);
  const [categorizeLoading, setCategorizeLoading] = useState(false);
  const [categorizeSaving, setCategorizeSaving] = useState(false);
  const [openArchiveBulkDialog, setOpenArchiveBulkDialog] = useState(false);
  const [openArchiveSingleDialog, setOpenArchiveSingleDialog] = useState(false);
  const [archiveSingleClient, setArchiveSingleClient] = useState<Client | null>(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);
  const [openRestoreDialog, setOpenRestoreDialog] = useState(false);
  const [restoreClient, setRestoreClient] = useState<Client | null>(null);
  const [openRestoreBulkDialog, setOpenRestoreBulkDialog] = useState(false);
  const [openDeleteBulkDialog, setOpenDeleteBulkDialog] = useState(false);

  const debouncedSearch = useDebouncedValue(searchQuery, 500);

  // Ensure we only notify tenant-missing once per page lifecycle
  const tenantMissingNotifiedRef = useRef(false);

  const loadClients = async () => {
    setLoading(true);
    try {
      const tenantId = localStorage.getItem('tenantId');
      if (!tenantId) {
        if (!tenantMissingNotifiedRef.current) {
          toast.error("El usuario debe estar vinculado a una empresa para continuar");
          tenantMissingNotifiedRef.current = true;
        }
        setClients([]);
        setTotalCount(0);
        return;
      }
      const pagination: any = { limit, offset: (page - 1) * limit };
      if (sortKey && sortDir) pagination.orderBy = `${sortKey}:${sortDir}`;

      const data = await clientService.getClients(
        { 
          ...filters, 
          name: debouncedSearch || undefined,
          lastName: debouncedSearch || undefined 
        },
        pagination
      );
      setClients(data.rows);
      setTotalCount(data.count);
    } catch (error: any) {
      console.error(error);
      toast.error(getServerErrorMessage(error, t('clients.errorLoadingClients')));
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const tenantId = localStorage.getItem('tenantId');
      if (!tenantId) {
        if (!tenantMissingNotifiedRef.current) {
          toast.error("El usuario debe estar vinculado a una empresa para continuar");
          tenantMissingNotifiedRef.current = true;
        }
        setCategories([]);
        return;
      }
      const data = await categoryService.list({ filter: { module: "clientAccount" }, limit: 1000 });
      setCategories(data.rows || []);
    } catch (error) {
      console.error("Error al cargar categorías:", error);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (openCategorizeDialog) {
      loadCategories();
    }
  }, [openCategorizeDialog]);

  useEffect(() => {
    if (openMoveDialog) {
      loadCategories();
    }
  }, [openMoveDialog]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  // Reset bulk action selector when filter (active state) changes to reflect new options
  useEffect(() => {
    setBulkKey((k) => k + 1);
  }, [filters.active]);

  useEffect(() => {
    loadClients();
  }, [page, limit, debouncedSearch, filters, sortKey, sortDir]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(clients.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const openCategorizeForClient = async (client: Client) => {
    setCategorizeClientId(client.id);
    setCategorizeClientName(`${client.name}${client.lastName ? ` ${client.lastName}` : ""}`);
    setCategorizeLoading(true);
    setCategorizeCategories([]);
    setOpenCategorizeDialog(true);
    try {
      const data = await clientService.getClient(client.id);
      setCategorizeCategories((data as any).categoryIds ?? []);
    } catch (error: any) {
      // error handled by backend
      setOpenCategorizeDialog(false);
    } finally {
      setCategorizeLoading(false);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (action === "gestionar-categorias") {
      // Permitir reabrir/retocar el diálogo aunque ya esté abierto
      setOpenCategoryManager((prev) => {
        if (prev) {
          // toggle para forzar re-render del diálogo
          setTimeout(() => setOpenCategoryManager(true), 0);
          return false;
        }
        return true;
      });
      // Resetear el selector para poder re-seleccionar la misma opción
      setBulkKey((k) => k + 1);
      return;
    }

    if (action === "mover") {
      if (selectedIds.length === 0) {
        // user-visible warnings/errors are handled by backend
        setBulkKey((k) => k + 1);
        return;
      }
      setMoveCategories([]);
      setOpenMoveDialog(true);
      setBulkKey((k) => k + 1);
      return;
    }

    if (selectedIds.length === 0) {
      // backend will notify user
      setBulkKey((k) => k + 1);
      return;
    }

    if (action === "archivar") {
      const invalid = selectedIds.filter((id) => {
        const c = clients.find((x) => x.id === id);
        return !c || c.active === false;
      });
      if (invalid.length > 0) {
        // backend will notify user
        setSelectedIds([]);
        setBulkKey((k) => k + 1);
        return;
      }
      setOpenArchiveBulkDialog(true);
      setBulkKey((k) => k + 1);
      return;
    }

    if (action === "restaurar") {
      const invalid = selectedIds.filter((id) => {
        const c = clients.find((x) => x.id === id);
        return !c || c.active === true;
      });
      if (invalid.length > 0) {
        // backend will notify user
        setSelectedIds([]);
        setBulkKey((k) => k + 1);
        return;
      }
      setOpenRestoreBulkDialog(true);
      setBulkKey((k) => k + 1);
      return;
    }

    if (action === "eliminar") {
      const invalid = selectedIds.filter((id) => {
        const c = clients.find((x) => x.id === id);
        return !c || c.active === true;
      });
      if (invalid.length > 0) {
        // backend will notify user
        setSelectedIds([]);
        setBulkKey((k) => k + 1);
        return;
      }
      setOpenDeleteBulkDialog(true);
      setBulkKey((k) => k + 1);
      return;
    }

    toast.info(t('clients.actionNotImplemented', { action }));
    // Resetear el selector tras cualquier acción
    setBulkKey((k) => k + 1);
  };

  const handleExportPDF = async () => {
    try {

      toast.loading(t('clients.generatingPDF'));
      const blob = await clientService.exportPDF({
        ...filters,
        name: debouncedSearch || undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clientes-${new Date().toISOString().split("T")[0]}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.dismiss();
      toast.success(t('clients.pdfDownloaded'));
    } catch (error: any) {
      toast.dismiss();
      // backend handles error notification
    }
  };

  const handleExportExcel = async () => {
    try {

      toast.loading(t('clients.generatingExcel'));
      const blob = await clientService.exportExcel({
        ...filters,
        name: debouncedSearch || undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clientes-${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.dismiss();
      toast.success(t('clients.excelDownloaded'));
    } catch (error: any) {
      toast.dismiss();
      // backend handles error notification
    }
  };

  const handleCategorizeSubmit = async () => {
    if (!categorizeClientId) return;
    setCategorizeSaving(true);
    console.log('🔵 Categorizando cliente:', {
      clientId: categorizeClientId,
      categoryIds: categorizeCategories,
    });
    try {
      await clientService.updateClient(categorizeClientId, {
        categoryIds: categorizeCategories,
      } as any);
      toast.success(t('clients.categoriesUpdated'));
      setOpenCategorizeDialog(false);
      loadClients();
      loadCategories();
    } catch (error: any) {
      // backend handles error notification
    } finally {
      setCategorizeSaving(false);
    }
  };

  const handleMoveSubmit = async () => {
    if (moveCategories.length === 0) {
      toast.warning(t('clients.selectAtLeastOneCategory'));
      return;
    }
    setMoveLoading(true);
    console.log('🟢 Moviendo clientes a categorías:', {
      selectedIds,
      categoryIds: moveCategories,
    });
    try {
      await Promise.all(
        selectedIds.map((id) =>
          clientService.updateClient(id, {
            categoryIds: moveCategories,
          } as any)
        )
      );
      toast.success(t('clients.categoriesUpdated'));
      setOpenMoveDialog(false);
      setSelectedIds([]);
      loadClients();
      loadCategories();
    } catch (error: any) {
      // backend handles error notification
    } finally {
      setMoveLoading(false);
    }
  };

  const bulkActions: BulkAction[] = useMemo(() => {
    const actions: BulkAction[] = [];
    // mover (cambiar categoría) requires edit
    if (hasPermission('clientAccountEdit')) actions.push({ value: "mover", label: t('clients.bulk.move') });
    if (filters.active === true) {
      if (hasPermission('clientAccountEdit')) actions.push({ value: "archivar", label: t('clients.bulk.archive') });
    } else if (filters.active === false) {
      if (hasPermission('clientAccountEdit')) actions.push({ value: "restaurar", label: t('clients.bulk.restore') });
      if (hasPermission('clientAccountDestroy')) actions.push({ value: "eliminar", label: t('clients.bulk.delete') });
    } else {
      if (hasPermission('clientAccountEdit')) actions.push({ value: "archivar", label: t('clients.bulk.archive') });
      if (hasPermission('clientAccountEdit')) actions.push({ value: "restaurar", label: t('clients.bulk.restore') });
      if (hasPermission('clientAccountDestroy')) actions.push({ value: "eliminar", label: t('clients.bulk.delete') });
    }
    if (hasPermission('clientAccountEdit')) actions.push({ value: "gestionar-categorias", label: t('clients.bulk.manageCategories') });
    return actions;
  }, [filters.active]);

  const columns: Column<Client>[] = useMemo(
    () => [
      {
        key: "name",
        header: t('clients.columns.name'),
        className: "font-medium",
        render: (value, row) => {
          const lastName = row.lastName && row.lastName !== 'undefined' ? row.lastName : '';
          return lastName ? `${row.name} ${lastName}` : row.name;
        }

      },
      { key: "address", header: t('clients.columns.address') },
      { key: "email", header: t('clients.columns.email') },
      { key: "phoneNumber", header: t('clients.columns.phone') },
      {
        key: "active",
        header: t('clients.columns.status'),
        render: (_value: any, row: Client) => {
          // El backend puede enviar booleano o entero (0/1)
          const isActive = row.active === true ;
          return (
            <span className={`px-2 py-1 text-xs rounded-full ${
              isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}>
              {isActive ? t('clients.status.active') : t('clients.status.archived')}
            </span>
          );
        },
      },
    ],
    []
  );

  const rowActions = (client: Client): RowAction[] => {
    const isActive = client.active === true;
    const actions: RowAction[] = [];

    if (hasPermission('clientAccountRead')) {
      actions.push({
        label: t('clients.actions.viewDetails'),
        icon: <Eye className="h-4 w-4" />,
        onClick: () => {
          setSelectedClientId(client.id);
          setOpenClientDetails(true);
        },
      });
    }

    if (isActive) {
      if (hasPermission('clientAccountEdit')) {
        actions.push({
          label: t('clients.actions.categorize'),
          icon: <Tag className="h-4 w-4" />,
          onClick: () => openCategorizeForClient(client),
        });

        actions.push({
          label: t('clients.actions.archive'),
          icon: <Archive className="h-4 w-4" />,
          onClick: async () => {
            try {
              await clientService.updateClient(client.id, { active: false } as any);
              toast.success(t('clients.clientArchived'));
              // refresh list
              loadClients();
            } catch (error: any) {
              toast.error(getServerErrorMessage(error, t('clients.errorArchiveClient')));
            }
          },
        });
      }
    } else {
      if (hasPermission('clientAccountDestroy')) {
        actions.push({
            label: t('clients.actions.delete'),
            icon: <Trash className="h-4 w-4" />,
            onClick: () => {
              setDeleteClient(client);
              setOpenDeleteDialog(true);
            },
          });
      }

      if (hasPermission('clientAccountEdit')) {
        actions.push({
            label: t('clients.actions.restore'),
            icon: <RotateCcw className="h-4 w-4" />,
            onClick: () => {
              setRestoreClient(client);
              setOpenRestoreDialog(true);
            },
          });
      }
    }

    return actions;
  };

  const from = clients.length > 0 ? (page - 1) * limit + 1 : 0;
  const to = Math.min(page * limit, totalCount);

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: t('clients.breadcrumb.dashboard'), path: "/dashboard" },
          { label: t('clients.breadcrumb.clients') },
        ]}
      />

      <section className="p-4">
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <BulkActionsSelect key={bulkKey} actions={bulkActions} onChange={handleBulkAction} />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('clients.searchPlaceholder')}
                className="pl-9 w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {hasPermission('clientAccountCreate') && (
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white"
                asChild
              >
                <Link to="/clients/add-new">{t('clients.newClient')}</Link>
              </Button>
            )}

            <Sheet open={openFilter} onOpenChange={setOpenFilter}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="text-orange-600 border-orange-200"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  {t('clients.filters.title')}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[400px] sm:w-[460px]">
                <SheetHeader>
                  <SheetTitle>{t('clients.filters.title')}</SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label>{t('clients.filters.email')}</Label>
                    <Input
                      placeholder={t('clients.placeholders.emailExample')}
                      value={filters.email || ""}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          email: e.target.value || undefined,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('clients.filters.phone')}</Label>
                    <Input
                      placeholder={t('clients.placeholders.phoneExample')}
                      value={filters.phoneNumber || ""}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          phoneNumber: e.target.value || undefined,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('clients.filters.city')}</Label>
                    <Input
                      placeholder={t('clients.placeholders.cityExample')}
                      value={filters.city || ""}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          city: e.target.value || undefined,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('clients.filters.country')}</Label>
                    <Input
                      placeholder={t('clients.placeholders.countryExample')}
                      value={filters.country || ""}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          country: e.target.value || undefined,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('clients.filters.categories')}</Label>
                    <Select
                      value={filters.category || "all"}
                      onValueChange={(v) =>
                        setFilters({
                          ...filters,
                          category: v === "all" ? undefined : v,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('clients.filters.all')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('clients.filters.all')}</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('clients.filters.status')}</Label>
                    <Select
                      value={
                        filters.active === undefined
                          ? "all"
                          : filters.active
                          ? "active"
                          : "inactive"
                      }
                      onValueChange={(v) => {
                        if (v === "all") {
                          setFilters({ ...filters, active: undefined });
                        } else if (v === "active") {
                          setFilters({ ...filters, active: true });
                        } else {
                          setFilters({ ...filters, active: false });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('clients.filters.all')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('clients.filters.all')}</SelectItem>
                        <SelectItem value="active">{t('clients.filters.active')}</SelectItem>
                        <SelectItem value="inactive">{t('clients.filters.archived')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={() => setOpenFilter(false)}
                  >
                    {t('clients.applyFilters')}
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setFilters({ active: true });
                      setOpenFilter(false);
                    }}
                  >
                    {t('clients.clearFilters')}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <EllipsisVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem disabled={!hasPermission('clientAccountRead')} onClick={async () => { if (!hasPermission('clientAccountRead')) return; await handleExportPDF(); }}>
                  <FileDown className="mr-2 h-4 w-4" /> {t('clients.export.pdf')}
                </DropdownMenuItem>
                <DropdownMenuItem disabled={!hasPermission('clientAccountRead')} onClick={async () => { if (!hasPermission('clientAccountRead')) return; await handleExportExcel(); }}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> {t('clients.export.excel')}
                </DropdownMenuItem>
                {hasPermission('clientAccountImport') && (
                  <DropdownMenuItem onClick={() => setOpenImport(true)}>
                    <ArrowDownUp className="mr-2 h-4 w-4" /> {t('clients.import')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-4">
          <DataTable<Client>
            columns={columns}
            data={clients}
            loading={loading}
            selectedIds={selectedIds}
            onSelectAll={handleSelectAll}
            onSelectOne={handleSelectOne}
            rowActions={rowActions}
            sortKey={sortKey ?? undefined}
            sortDir={sortDir ?? undefined}
            onSortChange={(key, dir) => {
              setSortKey(dir ? key : null);
              setSortDir(dir);
              setPage(1);
            }}
            emptyState={
              <div className="flex flex-col items-center justify-center text-center">
                <img
                  src="https://app.guardspro.com/assets/icons/custom/no-data-found.png"
                  alt={t('clients.empty.alt')}
                  className="h-36 mb-4"
                />
                <h3 className="text-lg font-semibold">
                  {t('clients.empty.title')}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                  {t('clients.empty.description')}
                </p>
              </div>
            }
          />

          <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-600 bg-gray-50 border-x border-b rounded-b-lg">
            <div className="flex items-center gap-2">
              <span>{t('clients.pagination.itemsPerPage')}</span>
              <Select
                value={limit.toString()}
                onValueChange={(v) => {
                  setLimit(Number(v));
                  setPage(1);
                }}
              >
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

            <div>
              {from} – {to} {t('clients.pagination.of')} {totalCount}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1 || loading}
                onClick={() => setPage((p) => p - 1)}
              >
                {t('clients.pagination.prev')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * limit >= totalCount || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                {t('clients.pagination.next')}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <ImportDialog open={openImport} onOpenChange={setOpenImport} onSuccess={loadClients} />
      <Dialog open={openMoveDialog} onOpenChange={setOpenMoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('clients.dialogs.changeCategories.title')}</DialogTitle>
            <DialogDescription>
              {t('clients.dialogs.changeCategories.desc', { count: selectedIds.length })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>{t('clients.dialogs.changeCategories.newCategories')}</Label>
            <CategorySelect
              module="clientAccount"
              multiple
              value={moveCategories}
              onChange={(val) => setMoveCategories(Array.isArray(val) ? val : [])}
              placeholder={categories.length === 0 ? t('clients.loading') : t('clients.selectCategories')}
              options={categories.map((c) => ({ id: c.id, name: c.name }))}
              onCategoryCreated={loadCategories}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenMoveDialog(false)} disabled={moveLoading}>
              {t('clients.cancel')}
            </Button>
            <Button onClick={handleMoveSubmit} disabled={moveLoading}>
              {moveLoading ? t('clients.saving') : t('clients.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={openCategorizeDialog} onOpenChange={setOpenCategorizeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('clients.dialogs.categorize.title')}</DialogTitle>
            <DialogDescription>
              {categorizeClientName || t('clients.client')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>{t('clients.filters.categories')}</Label>
            <CategorySelect
              module="clientAccount"
              multiple
              value={categorizeCategories}
              onChange={(val) => setCategorizeCategories(Array.isArray(val) ? val : [])}
              placeholder={categorizeLoading || categories.length === 0 ? t('clients.loading') : t('clients.selectCategories')}
              options={categories.map((c) => ({ id: c.id, name: c.name }))}
              onCategoryCreated={loadCategories}
            />
          </div>

          <DialogFooter>
            <Button 
            variant="outline" onClick={() => setOpenCategorizeDialog(false)} disabled={categorizeSaving}>
              {t('clients.cancel')}
            </Button>
            <Button 
            className="bg-orange-500 hover:bg-orange-600"
            onClick={handleCategorizeSubmit} disabled={categorizeSaving || categorizeLoading}>
              {categorizeSaving ? t('clients.saving') : t('clients.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CategoryManagerDialog open={openCategoryManager} onOpenChange={setOpenCategoryManager} module="clientAccount" onChanged={loadCategories} />
      <ClientDetailsDialog
        open={openClientDetails}
        onOpenChange={setOpenClientDetails}
        clientId={selectedClientId}
      />

      <AlertDialog open={openArchiveBulkDialog} onOpenChange={setOpenArchiveBulkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('clients.alerts.archiveClients.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('clients.alerts.archiveClients.desc', { count: selectedIds.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('clients.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                  try {
                    await Promise.all(
                      selectedIds.map((id) =>
                        clientService.updateClient(id, { active: false } as any)
                      )
                    );
                    toast.success(t('clients.clientsArchived'));
                    setSelectedIds([]);
                    loadClients();
                    setOpenArchiveBulkDialog(false);
                  } catch (error: any) {
                    // backend handles errors
                  }
                }}
            >
              {t('clients.accept')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={openRestoreBulkDialog} onOpenChange={setOpenRestoreBulkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('clients.alerts.restoreClients.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('clients.alerts.restoreClients.desc', { count: selectedIds.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('clients.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await Promise.all(
                    selectedIds.map((id) =>
                      clientService.updateClient(id, { active: true } as any)
                    )
                  );
                  toast.success(t('clients.clientsRestored'));
                  setSelectedIds([]);
                  loadClients();
                  setOpenRestoreBulkDialog(false);
                } catch (error: any) {
                  // backend handles errors
                }
              }}
            >
              {t('clients.accept')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={openDeleteBulkDialog} onOpenChange={setOpenDeleteBulkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('clients.alerts.deleteClients.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('clients.alerts.deleteClients.desc', { count: selectedIds.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('clients.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await clientService.deleteClients(selectedIds);
                  toast.success(t('clients.clientsDeleted'));
                  setSelectedIds([]);
                  loadClients();
                  setOpenDeleteBulkDialog(false);
                } catch (error: any) {
                  // backend handles errors
                }
              }}
            >
              {t('clients.accept')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('clients.alerts.deleteClient.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('clients.alerts.deleteClient.desc', { name: deleteClient?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('clients.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteClient) return;
                try {
                  await clientService.deleteClients([deleteClient.id]);
                  toast.success(t('clients.clientDeleted'));
                  loadClients();
                } catch (error: any) {
                  // backend handles errors
                }
              }}
            >
              {t('clients.accept')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={openRestoreDialog} onOpenChange={setOpenRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('clients.alerts.restoreClient.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('clients.alerts.restoreClient.desc', { name: restoreClient?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('clients.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!restoreClient) return;
                try {
                  await clientService.updateClient(restoreClient.id, { active: true } as any);
                  toast.success(t('clients.clientRestored'));
                  loadClients();
                } catch (error: any) {
                  // backend handles errors
                }
              }}
            >
              {t('clients.accept')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
