import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { PostSiteInput, postSiteSchema } from "@/lib/validators/post-site";

export type Client = { id: string; name: string };
export type Category = { id: string; name: string };

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
    categories,
    baseUrl = "/api/post-sites",
    onSaved,
}: PostSiteFormProps) {
    const form = useForm<PostSiteInput>({
        resolver: zodResolver(postSiteSchema as any),
        defaultValues: {
            name: "",
            clientId: "",
            address: "",
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
                const { data } = await axios.get(`${baseUrl}/${id}`);
                const payload: PostSiteInput = {
                    name: data.name ?? "",
                    clientId: data.clientId ?? "",
                    address: data.address ?? "",
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
            if (mode === "create") {
                const { data } = await axios.post(baseUrl, values);
                toast.success("Sitio de publicación creado");
                onSaved?.({ id: data?.id ?? "", data: values });
                form.reset();
            } else if (mode === "edit" && id) {
                await axios.put(`${baseUrl}/${id}`, values);
                toast.success("Cambios guardados");
                onSaved?.({ id, data: values });
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

    const categoriesList = useMemo(() => {
        if (!categories || !Array.isArray(categories)) return [];
        return categories;
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
                                    <Select 
                                        onValueChange={field.onChange} 
                                        value={field.value ? String(field.value) : ""}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona un cliente" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {clientsList.map((c) => (
                                                <SelectItem value={c.id} key={c.id}>
                                                    {c.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
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

                    {/* Fila 2 */}
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
                                                    <Input 
                                                        placeholder="e.g. +12015550123" 
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
                                        name="fax"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Fax</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        placeholder="e.g. +12015550123" 
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
                                        name="categoryId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Categoría</FormLabel>
                                                <Select 
                                                    onValueChange={field.onChange} 
                                                    value={field.value ? String(field.value) : ""}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecciona una categoría" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {categoriesList.map((c) => (
                                                            <SelectItem value={c.id} key={c.id}>
                                                                {c.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

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