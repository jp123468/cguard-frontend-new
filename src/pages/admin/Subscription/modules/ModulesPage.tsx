import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import ModulesTable, { ModuleRow } from "./ModulesTable";

export default function ModulesPage() {
  const modules: ModuleRow[] = [];

  return (
    <AppLayout>
      <SettingsLayout navKey="suscripcion" title="Módulos">
        <div className="max-w-6xl">
          <ModulesTable
            modules={modules}
            onDisable={(id) => {
              console.log("Deshabilitar módulo:", id);
            }}
          />
        </div>
      </SettingsLayout>
    </AppLayout>
  );
}
