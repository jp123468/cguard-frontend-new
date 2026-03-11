import { useEffect, useMemo, useState, useRef } from "react";
import { clientService } from "@/lib/api/clientService";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { categoryService } from "@/lib/api/categoryService";
import { postSiteService } from "@/lib/api/postSiteService";
import AddressAutocompleteOSM, { AddressComponents } from "@/components/maps/AddressAutocompleteOSM";

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
import OSMMapEmbed from "@/components/maps/OSMMapEmbed";
import { t } from "i18next";

import { useClientSelection } from '@/contexts/ClientSelectionContext';

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
    // Obtener cliente seleccionado del contexto (debe ir antes de cualquier uso)
    const { selectedClient, setSelectedClient } = useClientSelection();
    const navigate = useNavigate();
    const [categories, setCategories] = useState<Category[]>(initialCategories || []);
    const [loadingCategories, setLoadingCategories] = useState(false);
    // Estado para dirección diferente
    const [direccionDiferente, setDireccionDiferente] = useState(false);
    const [addressComponents, setAddressComponents] = useState<AddressComponents | null>(null);
    // Si hay cliente seleccionado y el checkbox NO está marcado, copiar los datos de dirección del cliente al formulario y forzar validación
    useEffect(() => {
        if (!direccionDiferente && selectedClient && selectedClient.id) {
            form.setValue('address', selectedClient.address || '', { shouldValidate: true, shouldDirty: true });
            form.setValue('city', selectedClient.city || '', { shouldValidate: true, shouldDirty: true });
            form.setValue('postalCode', selectedClient.postalCode || '', { shouldValidate: true, shouldDirty: true });
            form.setValue('country', selectedClient.country || '', { shouldValidate: true, shouldDirty: true });
            form.trigger(['address', 'city', 'postalCode', 'country']);
        }
    }, [direccionDiferente, selectedClient]);

    // Manejar cambio de cliente: fetch datos completos y actualizar selectedClient
    const handleClientChange = async (clientId: string) => {
        if (!clientId) {
            setSelectedClient(null);
            return;
        }
        try {
            const client = await clientService.getClient(clientId);
            setSelectedClient(client);
        } catch (e) {
            toast.error("No se pudo obtener la información del cliente");
            setSelectedClient(null);
        }
    };

    // Antes de enviar, si el checkbox NO está marcado, forzar los datos del cliente en el payload
    async function onSubmit(values: PostSiteInput) {
        // Forzar los datos del cliente justo antes de enviar si el checkbox NO está marcado
        if (!direccionDiferente && selectedClient) {
            values.address = selectedClient.address || '';
            values.city = selectedClient.city || '';
            values.postalCode = selectedClient.postalCode || '';
            values.country = selectedClient.country || '';
            // Agregar latitud y longitud si existen en el cliente
            values.latitud = selectedClient.latitud || selectedClient.latitude || '';
            values.longitud = selectedClient.longitud || selectedClient.longitude || '';
        }
        // Forzar los valores en el form también (por si RHF hace validación interna)
        if (!direccionDiferente && selectedClient) {
            setFormValue('address', selectedClient.address || '');
            setFormValue('city', selectedClient.city || '');
            setFormValue('postalCode', selectedClient.postalCode || '');
            setFormValue('country', selectedClient.country || '');
        }
        console.log('onSubmit ejecutado, valores:', values);
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
                navigate(`/post-sites/${data.id}/profile`);
            } else if (mode === "edit" && id) {
                await postSiteService.update(id, payload);
                toast.success("Cambios guardados");
                onSaved?.({ id, data: payload });
                navigate(`/post-sites/${id}/profile`);
            }
        } catch (e: any) {
            console.error(e);
            toast.error(e?.response?.data?.message ?? "Error al guardar");
        }
    }
        // Cuando el usuario selecciona una dirección diferente con el mapa
        const handleAddressSelect = (address: AddressComponents) => {
            setAddressComponents(address);
            setFormValue('address', address.address);
            setFormValue('city', address.city);
            setFormValue('postalCode', address.postalCode);
            setFormValue('country', address.country);
            setFormValue('latitud', address.latitude);
            setFormValue('longitud', address.longitude);
        };
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

    // Si hay un cliente seleccionado en contexto, usarlo como valor por defecto y bloquear el campo
    useEffect(() => {
        if (mode === 'create' && selectedClient && selectedClient.id) {
            form.setValue('clientId', selectedClient.id, { shouldValidate: true, shouldDirty: true });
        }
    }, [mode, selectedClient]);

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
        if (mode === 'edit' && id) {
            navigate(`/post-sites/${id}/profile`);
        } else {
            navigate('/post-sites');
        }
    };


    // Mostrar errores de validación
    function onError(errors: any) {
        console.log('Errores de validación:', errors);
    }

    const clientsList = useMemo(() => {
        if (!clients || !Array.isArray(clients)) return [];
        return clients;
    }, [clients]);

    const cats: CategoryOption[] = useMemo(() => {
        if (!categories || !Array.isArray(categories)) return [];
        return categories.map((c) => ({ id: c.id, name: c.name }));
    }, [categories]);

    // Obtener valores actuales de latitud y longitud del formulario
    const lat = form.watch('latitud');
    const lng = form.watch('longitud');

    // Estado para tipo de mapa
    const [mapType, setMapType] = useState<'osm' | 'satellite'>('osm');

    return (
        <div className="max-w-[1400px] mx-auto">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-6">
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
                                        onChange={(value) => {
                                            field.onChange(value);
                                            handleClientChange(value);
                                        }}
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

                    {/* Checkbox para dirección diferente */}
                    <div className="my-2">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={direccionDiferente}
                                onChange={e => setDireccionDiferente(e.target.checked)}
                            />
                            ¿La dirección del sitio es diferente a la del cliente?
                        </label>
                    </div>

                    {/* Dirección del sitio solo si el checkbox está activo */}
                    {direccionDiferente && (
                        <div className="my-2">
                            <FormField<PostSiteInput>
                                control={form.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Dirección del sitio</FormLabel>
                                        <FormControl>
                                            <AddressAutocompleteOSM
                                                onAddressSelect={handleAddressSelect}
                                                defaultValue={form.getValues('address') || ''}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    )}
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
                    {/* Mapa OSM con selector de tipo de mapa */}
                    {(lat && lng) && (
                        <div className="my-4">
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-gray-700">Ubicación en el mapa</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-600">Tipo de mapa</span>
                                    <select
                                        className="border rounded px-2 py-1 text-xs"
                                        value={mapType}
                                        onChange={e => setMapType(e.target.value as 'osm' | 'satellite')}
                                    >
                                        <option value="osm">OpenStreetMap</option>
                                        <option value="satellite">Satélite</option>
                                    </select>
                                </div>
                            </div>
                            <OSMMapEmbed lat={lat} lng={lng} mapType={mapType} />
                        </div>
                    )}
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