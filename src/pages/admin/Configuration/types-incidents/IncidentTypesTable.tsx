import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, EllipsisVertical, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export type IncidentTypeRow = { id: string; name: string; status: "active" | "inactive" };

type Props = {
  rows: IncidentTypeRow[];
  total: number;
  page: number;
  pageSize: number;
  loading?: boolean;
  query?: string;
  onQueryChange?: (q: string) => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onCreate?: () => void;
  onEdit?: (row: IncidentTypeRow) => void;
  onToggleStatus?: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
};

const PAGE_SIZES = [10, 25, 50, 100];

export default function IncidentTypesTable({
  rows,
  total,
  page,
  pageSize,
  loading,
  query = "",
  onQueryChange,
  onPageChange,
  onPageSizeChange,
  onCreate,
  onEdit,
  onToggleStatus,
  onBulkDelete,
}: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const selectionCount = useMemo(() => Object.values(checked).filter(Boolean).length, [checked]);
  const allVisibleChecked = rows.length > 0 && rows.every((r) => checked[r.id]);
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const toggleAll = () => {
    if (allVisibleChecked) {
      const next = { ...checked };
      rows.forEach((r) => delete next[r.id]);
      setChecked(next);
    } else {
      const next = { ...checked };
      rows.forEach((r) => (next[r.id] = true));
      setChecked(next);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[140px] justify-between">
              Acción <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem disabled={!selectionCount} onClick={() => onBulkDelete?.(Object.keys(checked).filter((k) => checked[k]))}>
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar tipo de incidente" value={query} onChange={(e) => onQueryChange?.(e.target.value)} />
        </div>

        <Button onClick={onCreate}>Nuevo Tipo de Incidente</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[44px]">
                <Checkbox checked={allVisibleChecked} onCheckedChange={toggleAll} />
              </TableHead>
              <TableHead className="w-[60%]">Tipo de Incidente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-40 text-center">
                  <div className="inline-flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando…
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-40 text-center text-muted-foreground">
                  No se encontraron resultados
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-accent/40">
                  <TableCell>
                    <Checkbox checked={!!checked[row.id]} onCheckedChange={(v) => setChecked((s) => ({ ...s, [row.id]: Boolean(v) }))} />
                  </TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>
                    <Badge variant={row.status === "active" ? "default" : "secondary"}>
                      {row.status === "active" ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <EllipsisVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[160px]">
                        <DropdownMenuItem onClick={() => onEdit?.(row)}>Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onToggleStatus?.(row.id)}>
                          {row.status === "active" ? "Desactivar" : "Activar"}
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

      <div className="flex items-center justify-end gap-4">
        <div className="text-sm text-muted-foreground">Elementos por página</div>
        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange?.(Number(v))}>
          <SelectTrigger className="w-[90px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((s) => (
              <SelectItem key={s} value={String(s)}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="min-w-[110px] text-right text-sm text-muted-foreground">
          {start} – {end} of {total}
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page <= 1 || !!loading} onClick={() => onPageChange?.(Math.max(1, page - 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page >= totalPages || !!loading} onClick={() => onPageChange?.(Math.min(totalPages, page + 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
