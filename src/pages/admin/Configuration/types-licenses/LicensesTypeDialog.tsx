import { useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useTranslation } from 'react-i18next';

const schema = z.object({
  name: z.string().min(1, 'Requerido'),
});

export type LicenseTypeDialogValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: string;
  defaultValues?: LicenseTypeDialogValues | null;
  onSubmit: (values: LicenseTypeDialogValues) => Promise<void> | void;
};

export default function LicenseTypeDialog({ open, onOpenChange, title = "Nuevo Tipo de Licencia", defaultValues, onSubmit }: Props) {
  const { t } = useTranslation();
  const form = useForm<LicenseTypeDialogValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (defaultValues) form.reset(defaultValues);
    else form.reset({ name: "" });
  }, [defaultValues]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t('licenseTypes.dialog.description', { defaultValue: 'Formulario para crear o editar un tipo de licencia.' })}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('licenseTypes.dialog.form.nameLabel', { defaultValue: 'Nombre del Tipo de Licencia' })}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('licenseTypes.dialog.form.namePlaceholder', { defaultValue: 'Escribe un nombre' })} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" className="bg-orange-500 text-white hover:bg-orange-600">{t('licenseTypes.dialog.save', { defaultValue: 'Guardar' })}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
