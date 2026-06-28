import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import { SlidersHorizontal } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/kit";
import OtherSettingsForm from "./OtherSettingsForm";

export default function OtherSettingsPage() {
  return (
    <AppLayout>
      <SettingsLayout navKey="configuracion" title="Otras Configuraciones">
        <PageContainer>
          <PageHeader
            icon={<SlidersHorizontal />}
            title="Otras Configuraciones"
            subtitle="Preferencias regionales, de asistencia y de visualización del sistema."
          />
          <OtherSettingsForm />
        </PageContainer>
      </SettingsLayout>
    </AppLayout>
  );
}
