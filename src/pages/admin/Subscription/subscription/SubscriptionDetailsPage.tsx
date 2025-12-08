import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import SubscriptionDetailsModule from "./SubscriptionDetailsModule";

export default function SubscriptionDetailsPage() {
  return (
    <AppLayout>
      <SettingsLayout navKey="suscripcion" title="Detalles de la Suscripción">
        <SubscriptionDetailsModule />
      </SettingsLayout>
    </AppLayout>
  );
}
