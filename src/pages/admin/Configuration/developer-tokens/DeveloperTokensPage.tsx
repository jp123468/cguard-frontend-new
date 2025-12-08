import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import DeveloperTokensView, { TokenRow } from "./DeveloperTokensView";

export default function DeveloperTokensPage() {
  const tokens: TokenRow[] = [];

  return (
    <AppLayout>
      <SettingsLayout navKey="configuracion" title="Acceso de desarrollador">
        <div>
          <DeveloperTokensView
            tokens={tokens}
            onCreate={() => {
              // Solo consola, como pediste:
              console.log("Se generó un nuevo token");
            }}
          />
        </div>
      </SettingsLayout>
    </AppLayout>
  );
}
