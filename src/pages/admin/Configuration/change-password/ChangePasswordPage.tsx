    import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import ChangePasswordForm, { ChangePasswordValues } from "./ChangePasswordForm";

export default function PasswordChangePage() {
  const handleSubmit = async (_values: ChangePasswordValues) => {};

  return (
    <AppLayout>
      <SettingsLayout navKey="configuracion" title="Cambiar Contraseña">
        <ChangePasswordForm onSubmit={handleSubmit} />
      </SettingsLayout>
    </AppLayout>
  );
}
