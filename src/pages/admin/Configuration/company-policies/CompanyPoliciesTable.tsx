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
import { EmptyState } from "@/components/kit";
import PolicyDialog, { PolicyForm } from "./PolicyDialog";


type Policy = {
  id: string;
  title: string;
  createdAt: string;
  status: "published" | "draft";
};

// Guard against missing/invalid createdAt so real API rows don't render "Invalid Date".
const formatPolicyDate = (value?: string) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
};

// NOTE: there is no backend policies endpoint yet. Rather than show fake rows or
// fake "saves", this screen is gated as "Próximamente" (see FEATURE_AVAILABLE).
const FEATURE_AVAILABLE = false;
const POLICIES: Policy[] = [];

export default function CompanyPoliciesTable() {
  const [query, setQuery] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [pageSize, setPageSize] = useState("25");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return POLICIES;
    return POLICIES.filter((p) => p.title.toLowerCase().includes(q));
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

  // No backend endpoint yet — these are intentionally no-ops and the entry points
  // that would call them are disabled while FEATURE_AVAILABLE is false.
  const handleCreate = (_data: PolicyForm) => {
    setOpenNew(false);
  };

  const handleDraft = (_data: PolicyForm) => {
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
              <DropdownMenuItem disabled={!FEATURE_AVAILABLE || !Object.keys(checked).length}>
                Eliminar seleccionados
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!FEATURE_AVAILABLE || !Object.keys(checked).length}>
                Publicar seleccionados
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!FEATURE_AVAILABLE || !Object.keys(checked).length}>
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

          <Button
            onClick={() => setOpenNew(true)}
            disabled={!FEATURE_AVAILABLE}
            variant="brand"
            className="whitespace-nowrap px-6"
            title={!FEATURE_AVAILABLE ? "Próximamente" : undefined}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva Política de Empresa
          </Button>
        </div>

        {!FEATURE_AVAILABLE && (
          <div className="rounded-md border border-dashed bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Próximamente: la gestión de políticas de empresa aún no está disponible.
          </div>
        )}

        <div className="cg-card overflow-hidden p-0">
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
                  <TableCell colSpan={3} className="p-0">
                    <EmptyState
                      icon={<Search />}
                      title={query.trim() ? "No se encontraron resultados" : "Aún no hay políticas"}
                      description={
                        query.trim()
                          ? "No pudimos encontrar ningún elemento que coincida con su búsqueda"
                          : "La gestión de políticas de empresa estará disponible próximamente."
                      }
                      className="border-0"
                    />
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
                    <TableCell className="text-right">{formatPolicyDate(p.createdAt)}</TableCell>
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
