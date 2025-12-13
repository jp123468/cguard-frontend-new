import { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { clientService } from "@/lib/api/clientService";
import { categoryService, type Category } from "@/lib/api/categoryService";
import { Client, ClientFilters } from "@/types/client";
import { useDebouncedValue } from "@/hooks/useDebounce";
import { ImportDialog } from "@/components/clients/ImportDialog";
import { ClientDetailsDialog } from "@/components/clients/ClientDetailsDialog";
import { BulkActionsSelect, type BulkAction } from "@/components/table/BulkActionsSelect";
import { DataTable, type Column } from "@/components/table/DataTable";
import type { RowAction } from "@/components/table/RowActionsMenu";

export default function ClientesPage() {
  const [openFilter, setOpenFilter] = useState(false);
  const [openImport, setOpenImport] = useState(false);
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
  const [filters, setFilters] = useState<ClientFilters>({});

  const debouncedSearch = useDebouncedValue(searchQuery, 500);

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await clientService.getClients(
        { 
          ...filters, 
          name: debouncedSearch || undefined,
          lastName: debouncedSearch || undefined 
        },
        { limit, offset: (page - 1) * limit }
      );
      setClients(data.rows);
      setTotalCount(data.count);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar clientes");
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await categoryService.list();

      setCategories(data.rows);
    } catch (error) {
      console.error("Error al cargar categorías:", error);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  useEffect(() => {
    loadClients();
  }, [page, limit, debouncedSearch, filters]);

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

  const handleBulkAction = async (action: string) => {
    if (selectedIds.length === 0) {
      toast.warning("Selecciona al menos un cliente");
      return;
    }

    if (action === "eliminar") {
      if (!confirm(`¿Estás seguro de eliminar ${selectedIds.length} cliente(s)?`)) return;
      try {
        await clientService.deleteClients(selectedIds);
        toast.success("Clientes eliminados");
        setSelectedIds([]);
        loadClients();
      } catch (error) {
        toast.error("Error al eliminar");
      }
    } else {
      toast.info(`Acción "${action}" no implementada aún`);
    }
  };

  const handleExportPDF = async () => {
    try {

      toast.loading("Generando PDF...");
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
      toast.success("PDF descargado");
    } catch (error: any) {
      toast.dismiss();
      toast.error(error?.response?.data?.message || error?.message || "Error al exportar PDF");
    }
  };

  const handleExportExcel = async () => {
    try {

      toast.loading("Generando Excel...");
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
      toast.success("Excel descargado");
    } catch (error: any) {

      toast.dismiss();
      toast.error(error?.response?.data?.message || error?.message || "Error al exportar Excel");
    }
  };

  const bulkActions: BulkAction[] = [
    { value: "mover", label: "Mover" },
    { value: "archivar", label: "Archivar" },
    { value: "gestionar-categorias", label: "Gestionar Categorías" },
  ];

  const columns: Column<Client>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Cliente",
        className: "font-medium",
        render: (value, row) => {
          const lastName = row.lastName && row.lastName !== 'undefined' ? row.lastName : '';
          return lastName ? `${row.name} ${lastName}` : row.name;
        }

      },
      { key: "address", header: "Dirección" },
      { key: "email", header: "Correo Electrónico" },
      { key: "phoneNumber", header: "Número de Teléfono" },
      {
        key: "active",
        header: "Estado",
        render: (_value: any, row: Client) => {
          // El backend puede enviar booleano o entero (0/1)
          const isActive = row.active === true ;
          return (
            <span className={`px-2 py-1 text-xs rounded-full ${
              isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
            }`}>
              {isActive ? "Activo" : "Inactivo"}
            </span>
          );
        },
      },
    ],
    []
  );

  const rowActions = (client: Client): RowAction[] => [
    {
      label: "Ver Detalles",
      icon: <Eye className="h-4 w-4" />,
      onClick: () => {
        setSelectedClientId(client.id);
        setOpenClientDetails(true);
      },
    },
    {
      label: "Categorizar",
      icon: <Tag className="h-4 w-4" />,
      onClick: () => toast.info("Acción de categorizar pendiente"),
    },
    {
      label: "Archivo",
      icon: <Archive className="h-4 w-4" />,
      onClick: () => toast.info("Mover a archivo pendiente"),
    },
  ];

  const from = clients.length > 0 ? (page - 1) * limit + 1 : 0;
  const to = Math.min(page * limit, totalCount);

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Clientes" },
        ]}
      />

      <section className="p-4">
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <BulkActionsSelect actions={bulkActions} onChange={handleBulkAction} />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar Cliente"
                className="pl-9 w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              asChild
            >
              <Link to="/clients/add-new">Nuevo cliente</Link>
            </Button>

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
                    <Label>Correo Electrónico</Label>
                    <Input
                      placeholder="ejemplo@correo.com"
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
                    <Label>Número de Teléfono</Label>
                    <Input
                      placeholder="+593 123456789"
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
                    <Label>Ciudad</Label>
                    <Input
                      placeholder="Quito"
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
                    <Label>País</Label>
                    <Input
                      placeholder="Ecuador"
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
                    <Label>Categorías</Label>
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
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Estado</Label>
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
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="active">Activo</SelectItem>
                        <SelectItem value="inactive">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={() => setOpenFilter(false)}
                  >
                    Aplicar Filtros
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setFilters({});
                      setOpenFilter(false);
                    }}
                  >
                    Limpiar Filtros
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
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileDown className="mr-2 h-4 w-4" /> Exportar como PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar como Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOpenImport(true)}>
                  <ArrowDownUp className="mr-2 h-4 w-4" /> Importar
                </DropdownMenuItem>
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
            emptyState={
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
                  No pudimos encontrar ningún elemento que coincida con su
                  búsqueda.
                </p>
              </div>
            }
          />

          <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-600 bg-gray-50 border-x border-b rounded-b-lg">
            <div className="flex items-center gap-2">
              <span>Elementos por página</span>
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
              {from} – {to} de {totalCount}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1 || loading}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * limit >= totalCount || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      </section>

      <ImportDialog open={openImport} onOpenChange={setOpenImport} onSuccess={loadClients} />
      <ClientDetailsDialog
        open={openClientDetails}
        onOpenChange={setOpenClientDetails}
        clientId={selectedClientId}
      />
    </AppLayout>
  );
}
