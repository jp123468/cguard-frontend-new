import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { categoryService } from "@/lib/api/categoryService";
import { postSiteService } from "@/lib/api/postSiteService";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    CategorySelect,
    CategoryOption,
} from "@/components/categories/CategorySelect";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/app/combobox";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { PostSiteInput, postSiteSchema } from "@/lib/validators/post-site";
import { PhoneInput } from "@/components/phone/PhoneInput";

export type Client = { id: string; name: string; lastName?: string };
export type Category = { id: string; name: string; description?: string };

export type PostSiteFormProps = {
    mode: "create" | "edit";
    id?: string;
    clients?: Client[];
    categories?: Category[];
    baseUrl?: string;
    onSaved?: (payload: { id: string; data: PostSiteInput }) => void;
};

export default function PostSiteForm({
    mode,
    id,
    clients,
    categories: initialCategories,
    baseUrl = "/api/post-sites",
    onSaved,
}: PostSiteFormProps) {
    const navigate = useNavigate();
    const [categories, setCategories] = useState<Category[]>(initialCategories || []);
    const [loadingCategories, setLoadingCategories] = useState(false);

    const formatClientName = (client: Client) => {
        const fullName = [client.name, client.lastName].filter(Boolean).join(" ").trim();
        return fullName || client.name;
    };

    const loadCategories = async () => {
        setLoadingCategories(true);
        try {
            const response = await categoryService.list({
                filter: {
                    module: "postSite"
                },
                limit: 1000,
                offset: 0
            });
            const categoryList = response?.rows || [];
            setCategories(categoryList);
        } catch (e) {
            console.error("Error loading categories:", e);
            toast.error("No se pudieron cargar las categorías");
        } finally {
            setLoadingCategories(false);
        }
    };

    useEffect(() => {
        loadCategories();
    }, []);

    const handleCategoryCreated = () => {
        loadCategories();
    };

    const form = useForm<PostSiteInput>({
        resolver: zodResolver(postSiteSchema as any),
        defaultValues: {
            name: "",
            clientId: "",
            address: "",
            addressLine2: "",
            postalCode: "",
            city: "",
            country: "",
            email: undefined,
            phone: undefined,
            fax: undefined,
            categoryId: undefined,
            status: "active",
        },
    });

    // Cargar datos en modo edición
    useEffect(() => {
        if (mode === "edit" && id) {
            (async () => {
                const data = await postSiteService.get(id);
                const payload: PostSiteInput = {
                    name: data.name ?? "",
                    clientId: data.clientId ?? "",
                    address: data.address ?? "",
                    addressLine2: (data as any).addressLine2 ?? "",
                    postalCode: (data as any).postalCode ?? "",
                    city: (data as any).city ?? "",
                    country: (data as any).country ?? "",
                    email: data.email || undefined,
                    phone: data.phone || undefined,
                    fax: data.fax || undefined,
                    categoryId: data.categoryId || undefined,
                    status: data.status ?? "active",
                };
                form.reset(payload);
            })().catch((e) => {
                console.error(e);
                toast.error("No se pudo cargar el sitio de publicación");
            });
        }
    }, [mode, id, baseUrl, form]);

    async function onSubmit(values: PostSiteInput) {
        try {
            const payload: PostSiteInput = {
                ...values,
                // Map empty string to null for category
                categoryId: values.categoryId && String(values.categoryId).length > 0 ? values.categoryId : undefined,
            };
            
            if (mode === "create") {
                const data = await postSiteService.create(payload);
                toast.success("Sitio de publicación creado");
                onSaved?.({ id: data.id, data: payload });
                navigate("/admin/post-sites");
            } else if (mode === "edit" && id) {
                await postSiteService.update(id, payload);
                toast.success("Cambios guardados");
                onSaved?.({ id, data: payload });
                navigate("/admin/post-sites");
            }
        } catch (e: any) {
            console.error(e);
            toast.error(e?.response?.data?.message ?? "Error al guardar");
        }
    }

    const clientsList = useMemo(() => {
        if (!clients || !Array.isArray(clients)) return [];
        return clients;
    }, [clients]);

    const cats: CategoryOption[] = useMemo(() => {
        if (!categories || !Array.isArray(categories)) return [];
        return categories.map((c) => ({ id: c.id, name: c.name }));
    }, [categories]);

    return (
        <div className="max-w-[1400px] mx-auto">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Fila 1 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField<PostSiteInput>
                            control={form.control}
                            name="clientId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cliente *</FormLabel>
                                    <Combobox
                                        value={field.value ? String(field.value) : ""}
                                        onChange={field.onChange}
                                        options={clientsList.map((c) => ({
                                            value: c.id,
                                            label: formatClientName(c),
                                        }))}
                                        placeholder="Selecciona un cliente"
                                        aria-label="Selecciona un cliente"
                                    />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField<PostSiteInput>
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sitio de publicación *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="" {...field} value={field.value ? String(field.value) : ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Fila 2: Dirección */}
                    <div className="grid grid-cols-1 gap-6">
                        <FormField<PostSiteInput>
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Dirección *</FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="" 
                                            {...field} 
                                            value={field.value ? String(field.value) : ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField<PostSiteInput>
                            control={form.control}
                            name="addressLine2"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Dirección Complementaria</FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="Opcional" 
                                            {...field} 
                                            value={field.value ? String(field.value) : ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Fila 3: Código postal, Ciudad, País */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FormField<PostSiteInput>
                            control={form.control}
                            name="postalCode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Código postal/Zip *</FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="" 
                                            {...field} 
                                            value={field.value ? String(field.value) : ""}
                                            maxLength={20}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField<PostSiteInput>
                            control={form.control}
                            name="city"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ciudad *</FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="" 
                                            {...field} 
                                            value={field.value ? String(field.value) : ""}
                                            maxLength={100}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField<PostSiteInput>
                            control={form.control}
                            name="country"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>País *</FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="" 
                                            {...field} 
                                            value={field.value ? String(field.value) : ""}
                                            maxLength={100}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Más Información (Accordion) */}
                    <Accordion type="single" collapsible defaultValue="more">
                        <AccordionItem value="more" className="border rounded-md">
                            <AccordionTrigger className="px-4 hover:cursor-pointer text-md font-medium hover:no-underline">Más Información</AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField<PostSiteInput>
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Correo Electrónico</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        type="email" 
                                                        placeholder="" 
                                                        {...field} 
                                                        value={field.value ? String(field.value) : ""}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField<PostSiteInput>
                                        control={form.control}
                                        name="phone"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Número de Teléfono</FormLabel>
                                                <FormControl>
                                                    <PhoneInput
                                                        value={field.value ?? ""}
                                                        onChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField<PostSiteInput>
                                        control={form.control}
                                        name="fax"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Fax</FormLabel>
                                                <FormControl>
                                                    <PhoneInput
                                                        value={field.value ?? ""}
                                                        onChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField<PostSiteInput>
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
                                                    module="postSite"
                                                    onCategoryCreated={handleCategoryCreated}
                                                />
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {mode === 'edit' && (
                                        <FormField<PostSiteInput>
                                            control={form.control}
                                            name="status"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Estado</FormLabel>
                                                    <Select 
                                                        onValueChange={field.onChange} 
                                                        value={field.value ? String(field.value) : "active"}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Selecciona un estado" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="active">Activo</SelectItem>
                                                            <SelectItem value="inactive">Inactivo</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>

                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" className="min-w-28">Cancelar</Button>
                        <Button type="submit" className="min-w-28">Enviar</Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}