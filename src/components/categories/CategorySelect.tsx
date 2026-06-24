import { useMemo, useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { categoryService } from "@/lib/api/categoryService";
import { usePermissions } from '@/hooks/usePermissions';
import { useTranslation } from 'react-i18next';

export type CategoryOption = { id: string; name: string };

type CategorySelectProps = {
    options?: CategoryOption[];
    value?: string | string[];
    onChange: (value?: string | string[]) => void;
    placeholder?: string;
    module: string;
    onCategoryCreated?: () => void;
    multiple?: boolean;
};

export function CategorySelect({
    options = [],
    value,
    onChange,
    placeholder,
    module,
    onCategoryCreated,
    multiple = false,
}: CategorySelectProps) {
    const { hasPermission } = usePermissions();
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [openCreate, setOpenCreate] = useState(false);
    const [newName, setNewName] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [items, setItems] = useState<CategoryOption[]>(options);
    const [isLoading, setIsLoading] = useState(false);
    const prevValueRef = useRef<string | undefined>(undefined);
    const hasLoadedRef = useRef(false);

    // Sync provided options into local state. Depend on a stable signal (count)
    // instead of the array identity so a parent passing a fresh `[]` each render
    // doesn't thrash this effect.
    const optionsCount = options?.length ?? 0;
    useEffect(() => {
        if (optionsCount > 0) setItems(options);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [optionsCount]);

    // Re-allow a fetch when the target module changes.
    useEffect(() => {
        hasLoadedRef.current = false;
    }, [module]);

    // When the parent supplies no options, fetch the list once for this module.
    useEffect(() => {
        const shouldLoad = optionsCount === 0;
        if (!shouldLoad || hasLoadedRef.current) return;
        hasLoadedRef.current = true;

        let cancelled = false;
        const load = async () => {
            try {
                setIsLoading(true);
                const res = await categoryService.list({
                    filter: { module },
                    limit: 1000,
                });
                if (cancelled) return;
                const mapped = res.rows.map((c) => ({ id: c.id, name: c.name }));
                setItems(mapped);
            } catch {
                if (cancelled) return;
                toast.error(t('categories.notcategories', 'No hay Sectores disponibles'));
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        load();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [module, optionsCount]);

    const selectedSingle = useMemo(() => {
        if (multiple) return undefined;
        return items.find((o) => o.id === value);
    }, [items, value, multiple]);

    const selectedMany = useMemo(() => {
        if (!multiple) return [] as CategoryOption[];
        const ids = Array.isArray(value) ? value : [];
        return items.filter((o) => ids.includes(o.id));
    }, [items, value, multiple]);

    const handleCreate = async () => {
        if (!hasPermission('categoryCreate')) {
            toast.error(t('categories.noPermissionCreate', 'No tienes permiso para Crear sector de seguridads'));
            return;
        }
        if (!newName.trim()) {
            toast.error(t('categories.nameRequired', 'El nombre es obligatorio'));
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
            // Respect multi-select: APPEND the new sector to the current array
            // instead of replacing the whole value with a single string. The old
            // `onChange(created.id)` turned `categoryIds` into a string, so on save
            // `Array.isArray(...)` dropped it (sector lost / "save twice") and it
            // never showed as selected.
            if (multiple) {
                const cur = Array.isArray(value) ? value : (value ? [value as string] : []);
                onChange(cur.includes(created.id) ? cur : [...cur, created.id]);
            } else {
                onChange(created.id);
            }
            setNewName("");
            setNewDescription("");
            setOpenCreate(false);
            toast.success(t('categories.categoryCreated', 'Categoría creada con éxito'));
            onCategoryCreated?.();
        } catch (error: any) {
            toast.error(error?.message || t('categories.categoryCreateFailed', 'Error al crear la categoría'));
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className="w-full justify-between font-normal" disabled={isLoading}>
                        <span className={(multiple ? selectedMany.length > 0 : !!selectedSingle) ? "" : "text-muted-foreground"}>
                            {isLoading
                                ? t('categories.loading', 'Cargando...')
                                : multiple
                                    ? selectedMany.length > 0
                                        ? selectedMany.map(s => s.name).join(", ")
                                        : (placeholder ?? t('clients.form.categoryLabel', 'Sector de seguridad'))
                                    : selectedSingle
                                        ? selectedSingle.name
                                        : (placeholder ?? t('clients.form.categoryLabel', 'Sector de seguridad'))}
                        </span>
                        <ChevronDown className="h-4 w-4 opacity-60" />
                    </Button>
                </PopoverTrigger>

                <PopoverContent align="start" className="p-0 w-full min-w-[var(--radix-popover-trigger-width)]">
                    <Command>
                        <CommandInput placeholder={t('categories.searchPlaceholder', 'Buscar...')} />
                        <CommandList>
                            <CommandEmpty>{isLoading ? "Cargando..." : t('categories.notfoundcategory', 'No se encontraron Sectores.')}</CommandEmpty>

                            {hasPermission('categoryCreate') && (
                                <CommandGroup>
                                    <CommandItem
                                        value="__add__"
                                        onSelect={() => setOpenCreate(true)}
                                        className="flex items-center gap-2 font-medium"
                                    >
                                        <Checkbox checked={false} className="pointer-events-none" />
                                        <span>{t('categories.addcategory', 'Agregar categoría')}</span>
                                        <Plus className="ml-auto h-4 w-4 text-[#C8860A]" />
                                    </CommandItem>
                                </CommandGroup>
                            )}

                            <CommandGroup>
                                {items.map((opt) => (
                                    <CommandItem
                                        key={opt.id}
                                        value={opt.name}
                                        onSelect={() => {
                                            if (multiple) {
                                                const current = Array.isArray(value) ? [...value] : [];
                                                const exists = current.includes(opt.id);
                                                const next = exists ? current.filter(id => id !== opt.id) : [...current, opt.id];
                                                onChange(next.length > 0 ? next : undefined);
                                            } else {
                                                if (opt.id === value && opt.id === prevValueRef.current) {
                                                    onChange(undefined);
                                                    prevValueRef.current = undefined;
                                                } else {
                                                    onChange(opt.id);
                                                    prevValueRef.current = opt.id;
                                                }
                                                setOpen(false);
                                            }
                                        }}
                                        className="flex items-center gap-2"
                                    >
                                        <Checkbox
                                            checked={multiple ? (Array.isArray(value) ? value.includes(opt.id) : false) : opt.id === value}
                                            className="pointer-events-none"
                                        />
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
                        <DialogTitle className="text-center">{t('categories.addcategory', 'Add Category')}</DialogTitle>
                        <DialogDescription>{t('categories.addcategoryDescription', 'Form to create a new category.')}</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">
                                {t('categories.name', 'Name*')}
                            </label>
                            <Input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) => {
                                    // Create the sector on Enter instead of letting the
                                    // keypress bubble to (or submit) any surrounding form.
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (!isCreating) handleCreate();
                                    }
                                }}
                                placeholder={t('categories.nameHint', 'Ej: General')}
                                className="placeholder:text-muted-foreground"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1 block">
                                {t('categories.description', 'Description')}
                            </label>
                            <Textarea
                                rows={3}
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                placeholder={t('categories.descriptionHint', 'Breve descripción (opcional)')}
                                className="placeholder:text-muted-foreground"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpenCreate(false)} disabled={isCreating}>
                            {t('categories.cancel', 'Cancel')}
                        </Button>
                        <Button
                            type="button"
                            onClick={handleCreate}
                            disabled={isCreating}
                            className="bg-[#C8860A] hover:bg-[#B37809] text-white disable:opacity-50 disabled:pointer-event-none">
                            {isCreating ? t('categories.creating', 'Creating...') : t('categories.create', 'Create')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >
        </>
    );
}
