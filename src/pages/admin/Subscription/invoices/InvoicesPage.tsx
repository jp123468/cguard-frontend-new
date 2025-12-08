import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import InvoicesTable, { InvoiceRow } from "./InvoicesTable";

export default function InvoicesPage() {
  // Solo vistas: no cargamos datos de prueba.
  const invoices: InvoiceRow[] = [];

  return (
    <AppLayout>
      <SettingsLayout navKey="suscripcion" title="Facturas">
        <div className="max-w-6xl">
          <InvoicesTable
            invoices={invoices}
            onDownload={(id) => {
              // Solo consola, como pediste
              console.log("Descargar PDF de factura:", id);
            }}
          />
        </div>
      </SettingsLayout>
    </AppLayout>
  );
}
