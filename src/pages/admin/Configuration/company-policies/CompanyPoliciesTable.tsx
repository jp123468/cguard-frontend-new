"use client";

import { useMemo, useState } from "react";
import { Search, ChevronDown, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table } from "@/components/ui/table";
import { TableBody } from "@/components/ui/table";
import { TableCell } from "@/components/ui/table";
import { TableHead } from "@/components/ui/table";
import { TableHeader } from "@/components/ui/table";
import { TableRow } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { SelectContent } from "@/components/ui/select";
import { SelectItem } from "@/components/ui/select";
import { SelectTrigger } from "@/components/ui/select";
import { SelectValue } from "@/components/ui/select";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import PolicyDialog, { PolicyForm } from "./PolicyDialog";


type Policy = {
  id: string;
  title: string;
  createdAt: string;
  status: "published" | "draft";
};

const MOCK_POLICIES: Policy[] = [
  { id: "1", title: "Política de Seguridad en Sitio", createdAt: new Date().toISOString(), status: "published" },
  { id: "2", title: "Procedimiento de Reportes", createdAt: new Date().toISOString(), status: "draft" },
];

export default function CompanyPoliciesTable() {
  const [query, setQuery] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [pageSize, setPageSize] = useState("25");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MOCK_POLICIES;
    return MOCK_POLICIES.filter((p) => p.title.toLowerCase().includes(q));
  }, [query]);

  const allChecked = filtered.length > 0 && filtered.every((p) => checked[p.id]);

  const toggleAll = () => {
    if (allChecked) {
      const next = { ...checked };
      filtered.forEach((p) => delete next[p.id]);
      setChecked(next);
    } else {
      const next = { ...checked };
      filtered.forEach((p) => (next[p.id] = true));
      setChecked(next);
    }
  };

  const handleCreate = (data: PolicyForm) => {
    console.log("GUARDAR", data);
    setOpenNew(false);
  };

  const handleDraft = (data: PolicyForm) => {
    console.log("BORRADOR", data);
    setOpenNew(false);
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-[140px] justify-between">
                Acción <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem disabled={!Object.keys(checked).length}>
                Eliminar seleccionados
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!Object.keys(checked).length}>
                Publicar seleccionados
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!Object.keys(checked).length}>
                Mover a borrador
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="relative flex-1 max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar política de empresa"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <Button onClick={() => setOpenNew(true)} className="whitespace-nowrap">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Política de Empresa
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[44px]">
                  <Checkbox checked={allChecked} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead>Título</TableHead>
                <TableHead className="text-right">Hora</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3}>
                    <div className="py-16 text-center text-muted-foreground">
                      <div className="text-lg font-semibold">No se encontraron resultados</div>
                      <div className="text-sm">
                        No pudimos encontrar ningún elemento que coincida con su búsqueda
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Checkbox
                        checked={!!checked[p.id]}
                        onCheckedChange={(v) => setChecked((s) => ({ ...s, [p.id]: Boolean(v) }))}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell className="text-right">{new Date(p.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="text-sm text-muted-foreground">Elementos por página</div>
          <div className="flex items-center gap-4">
            <Select value={pageSize} onValueChange={setPageSize}>
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
            <div className="text-sm text-muted-foreground">{filtered.length} of {filtered.length}</div>
          </div>
        </div>
      </div>

      <PolicyDialog
        open={openNew}
        onOpenChange={setOpenNew}
        onSubmit={handleCreate}
        onDraft={handleDraft}
      />
    </>
  );
}
