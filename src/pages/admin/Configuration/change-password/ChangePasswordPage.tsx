    import AppLayout from "@/layouts/app-layout";
    import SettingsLayout from "@/layouts/SettingsLayout";
    import ChangePasswordForm, { ChangePasswordValues } from "./ChangePasswordForm";
    import AccountService from "@/services/accountService";
    import { toast } from "sonner";

    export default function PasswordChangePage() {
      const handleSubmit = async (values: ChangePasswordValues) => {
        try {
          const resp: any = await AccountService.changePassword(values.oldPassword, values.newPassword);

          // Backend returns either { messageCode, message } or plain data
          const message = (resp && (resp.message || resp.data?.message)) || (resp && resp.message) || 'Contraseña actualizada';
          toast.success(message);
        } catch (err: any) {
          const msg = err?.response?.data?.message || err?.message || 'Error al cambiar la contraseña';
          toast.error(msg);
        }
      };

      return (
        <AppLayout>
          <SettingsLayout navKey="configuracion" title="Cambiar Contraseña">
            <ChangePasswordForm onSubmit={handleSubmit} />
          </SettingsLayout>
        </AppLayout>
      );
    }
