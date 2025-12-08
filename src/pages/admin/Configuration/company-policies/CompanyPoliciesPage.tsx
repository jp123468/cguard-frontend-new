import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import CompanyPoliciesTable from "./CompanyPoliciesTable";

export default function CompanyPoliciesIndexPage() {
  return (
    <AppLayout>
      <SettingsLayout navKey="configuracion" title="Políticas y Documentos de la Empresa">
        <CompanyPoliciesTable />
      </SettingsLayout>
    </AppLayout>
  );
}
