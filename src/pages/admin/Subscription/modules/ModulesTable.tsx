import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreVertical, FileX } from "lucide-react";

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
    <Card className="p-0 overflow-hidden">
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
              <TableCell colSpan={4}>
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FileX className="h-14 w-14 text-muted-foreground/50 mb-4" />
                  <p className="text-lg font-semibold">No se encontraron resultados</p>
                  <p className="text-sm text-muted-foreground">
                    No pudimos encontrar ningún elemento que coincida con su búsqueda
                  </p>
                </div>
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
                  <Badge variant="secondary" className={m.status === "Activo" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200"}>
                    {m.status}
                  </Badge>
                </TableCell>
                <TableCell className="align-top text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
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
    </Card>
  );
}
