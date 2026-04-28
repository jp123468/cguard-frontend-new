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
import { validateCedulaOrRuc } from '@/lib/validators/id';
import AddressAutocomplete, { AddressComponents } from "@/components/maps/AddressAutocomplete";
import { toastOnce } from '@/lib/toastOnce';

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
    // Watch latitude/longitude so we can force remount of the map when they change
    const watchedLat = form.watch('latitude' as any);
    const watchedLng = form.watch('longitude' as any);
    const addressMapKey = `${watchedLat || ''}_${watchedLng || ''}_${mode}_${id || ''}`;
    // Función para cargar Sectores del módulo clientAccount
    const loadCategories = async () => {
        setLoadingCategories(true);
        try {
            const response = await categoryService.list({
                filter: { module: "clientAccount" }, // Filtrar por el módulo correcto
                limit: 1000, // Ajusta según necesites
                offset: 0,
            });

            // Extraer el array de Sectores de la respuesta
            const categoryList = response?.rows || [];
            setCategories(categoryList);
        } catch (e) {
            console.error("Error loading categories:", e);
            console.error(t('categoriesnotloaded', "No se pudieron cargar las Sectores"));
        } finally {
            setLoadingCategories(false);
        }
    };

    // Cargar Sectores al montar el componente
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
        if (values.website !== undefined && String(values.website).trim() !== "") basePayload.website = values.website;
        // Ensure latitude/longitude are sent as numbers (or null) to backend
        if ((values as any).latitude !== undefined) {
            const rawLat = (values as any).latitude;
            basePayload.latitude = rawLat === '' || rawLat === null ? null : Number.parseFloat(String(rawLat));
        }
        if ((values as any).longitude !== undefined) {
            const rawLng = (values as any).longitude;
            basePayload.longitude = rawLng === '' || rawLng === null ? null : Number.parseFloat(String(rawLng));
        }
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
        // Recargar las Sectores sin recargar toda la página
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
                                            // limitar caracteres según tipo
                                            maxLength={personType === 'PJ' ? 13 : 10}
                                            onChange={(e) => {
                                                // permitir sólo dígitos
                                                const digits = (e.target.value || '').replace(/\D/g, '');
                                                field.onChange(digits);
                                            }}
                                            onBlur={() => {
                                                const val = (field.value || '').toString().trim();
                                                const digits = val.replace(/\D/g, '');
                                                    if (personType === 'PN') {
                                                        if (digits.length !== 10 || !validateCedulaOrRuc(digits)) {
                                                            form.setError('documentNumber' as any, { type: 'manual', message: t('clients.validation.cedula_invalid') });
                                                        } else {
                                                            form.clearErrors('documentNumber' as any);
                                                        }
                                                    } else {
                                                        if (digits.length !== 13 || !validateCedulaOrRuc(digits)) {
                                                            form.setError('documentNumber' as any, { type: 'manual', message: t('clients.validation.ruc_invalid') });
                                                        } else {
                                                            form.clearErrors('documentNumber' as any);
                                                        }
                                                    }
                                            }}
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
                                                    placeholder={t('clients.selectCategories', 'Selecciona Sectores')}
                                                />
                                            </FormControl>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                );
                            }}
                        />
                    </div>

                    {/* Address Section */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
                        {/* Section header */}
                        <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-slate-200">
                            <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#C8860A]/10">
                                    <svg className="h-4 w-4 text-[#C8860A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <span className="text-sm font-semibold text-slate-800">{t('clients.form.addressSearch', 'Dirección')}</span>
                            </div>
                            {/* Mode toggle pills */}
                            <div className="flex items-center rounded-lg bg-slate-100 p-0.5 gap-0.5">
                                <button
                                    type="button"
                                    onClick={() => setShowAddressAutocomplete(true)}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${showAddressAutocomplete ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {t('clients.form.switchToAutocomplete', 'Búsqueda')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowAddressAutocomplete(false)}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${!showAddressAutocomplete ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {t('clients.form.switchToManual', 'Manual')}
                                </button>
                            </div>
                        </div>

                    <div className="p-5 space-y-4">

                        {showAddressAutocomplete ? (
                            <AddressAutocomplete
                                key={addressMapKey}
                                onAddressSelect={(addressData: AddressComponents) => {
                                    const anyAddr = addressData as any;
                                    const addrObj = typeof anyAddr.address === 'object' && anyAddr.address ? anyAddr.address : {};

                                    const latRaw = anyAddr.lat ?? anyAddr.latitude;
                                    const lngRaw = anyAddr.lon ?? anyAddr.lng ?? anyAddr.longitude;

                                    const addressStr = typeof anyAddr.address === 'string'
                                        ? anyAddr.address
                                        : (anyAddr.display_name || [
                                            addrObj.road, addrObj.suburb, addrObj.town, addrObj.village,
                                            addrObj.county, addrObj.municipality, addrObj.state, addrObj.postcode, addrObj.country
                                        ].filter(Boolean).join(', ') || '');

                                    const cityStr = anyAddr.city ?? anyAddr.town ?? anyAddr.village ?? addrObj.town ?? addrObj.city ?? addrObj.village ?? '';
                                    const postal = anyAddr.postcode ?? anyAddr.postalCode ?? addrObj.postcode ?? '';
                                    const country = anyAddr.country ?? addrObj.country ?? '';

                                    const setOpts = { shouldDirty: true, shouldTouch: true, shouldValidate: false } as const;
                                    form.setValue('address', addressStr, setOpts);
                                    form.setValue('city', cityStr, setOpts);
                                    form.setValue('postalCode', postal, setOpts);
                                    form.setValue('country', country, setOpts);
                                    if (latRaw != null) form.setValue('latitude' as any, String(latRaw), setOpts);
                                    if (lngRaw != null) form.setValue('longitude' as any, String(lngRaw), setOpts);
                                    try { form.trigger(['latitude' as any, 'longitude' as any, 'address', 'city', 'postalCode']); } catch (e) {}
                                    toastOnce.success(t('clients.form.addressAutoFilled', 'Dirección completada automáticamente'));
                                }}
                                defaultValue={form.getValues('address') || ''}
                                placeholder={t('clients.form.searchAddress', 'Buscar dirección...')}
                                showMap={true}
                                mapHeight="320px"
                                initialLat={watchedLat ? Number.parseFloat(String(watchedLat)) : undefined}
                                initialLng={watchedLng ? Number.parseFloat(String(watchedLng)) : undefined}
                            />
                        ) : null}

                        {/* Address fields — editable in manual mode, read-only preview in autocomplete mode */}
                        <div className={`space-y-4 ${showAddressAutocomplete ? 'opacity-70 pointer-events-none' : ''}`}>
                            {/* Address line 1 */}
                            <FormField<ClientInput>
                                control={form.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                                            {t('clients.form.address', 'Dirección')} <span className="text-[#C8860A]">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <input
                                                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-[#C8860A] focus:outline-none focus:ring-2 focus:ring-[#C8860A]/20 disabled:opacity-50"
                                                {...field}
                                                value={typeof field.value === "string" ? field.value : ""}
                                                maxLength={100}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Address line 2 */}
                            <FormField<ClientInput>
                                control={form.control}
                                name="addressLine2"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                                            {t('clients.form.addressLine2', 'Dirección (línea 2)')}
                                            <span className="ml-2 text-[10px] font-normal text-slate-400 normal-case tracking-normal">{t('clients.form.optional', 'Opcional')}</span>
                                        </FormLabel>
                                        <FormControl>
                                            <input
                                                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-[#C8860A] focus:outline-none focus:ring-2 focus:ring-[#C8860A]/20"
                                                placeholder={t('clients.form.addressLine2Placeholder', 'Piso, oficina, departamento…')}
                                                {...field}
                                                value={typeof field.value === "string" ? field.value : ""}
                                                maxLength={100}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Postal / City / Country row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField<ClientInput>
                                    control={form.control}
                                    name="postalCode"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                                                {t('clients.form.postalCode', 'Código postal')} <span className="text-[#C8860A]">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <input
                                                    type="text"
                                                    className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-[#C8860A] focus:outline-none focus:ring-2 focus:ring-[#C8860A]/20 disabled:opacity-50"
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
                                            <FormLabel className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                                                {t('clients.form.city', 'Ciudad')} <span className="text-[#C8860A]">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <input
                                                    className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-[#C8860A] focus:outline-none focus:ring-2 focus:ring-[#C8860A]/20 disabled:opacity-50"
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
                                            <FormLabel className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                                                {t('clients.form.country', 'País')} <span className="text-[#C8860A]">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <input
                                                    className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-[#C8860A] focus:outline-none focus:ring-2 focus:ring-[#C8860A]/20 disabled:opacity-50"
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

                            {/* Coordinates — collapsible */}
                            <details className="group">
                                <summary className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-400 hover:text-slate-600 list-none select-none w-fit">
                                    <svg className="h-3.5 w-3.5 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                    </svg>
                                    {t('clients.form.coordinates', 'Coordenadas GPS')}
                                </summary>
                                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField<ClientInput>
                                        control={form.control}
                                        name="latitude"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                                                    {t('clients.form.latitude', 'Latitud')}
                                                </FormLabel>
                                                <FormControl>
                                                    <input
                                                        type="text"
                                                        className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono placeholder:text-slate-400 focus:border-[#C8860A] focus:outline-none focus:ring-2 focus:ring-[#C8860A]/20 disabled:opacity-50"
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
                                                <FormLabel className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                                                    {t('clients.form.longitude', 'Longitud')}
                                                </FormLabel>
                                                <FormControl>
                                                    <input
                                                        type="text"
                                                        className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono placeholder:text-slate-400 focus:border-[#C8860A] focus:outline-none focus:ring-2 focus:ring-[#C8860A]/20 disabled:opacity-50"
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
                            </details>
                        </div>
                    </div>
                    </div>{/* end address card inner */}
                    </div>{/* end address card */}

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
                            className="min-w-28 bg-[#C8860A] text-white  cursor-pointer border border-[#C8860A] hover:bg-[#C8860A]"
                        >
                            {t('profile.save', 'Guardar')}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}