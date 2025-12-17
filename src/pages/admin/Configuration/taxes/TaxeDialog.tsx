import { useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export type TaxDialogValues = {
  name: string;
  rate: number;
};

const schema = z.object({
  name: z.string().trim().min(1, "Requerido"),
  rate: z
    .number("Ingrese un número")
    .min(0, "Mínimo 0")
    .max(100, "Máximo 100"),
});

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: string;
  defaultValues?: Partial<TaxDialogValues> | null;
  onSubmit: (values: TaxDialogValues) => void | Promise<void>;
};

export default function TaxDialog({ open, onOpenChange, title = "Nuevo Impuesto", defaultValues, onSubmit }: Props) {
  const form = useForm<TaxDialogValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", rate: 0 },
    mode: "onChange",
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: defaultValues?.name ?? "",
        rate: typeof defaultValues?.rate === "number" ? defaultValues.rate : 0,
      });
    }
  }, [open, defaultValues, form]);

  const submit = async (v: TaxDialogValues) => {
    await onSubmit(v);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Configura los detalles del impuesto.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Impuesto*</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. VAT, Taxable, IVA..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tasa de Impuesto (%)*</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="decimal"
                      placeholder="Ej. 12"
                      value={String(field.value ?? "")}
                      onChange={(e) => {
                        const v = e.target.value.replace(",", ".");
                        const n = v === "" ? NaN : Number(v);
                        field.onChange(Number.isNaN(n) ? v : n);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button type="submit">Guardar</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
