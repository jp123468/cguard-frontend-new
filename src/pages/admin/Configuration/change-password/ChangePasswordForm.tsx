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


const schema = z
  .object({
    oldPassword: z.string().min(6, "Mínimo 6 caracteres"),
    newPassword: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .regex(/[A-Z]/, "Debe incluir una mayúscula")
      .regex(/[a-z]/, "Debe incluir una minúscula")
      .regex(/\d/, "Debe incluir un número"),
    confirmPassword: z.string().min(1, "Confirma tu contraseña"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden",
  });

export type ChangePasswordValues = z.infer<typeof schema>;

type Props = {
  defaultValues?: Partial<ChangePasswordValues>;
  onSubmit?: (values: ChangePasswordValues) => Promise<void> | void;
};

export default function ChangePasswordForm({ defaultValues, onSubmit }: Props) {
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(schema),
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
        <FormField
          control={form.control}
          name="oldPassword"
          render={({ field }) => (
            <FormItem>
              <Label>Contraseña Antigua*</Label>
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

        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <Label>Nueva Contraseña*</Label>
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
              <Label>Confirmar Nueva Contraseña*</Label>
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
          <Button type="submit" className="bg-orange-500 text-white hover:bg-orange-600 px-6">Guardar Cambios</Button>
        </div>
      </form>
    </Form>
  );
}
