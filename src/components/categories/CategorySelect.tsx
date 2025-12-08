import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { categoryService } from "@/lib/api/categoryService";

export type CategoryOption = { id: string; name: string };

type CategorySelectProps = {
    options?: CategoryOption[];
    value?: string;
    onChange: (value?: string) => void;
    placeholder?: string;
    module: string;
    onCategoryCreated?: () => void;
};

export function CategorySelect({
    options = [],
    value,
    onChange,
    placeholder = "Categoría",
    module,
    onCategoryCreated,
}: CategorySelectProps) {
    const [open, setOpen] = useState(false);
    const [openCreate, setOpenCreate] = useState(false);
    const [newName, setNewName] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [items, setItems] = useState<CategoryOption[]>(options);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setItems(options);
    }, [options]);

    useEffect(() => {
        const shouldLoad = !options || options.length === 0;
        if (!shouldLoad) return;

        const load = async () => {
            try {
                setIsLoading(true);
                const res = await categoryService.list({
                    filter: { module },
                    limit: 1000,
                });
                const mapped = res.rows.map((c) => ({ id: c.id, name: c.name }));
                setItems(mapped);
            } catch {
                toast.error("No se pudieron cargar las categorías");
            } finally {
                setIsLoading(false);
            }
        };

        load();
    }, [module, options]);

    const selected = useMemo(() => items.find((o) => o.id === value), [items, value]);

    const handleCreate = async () => {
        if (!newName.trim()) {
            toast.error("El nombre de la categoría es requerido");
            return;
        }

        setIsCreating(true);
        try {
            const created = await categoryService.create({
                name: newName.trim(),
                description: newDescription.trim() || undefined,
                module,
            });

            setItems((prev) => [...prev, { id: created.id, name: created.name }]);
            onChange(created.id);
            setNewName("");
            setNewDescription("");
            setOpenCreate(false);
            toast.success("Categoría creada exitosamente");
            onCategoryCreated?.();
        } catch (error: any) {
            toast.error(error?.message || "Error al crear la categoría");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className="w-full justify-between font-normal" disabled={isLoading}>
                        <span className={selected ? "" : "text-muted-foreground"}>
                            {isLoading ? "Cargando..." : selected ? selected.name : placeholder}
                        </span>
                        <ChevronDown className="h-4 w-4 opacity-60" />
                    </Button>
                </PopoverTrigger>

                <PopoverContent align="start" className="p-0 w-full min-w-[var(--radix-popover-trigger-width)]">
                    <Command>
                        <CommandInput placeholder="Buscar..." />
                        <CommandList>
                            <CommandEmpty>{isLoading ? "Cargando..." : "No se encontraron categorías."}</CommandEmpty>

                            <CommandGroup>
                                <CommandItem
                                    value="__add__"
                                    onSelect={() => setOpenCreate(true)}
                                    className="flex items-center gap-2 font-medium"
                                >
                                    <Checkbox checked={false} className="pointer-events-none" />
                                    <span>Agregar categoría</span>
                                    <Plus className="ml-auto h-4 w-4 text-orange-500" />
                                </CommandItem>
                            </CommandGroup>

                            <CommandGroup>
                                {items.map((opt) => (
                                    <CommandItem
                                        key={opt.id}
                                        value={opt.name}
                                        onSelect={() => {
                                            onChange(opt.id);
                                            setOpen(false);
                                        }}
                                        className="flex items-center gap-2"
                                    >
                                        <Checkbox checked={opt.id === value} className="pointer-events-none" />
                                        <span>{opt.name}</span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Agregar categoría</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Nombre*</label>
                            <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1 block">Descripción</label>
                            <Textarea rows={3} value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenCreate(false)} disabled={isCreating}>
                            Cancelar
                        </Button>
                        <Button onClick={handleCreate} disabled={isCreating}>
                            {isCreating ? "Creando..." : "Enviar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
