import { useEffect, useMemo, useState, useRef } from "react";
import { clientService } from "@/lib/api/clientService";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { categoryService } from "@/lib/api/categoryService";
import { stationService } from "@/lib/api/stationService";
import AddressAutocompleteOSM, { AddressComponents } from "@/components/maps/AddressAutocompleteOSM";
import geocodeClient from '@/lib/geocodeClient';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    CategorySelect,
    CategoryOption,
} from "@/components/categories/CategorySelect";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation();
    // Obtener cliente seleccionado del contexto (debe ir antes de cualquier uso)
    const { selectedClient, setSelectedClient } = useClientSelection();
    const navigate = useNavigate();
    const [categories, setCategories] = useState<Category[]>(initialCategories || []);
    const [loadingCategories, setLoadingCategories] = useState(false);
    // Estado para dirección diferente
    const [direccionDiferente, setDireccionDiferente] = useState(false);
    const [addressComponents, setAddressComponents] = useState<AddressComponents | null>(null);
    // Si hay cliente seleccionado y el checkbox NO está marcado, copiar los datos de dirección del cliente al formulario y forzar validación
    // Solo hacerlo en modo creación para no sobreescribir los datos de un puesto existente.
    useEffect(() => {
        if (mode === 'create' && !direccionDiferente && selectedClient && selectedClient.id) {
            form.setValue('address', selectedClient.address || '', { shouldValidate: true, shouldDirty: true });
            form.setValue('city', selectedClient.city || '', { shouldValidate: true, shouldDirty: true });
            form.setValue('postalCode', selectedClient.postalCode || '', { shouldValidate: true, shouldDirty: true });
            form.setValue('country', selectedClient.country || '', { shouldValidate: true, shouldDirty: true });
            form.trigger(['address', 'city', 'postalCode', 'country']);
        }
    }, [mode, direccionDiferente, selectedClient]);

    // También completar teléfono y correo desde el cliente seleccionado cuando NO se indica dirección diferente
    useEffect(() => {
        if (!direccionDiferente && selectedClient && selectedClient.id) {
            const phone = (selectedClient as any).contactPhone || (selectedClient as any).phone || (selectedClient as any).phoneNumber || (selectedClient as any).mobile || (selectedClient as any).cellPhone || (selectedClient as any).cellular || '';
            const email = (selectedClient as any).contactEmail || (selectedClient as any).email || (selectedClient as any).mail || '';
            form.setValue('phone', phone, { shouldValidate: true, shouldDirty: true });
            form.setValue('email', email, { shouldValidate: true, shouldDirty: true });
            form.trigger(['phone', 'email']);
        }
    }, [direccionDiferente, selectedClient]);

    // Al marcar "dirección diferente": limpiar el campo de dirección para
    // permitir ingresar una nueva dirección (el autocompletado se remonta).
    useEffect(() => {
        if (!direccionDiferente) return;
        form.setValue('address', '', { shouldValidate: true, shouldDirty: true });
        form.setValue('city', '', { shouldValidate: true, shouldDirty: true });
        form.setValue('postalCode', '', { shouldValidate: true, shouldDirty: true });
        form.setValue('country', '', { shouldValidate: true, shouldDirty: true });
        form.setValue('latitud', undefined, { shouldValidate: true, shouldDirty: true });
        form.setValue('longitud', undefined, { shouldValidate: true, shouldDirty: true });
        setAddressComponents(null);
    }, [direccionDiferente]);

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
        // Debug: show current addressComponents and form values at submit start
        try {
            // eslint-disable-next-line no-console
            console.debug('[PostSiteForm] onSubmit - addressComponents:', addressComponents);
            // eslint-disable-next-line no-console
            console.debug('[PostSiteForm] form values at submit start:', {
                address: form.getValues('address'),
                city: form.getValues('city'),
                postalCode: form.getValues('postalCode'),
                country: form.getValues('country'),
                latitud: form.getValues('latitud'),
                longitud: form.getValues('longitud'),
            });
        } catch (e) {}
        // If the user indicated a different address, prefer the values
        // obtained from the map (`addressComponents`) to ensure the form
        // receives address/city/postalCode/country and lat/lng before
        // validation and submit.
        if (direccionDiferente) {
            if (addressComponents) {
                values.address = addressComponents.address || '';
                values.city = addressComponents.city || '';
                values.postalCode = addressComponents.postalCode || '';
                values.country = addressComponents.country || '';
                values.latitud = String(addressComponents.latitude);
                values.longitud = String(addressComponents.longitude);
                // keep form inputs in sync
                setFormValue('address', values.address);
                setFormValue('city', values.city);
                setFormValue('postalCode', values.postalCode);
                setFormValue('country', values.country);
                setFormValue('latitud', values.latitud);
                setFormValue('longitud', values.longitud);
            } else {
                // If there's no addressComponents, try to geocode the typed address
                const typed = form.getValues('address') || '';
                        if (typed && typed.length > 0) {
                            try {
                                const arr = await geocodeClient.searchGeocode(typed, { addressdetails: '1', limit: '1', 'accept-language': 'es', countrycodes: 'ec' });
                                if (Array.isArray(arr) && arr.length > 0) {
                                    const r = arr[0] as any;
                                    const lat = parseFloat(r.lat);
                                    const lng = parseFloat(r.lon);
                                    const addr = r.address || {};
                                    values.address = [addr.road, addr.house_number].filter(Boolean).join(' ') || r.display_name || typed;
                                    values.city = addr.city || addr.town || addr.village || addr.county || addr.state || (addr as any).city_district || addr.suburb || '';
                                    values.postalCode = addr.postcode || '';
                                    values.country = addr.country || '';
                                    values.latitud = String(lat);
                                    values.longitud = String(lng);
                                    // sync form fields
                                    setFormValue('address', values.address);
                                    setFormValue('city', values.city);
                                    setFormValue('postalCode', values.postalCode);
                                    setFormValue('country', values.country);
                                    setFormValue('latitud', values.latitud);
                                    setFormValue('longitud', values.longitud);
                                }
                            } catch (err) {
                                // ignore and fallthrough to validation errors below
                            }
                        }
                // After attempting geocode, re-check required fields
                const a = form.getValues('address') || values.address || '';
                const c = form.getValues('city') || values.city || '';
                const p = form.getValues('postalCode') || values.postalCode || '';
                const co = form.getValues('country') || values.country || '';
                if (!a || !c || !p || !co) {
                    toast.error(t('postSites.form.addressRequired', 'Debes seleccionar o ingresar la dirección del sitio'));
                    return;
                }
                // ensure lat/lng are strings if present
                const latVal = form.getValues('latitud') || values.latitud;
                const lngVal = form.getValues('longitud') || values.longitud;
                if (latVal !== undefined && latVal !== null) values.latitud = String(latVal);
                if (lngVal !== undefined && lngVal !== null) values.longitud = String(lngVal);
            }
        }

        // Forzar los datos del cliente justo antes de enviar si el checkbox NO está marcado
        if (!direccionDiferente && selectedClient) {
            values.address = selectedClient.address || '';
            values.city = selectedClient.city || '';
            values.postalCode = selectedClient.postalCode || '';
            values.country = selectedClient.country || '';
            // Agregar latitud y longitud si existen en el cliente
            values.latitud = String(selectedClient.latitud ?? selectedClient.latitude ?? '');
            values.longitud = String(selectedClient.longitud ?? selectedClient.longitude ?? '');
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
            const payload: any = {
                ...values,
                // backend expects companyName
                companyName: values.name,
                // Map empty string to null for category
                categoryId: values.categoryId && String(values.categoryId).length > 0 ? values.categoryId : undefined,
            };
            if (mode === "create") {
                const data = await stationService.create(payload as any);
                toast.success(t('postSites.created', 'Puesto de vigilancia creado'));
                onSaved?.({ id: data.id, data: payload });
                navigate(`/post-sites/${data.id}/profile`);
            } else if (mode === "edit" && id) {
                await stationService.update(id, payload as any);
                toast.success(t('postSites.changesSaved', 'Cambios guardados'));
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
        try { console.debug('[PostSiteForm] handleAddressSelect ->', address); } catch (e) {}
        setFormValue('address', address.address);
        setFormValue('city', address.city);
        setFormValue('postalCode', address.postalCode);
        setFormValue('country', address.country);
        // El validador espera strings para latitud/longitud
        setFormValue('latitud', String(address.latitude));
        setFormValue('longitud', String(address.longitude));
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
            toast.error("No se pudieron cargar las Sectores");
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
            latitud: undefined,
            longitud: undefined,
            stationSchedule: undefined,
            startingTimeInDay: "",
            finishTimeInDay: "",
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
                const data = await stationService.get(id);
                const payload: PostSiteInput = {
                    name: (data as any).companyName ?? (data as any).name ?? "",
                    description: (data as any).description ?? "",
                    clientId: (data as any).clientAccountId ?? (data as any).clientId ?? "",
                    address: data.address ?? "",
                    addressLine2: (data as any).secondAddress ?? (data as any).addressLine2 ?? "",
                    postalCode: (data as any).postalCode ?? (data as any).zipCode ?? "",
                    city: (data as any).city ?? "",
                    country: (data as any).country ?? "",
                    latitud: (data as any).latitud !== undefined && (data as any).latitud !== null ? String((data as any).latitud) : undefined,
                    longitud: (data as any).longitud !== undefined && (data as any).longitud !== null ? String((data as any).longitud) : undefined,
                    email: (data as any).contactEmail ?? data.email ?? "",
                    phone: (data as any).contactPhone ?? data.phone ?? "",
                    fax: data.fax || "",
                    categoryId: Array.isArray((data as any).categoryIds) && (data as any).categoryIds.length > 0
                        ? (data as any).categoryIds[0]
                        : (data as any).categoryId || undefined,
                    status: typeof (data as any).active === 'boolean' ? ((data as any).active ? 'active' : 'inactive') : (data.status ?? "active"),
                };
                form.reset(payload);

                const hasAnyAddressValue = Boolean(payload.address || payload.postalCode || payload.city || payload.country || payload.addressLine2);
                const sameAsClient = selectedClient && selectedClient.id &&
                    payload.address === (selectedClient.address || '') &&
                    payload.postalCode === (selectedClient.postalCode || '') &&
                    payload.city === (selectedClient.city || '') &&
                    payload.country === (selectedClient.country || '');

                if (hasAnyAddressValue && !sameAsClient) {
                    setDireccionDiferente(true);
                }
            })().catch((e) => {
                console.error(e);
                    if (!redirecting) {
                    setRedirecting(true);
                    showToastOnce('edit-postsite-not-found', t('postSites.notFound', 'Puesto de vigilancia no encontrado o error al cargar los datos.'));
                    navigate('/post-sites', { replace: true });
                }
            });
        }
    }, [mode, id, baseUrl, form, selectedClient]);

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

    // Watch station schedule to disable/hide start/end when schedule is 24 hours
    const stationScheduleValue = form.watch('stationSchedule');
    const scheduleNumber = parseInt(String(stationScheduleValue || ''), 10);
    const is24Hours = !isNaN(scheduleNumber) && scheduleNumber === 24;

    // If schedule becomes 24 hours, clear start/end time fields
    useEffect(() => {
        if (is24Hours) {
            setFormValue('startingTimeInDay', '');
            setFormValue('finishTimeInDay', '');
        }
    }, [is24Hours]);

    // Estado para tipo de mapa
    const [mapType, setMapType] = useState<'osm' | 'satellite'>('osm');

    return (
        <div className="max-w-[1400px] mx-auto">
            <Form {...form}>
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    // If direccionDiferente and no addressComponents yet, try a geocode
                    if (direccionDiferente && !addressComponents) {
                        const typed = form.getValues('address') || '';
                        if (typed && typed.length > 2) {
                            try {
                                const arr = await geocodeClient.searchGeocode(typed, { addressdetails: '1', limit: '1', 'accept-language': 'es', countrycodes: 'ec' });
                                if (Array.isArray(arr) && arr.length > 0) {
                                    const r = arr[0] as any;
                                    const lat = parseFloat(r.lat);
                                    const lng = parseFloat(r.lon);
                                    const addr = r.address || {};
                                    const derived = {
                                        address: [addr.road, addr.house_number].filter(Boolean).join(' ') || r.display_name || typed,
                                        city: addr.city || addr.town || addr.village || addr.county || addr.state || (addr as any).city_district || addr.suburb || '',
                                        postalCode: addr.postcode || '',
                                        country: addr.country || '',
                                        latitude: lat,
                                        longitude: lng,
                                    };
                                    // Populate form values so RHF validation can succeed
                                    setAddressComponents(derived as any);
                                    setFormValue('address', derived.address);
                                    setFormValue('city', derived.city);
                                    setFormValue('postalCode', derived.postalCode);
                                    setFormValue('country', derived.country);
                                    setFormValue('latitud', String(derived.latitude));
                                    setFormValue('longitud', String(derived.longitude));
                                }
                            } catch (err) {
                                // ignore
                            }
                        }
                    }
                    // Now run RHF validation + onSubmit
                    await form.handleSubmit(onSubmit, onError)();
                }} className="space-y-6">
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
                                    <FormLabel>{t('postSites.form.siteName', 'Puesto de seguridad *')}</FormLabel>
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
                            {t('postSites.form.addressDifferent', '¿La dirección del puesto de vigilancia es diferente a la del cliente?')}
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
                                                key={direccionDiferente ? 'address-different' : 'address-same'}
                                                onAddressSelect={handleAddressSelect}
                                                defaultValue={form.watch('address') || ''}
                                                initialLat={form.watch('latitud') ? Number(form.watch('latitud')) : undefined}
                                                initialLng={form.watch('longitud') ? Number(form.watch('longitud')) : undefined}
                                                suppressInitialReverse={false}
                                                onQueryChange={(q) => setFormValue('address', q)}
                                                onGeocodeResult={(addr) => {
                                                    try { console.debug('[PostSiteForm] onGeocodeResult ->', addr); } catch (e) {}
                                                    setAddressComponents(addr);
                                                    setFormValue('address', addr.address);
                                                    setFormValue('city', addr.city);
                                                    setFormValue('postalCode', addr.postalCode);
                                                    setFormValue('country', addr.country);
                                                    setFormValue('latitud', String(addr.latitude));
                                                    setFormValue('longitud', String(addr.longitude));
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                                <p className="text-sm font-medium text-slate-700 mb-3">{t('postSites.form.additionalAddressFields', 'Campos adicionales de dirección')}</p>
                                <div className="grid grid-cols-1 gap-6">
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
                                                        value={field.value ? String(field.value) : ''}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                                    <FormField<PostSiteInput>
                                        control={form.control}
                                        name="postalCode"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('clients.form.postalCode', 'Código postal/Zip')}</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="170606"
                                                        {...field}
                                                        value={field.value ? String(field.value) : ''}
                                                        disabled
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
                                                <FormLabel>{t('clients.form.city', 'Ciudad')}</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Quito"
                                                        {...field}
                                                        value={field.value ? String(field.value) : ''}
                                                        disabled
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
                                                <FormLabel>{t('clients.form.country', 'País')}</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Ecuador"
                                                        {...field}
                                                        value={field.value ? String(field.value) : ''}
                                                        disabled
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                    <FormField<PostSiteInput>
                                        control={form.control}
                                        name="latitud"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('clients.form.latitude', 'Latitud')}</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="-0.2695948"
                                                        {...field}
                                                        value={field.value ? String(field.value) : ''}
                                                        disabled
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
                                            <FormItem>
                                                <FormLabel>{t('clients.form.longitude', 'Longitud')}</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="-78.5365247"
                                                        {...field}
                                                        value={field.value ? String(field.value) : ''}
                                                        disabled
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
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
                    {/* Evitar mostrar el mapa duplicado: si el usuario marca "dirección diferente",
                        el componente AddressAutocompleteOSM ya renderiza su propio mapa. */}
                    {(lat && lng) && !direccionDiferente && (
                        <div className="my-4">
                            {/* Nota: el selector de tipo de mapa y la etiqueta de ubicación
                                deben mostrarse debajo del bloque de horario. */}

                            <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField<PostSiteInput>
                                    control={form.control}
                                    name="stationSchedule"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Horario</FormLabel>
                                            <FormControl>
                                                <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v)}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Seleccione horario" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="1 hora">1 hora</SelectItem>
                                                        <SelectItem value="4 horas">4 horas</SelectItem>
                                                        <SelectItem value="8 horas">8 horas</SelectItem>
                                                        <SelectItem value="10 horas">10 horas</SelectItem>
                                                        <SelectItem value="12 horas">12 horas</SelectItem>
                                                        <SelectItem value="14 horas">14 horas</SelectItem>
                                                        <SelectItem value="16 horas">16 horas</SelectItem>
                                                        <SelectItem value="24 horas">24 horas</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {!is24Hours ? (
                                    <>
                                        <FormField<PostSiteInput>
                                            control={form.control}
                                            name="startingTimeInDay"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Hora inicio</FormLabel>
                                                    <FormControl>
                                                        <Input type="time" {...field} value={field.value ?? ''} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField<PostSiteInput>
                                            control={form.control}
                                            name="finishTimeInDay"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Hora fin</FormLabel>
                                                    <FormControl>
                                                        <Input type="time" {...field} value={field.value ?? ''} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </>
                                ) : (
                                    <div className="flex items-center col-span-2">
                                        <div className="text-sm text-gray-500">Horario 24 horas seleccionado — no aplica hora inicio/fin</div>
                                    </div>
                                )}
                            </div>

                            <label className="block text-sm font-medium text-gray-700 mb-2">Ubicación en el mapa</label>

                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-4">
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
                                <div>{/* placeholder for future quick actions */}</div>
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
                                                <FormLabel>{t('postSites.form.fax', 'Teléfono fijo')}</FormLabel>
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
                                                <div className="flex items-center gap-2">
                                                    <FormLabel className="flex items-center gap-2">
                                                        {t('clients.form.categoryLabel', 'Sector de seguridad')}
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="text-muted-foreground cursor-help">
                                                                        <Info size={16} />
                                                                    </span>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top">
                                                                    {t('postSites.form.categoryTooltip', 'Selecciona el sector de seguridad asociado al puesto de vigilancia')}
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </FormLabel>
                                                </div>
                                                <div className="mt-2">
                                                    <CategorySelect
                                                        options={cats}
                                                        value={field.value ? String(field.value) : undefined}
                                                        onChange={field.onChange}
                                                        placeholder={loadingCategories ? t('categories.loading', 'Cargando...') : t('postSites.form.slectcategory', 'seleccionar sector de seguridadría')}
                                                        module="postSite"
                                                        onCategoryCreated={handleCategoryCreated}
                                                    />
                                                </div>
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