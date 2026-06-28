import { useEffect } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { stationService } from "@/lib/api/stationService";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { PostSiteInput, postSiteSchema } from "@/lib/validators/post-site";
import { useTranslation } from 'react-i18next';
import { useClientSelection } from '@/contexts/ClientSelectionContext';
import ServiceTypeConfigFields from "@/components/post-sites/ServiceTypeConfigFields";
import { ServiceTypePicker } from "@/components/post-sites/ServiceTypeBadge";
import AddressAutocomplete, { AddressComponents } from "@/components/maps/AddressAutocomplete";

export type Client = { id: string; name: string; lastName?: string };

export type PostSiteFormProps = {
    mode: "create" | "edit";
    id?: string;
    clients?: Client[];
    baseUrl?: string;
    onSaved?: (payload: { id: string; data: PostSiteInput }) => void;
};

export default function PostSiteForm({ mode, id, clients = [], onSaved }: PostSiteFormProps) {
    const { t } = useTranslation();
    const { selectedClient } = useClientSelection();
    const navigate = useNavigate();

    const form = useForm<PostSiteInput>({
        resolver: zodResolver(postSiteSchema as any),
        defaultValues: {
            name: "",
            serviceType: undefined,
            serviceConfig: undefined,
            description: "",
            clientId: "",
            categoryId: "",
            address: "",
            addressLine2: "",
            city: "",
            country: "",
            postalCode: "",
            email: "",
            phone: "",
            latitud: "",
            longitud: "",
            stationSchedule: undefined,
            startingTimeInDay: "",
            finishTimeInDay: "",
            fax: "",
            status: "active",
        },
    });

    // Auto-inject clientId from context
    useEffect(() => {
        if (selectedClient?.id) {
            form.setValue('clientId', String(selectedClient.id), { shouldValidate: true, shouldDirty: true });
        }
    }, [selectedClient]);

    // Auto-inject categoryId from client's first category (create mode only)
    useEffect(() => {
        if (mode !== 'create') return;
        const ids: string[] = (selectedClient as any)?.categoryIds ?? [];
        if (ids.length > 0) {
            form.setValue('categoryId', ids[0], { shouldValidate: true, shouldDirty: true });
        }
    }, [selectedClient, mode]);

    useEffect(() => {
        if (mode === "edit" && id) {
            loadPostSite(id);
        }
    }, []);

    const loadPostSite = async (siteId: string) => {
        try {
            const data = await stationService.get(siteId);
            form.reset({
                name: (data as any).companyName ?? (data as any).stationName ?? (data as any).name ?? "",
                serviceType: (data as any).serviceType ?? undefined,
                description: (data as any).description ?? "",
                clientId: (data as any).clientAccountId ?? (data as any).clientId ?? "",
                categoryId:
                    Array.isArray((data as any).categoryIds) && (data as any).categoryIds.length > 0
                        ? (data as any).categoryIds[0]
                        : (data as any).categoryId || "",
                address: (data as any).address ?? "",
                addressLine2: (data as any).secondAddress ?? (data as any).addressLine2 ?? "",
                serviceConfig: (data as any).serviceConfig ?? undefined,
                city: (data as any).city ?? "",
                country: (data as any).country ?? "",
                postalCode: (data as any).postalCode ?? (data as any).zipCode ?? "",
                email: (data as any).contactEmail ?? (data as any).email ?? "",
                phone: (data as any).contactPhone ?? (data as any).phone ?? "",
                latitud: String((data as any).latitud ?? (data as any).latitude ?? ""),
                longitud: String((data as any).longitud ?? (data as any).longitude ?? ""),
                stationSchedule: (data as any).stationSchedule ?? undefined,
                startingTimeInDay: (data as any).startingTimeInDay ?? "",
                finishTimeInDay: (data as any).finishTimeInDay ?? "",
                fax: (data as any).fax ?? "",
                status:
                    typeof (data as any).active === "boolean"
                        ? (data as any).active ? "active" : "inactive"
                        : (data as any).status ?? "active",
            });
        } catch (e) {
            console.error(e);
            toast.error(t('postSites.notFound', 'Puesto de vigilancia no encontrado o error al cargar los datos.'));
            navigate('/post-sites', { replace: true });
        }
    };

    const onSubmit = async (values: PostSiteInput) => {
        try {
            // Auto-generate name from address if not provided
            const autoName = values.name?.trim() ||
                values.address?.trim() ||
                (() => {
                    const c = clients.find((cl) => cl.id === values.clientId);
                    return c ? `Sitio de ${c.name}` : 'Sitio sin nombre';
                })();
            const payload: any = {
                ...values,
                name: autoName,
                companyName: autoName,
                categoryId:
                    values.categoryId && String(values.categoryId).length > 0
                        ? values.categoryId
                        : undefined,
            };

            if (mode === "create") {
                const data = await stationService.create(payload);
                toast.success(t('postSites.created', 'Puesto de vigilancia creado'));
                onSaved?.({ id: data.id, data: payload });
                navigate(`/post-sites/${data.id}/profile`);
            } else if (mode === "edit" && id) {
                await stationService.update(id, payload);
                toast.success(t('postSites.changesSaved', 'Cambios guardados'));
                onSaved?.({ id, data: payload });
                navigate(`/post-sites/${id}/profile`);
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.message ?? "Error al guardar");
        }
    };

    const handleCancel = () => {
        if (mode === "edit" && id) {
            navigate(`/post-sites/${id}/profile`);
        } else {
            navigate('/post-sites');
        }
    };

    const SCHEDULES = ["1 hora","4 horas","8 horas","10 horas","12 horas","14 horas","16 horas","24 horas"];

    const serviceType = useWatch({ control: form.control, name: 'serviceType' });

    const handleAddressSelect = (ac: AddressComponents) => {
        form.setValue('address',    ac.address,   { shouldDirty: true });
        form.setValue('city',       ac.city,      { shouldDirty: true });
        form.setValue('country',    ac.country,   { shouldDirty: true });
        form.setValue('postalCode', ac.postalCode, { shouldDirty: true });
        form.setValue('latitud',    String(ac.latitude),  { shouldDirty: true });
        form.setValue('longitud',   String(ac.longitude), { shouldDirty: true });
    };

    return (
        <div className="max-w-2xl mx-auto">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                    {/* ── Cliente ──────────────────────────────────── */}
                    <section className="space-y-3">
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                            Cliente
                        </h2>
                        <FormField<PostSiteInput>
                            control={form.control}
                            name="clientId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cliente al que pertenece este sitio</FormLabel>
                                    <FormControl>
                                        <select
                                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                            value={String(field.value ?? "")}
                                            onChange={(e) => field.onChange(e.target.value)}
                                        >
                                            <option value="">— Seleccionar cliente —</option>
                                            {clients.map((c) => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </section>

                    {/* ── Tipo de servicio ─────────────────────────── */}
                    <section>
                        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Tipo de servicio</h2>
                        <Controller
                            control={form.control}
                            name="serviceType"
                            render={({ field, fieldState }) => (
                                <ServiceTypePicker
                                    value={field.value as string | undefined}
                                    onChange={(val) => field.onChange(val)}
                                    error={fieldState.error?.message}
                                />
                            )}
                        />
                    </section>

                    {/* ── Service-type specific config ───────────────── */}
                    {serviceType && (
                        <ServiceTypeConfigFields
                            serviceType={serviceType as string}
                            form={form as any}
                        />
                    )}

                    {/* ── Información básica ───────────────────────── */}
                    <section className="space-y-4">
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                            Información básica
                        </h2>

                        <FormField<PostSiteInput>
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('postSites.form.description', 'Descripción')}</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder={t('postSites.form.descriptionPlaceholder', 'Descripción del sitio')}
                                            rows={3}
                                            {...field}
                                            value={field.value ? String(field.value) : ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField<PostSiteInput>
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Correo electrónico</FormLabel>
                                        <FormControl>
                                            <Input placeholder="correo@empresa.com" {...field} value={field.value ? String(field.value) : ""} />
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
                                        <FormLabel>Teléfono de contacto</FormLabel>
                                        <FormControl>
                                            <Input placeholder="+1 555 000 0000" {...field} value={field.value ? String(field.value) : ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </section>

                    {/* ── Ubicación del servicio ────────────────────── */}
                    <section className="space-y-4">
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                            Ubicación del servicio
                        </h2>

                        {/* Google Maps autocomplete — populates all address fields */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                                Buscar dirección
                            </label>
                            <AddressAutocomplete
                                onAddressSelect={handleAddressSelect}
                                defaultValue={form.getValues('address') ?? ''}
                                placeholder="Calle, número, ciudad…"
                                showMap={true}
                                mapHeight="220px"
                                initialLat={form.getValues('latitud') ? Number(form.getValues('latitud')) : undefined}
                                initialLng={form.getValues('longitud') ? Number(form.getValues('longitud')) : undefined}
                                suppressInitialReverse={true}
                            />
                        </div>

                        <FormField<PostSiteInput>
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Dirección</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Calle, número, piso…" {...field} value={field.value ? String(field.value) : ""} />
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
                                    <FormLabel>Dirección complementaria</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Aptto., oficina, referencia…" {...field} value={field.value ? String(field.value) : ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <FormField<PostSiteInput>
                                control={form.control}
                                name="city"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Ciudad</FormLabel>
                                        <FormControl>
                                            <Input {...field} value={field.value ? String(field.value) : ""} />
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
                                        <FormLabel>País</FormLabel>
                                        <FormControl>
                                            <Input {...field} value={field.value ? String(field.value) : ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField<PostSiteInput>
                                control={form.control}
                                name="postalCode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Código postal</FormLabel>
                                        <FormControl>
                                            <Input {...field} value={field.value ? String(field.value) : ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField<PostSiteInput>
                                control={form.control}
                                name="latitud"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Latitud</FormLabel>
                                        <FormControl>
                                            <Input placeholder="0.000000" {...field} value={field.value ? String(field.value) : ""} />
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
                                        <FormLabel>Longitud</FormLabel>
                                        <FormControl>
                                            <Input placeholder="0.000000" {...field} value={field.value ? String(field.value) : ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </section>

                    {/* ── Horario de servicio ───────────────────────── */}
                    <section className="space-y-4">
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                            Horario de servicio
                        </h2>

                        <FormField<PostSiteInput>
                            control={form.control}
                            name="stationSchedule"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Jornada de vigilante</FormLabel>
                                    <FormControl>
                                        <select
                                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                            value={String(field.value ?? "")}
                                            onChange={(e) => field.onChange(e.target.value || undefined)}
                                        >
                                            <option value="">Sin definir</option>
                                            {SCHEDULES.map((s) => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField<PostSiteInput>
                                control={form.control}
                                name="startingTimeInDay"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Hora de inicio</FormLabel>
                                        <FormControl>
                                            <Input placeholder="08:00" {...field} value={field.value ? String(field.value) : ""} />
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
                                        <FormLabel>Hora de fin</FormLabel>
                                        <FormControl>
                                            <Input placeholder="20:00" {...field} value={field.value ? String(field.value) : ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField<PostSiteInput>
                            control={form.control}
                            name="fax"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Teléfono fijo / Fax</FormLabel>
                                    <FormControl>
                                        <Input placeholder="+1 555 000 0001" {...field} value={field.value ? String(field.value) : ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </section>

                    {/* ── Estado ───────────────────────────────────── */}
                    <section>
                        <FormField<PostSiteInput>
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Estado</FormLabel>
                                    <FormControl>
                                        <select
                                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                            value={String(field.value ?? "active")}
                                            onChange={(e) => field.onChange(e.target.value)}
                                        >
                                            <option value="active">Activo</option>
                                            <option value="inactive">Inactivo</option>
                                        </select>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </section>

                    {/* ── Acciones ──────────────────────────────────── */}
                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="outline" className="min-w-28" onClick={handleCancel}>
                            {t('postSites.form.cancel', 'Cancelar')}
                        </Button>
                        <Button
                            type="submit"
                            className="min-w-28 bg-primary text-white border border-primary hover:bg-primary/90 cursor-pointer"
                        >
                            {t('postSites.form.submit', 'Guardar')}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
