import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const TYPE_OPTIONS = [
  { id: "client", label: "Cliente" },
  { id: "jobsite", label: "Sitio de Publicación" },
  { id: "guard", label: "Guardia" },
  { id: "office_user", label: "Usuario de oficina administrativa" },
];

const schema = z.object({
  name: z.string().min(2, "Requerido"),
  type: z.enum(["client", "jobsite", "guard", "office_user"], { required_error: "Seleccione un tipo" }),
});

export type ProfileFieldDialogValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  defaultValues: ProfileFieldDialogValues | null;
  onSubmit: (v: ProfileFieldDialogValues) => Promise<void> | void;
};

export default function ProfileFieldDialog({ open, onOpenChange, title, defaultValues, onSubmit }: Props) {
  const [openType, setOpenType] = useState(false);

  const form = useForm<ProfileFieldDialogValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? { name: "", type: undefined as unknown as any },
    values: defaultValues ?? undefined,
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
    form.reset({ name: "", type: undefined as unknown as any });
  });

  const selectedType = TYPE_OPTIONS.find((t) => t.id === form.watch("type"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Campo</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del Campo*" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Popover open={openType} onOpenChange={setOpenType}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between">
                        {selectedType ? selectedType.label : "Seleccionar tipo"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[360px]">
                      <Command>
                        <CommandInput placeholder="Buscar..." />
                        <CommandList>
                          <CommandEmpty>Sin resultados</CommandEmpty>
                          <CommandGroup>
                            {TYPE_OPTIONS.map((opt) => (
                              <CommandItem
                                key={opt.id}
                                value={opt.label}
                                onSelect={() => {
                                  field.onChange(opt.id);
                                  setOpenType(false);
                                }}
                                className="flex items-center justify-between"
                              >
                                <span>{opt.label}</span>
                                <Check className={cn("h-4 w-4", field.value === opt.id ? "opacity-100" : "opacity-0")} />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit">Guardar</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
