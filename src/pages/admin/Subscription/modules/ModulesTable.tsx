import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, FileX, Boxes } from "lucide-react";
import { Section, StatusBadge, EmptyState } from "@/components/kit";

export type ModuleRow = {
  id: string;
  name: string;         // "Gestión de Visitantes"
  description?: string; // "Gestiona los visitantes..."
  price: string;        // "$1 / Month / User"
  status: "Activo" | "Inactivo";
};

export default function ModulesTable({
  modules = [],
  onDisable,
}: {
  modules?: ModuleRow[];
  onDisable?: (id: string) => void;
}) {
  return (
    <Section title="Módulos contratados" icon={<Boxes />} contentClassName="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[45%]">Módulo</TableHead>
            <TableHead className="w-[25%]">Precio</TableHead>
            <TableHead className="w-[20%]">Estado</TableHead>
            <TableHead className="w-[10%]" />
          </TableRow>
        </TableHeader>

        <TableBody>
          {modules.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="p-0">
                <EmptyState
                  icon={<FileX />}
                  title="No se encontraron resultados"
                  description="No pudimos encontrar ningún elemento que coincida con su búsqueda"
                  className="border-0"
                />
              </TableCell>
            </TableRow>
          ) : (
            modules.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="font-semibold">{m.name}</div>
                  {m.description && (
                    <div className="text-sm text-muted-foreground">{m.description}</div>
                  )}
                </TableCell>
                <TableCell className="align-top">{m.price}</TableCell>
                <TableCell className="align-top">
                  <StatusBadge tone={m.status === "Activo" ? "green" : "slate"}>
                    {m.status}
                  </StatusBadge>
                </TableCell>
                <TableCell className="align-top text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          console.log(`Deshabilitar módulo: ${m.id}`);
                          onDisable?.(m.id);
                        }}
                      >
                        Deshabilitar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Section>
  );
}
