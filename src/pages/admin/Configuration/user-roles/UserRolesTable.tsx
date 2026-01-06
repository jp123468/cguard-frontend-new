import React from "react";
import { MoreVertical, Plus, Search, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionedButton } from '@/components/permissions/Permissioned';
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export type UserRoleRow = {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
};

type Props = {
  rows: UserRoleRow[];
  checked: Record<string, boolean>;
  onCheckAll: (v: boolean) => void;
  onCheckRow: (id: string, v: boolean) => void;
  query: string;
  onQueryChange: (v: string) => void;
  onNew: () => void;
  onToggleExpand?: (r: UserRoleRow) => void;
  onEdit: (r: UserRoleRow) => void;
  onBulkDelete: () => void;
  expandedRoleId?: string | null;
  expandedContent?: any;
  onSaveExpanded?: (id: string, perms: string[]) => void;
  pageSize: string;
  onPageSize: (v: string) => void;
  pageLabel: string;
};

export default function UserRolesTable({
  rows,
  checked,
  onCheckAll,
  onCheckRow,
  query,
  onQueryChange,
  onNew,
  onToggleExpand,
  onEdit,
  onBulkDelete,
  expandedRoleId,
  expandedContent,
  pageSize,
  onPageSize,
  pageLabel,
}: Props) {
  const allChecked = rows.length > 0 && rows.every((r) => checked[r.id]);

  const { hasPermission } = usePermissions();

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
            <DropdownMenuItem onClick={onBulkDelete} disabled={!Object.keys(checked).length}>
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="relative flex-1 max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar Rol de Usuario"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
        </div>

        <PermissionedButton permission="settingsEdit" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={onNew}> Nuevo Rol</PermissionedButton>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[44px]">
                <Checkbox checked={allChecked} onCheckedChange={(v) => onCheckAll(Boolean(v))} />
              </TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="w-[56px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <div className="py-16 text-center text-muted-foreground">
                    <div className="text-lg font-semibold">No se encontraron resultados</div>
                    <div className="text-sm">Sin datos para mostrar</div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <React.Fragment key={r.id}>
                  <TableRow>
                    <TableCell>
                      <Checkbox
                        checked={!!checked[r.id]}
                        onCheckedChange={(v) => onCheckRow(r.id, Boolean(v))}
                      />
                    </TableCell>
                    <TableCell
                      className="font-medium cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onClick={() => onToggleExpand && onToggleExpand(r)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") onToggleExpand && onToggleExpand(r);
                      }}
                    >
                      <span className="mr-2">{r.name}</span>
                      {r.isDefault && <Badge variant="secondary">Predeterminado</Badge>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.description}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem disabled={!hasPermission('settingsEdit')} onClick={() => { if (!hasPermission('settingsEdit')) return; onEdit(r); }}>Editar</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  {expandedRoleId === r.id && (
                    <TableRow key={`${r.id}-expanded`}>
                      <TableCell colSpan={4}>
                        <div className="p-4 border rounded">{expandedContent}</div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-4">
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
