import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import PayrollSettingsForm, { PayrollSettingsValues } from "./PayrollSettingsForm";

export default function PayrollSettingsPage() {
  const handleSubmit = async (_values: PayrollSettingsValues) => {};

  return (
    <AppLayout>
      <SettingsLayout navKey="configuracion" title="Configuración de Nómina">
        <PayrollSettingsForm onSubmit={handleSubmit} />
      </SettingsLayout>
    </AppLayout>
  );
}
