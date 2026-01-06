import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useEffect } from "react";

const schema = z.object({
  name: z
    .string("El nombre del rol es obligatorio.")
    .trim()
    .min(3, "Debe tener al menos 3 caracteres.")
    .max(80, "Máximo 80 caracteres."),
  description: z
    .string()
    .trim()
    .max(500, "Máximo 500 caracteres.")
    .optional()
    .or(z.literal("")),
  permissions: z.array(z.string()).optional(),
});

export type UserRoleDialogValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  defaultValues: UserRoleDialogValues | null;
  onSubmit: (v: UserRoleDialogValues) => Promise<void> | void;
};

export default function UserRoleDialog({
  open,
  onOpenChange,
  title,
  defaultValues,
  onSubmit,
}: Props) {
  useEffect(() => {
    console.debug('[UserRoleDialog] mount/open state', open);
  }, [open]);
  const form = useForm<UserRoleDialogValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? { name: "", description: "", permissions: [] },
    values: defaultValues ?? { name: "", description: "", permissions: [] },
    mode: "onBlur",
  });

  const submitting = form.formState.isSubmitting;




  const submit = form.handleSubmit(async (values) => {
    await onSubmit(values);
    form.reset();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-center">
          <DialogTitle className="w-full text-center">{title}</DialogTitle>
          <DialogDescription>
            Proporcione un nombre y, opcionalmente, una breve descripción para el rol.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={submit} className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Rol <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nombre del Rol"
                      {...field}
                      aria-invalid={!!form.formState.errors.name}
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
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={5}
                      placeholder="Describe el rol (opcional)"
                      {...field}
                      aria-invalid={!!form.formState.errors.description}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
