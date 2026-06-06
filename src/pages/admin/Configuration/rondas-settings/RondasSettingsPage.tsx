import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import RondaSettingsForm from "./RondaSettingsForm";

export default function RondasSettingsPage() {
  return (
    <AppLayout>
      <SettingsLayout navKey="configuracion" title="Configuraciones de Rondas">
        <div className="mx-auto max-w-2xl">
          {/* Tenant-wide default (no postSiteId) */}
          <RondaSettingsForm />
        </div>
      </SettingsLayout>
    </AppLayout>
  );
}
