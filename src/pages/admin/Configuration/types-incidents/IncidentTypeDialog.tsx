import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const schema = z.object({ name: z.string().min(2, "Ingresa un nombre válido") });
export type IncidentTypeDialogValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: string;
  defaultValues?: IncidentTypeDialogValues | null;
  onSubmit: (v: IncidentTypeDialogValues) => void | Promise<void>;
};

export default function IncidentTypeDialog({ open, onOpenChange, title = "Nuevo Tipo de Incidente", defaultValues, onSubmit }: Props) {
  const form = useForm<IncidentTypeDialogValues>({ resolver: zodResolver(schema), defaultValues: { name: "" } });
  useEffect(() => { form.reset(defaultValues ?? { name: "" }); }, [defaultValues, form]);
  const submitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Asigna un nombre para identificar el tipo de incidente.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Incidente</FormLabel>
                  <FormControl><Input placeholder="p. ej. Theft, Injury, Fire Alarm…" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting} className="min-w-28">{submitting ? "Guardando…" : "Guardar"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
