import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import { Route } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/kit";
import RondaSettingsForm from "./RondaSettingsForm";

export default function RondasSettingsPage() {
  return (
    <AppLayout>
      <SettingsLayout navKey="configuracion" title="Configuraciones de Rondas">
        <PageContainer width="narrow">
          <PageHeader
            icon={<Route />}
            title="Configuraciones de Rondas"
            subtitle="Define la cadencia, validación y notificaciones predeterminadas para las rondas"
          />
          {/* Tenant-wide default (no postSiteId) */}
          <RondaSettingsForm />
        </PageContainer>
      </SettingsLayout>
    </AppLayout>
  );
}
