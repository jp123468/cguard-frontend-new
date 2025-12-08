import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { FileX } from "lucide-react";

export type TokenRow = {
  id: string;
  accessToken: string;
  createdAt: string;   // formateado para mostrar
  expiresAt: string;   // formateado para mostrar
};

export default function DeveloperTokensView({
  tokens = [],
  onCreate,
}: {
  tokens?: TokenRow[];
  onCreate?: () => void;
}) {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h2 className="text-base font-semibold mb-3">Acceso de desarrollador Token</h2>

        <div className="space-y-1 text-sm">
          <div>
            <span className="font-medium">API Base URL : </span>
            <a
              className="text-orange-600 hover:underline"
              href="https://developer.guardspro.com/"
              target="_blank"
              rel="noreferrer"
            >
              https://developer.guardspro.com/
            </a>
          </div>
          <div>
            <span className="font-medium">API Documentation : </span>
            <a
              className="text-orange-600 hover:underline"
              href="https://developerdocument.guardspro.com"
              target="_blank"
              rel="noreferrer"
            >
              https://developerdocument.guardspro.com
            </a>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            className="text-orange-600 border-orange-200 hover:text-orange-700"
            onClick={() => {
              console.log("Se generó un nuevo token");
              onCreate?.();
            }}
          >
            Nuevo token de acceso
          </Button>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[40%]">Token de acceso</TableHead>
              <TableHead className="w-[30%]">Fecha de creación</TableHead>
              <TableHead className="w-[30%]">Fecha de expiración</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {tokens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3}>
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
              tokens.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono">{t.accessToken}</TableCell>
                  <TableCell>{t.createdAt}</TableCell>
                  <TableCell>{t.expiresAt}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
