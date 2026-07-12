import { useState } from "react";
import { MoreVertical, Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge, EmptyState, SkeletonBlock } from "@/components/kit";

export type DepartmentRow = {
  id: string;
  name: string;
  description?: string | null;
  managerName?: string | null;
  managerId?: string | null;
  members?: number;
  status?: "active" | "inactive";
  createdAt?: string;
};

type Props = {
  rows: DepartmentRow[];
  total: number;
  page: number;
  pageSize: number;
  loading?: boolean;
  query: string;
  onQueryChange: (v: string) => void;
  onPageChange: (v: number) => void;
  onPageSizeChange: (v: number) => void;
  onCreate: () => void;
  onEdit: (row: DepartmentRow) => void;
  onToggleStatus: (row: DepartmentRow) => void;
  onDelete: (row: DepartmentRow) => void;
  onBulkDelete: (ids: string[]) => void;
  canEdit?: boolean;
};

export default function DepartmentsTable({
  rows,
  total,
  page,
  pageSize,
  loading,
  query,
  onQueryChange,
  onPageChange,
  onPageSizeChange,
  onCreate,
  onEdit,
  onToggleStatus,
  onDelete,
  onBulkDelete,
  canEdit = true,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const from = Math.min((page - 1) * pageSize + 1, Math.max(total, 1));
  const to = Math.min(page * pageSize, total);
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onBulkDelete(Array.from(selected));
              setSelected(new Set());
            }}
            disabled={!canEdit || selected.size === 0}
          >
            Eliminar{selected.size > 0 ? ` (${selected.size})` : ""}
          </Button>
        </div>
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar departamento"
            className="pl-9"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
        </div>
        <Button variant="brand" onClick={onCreate} disabled={!canEdit}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Departamento
        </Button>
      </div>

      <div className="rounded-2xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[44px]">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              </TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Responsable</TableHead>
              <TableHead>Miembros</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[56px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-6">
                  <div className="space-y-3">
                    <SkeletonBlock className="h-4 w-1/3" />
                    <SkeletonBlock className="h-4 w-1/2" />
                    <SkeletonBlock className="h-4 w-2/5" />
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState
                    icon={<Search />}
                    title="Sin departamentos"
                    description='Crea el primero con "Nuevo Departamento" — por ejemplo Operaciones, Talento Humano o Nómina.'
                    className="border-0 py-12"
                  />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleOne(r.id)} />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{r.name}</div>
                    {r.description ? (
                      <div className="text-xs text-muted-foreground line-clamp-1">{r.description}</div>
                    ) : null}
                  </TableCell>
                  <TableCell>{r.managerName ?? "—"}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      {r.members ?? 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={r.status === "inactive" ? "slate" : "green"}>
                      {r.status === "inactive" ? "Inactivo" : "Activo"}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={!canEdit}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => onEdit(r)}>Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onToggleStatus(r)}>
                          {r.status === "inactive" ? "Activar" : "Desactivar"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDelete(r)}
                        >
                          Eliminar
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

      <div className="flex items-center justify-end gap-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Elementos por página
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="w-[90px]">
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
        <div className="text-sm text-muted-foreground">{total === 0 ? "0 de 0" : `${from} – ${to} de ${total}`}</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))}>
            Anterior
          </Button>
          <Button variant="outline" size="sm" disabled={page >= maxPage} onClick={() => onPageChange(Math.min(maxPage, page + 1))}>
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
