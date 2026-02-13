    import AppLayout from "@/layouts/app-layout";
    import SettingsLayout from "@/layouts/SettingsLayout";
    import ChangePasswordForm, { ChangePasswordValues } from "./ChangePasswordForm";
    import AccountService from "@/services/accountService";
    import { toast } from "sonner";
    import { useTranslation } from "react-i18next";

    export default function PasswordChangePage() {
      const { t } = useTranslation();

      const handleSubmit = async (values: ChangePasswordValues) => {
        try {
          const resp: any = await AccountService.changePassword(values.oldPassword, values.newPassword);

          // Backend returns either { messageCode, message } or plain data
          const message = (resp && (resp.message || resp.data?.message)) || (resp && resp.message) || t('auth.change_password_success', { defaultValue: 'Password updated' });
          toast.success(message);
        } catch (err: any) {
          const msg = err?.response?.data?.message || err?.message || t('auth.change_password_error', { defaultValue: 'Error changing password' });
          toast.error(msg);
        }
      };

      return (
        <AppLayout>
          <SettingsLayout navKey="configuracion" title={t('auth.change_password_title', { defaultValue: 'Change password' })}>
            <ChangePasswordForm onSubmit={handleSubmit} />
          </SettingsLayout>
        </AppLayout>
      );
    }
