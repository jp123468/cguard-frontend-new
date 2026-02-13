import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next";

export type ChangePasswordValues = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type Props = {
  defaultValues?: Partial<ChangePasswordValues>;
  onSubmit?: (values: ChangePasswordValues) => Promise<void> | void;
  showOldField?: boolean;
};

export default function ChangePasswordForm({ defaultValues, onSubmit, showOldField = true }: Props) {
  const { t } = useTranslation();
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Build schema conditionally so the oldPassword field can be omitted (useful for password reset flows)
  const baseSchema: any = {
    newPassword: z
      .string()
      .min(8, t('auth.validation_min8'))
      .regex(/[A-Z]/, t('auth.validation_uppercase'))
      .regex(/[a-z]/, t('auth.validation_lowercase'))
      .regex(/\d/, t('auth.validation_number')),
    confirmPassword: z.string().min(1, t('auth.validation_confirm_required')),
  };

  if (showOldField) {
    baseSchema.oldPassword = z.string().min(6, t('auth.validation_min6'));
  }

  const schema: z.ZodTypeAny = z.object(baseSchema).refine((v: any) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: t('auth.validation_passwords_not_match'),
  });

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(schema as any),
    defaultValues: {
      oldPassword: defaultValues?.oldPassword ?? "",
      newPassword: defaultValues?.newPassword ?? "",
      confirmPassword: defaultValues?.confirmPassword ?? "",
    },
  });

  const submit = form.handleSubmit(async (values) => {
    await onSubmit?.(values);
    form.reset({ oldPassword: "", newPassword: "", confirmPassword: "" });
  });

  return (
    <Form {...form}>
      <form onSubmit={submit} className="space-y-8">
        {showOldField && (
          <FormField
            control={form.control}
            name="oldPassword"
            render={({ field }) => (
              <FormItem>
                <Label>{t('auth.old_password_label')}*</Label>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showOldPassword ? "text" : "password"}
                      autoComplete="current-password"
                      className="h-12 pr-10"
                      {...field}
                    />

                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      {showOldPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <Label>{t('auth.new_password_label')}*</Label>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className="h-12 pr-10"
                    {...field}
                  />

                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <Label>{t('auth.confirm_new_password_label')}*</Label>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className="h-12 pr-10"
                    {...field}
                  />

                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />


        <div className="flex justify-end">
          <Button type="submit" className="bg-orange-500 text-white hover:bg-orange-600 px-6">{t('auth.save_changes')}</Button>
        </div>
      </form>
    </Form>
  );
}
