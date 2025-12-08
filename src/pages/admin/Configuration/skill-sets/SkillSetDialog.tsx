import { useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const schema = z.object({
  name: z.string().min(1, "Requerido"),
  description: z.string().min(1, "Requerido"),
  guardId: z.string().optional().nullable(),
});

export type SkillSetDialogValues = z.infer<typeof schema>;

type GuardOption = { id: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: string;
  defaultValues?: SkillSetDialogValues | null;
  guards?: GuardOption[];
  onSubmit: (values: SkillSetDialogValues) => Promise<void> | void;
};

export default function SkillSetDialog({
  open,
  onOpenChange,
  title = "Nuevo Conjunto de Habilidades",
  defaultValues,
  guards = [],
  onSubmit,
}: Props) {
  const form = useForm<SkillSetDialogValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", guardId: undefined },
  });

  useEffect(() => {
    if (defaultValues) form.reset(defaultValues);
    else form.reset({ name: "", description: "", guardId: undefined });
  }, [defaultValues]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre*" {...field} />
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
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descripción*" rows={5} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="guardId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asignar Guardia</FormLabel>
                  <Select onValueChange={(v) => field.onChange(v || undefined)} defaultValue={field.value ?? undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Asignar Guardia" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {guards.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Guardar</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
