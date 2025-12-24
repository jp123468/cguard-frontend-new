import { useEffect, useMemo, useState } from "react";
import { ApiService } from "@/services/api/apiService";
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

/* Debounce helper */
function useDebounced<T>(value: T, delay = 400) {
  const [deb, setDeb] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDeb(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return deb;
}

export default function AdminOfficeUsersPage() {
  const [openFilter, setOpenFilter] = useState(false);
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(25);

  const debouncedQuery = useDebounced(query, 450);

  // filas desde API
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const tenantId = localStorage.getItem("tenantId") || "";
        if (!tenantId) return;
        const res = await ApiService.get(`/tenant/${tenantId}/user`);
        let users: any[] = [];
        if (!res) users = [];
        else if (Array.isArray(res)) users = res;
        else if (res.rows && Array.isArray(res.rows)) users = res.rows;
        else users = Array.isArray(res.data) ? res.data : [];

        const normalizeRoles = (roles: any): string[] => {
          if (!roles) return [];
          if (Array.isArray(roles)) {
            return roles
              .map((r) => (typeof r === "string" ? r : r && (r.name || r.role) ? (r.name || r.role) : ""))
              .filter(Boolean)
              .map((s) => String(s).toLowerCase().trim());
          }
          if (typeof roles === "string") return [roles.toLowerCase().trim()];
          if (typeof roles === "object") {
            const candidate = roles.name || roles.role || roles.type || "";
            return candidate ? [String(candidate).toLowerCase().trim()] : [];
          }
          return [];
        };

        // Excluir usuarios con rol `securityGuard` (insensible a mayúsculas/espacios y distintos formatos)
        const filtered = users.filter((u) => {
          const r = normalizeRoles(u.roles || u.role || u.rolesList);
          return !(r.includes("securityguard") || r.includes("security_guard") || r.includes("guard"));
        }).map((u) => ({
          ...u,
          _rolesDisplay: (normalizeRoles(u.roles || u.role || u.rolesList) || []).join(", "),
        }));

        setRows(filtered);
      } catch (err) {
        console.error("Error cargando usuarios:", err);
      }
    };
    load();
  }, []);

  const filteredRows = useMemo(() => {
    if (!debouncedQuery) return rows;
    const q = debouncedQuery.toLowerCase();
    return rows.filter((r) => {
      const name = (r.firstName || r.name || "").toString().toLowerCase();
      const email = (r.email || "").toString().toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [rows, debouncedQuery]);

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Usuarios de Oficina Administrativa" },
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
                <SelectItem value="suspender">Suspender</SelectItem>
                <SelectItem value="eliminar">Eliminar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuario"
                className="w-64 pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Buscar usuario"
              />
            </div>

            <Button asChild className="bg-orange-500 text-white hover:bg-orange-600">
              <Link to="/back-office/new">Nuevo Usuario</Link>
            </Button>

            {/* Filtros */}
            <Sheet open={openFilter} onOpenChange={setOpenFilter}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="border-orange-200 text-orange-600"
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
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Categorías" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* llena con tus categorías reales */}
                        <SelectItem value="all">Todas</SelectItem>
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
                        {/* llena con tus clientes reales */}
                        <SelectItem value="all">Todos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los Usuarios" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* estados reales */}
                        <SelectItem value="all">Todos los Usuarios</SelectItem>
                        <SelectItem value="Activo">Activo</SelectItem>
                        <SelectItem value="Inactivo">Inactivo</SelectItem>
                        <SelectItem value="Suspendido">Suspendido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    className="w-full bg-orange-500 text-white hover:bg-orange-600"
                    onClick={() => {
                      // aplica filtros y cierra
                      setOpenFilter(false);
                    }}
                  >
                    Filtro
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            {/* Menú superior (export/import) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Más acciones">
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
        <div className="mt-4 overflow-hidden rounded-lg border">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-gray-50">
              <tr className="border-b">
                <th className="px-4 py-3">
                  <Checkbox aria-label="Seleccionar todos" />
                </th>
                <th className="px-4 py-3 font-semibold">Nombre de Contacto</th>
                <th className="px-4 py-3 font-semibold">Correo Electrónico</th>
                <th className="px-4 py-3 font-semibold">Nivel de Acceso</th>
                <th className="px-4 py-3 font-semibold">Último Inicio de Sesión</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20">
                    <div className="flex flex-col items-center justify-center text-center">
                      <img
                        src="https://app.guardspro.com/assets/icons/custom/no-data-found.png"
                        alt="Sin datos"
                        className="mb-4 h-36"
                      />
                      <h3 className="text-lg font-semibold">No se encontraron resultados</h3>
                      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                        No pudimos encontrar ningún elemento que coincida con su búsqueda
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((u, i) => (
                  <tr key={u.id || i} className="border-b">
                    <td className="px-4 py-3"><Checkbox /></td>
                    <td className="px-4 py-3">{[u.firstName, u.lastName].filter(Boolean).join(" ") || u.name || "-"}</td>
                    <td className="px-4 py-3">{u.email || "-"}</td>
                    <td className="px-4 py-3">{(u.roles || []).join(", ")}</td>
                    <td className="px-4 py-3">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "-"}</td>
                    <td className="px-4 py-3">{u.active === false ? "Inactivo" : "Activo"}</td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><EllipsisVertical className="h-5 w-5" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => console.log("Editar", u.id)}>Editar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => console.log("Suspender", u.id)}>Suspender</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Footer de tabla */}
          <div className="flex items-center justify-between bg-gray-50 px-4 py-3 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span>Elementos por página</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => setPageSize(Number(v))}
              >
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
            <div>
              {filteredRows.length === 0 ? "0 – 0 de 0" : `1 – ${filteredRows.length} de ${filteredRows.length}`}
            </div>
          </div>
        </div>
      </section>
    </AppLayout>
  );
}
