import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import PaymentMethodsView from "./PaymentMethodsView";

export default function PaymentMethodsPage() {
  return (
    <AppLayout>
      <SettingsLayout navKey="suscripcion" title="Métodos de Pago">
        <div>
          <PaymentMethodsView />
        </div>
      </SettingsLayout>
    </AppLayout>
  );
}
