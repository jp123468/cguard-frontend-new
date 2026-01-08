import { MoreVertical, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type TaxRow = {
  id: string;
  name: string;
  rate: number;
  description?: string;
  status: "active" | "inactive";
};

type Props = {
  rows: TaxRow[];
  checked: Record<string, boolean>;
  onCheckAll: (checked: boolean) => void;
  onCheckRow: (id: string, checked: boolean) => void;
  query: string;
  onQueryChange: (v: string) => void;
  onNew: () => void;
  onEdit: (row: TaxRow) => void;
  onDeactivate: (row: TaxRow) => void;
  onDelete: (row: TaxRow) => void;
  onBulkDelete: () => void;
  pageSize: string;
  onPageSize: (v: string) => void;
  pageLabel: string;
};

export default function TaxesTable({
  rows,
  checked,
  onCheckAll,
  onCheckRow,
  query,
  onQueryChange,
  onNew,
  onEdit,
  onDeactivate,
  onDelete,
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
              <MoreVertical className="ml-2 h-4 w-4 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem disabled={!Object.values(checked).some(Boolean)} onClick={onBulkDelete}>
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => onQueryChange(e.target.value)} placeholder="Buscar Impuesto" className="pl-9" />
        </div>

        <Button  className="bg-orange-500 hover:bg-orange-600" onClick={onNew}>Nuevo Impuesto</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[44px]">
                <Checkbox checked={allChecked} onCheckedChange={(v) => onCheckAll(Boolean(v))} />
              </TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Tasa</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <div className="py-16 text-center text-muted-foreground">
                    <div className="text-lg font-semibold">No se encontraron resultados</div>
                    <div className="text-sm">No pudimos encontrar elementos que coincidan con su búsqueda</div>
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
                  <TableCell>{r.rate}%</TableCell>
                  <TableCell className={r.status === "active" ? "text-emerald-600" : "text-muted-foreground"}>
                    {r.status === "active" ? "Activo" : "Inactivo"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => onEdit(r)}>Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDeactivate(r)}>Desactivar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(r)}>Eliminar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-4 py-2">
        <div className="text-sm text-muted-foreground">Elementos por página</div>
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
  );
}
