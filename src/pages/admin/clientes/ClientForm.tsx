import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientSchema, type ClientInput } from "@/lib/validators/client";
import { toast } from "sonner";
import { clientService } from "@/lib/api/clientService";
import { categoryService } from "@/lib/api/categoryService";

import { Button } from "@/components/ui/button";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";

import { PhoneInput } from "@/components/phone/PhoneInput";
import {
    CategorySelect,
    CategoryOption,
} from "@/components/categories/CategorySelect";
import { Link } from "react-router-dom";

export type Category = { id: string; name: string };

export type ClientFormProps = {
    mode: "create" | "edit";
    id?: string;
    categories?: Category[];
    onSaved?: (payload: { id: string; data: ClientInput }) => void;
};

type ClientApiPayload = Omit<ClientInput, "categoryId"> & {
    categoryId?: string | null;
};

export default function ClientForm({
    mode,
    id,
    categories: initialCategories,
    onSaved,
}: ClientFormProps) {
    const [categories, setCategories] = useState<Category[]>(initialCategories || []);
    const [loadingCategories, setLoadingCategories] = useState(false);

    const form = useForm<ClientInput>({
        resolver: zodResolver(clientSchema as any),
        defaultValues: {
            name: "",
            email: "",
            phoneNumber: "",
            address: "",
            faxNumber: "",
            website: "",
            categoryId: "",
        },
    });

    // Función para cargar categorías del módulo clientAccount
    const loadCategories = async () => {
        setLoadingCategories(true);
        try {
            const response = await categoryService.list({
                filter: {
                    module: "clientAccount" // Filtrar por el módulo correcto
                },
                limit: 1000, // Ajusta según necesites
                offset: 0
            });

            // Extraer el array de categorías de la respuesta
            const categoryList = response?.rows || [];
            setCategories(categoryList);
        } catch (e) {
            console.error("Error loading categories:", e);
            toast.error("No se pudieron cargar las categorías");
        } finally {
            setLoadingCategories(false);
        }
    };

    // Cargar categorías al montar el componente
    useEffect(() => {
        loadCategories();
    }, []);

    // Cargar datos del cliente en modo edición
    useEffect(() => {
        if (mode === "edit" && id) {
            (async () => {
                try {
                    const data = await clientService.getClient(id);
                    const payload: ClientInput = {
                        name: data.name ?? "",
                        email: data.email || "",
                        phoneNumber: data.phoneNumber || "",
                        address: data.address || "",
                        faxNumber: data.faxNumber || "",
                        website: data.website || "",
                        categoryId: data.categoryId || "",
                    };
                    form.reset(payload);
                } catch (e) {
                    console.error(e);
                    toast.error("No se pudo cargar el cliente");
                }
            })();
        }
    }, [mode, id, form]);

    async function onSubmit(values: ClientInput) {
        const apiPayload: ClientApiPayload = {
            ...values,
            categoryId: values.categoryId || null,
        };

        try {
            if (mode === "create") {
                // const data = await clientService.createClient(
                //     apiPayload as unknown as ClientInput
                // );

                const data = await clientService.createClient(apiPayload as ClientInput);

                toast.success("Cliente creado");
                onSaved?.({ id: data.id, data: values });
                form.reset();
            } else if (mode === "edit" && id) {
                await clientService.updateClient(
                    id,
                    apiPayload as unknown as ClientInput
                );
                toast.success("Cambios guardados");
                onSaved?.({ id, data: values });
            }
        } catch (e: any) {
            console.error(e);
            toast.error(e?.message || "Error al guardar");
        }
    }

    const cats: CategoryOption[] = useMemo(() => {
        if (!categories || !Array.isArray(categories)) return [];
        return categories.map((c) => ({ id: c.id, name: c.name }));
    }, [categories]);

    const handleCategoryCreated = () => {
        // Recargar las categorías sin recargar toda la página
        loadCategories();
    };

    return (
        <div className="">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField<ClientInput>
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre del Cliente *</FormLabel>
                                    <FormControl>
                                        <input
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            {...field}
                                            value={field.value || ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField<ClientInput>
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Correo Electrónico *</FormLabel>
                                    <FormControl>
                                        <input
                                            type="email"
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            {...field}
                                            value={field.value || ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField<ClientInput>
                            control={form.control}
                            name="phoneNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Número de Teléfono *</FormLabel>
                                    <FormControl>
                                        <PhoneInput
                                            value={field.value || ""}
                                            onChange={field.onChange}
                                            placeholder="e.g. +12015550123"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField<ClientInput>
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Dirección del Cliente *</FormLabel>
                                    <FormControl>
                                        <input
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            {...field}
                                            value={field.value || ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <Accordion type="single" collapsible defaultValue="more">
                        <AccordionItem value="more" className="border rounded-md">
                            <AccordionTrigger className="px-4">
                                Más Información
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField<ClientInput>
                                        control={form.control}
                                        name="faxNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Fax</FormLabel>
                                                <FormControl>
                                                    <PhoneInput
                                                        value={field.value || ""}
                                                        onChange={field.onChange}
                                                        placeholder="e.g. +12015550123"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField<ClientInput>
                                        control={form.control}
                                        name="website"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Sitio Web</FormLabel>
                                                <FormControl>
                                                    <input
                                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                        placeholder="https://"
                                                        {...field}
                                                        value={field.value || ""}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField<ClientInput>
                                        control={form.control}
                                        name="categoryId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Categoría</FormLabel>
                                                <CategorySelect
                                                    options={cats}
                                                    value={field.value ? String(field.value) : undefined}
                                                    onChange={field.onChange}
                                                    placeholder={loadingCategories ? "Cargando..." : "Selecciona una categoría"}
                                                    module="clientAccount"
                                                    onCategoryCreated={handleCategoryCreated}
                                                />
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>

                    <div className="flex justify-end gap-4">
                        <Button type="submit" className="min-w-28 bg-white text-[#FE6F02] rounded-none cursor-pointer border border-[#FE6F02] hover:bg-gray-100 hover:text-[#FE6F02]">
                            Enviar
                        </Button>
                        <Link to="/clients" className="px-3 py-1 border rounded-none cursor-pointer font-medium">
                            Cancelar
                        </Link>
                    </div>
                </form>
            </Form>
        </div>
    );
}