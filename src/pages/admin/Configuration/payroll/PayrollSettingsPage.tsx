import { Calculator } from "lucide-react";
import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import { PageContainer, PageHeader } from "@/components/kit";
import PayrollSettingsForm, { PayrollSettingsValues } from "./PayrollSettingsForm";

export default function PayrollSettingsPage() {
  const handleSubmit = async (_values: PayrollSettingsValues) => {};

  return (
    <AppLayout>
      <SettingsLayout navKey="configuracion" title="Configuración de Nómina">
        <PageContainer width="narrow">
          <PageHeader
            icon={<Calculator />}
            title="Configuración de Nómina"
            subtitle="Define el período de pago y las reglas de cálculo de horas."
          />
          <PayrollSettingsForm onSubmit={handleSubmit} />
        </PageContainer>
      </SettingsLayout>
    </AppLayout>
  );
}
