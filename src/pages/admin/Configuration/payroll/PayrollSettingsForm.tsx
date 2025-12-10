import { z } from "zod";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

const schema = z.object({
  payPeriod: z.enum(["weekly", "biweekly", "monthly"] as const),
  lastPeriodEnd: z.string().min(1, "Requerido"),
  california7thDayRule: z.boolean().optional().default(false),
  cutShiftAtMidnight: z.boolean().optional().default(false),
});

export type PayrollSettingsValues = z.infer<typeof schema>;

type Props = {
  defaultValues?: Partial<PayrollSettingsValues>;
  onSubmit?: (values: PayrollSettingsValues) => Promise<void> | void;
};

export default function PayrollSettingsForm({ defaultValues, onSubmit }: Props) {
  const form = useForm<PayrollSettingsValues>({
    resolver: zodResolver(schema) as Resolver<PayrollSettingsValues>,
    defaultValues: {
      payPeriod: defaultValues?.payPeriod ?? undefined,
      lastPeriodEnd: defaultValues?.lastPeriodEnd ?? "",
      california7thDayRule: defaultValues?.california7thDayRule ?? false,
      cutShiftAtMidnight: defaultValues?.cutShiftAtMidnight ?? false,
    },
  });

  const submit = form.handleSubmit(async (values) => {
    await onSubmit?.(values);
  });

  return (
    <Form {...form}>
      <form onSubmit={submit} className="space-y-8">
        <FormField
          control={form.control}
          name="payPeriod"
          render={({ field }) => (
            <FormItem>
              <Label>Seleccionar Período de Pago</Label>
              <FormControl>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Seleccionar Período de Pago" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Semanalmente</SelectItem>
                    <SelectItem value="biweekly">Quincenal</SelectItem>
                    <SelectItem value="monthly">Mensual</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="lastPeriodEnd"
          render={({ field }) => (
            <FormItem>
              <Label>¿Cuándo terminó su último período de pago?*</Label>
              <FormControl>
                <Input
                  type="date"
                  value={field.value}
                  onChange={field.onChange}
                  className="h-12"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="california7thDayRule"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-3">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(Boolean(v))} />
              </FormControl>
              <Label className="font-normal">
                Usar la regla general de horas extra de California para trabajar en el séptimo día consecutivo
              </Label>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cutShiftAtMidnight"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-3">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(Boolean(v))} />
              </FormControl>
              <Label className="font-normal">
                Cortar las horas del turno a la medianoche al procesar la nómina
              </Label>
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" className="px-6">Guardar Configuración</Button>
        </div>
      </form>
    </Form>
  );
}
