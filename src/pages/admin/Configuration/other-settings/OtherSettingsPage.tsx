import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import OtherSettingsForm from "./OtherSettingsForm";

export default function OtherSettingsPage() {
  return (
    <AppLayout>
      <SettingsLayout navKey="configuracion" title="Otras Configuraciones">
        <div>
          <OtherSettingsForm />
        </div>
      </SettingsLayout>
    </AppLayout>
  );
}
