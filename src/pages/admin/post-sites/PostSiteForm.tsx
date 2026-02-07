import { useEffect, useMemo, useState, useRef } from "react";
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
import { t } from "i18next";

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
    const redirectUrl = "/post-sites/fa6e52cc-7842-43a2-aba6-977e44ba082b/profile";
    const [categories, setCategories] = useState<Category[]>(initialCategories || []);
    const [loadingCategories, setLoadingCategories] = useState(false);
    // Deduplicate toasts across mounts and avoid duplicate navigation
    const shownToasts = useRef<Set<string>>(new Set());
    const showToastOnce = (key: string, message: string) => {
        if (shownToasts.current.has(key)) return;
        shownToasts.current.add(key);
        toast.error(message);
    };
    const [redirecting, setRedirecting] = useState(false);

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
            description: "",
            clientId: "",
            address: "",
            addressLine2: "",
            postalCode: "",
            city: "",
            country: "",
            email: "",
            phone: "",
            fax: "",
            categoryId: "",
            status: "active",
        },
    });

    const setFormValue = (name: keyof PostSiteInput, value: any) => {
        // use form.setValue while keeping validation trigger
        form.setValue(name as any, value, { shouldValidate: true, shouldDirty: true });
    };

    // Cargar datos en modo edición
    useEffect(() => {
        if (mode === "edit" && id) {
            (async () => {
                const data = await postSiteService.get(id);
                const payload: PostSiteInput = {
                    name: (data as any).companyName ?? (data as any).name ?? "",
                    description: (data as any).description ?? "",
                    clientId: (data as any).clientAccountId ?? (data as any).clientId ?? "",
                    address: data.address ?? "",
                    addressLine2: (data as any).secondAddress ?? (data as any).addressLine2 ?? "",
                    postalCode: (data as any).postalCode ?? (data as any).zipCode ?? "",
                    city: (data as any).city ?? "",
                    country: (data as any).country ?? "",
                    latitud: (data as any).latitud ?? undefined,
                    longitud: (data as any).longitud ?? undefined,
                    email: (data as any).contactEmail ?? data.email ?? "",
                    phone: (data as any).contactPhone ?? data.phone ?? "",
                    fax: data.fax || "",
                    categoryId: Array.isArray((data as any).categoryIds) && (data as any).categoryIds.length > 0
                        ? (data as any).categoryIds[0]
                        : (data as any).categoryId || undefined,
                    status: typeof (data as any).active === 'boolean' ? ((data as any).active ? 'active' : 'inactive') : (data.status ?? "active"),
                };
                form.reset(payload);
            })().catch((e) => {
                console.error(e);
                if (!redirecting) {
                    setRedirecting(true);
                    showToastOnce('edit-postsite-not-found', 'Sitio de publicación no encontrado o error al cargar los datos.');
                    navigate('/post-sites', { replace: true });
                }
            });
        }
    }, [mode, id, baseUrl, form]);

    const handleCancel = () => {
        navigate(redirectUrl);
    };

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
                navigate(redirectUrl);
            } else if (mode === "edit" && id) {
                await postSiteService.update(id, payload);
                toast.success("Cambios guardados");
                onSaved?.({ id, data: payload });
                navigate(redirectUrl);
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
                                    <FormLabel>{t('postSites.form.client', 'Cliente *')}</FormLabel>
                                    <Combobox
                                        value={field.value ? String(field.value) : ""}
                                        onChange={field.onChange}
                                        options={clientsList.map((c) => ({
                                            value: c.id,
                                            label: formatClientName(c),
                                        }))}
                                        placeholder={t('postSites.form.selectClient', 'Select client')}
                                        aria-label={t('postSites.form.selectClient', 'Select client')}
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
                                    <FormLabel>{t('postSites.form.siteName', 'Sitio de publicación *')}</FormLabel>
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
                                    <FormLabel>{t('postSites.form.address', 'Dirección *')}</FormLabel>
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
                                    <FormLabel>{t('postSites.form.addressLine2', 'Dirección Complementaria')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t('postSites.form.addressLine2Placeholder', 'Opcional')}
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
                                    <FormLabel>{t('postSites.form.postalCode', 'Código postal/Zip *')}</FormLabel>
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
                                    <FormLabel>{t('postSites.form.city', 'Ciudad *')}</FormLabel>
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
                                    <FormLabel>{t('postSites.form.country', 'País *')}</FormLabel>
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
                    <div className="md:col-span-2 flex gap-4 items-start">
                        <FormField<PostSiteInput>
                            control={form.control}
                            name="latitud"
                            render={({ field }) => (
                                <FormItem className="flex-1">
                                    <FormLabel>{t('postSites.form.latitude', 'Latitud *')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t('postSites.form.latitude', 'Latitud *')}
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
                            name="longitud"
                            render={({ field }) => (
                                <FormItem className="flex-1">
                                    <FormLabel>{t('postSites.form.longitude', 'Longitud *')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t('postSites.form.longitude', 'Longitud *')}
                                            {...field}
                                            value={field.value ? String(field.value) : ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="mt-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    if (!navigator.geolocation) {
                                        toast.error(t('postSites.form.geolocationNotSupported', 'Geolocalización no soportada en este navegador'));
                                        return;
                                    }
                                    navigator.geolocation.getCurrentPosition(
                                        (pos) => {
                                            const lat = String(pos.coords.latitude);
                                            const lng = String(pos.coords.longitude);
                                            setFormValue('latitud' as any, lat);
                                            setFormValue('longitud' as any, lng);
                                            toast.success(t('postSites.form.locationSet', 'Ubicación actual establecida'));
                                        },
                                        (err) => {
                                            console.error(err);
                                            toast.error(t('postSites.form.unableToRetrieveLocation', 'No se pudo obtener la ubicación'));
                                        },
                                        { enableHighAccuracy: true, timeout: 10000 }
                                    );
                                }}
                            >
                                {t('postSites.form.useMyLocation', 'Usar mi ubicación')}
                            </Button>
                        </div>

                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField<PostSiteInput>
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('postSites.form.phone', 'Número de Teléfono *')}</FormLabel>
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
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('postSites.form.email', 'Email Address *')}</FormLabel>
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
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('postSites.form.description', 'Descripción *')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t('postSites.form.descriptionPlaceholder', 'Descripción del sitio')}
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
                            <AccordionTrigger className="px-4 hover:cursor-pointer text-md font-medium hover:no-underline">
                                {t('postSites.form.moreInfo', 'Más Información')}
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField<PostSiteInput>
                                        control={form.control}
                                        name="fax"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('postSites.form.fax', 'Fax')}</FormLabel>
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
                                                <FormLabel>{t('postSites.form.category', 'Categoría')}</FormLabel>
                                                <CategorySelect
                                                    options={cats}
                                                    value={field.value ? String(field.value) : undefined}
                                                    onChange={field.onChange}
                                                    placeholder={loadingCategories ? "Cargando..." : t('postSites.form.slectcategory', 'Selecciona una categoría')}
                                                    module="postSite"
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

                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" className="min-w-28" onClick={handleCancel}>
                            {t('postSites.form.cancel', 'Cancelar')}
                        </Button>
                        <Button type="submit" className="min-w-28 bg-orange-500 text-white  cursor-pointer border border-orange-500 hover:bg-orange-600">
                            {t('postSites.form.submit', 'Enviar')}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}