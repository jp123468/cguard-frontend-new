import { useEffect } from "react";
import { z } from "zod";
import { useForm, SubmitHandler, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export type TaxDialogValues = {
  name: string;
  rate: number;
  description?: string;
};

const schema = z.object({
  name: z.string().trim().min(1, "Requerido"),
  rate: z.preprocess((val) => {
    if (typeof val === "string") {
      const s = val.trim();
      if (s === "") return NaN;
      const n = Number(s.replace(",", "."));
      return Number.isNaN(n) ? NaN : n;
    }
    return val;
  },
    z
      .number({
        // Use the newer error mapping signature supported by our Zod version
        error: (issue) => ({ message: issue.code === "invalid_type" ? "Ingrese un número" : "Requerido" }),
      })
      .min(0.0000001, "Debe ser mayor que 0")
      .max(100, "Máximo 100"),
  ),
  description: z.string().optional(),
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
    resolver: zodResolver(schema) as Resolver<TaxDialogValues, any>,
    defaultValues: { name: "", rate: undefined as unknown as number, description: "" },
    mode: "onChange",
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: defaultValues?.name ?? "",
        rate: typeof defaultValues?.rate === "number" ? defaultValues.rate : (undefined as unknown as number),
        description: defaultValues?.description ?? "",
      });
    }
  }, [open, defaultValues, form]);

  const submit: SubmitHandler<TaxDialogValues> = async (v) => {
    await onSubmit(v);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription>Configura los detalles del impuesto.</DialogDescription>
        <Form {...(form as any)}>
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

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (opcional)</FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      rows={3}
                      className="w-full rounded border px-3 py-2 text-sm"
                      placeholder="Descripción del impuesto"
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
              <Button  className="bg-orange-500 hover:bg-orange-600" type="submit">Guardar</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
