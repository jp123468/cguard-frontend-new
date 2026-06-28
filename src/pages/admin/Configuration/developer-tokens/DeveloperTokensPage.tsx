import { KeyRound } from "lucide-react";
import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import { PageContainer, PageHeader } from "@/components/kit";
import DeveloperTokensView, { TokenRow } from "./DeveloperTokensView";

export default function DeveloperTokensPage() {
  const tokens: TokenRow[] = [];

  return (
    <AppLayout>
      <SettingsLayout navKey="configuracion" title="Acceso de desarrollador">
        <PageContainer>
          <PageHeader
            icon={<KeyRound />}
            title="Acceso de desarrollador"
            subtitle="Genera tokens para consumir la API de C-Guard Pro desde tus sistemas."
          />
          <DeveloperTokensView
            tokens={tokens}
            onCreate={() => {
              // Solo consola, como pediste:
            }}
          />
        </PageContainer>
      </SettingsLayout>
    </AppLayout>
  );
}
