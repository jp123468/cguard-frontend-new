import { useMemo } from "react";
import { MoreVertical, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type LicenseTypeRow = {
  id: string;
  name: string;
  status: "active" | "inactive";
  createdAt?: string;
};

type Props = {
  rows: LicenseTypeRow[];
  total: number;
  page: number;
  pageSize: number;
  loading?: boolean;
  query: string;
  onQueryChange: (v: string) => void;
  onPageChange: (v: number) => void;
  onPageSizeChange: (v: number) => void;
  onCreate: () => void;
  onEdit: (row: LicenseTypeRow) => void;
  onToggleStatus: (row: LicenseTypeRow) => void;
  onBulkDelete: (ids: string[]) => void;
};

export default function LicenseTypesTable({
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
  onBulkDelete,
}: Props) {
  const [allChecked, idsChecked] = useMemo(() => {
    return [false, [] as string[]];
  }, [rows]);

  const from = Math.min((page - 1) * pageSize + 1, Math.max(total, 1));
  const to = Math.min(page * pageSize, total);
  const maxPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={!idsChecked.length} onClick={() => onBulkDelete(idsChecked)}>
            Eliminar
          </Button>
        </div>
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar tipo de licencia" className="pl-9" value={query} onChange={(e) => onQueryChange(e.target.value)} />
        </div>
        <Button onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Tipo de Licencia
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[44px]">
                <Checkbox checked={allChecked} onCheckedChange={() => {}} />
              </TableHead>
              <TableHead>Tipo de Licencia</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[56px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  Cargando…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-16 text-center text-muted-foreground">
                  No se encontraron resultados
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Checkbox checked={false} onCheckedChange={() => {}} />
                  </TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.status === "active" ? "Activo" : "Inactivo"}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => onEdit(r)}>Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onToggleStatus(r)}>
                          {r.status === "active" ? "Desactivar" : "Activar"}
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
