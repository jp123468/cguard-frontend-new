import { Plus, Search, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export type ProfileFieldRow = {
  id: string;
  name: string;
  type: string;
  status: "active" | "inactive";
};

type Props = {
  rows: ProfileFieldRow[];
  checked: Record<string, boolean>;
  onCheckAll: (v: boolean) => void;
  onCheckRow: (id: string, v: boolean) => void;
  query: string;
  onQueryChange: (v: string) => void;
  onNew: () => void;
  onEdit: (r: ProfileFieldRow) => void;
  onToggleStatus: (r: ProfileFieldRow) => void;
  onBulkDelete: () => void;
  pageSize: string;
  onPageSize: (v: string) => void;
  pageLabel: string;
};

export default function ProfileFieldsTable({
  rows,
  checked,
  onCheckAll,
  onCheckRow,
  query,
  onQueryChange,
  onNew,
  onEdit,
  onToggleStatus,
  onBulkDelete,
  pageSize,
  onPageSize,
  pageLabel,
}: Props) {
  const allChecked = rows.length > 0 && rows.every((r) => checked[r.id]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[140px] justify-between">
              Acción
              <MoreVertical className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={onBulkDelete} disabled={!Object.keys(checked).length}>
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar" value={query} onChange={(e) => onQueryChange(e.target.value)} />
        </div>

        <Button onClick={onNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Campo
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[44px]">
                <Checkbox checked={allChecked} onCheckedChange={(v) => onCheckAll(Boolean(v))} />
              </TableHead>
              <TableHead>Nombre del Campo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[44px]" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <div className="py-16 text-center text-muted-foreground">
                    <div className="text-lg font-semibold">No se encontraron resultados</div>
                    <div className="text-sm">No pudimos encontrar ningún elemento que coincida con su búsqueda</div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Checkbox checked={!!checked[r.id]} onCheckedChange={(v) => onCheckRow(r.id, Boolean(v))} />
                  </TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.type}</TableCell>
                  <TableCell>
                    {r.status === "active" ? (
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                        Activo
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100">
                        Inactivo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
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

      <div className="flex items-center justify-between py-2">
        <div className="text-sm text-muted-foreground">Elementos por página</div>
        <div className="flex items-center gap-4">
          <Select value={pageSize} onValueChange={onPageSize}>
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
          <div className="text-sm text-muted-foreground">{pageLabel}</div>
        </div>
      </div>
    </div>
  );
}
