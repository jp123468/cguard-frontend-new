import { useEffect, useMemo, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientSchema, type ClientInput } from "@/lib/validators/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { clientService } from "@/lib/api/clientService";
import { categoryService } from "@/lib/api/categoryService";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import AddressAutocompleteOSM, { AddressComponents } from "@/components/maps/AddressAutocompleteOSM";

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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
// Switch removed — replaced by CategorySelect

import { PhoneInput } from "@/components/phone/PhoneInput";
import {
    CategorySelect,
    CategoryOption,
} from "@/components/categories/CategorySelect";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { Link } from "react-router-dom";

export type Category = { id: string; name: string };

export type ClientFormProps = {
    mode: "create" | "edit";
    id?: string;
    categories?: Category[];
    onSaved?: (payload: { id: string; data: ClientInput }) => void;
    /** If true, do not navigate away after successful save; call onSaved instead */
    keepOnSave?: boolean;
    /** Optional cancel handler: when provided, Cancel button will call this instead of navigating */
    onCancel?: () => void;
};

type ClientApiPayload = Omit<ClientInput, "categoryIds"> & {
    categoryIds?: string[] | null;
};

export default function ClientForm({
    mode,
    id,
    categories: initialCategories,
    onSaved,
    keepOnSave = false,
    onCancel,
}: ClientFormProps) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t } = useTranslation();
    // Deduplicate toasts in case of multiple mounts (React StrictMode)
    const shownToasts = useRef<Set<string>>(new Set());
    const showToastOnce = (key: string, message: string) => {
        if (shownToasts.current.has(key)) return;
        shownToasts.current.add(key);
        // Avoid showing error/warning toasts; log instead per UX decision.
        console.warn(message);
    };
    const [redirecting, setRedirecting] = useState(false);
    const [categories, setCategories] = useState<Category[]>(initialCategories || []);
    const [loadingCategories, setLoadingCategories] = useState(false);
    const [showAddressAutocomplete, setShowAddressAutocomplete] = useState(true);

    type FormValues = ClientInput & { personType?: 'PN' | 'PJ'; documentNumber?: string };

    const form = useForm<FormValues>({
        resolver: zodResolver(clientSchema as any),
        defaultValues: {
            name: "",
            lastName: "",
            personType: "PN",
            documentNumber: "",
            email: "",
            phoneNumber: "",
            address: "",
            addressLine2: "",
            postalCode: "",
            city: "",
            country: "",
            faxNumber: "",
            website: "",
            latitude: "",
            longitude: "",
            active: true,
            categoryIds: [],
        },
    });

    const personType = form.watch('personType' as any) || 'PN';
    // Función para cargar categorías del módulo clientAccount
    const loadCategories = async () => {
        setLoadingCategories(true);
        try {
            const response = await categoryService.list({
                filter: { module: "clientAccount" }, // Filtrar por el módulo correcto
                limit: 1000, // Ajusta según necesites
                offset: 0,
            });

            // Extraer el array de categorías de la respuesta
            const categoryList = response?.rows || [];
            setCategories(categoryList);
        } catch (e) {
            console.error("Error loading categories:", e);
            console.error(t('categoriesnotloaded', "No se pudieron cargar las categorías"));
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
                    const initial: FormValues = {
                        name: data.name ?? "",
                        lastName: data.lastName ?? "",
                        personType: (data as any)?.personType ?? 'PN',
                        documentNumber: (data as any)?.documentNumber ?? '',
                        email: data.email ?? "",
                        phoneNumber: data.phoneNumber ?? "",
                        address: data.address ?? "",
                        addressLine2: data.addressLine2 ?? "",
                        postalCode: data.postalCode ?? "",
                        city: data.city ?? "",
                        country: data.country ?? "",
                        faxNumber: data.faxNumber ?? "",
                        website: data.website ?? "",
                        latitude: (data as any)?.latitude !== undefined && (data as any)?.latitude !== null ? String((data as any).latitude) : "",
                        longitude: (data as any)?.longitude !== undefined && (data as any)?.longitude !== null ? String((data as any).longitude) : "",
                        active: data.active ?? true,
                        categoryIds: (data as any).categoryIds ?? [],
                    } as FormValues;

                    // store initial values to compute diffs on submit
                    initialDataRef.current = initial;

                    form.reset(initial);
                } catch (e) {
                    console.error(e);
                    if (!redirecting) {
                        setRedirecting(true);
                        showToastOnce('clients.generalInfo.notfoundclient', t('clients.generalInfo.notfoundclient', 'Cliente no encontrado o error al cargar los datos.'));
                        navigate('/clients', { replace: true });
                    }
                }
            })();
        }
    }, [mode, id, form]);

    // Keep a ref with the initial data loaded in edit mode to compute diffs
    const initialDataRef = useRef<FormValues | null>(null);

    async function onSubmit(values: FormValues) {
        // Crear payload solo con los campos que el backend actual soporta
        // En modo edición enviaremos únicamente los campos modificados (diff)
        const basePayload: any = {
            name: values.name,
            email: values.email,
            phoneNumber: values.phoneNumber,
            address: values.address,
            categoryIds: Array.isArray((values as any).categoryIds) ? (values as any).categoryIds : null,
        };

        // Agregar campos opcionales al basePayload para comparación
        if (values.lastName !== undefined) basePayload.lastName = values.lastName;
        if ((values as any).personType !== undefined) basePayload.personType = (values as any).personType;
        if ((values as any).documentNumber !== undefined) basePayload.documentNumber = (values as any).documentNumber;
        // Ensure categoryIds is present (zod will also validate)
        if (values.addressLine2 !== undefined) basePayload.addressLine2 = values.addressLine2;
        if (values.postalCode !== undefined) basePayload.postalCode = values.postalCode;
        if (values.city !== undefined) basePayload.city = values.city;
        if (values.country !== undefined) basePayload.country = values.country;
        if (values.faxNumber !== undefined) basePayload.faxNumber = values.faxNumber;
        if (values.website !== undefined) basePayload.website = values.website;
        if ((values as any).latitude !== undefined) basePayload.latitude = (values as any).latitude;
        if ((values as any).longitude !== undefined) basePayload.longitude = (values as any).longitude;
        if (values.active !== undefined) basePayload.active = values.active;

        try {
            if (mode === "create") {
                const data = await clientService.createClient(basePayload as ClientInput);
                toast.success(t('clients.clientCreated') || "Cliente creado exitosamente");
                onSaved?.({ id: data.id, data: values as unknown as ClientInput });
                form.reset();
                if (!keepOnSave) navigate("/clients");
            } else if (mode === "edit" && id) {
                // Compute diff against initially loaded data so we only PATCH changed fields
                const initial = initialDataRef.current ?? {} as ClientInput;
                const changed: any = {};
                const keys = Object.keys(basePayload) as Array<keyof ClientInput>;
                for (const k of keys) {
                    const cur = (basePayload as any)[k];
                    const init = (initial as any)[k];
                    // Normalize arrays and primitives for comparison
                    const curVal = Array.isArray(cur) ? JSON.stringify(cur) : (cur === undefined ? null : String(cur));
                    const initVal = Array.isArray(init) ? JSON.stringify(init) : (init === undefined ? null : String(init));
                    if (curVal !== initVal) {
                        // for arrays, send actual array; for others preserve original type
                        changed[k as string] = Array.isArray((basePayload as any)[k]) ? (basePayload as any)[k] : (basePayload as any)[k];
                    }
                }

                if (Object.keys(changed).length === 0) {
                    toast.success(t('clients.noChanges', 'No hubo cambios para guardar'));
                    return;
                }

                const response = await clientService.updateClient(id, changed as ClientInput);
                toast.success(t('clients.clientUpdated') || "Cliente actualizado exitosamente");
                onSaved?.({ id, data: values as unknown as ClientInput });
                if (!keepOnSave) navigate("/clients");
            }
        } catch (e: any) {
            try { console.error('[ClientForm.onSubmit] save error:', e); } catch (err) {}

            // Normalize backend error shapes
            const respData = e?.response?.data ?? e?.details ?? e;
            const message =
                respData?.message ||
                e?.message ||
                'Error al guardar';

            // backend may populate errors.existingId and also include email/phoneNumber
            const existingId =
                respData?.errors?.existingId ||
                respData?.existingId ||
                (respData && respData.errors && respData.errors.existingId) ||
                null;

            const duplicateFields = [] as string[];
            try {
                if (respData?.errors?.email || respData?.email || (respData?.errors && respData.errors.email)) duplicateFields.push('email');
                if (respData?.errors?.phoneNumber || respData?.phoneNumber || (respData?.errors && respData.errors.phoneNumber)) duplicateFields.push('phoneNumber');
            } catch (err) {}

            // Show a clearer message mentioning duplicate fields when available
            if (existingId && duplicateFields.length > 0) {
                const fieldLabels = duplicateFields.map((f) => t(`clients.form.${f}`, f)).join(', ');
                toast.error(`${message} — ${t('clients.duplicateFound', { fields: fieldLabels })}`);
            } else {
                toast.error(message);
            }

            if (existingId) {
                // Navigate the user to the existing conflicting client (overview) so they can inspect/merge
                try {
                    navigate(`/clients/${existingId}/overview`);
                } catch (navErr) {
                    // ignore navigation errors
                }
            }
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
                        {/* Category selector removed temporarily for syntax debug; will restore. */}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField<ClientInput>
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('clients.form.name', 'Nombre *')}</FormLabel>
                                    <FormControl>
                                        <input
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            {...field}
                                            value={typeof field.value === "string" ? field.value : ""}
                                            onChange={(e) => {
                                                const noDigits = e.target.value.replace(/[0-9]/g, "");
                                                const capitalized = noDigits
                                                    .split(' ')
                                                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                                    .join(' ');
                                                field.onChange(capitalized);
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField<ClientInput>
                            control={form.control}
                            name="lastName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('clients.form.lastName', 'Apellidos *')}</FormLabel>
                                    <FormControl>
                                        <input
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            {...field}
                                            value={typeof field.value === "string" ? field.value : ""}
                                            onChange={(e) => {
                                                const noDigits = e.target.value.replace(/[0-9]/g, "");
                                                const capitalized = noDigits
                                                    .split(' ')
                                                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                                    .join(' ');
                                                field.onChange(capitalized);
                                            }}
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
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('clients.form.email', 'Correo Electrónico *')}</FormLabel>
                                    <FormControl>
                                        <input
                                            type="email"
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            {...field}
                                            value={typeof field.value === "string" ? field.value : ""}
                                            maxLength={50}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField<ClientInput>
                            control={form.control}
                            name="phoneNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('clients.form.phone', 'Teléfono *')}</FormLabel>
                                    <FormControl>
                                        <PhoneInput
                                            value={typeof field.value === "string" ? field.value : ""}
                                            onChange={(val) => {
                                                // Limitar a 10 dígitos locales (excluye código de país y espacios)
                                                const digitsOnly = val.replace(/[^\d+]/g, "");
                                                // Mantener el prefijo +Código y luego hasta 10 dígitos
                                                const match = digitsOnly.match(/^(\+\d+)(\d*)$/);
                                                if (match) {
                                                    const prefix = match[1];
                                                    const local = match[2].slice(0, 10);
                                                    field.onChange(prefix + local);
                                                } else {
                                                    // fallback
                                                    field.onChange(val.slice(0, 1 + 3 + 10));
                                                }
                                            }}
                                            placeholder="e.g. +12015550123"
                                            maxLocalDigits={10}
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
                            name={"personType" as any}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('clients.form.personType', 'Tipo de persona')}</FormLabel>
                                    <FormControl>
                                        <Select value={String(field.value || 'PN')} onValueChange={(v) => field.onChange(v)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="PN">{t('clients.form.personNatural', 'Persona natural (Cédula)')}</SelectItem>
                                                <SelectItem value="PJ">{t('clients.form.personJuridica', 'Persona jurídica (RUC)')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField<ClientInput>
                            control={form.control}
                            name={"documentNumber" as any}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{personType === 'PJ' ? t('clients.form.ruc', 'RUC') : t('clients.form.cedula', 'Cédula')}</FormLabel>
                                    <FormControl>
                                        <input
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            {...field}
                                            value={typeof field.value === 'string' ? field.value : ''}
                                            maxLength={20}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Categories: moved below RUC/Cédula per request */}
                    <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                        <FormField<ClientInput>
                            control={form.control}
                            name="categoryIds"
                            render={({ field }) => {
                                const currentValue: string[] = Array.isArray(field.value)
                                    ? field.value
                                    : (typeof field.value === 'string' ? [field.value] : []);

                                return (
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
                                                            {t('clients.form.categoryTooltip', 'Selecciona el sector de seguridad asociado al cliente')}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </FormLabel>
                                        </div>
                                        <div className="mt-2">
                                            <FormControl>
                                                <CategorySelect
                                                    options={cats}
                                                    value={currentValue}
                                                    onChange={(v) => field.onChange(v as any)}
                                                    module="clientAccount"
                                                    onCategoryCreated={handleCategoryCreated}
                                                    multiple={true}
                                                    placeholder={t('clients.selectCategories', 'Selecciona categorías')}
                                                />
                                            </FormControl>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                );
                            }}
                        />
                    </div>

                    {/* Address Autocomplete Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium">{t('clients.form.addressSearch', 'Búsqueda de Dirección')}</h3>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowAddressAutocomplete(!showAddressAutocomplete)}
                            >
                                {showAddressAutocomplete 
                                    ? t('clients.form.switchToManual', 'Entrada manual') 
                                    : t('clients.form.switchToAutocomplete', 'Búsqueda automática')}
                            </Button>
                        </div>

                        {showAddressAutocomplete ? (
                            <AddressAutocompleteOSM
                                onAddressSelect={(addressData: AddressComponents) => {
                                    form.setValue('address', addressData.address);
                                    form.setValue('city', addressData.city);
                                    form.setValue('postalCode', addressData.postalCode);
                                    form.setValue('country', addressData.country);
                                    form.setValue('latitude' as any, String(addressData.latitude));
                                    form.setValue('longitude' as any, String(addressData.longitude));
                                    toast.success(t('clients.form.addressAutoFilled', 'Dirección completada automáticamente'));
                                }}
                                defaultValue={form.getValues('address') || ''}
                                placeholder={t('clients.form.searchAddress', 'Buscar dirección...')}
                                showMap={true}
                                mapHeight="350px"
                                initialLat={form.getValues('latitude' as any) ? parseFloat(form.getValues('latitude' as any)!) : undefined}
                                initialLng={form.getValues('longitude' as any) ? parseFloat(form.getValues('longitude' as any)!) : undefined}
                            />
                        ) : null}

                        {/* Manual Address Fields - Always show for editing */}
                        <div className={showAddressAutocomplete ? 'opacity-60 pointer-events-none' : ''}>
                            <div className="grid grid-cols-1 gap-6">
                                <FormField<ClientInput>
                                    control={form.control}
                                    name="address"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('clients.form.address', 'Dirección *')}</FormLabel>
                                            <FormControl>
                                                <input
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                    {...field}
                                                    value={typeof field.value === "string" ? field.value : ""}
                                                    maxLength={100}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField<ClientInput>
                                    control={form.control}
                                    name="addressLine2"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('clients.form.addressLine2', 'Dirección Complementaria')}</FormLabel>
                                            <FormControl>
                                                <input
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                    placeholder={t('clients.form.addressLine2Placeholder', 'Opcional')}
                                                    {...field}
                                                    value={typeof field.value === "string" ? field.value : ""}
                                                    maxLength={100}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                                <FormField<ClientInput>
                                    control={form.control}
                                    name="postalCode"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('clients.form.postalCode', 'Código postal/Zip *')}</FormLabel>
                                            <FormControl>
                                                <input
                                                    type="text"
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                    {...field}
                                                    value={String(field.value || "")}
                                                    maxLength={20}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField<ClientInput>
                                    control={form.control}
                                    name="city"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('clients.form.city', 'Ciudad *')}</FormLabel>
                                            <FormControl>
                                                <input
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                    {...field}
                                                    value={typeof field.value === "string" ? field.value : ""}
                                                    maxLength={100}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField<ClientInput>
                                    control={form.control}
                                    name="country"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('clients.form.country', 'País *')}</FormLabel>
                                            <FormControl>
                                                <input
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                    {...field}
                                                    value={typeof field.value === "string" ? field.value : ""}
                                                    maxLength={100}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Coordinates */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <FormField<ClientInput>
                                    control={form.control}
                                    name="latitude"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('clients.form.latitude', 'Latitud')}</FormLabel>
                                            <FormControl>
                                                <input
                                                    type="text"
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                    placeholder="-90 a 90"
                                                    {...field}
                                                    value={String(field.value ?? "")}
                                                    maxLength={20}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField<ClientInput>
                                    control={form.control}
                                    name="longitude"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('clients.form.longitude', 'Longitud')}</FormLabel>
                                            <FormControl>
                                                <input
                                                    type="text"
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                    placeholder="-180 a 180"
                                                    {...field}
                                                    value={String(field.value ?? "")}
                                                    maxLength={20}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    </div>

                    <Accordion type="single" collapsible defaultValue="more">
                        <AccordionItem value="more" className="border rounded-md">
                            <AccordionTrigger className="px-4">
                                {t('clients.form.moreInfo', 'Más Información')}
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField<ClientInput>
                                        control={form.control}
                                        name="faxNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('clients.form.fax', 'Landline')}</FormLabel>
                                                <FormControl>
                                                    <PhoneInput
                                                        value={typeof field.value === "string" ? field.value : ""}
                                                        onChange={(val) => {
                                                            const digitsOnly = val.replace(/[^\d+]/g, "");
                                                            const match = digitsOnly.match(/^(\+\d+)(\d*)$/);
                                                            if (match) {
                                                                const prefix = match[1];
                                                                const local = match[2].slice(0, 10);
                                                                field.onChange(prefix + local);
                                                            } else {
                                                                field.onChange(val.slice(0, 1 + 3 + 10));
                                                            }
                                                        }}
                                                        placeholder="e.g. +12015550123"
                                                        maxLocalDigits={10}
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
                                                <FormLabel>{t('clients.form.website', 'Sitio Web')}</FormLabel>
                                                <FormControl>
                                                    <input
                                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                        placeholder="https://"
                                                        {...field}
                                                        value={typeof field.value === "string" ? field.value : ""}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>

                    <div className="flex justify-end gap-4">
                        <Button
                            type="button"
                            onClick={() => onCancel ? onCancel() : navigate('/clients')}
                            className="min-w-28 bg-gray-100 text-black  cursor-pointer border border-gray-200 hover:bg-gray-200 hover:text-black"
                        >
                            {t('profile.cancel', 'Cancelar')}
                        </Button>
                        <Button
                            type="submit"
                            className="min-w-28 bg-orange-500 text-white  cursor-pointer border border-orange-500 hover:bg-orange-600"
                        >
                            {t('profile.save', 'Guardar')}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}