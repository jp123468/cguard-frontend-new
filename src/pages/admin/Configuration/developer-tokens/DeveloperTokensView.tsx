import { KeyRound, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Section, EmptyState, Field } from "@/components/kit";

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
    <div className="space-y-6">
      <Section
        title="Acceso de desarrollador"
        icon={<KeyRound />}
        action={
          <Button
            variant="brand"
            className="gap-2"
            onClick={() => {
              onCreate?.();
            }}
          >
            <Plus className="h-4 w-4" />
            Nuevo token de acceso
          </Button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="API Base URL"
            value={
              <a
                className="text-primary hover:underline"
                href="https://developer.guardspro.com/"
                target="_blank"
                rel="noreferrer"
              >
                https://developer.guardspro.com/
              </a>
            }
          />
          <Field
            label="API Documentation"
            value={
              <a
                className="text-primary hover:underline"
                href="https://developerdocument.guardspro.com"
                target="_blank"
                rel="noreferrer"
              >
                https://developerdocument.guardspro.com
              </a>
            }
          />
        </div>
      </Section>

      <Section title="Tokens de acceso" icon={<KeyRound />}>
        {tokens.length === 0 ? (
          <EmptyState
            icon={<KeyRound />}
            title="No se encontraron resultados"
            description="No pudimos encontrar ningún elemento que coincida con su búsqueda"
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[40%]">Token de acceso</TableHead>
                  <TableHead className="w-[30%]">Fecha de creación</TableHead>
                  <TableHead className="w-[30%]">Fecha de expiración</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {tokens.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono">{t.accessToken}</TableCell>
                    <TableCell>{t.createdAt}</TableCell>
                    <TableCell>{t.expiresAt}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>
    </div>
  );
}
