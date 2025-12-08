import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, FileX } from "lucide-react";
import { cn } from "@/lib/utils";

export type InvoiceRow = {
  id: string;                 // "2WQG5SNS-0001"
  issueDate: string;          // "Oct 07, 2025"
  amountPaid: string;         // "$0.00"
  amountDue: string;          // "$0.00"
  dueDate: string;            // "Oct 07, 2025"
  paymentStatus: "Pagado" | "Pendiente" | "Vencido";
};

export default function InvoicesTable({
  invoices = [],
  onDownload,
}: {
  invoices?: InvoiceRow[];
  onDownload?: (id: string) => void;
}) {
  return (
    <Card className="p-0 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[20%]">Número de Factura</TableHead>
            <TableHead className="w-[16%]">Fecha de Emisión</TableHead>
            <TableHead className="w-[16%]">Monto Pagado</TableHead>
            <TableHead className="w-[16%]">Monto Adeudado</TableHead>
            <TableHead className="w-[16%]">Fecha de Vencimiento</TableHead>
            <TableHead className="w-[12%]">Estado del Pago</TableHead>
            <TableHead className="w-[4%]" />
          </TableRow>
        </TableHeader>

        <TableBody>
          {invoices.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7}>
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FileX className="mb-4 h-14 w-14 text-muted-foreground/50" />
                  <p className="text-lg font-semibold">No se encontraron facturas</p>
                  <p className="text-sm text-muted-foreground">
                    Cuando tengas facturas, aparecerán aquí.
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            invoices.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium">{inv.id}</TableCell>
                <TableCell>{inv.issueDate}</TableCell>
                <TableCell>{inv.amountPaid}</TableCell>
                <TableCell>{inv.amountDue}</TableCell>
                <TableCell>{inv.dueDate}</TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "font-semibold",
                      inv.paymentStatus === "Pagado" && "text-green-600",
                      inv.paymentStatus === "Pendiente" && "text-amber-600",
                      inv.paymentStatus === "Vencido" && "text-red-600"
                    )}
                  >
                    {inv.paymentStatus}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      console.log("Descargar factura:", inv.id);
                      onDownload?.(inv.id);
                    }}
                    aria-label={`Descargar factura ${inv.id}`}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
