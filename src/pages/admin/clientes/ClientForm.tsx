import { useEffect, useMemo, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientSchema, type ClientInput } from "@/lib/validators/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { clientService } from "@/lib/api/clientService";
import { categoryService } from "@/lib/api/categoryService";
import { useAuth } from "@/contexts/AuthContext";

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
import { Switch } from "@/components/ui/switch";

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

type ClientApiPayload = Omit<ClientInput, "categoryIds"> & {
    categoryIds?: string[] | null;
};

export default function ClientForm({
    mode,
    id,
    categories: initialCategories,
    onSaved,
}: ClientFormProps) {
    const navigate = useNavigate();
    const { user } = useAuth();
    // Deduplicate toasts in case of multiple mounts (React StrictMode)
    const shownToasts = useRef<Set<string>>(new Set());
    const showToastOnce = (key: string, message: string) => {
        if (shownToasts.current.has(key)) return;
        shownToasts.current.add(key);
        toast.error(message);
    };
    const [redirecting, setRedirecting] = useState(false);
    const [categories, setCategories] = useState<Category[]>(initialCategories || []);
    const [loadingCategories, setLoadingCategories] = useState(false);

    const form = useForm<ClientInput>({
        resolver: zodResolver(clientSchema as any),
        defaultValues: {
            name: "",
            lastName: "",
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
                    console.log("Cliente cargado:", data);
                    console.log("Valor de active:", data.active, "Tipo:", typeof data.active);
                    form.reset({
                        name: data.name ?? "",
                        lastName: data.lastName ?? "",
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
                    });
                } catch (e) {
                    console.error(e);
                    if (!redirecting) {
                        setRedirecting(true);
                        showToastOnce('edit-client-not-found', 'Cliente no encontrado o error al cargar los datos.');
                        navigate('/clients', { replace: true });
                    }
                }
            })();
        }
    }, [mode, id, form]);

    async function onSubmit(values: ClientInput) {
        // Crear payload solo con los campos que el backend actual soporta
        const apiPayload: any = {
            name: values.name,
            email: values.email,
            phoneNumber: values.phoneNumber,
            address: values.address,
            categoryIds: Array.isArray((values as any).categoryIds) ? (values as any).categoryIds : null,
        };

        // Agregar campos opcionales (enviar aunque estén vacíos para permitir borrarlos)
        if (values.lastName !== undefined) apiPayload.lastName = values.lastName;
        if (values.addressLine2 !== undefined) apiPayload.addressLine2 = values.addressLine2;
        if (values.postalCode !== undefined) apiPayload.postalCode = values.postalCode;
        if (values.city !== undefined) apiPayload.city = values.city;
        if (values.country !== undefined) apiPayload.country = values.country;
        if (values.faxNumber !== undefined) apiPayload.faxNumber = values.faxNumber;
        if (values.website !== undefined) apiPayload.website = values.website;
        if ((values as any).latitude !== undefined) (apiPayload as any).latitude = (values as any).latitude;
        if ((values as any).longitude !== undefined) (apiPayload as any).longitude = (values as any).longitude;
        if (values.active !== undefined) apiPayload.active = values.active;

        try {
            if (mode === "create") {
                console.log('[ClientForm] creating client payload:', apiPayload);
                try {
                    console.log('[ClientForm] creating client by user:', {
                        id: user?.id,
                        email: user?.email,
                        name: user?.fullName || user?.firstName || user?.name || null,
                        tenantId: (user && Array.isArray(user.tenants) && user.tenants[0]) ? (user.tenants[0].tenantId || (user.tenants[0].tenant && user.tenants[0].tenant.id)) : null,
                        tenantUserId: (user && Array.isArray(user.tenants) && user.tenants[0]) ? (user.tenants[0].id || null) : null,
                    });
                } catch (e) {
                    console.debug('[ClientForm] failed to log creating user', e);
                }
                const data = await clientService.createClient(apiPayload as ClientInput);
                toast.success("Cliente creado exitosamente");
                onSaved?.({ id: data.id, data: values });
                form.reset();
                navigate("/clients");
            } else if (mode === "edit" && id) {
                const response = await clientService.updateClient(
                    id,
                    apiPayload as unknown as ClientInput
                );
                toast.success("Cliente actualizado exitosamente");
                onSaved?.({ id, data: values });
                navigate("/clients");
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.message || e?.message || "Error al guardar");
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
                                    <FormLabel>Nombre *</FormLabel>
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
                                    <FormLabel>Apellidos *</FormLabel>
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
                                    <FormLabel>Correo Electrónico *</FormLabel>
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
                                    <FormLabel>Teléfono *</FormLabel>
                                    <FormControl>
                                        <PhoneInput
                                            value={typeof field.value === "string" ? field.value : ""}
                                            onChange={field.onChange}
                                            placeholder="e.g. +12015550123"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        <FormField<ClientInput>
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Dirección *</FormLabel>
                                    <FormControl>
                                        <input
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            {...field}
                                            value={typeof field.value === "string" ? field.value : ""}
                                            maxLength={100}
                                            onChange={(e) => {
                                                const sanitized = e.target.value.replace(/[0-9]/g, "");
                                                const capitalized = sanitized
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
                            name="addressLine2"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Dirección Complementaria</FormLabel>
                                    <FormControl>
                                        <input
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            placeholder="Opcional"
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FormField<ClientInput>
                            control={form.control}
                            name="postalCode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Código postal/Zip *</FormLabel>
                                    <FormControl>
                                        <input
                                            type="text"
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            {...field}
                                            value={String(field.value || "")}
                                            maxLength={20}
                                            onChange={(e) => {
                                                const onlyNumbers = e.target.value.replace(/\D/g, '');
                                                field.onChange(onlyNumbers);
                                            }}
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
                                    <FormLabel>Ciudad *</FormLabel>
                                    <FormControl>
                                        <input
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            {...field}
                                            value={typeof field.value === "string" ? field.value : ""}
                                            maxLength={100}
                                            onChange={(e) => {
                                                const sanitized = e.target.value.replace(/[0-9]/g, "");
                                                const capitalized = sanitized
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
                            name="country"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>País *</FormLabel>
                                    <FormControl>
                                        <input
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            {...field}
                                            value={typeof field.value === "string" ? field.value : ""}
                                            maxLength={100}
                                            onChange={(e) => {
                                                const sanitized = e.target.value.replace(/[0-9]/g, "");
                                                const capitalized = sanitized
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
                            name="latitude"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Latitud</FormLabel>
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
                                    <FormLabel>Longitud</FormLabel>
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
                        <div className="flex items-end">
                            <Button type="button" variant="outline" className="w-full" onClick={() => {
                                if (!navigator.geolocation) {
                                    toast.error("Geolocalización no disponible en este navegador");
                                    return;
                                }
                                navigator.geolocation.getCurrentPosition(
                                    (pos) => {
                                        const { latitude, longitude } = pos.coords;
                                        form.setValue("latitude", String(latitude));
                                        form.setValue("longitude", String(longitude));
                                        toast.success("Ubicación establecida");
                                    },
                                    (err) => {
                                        toast.error(err.message || "No se pudo obtener la ubicación");
                                    },
                                    { enableHighAccuracy: true, timeout: 10000 }
                                );
                            }}>
                                Usar mi ubicación
                            </Button>
                        </div>
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
                                                        value={typeof field.value === "string" ? field.value : ""}
                                                        onChange={field.onChange}
                                                        placeholder="e.g. +12015550123"
                                                    />
                                                </FormControl>
                                                <FormMessage />
     npm run dev
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
                                                        value={typeof field.value === "string" ? field.value : ""}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField<ClientInput>
                                        control={form.control}
                                        name="categoryIds"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Categorías</FormLabel>
                                                <CategorySelect
                                                    options={cats}
                                                    value={Array.isArray(field.value) ? field.value : []}
                                                    onChange={(val) => field.onChange(Array.isArray(val) ? val : [])}
                                                    placeholder={loadingCategories ? "Cargando..." : "Selecciona categorías"}
                                                    module="clientAccount"
                                                    onCategoryCreated={handleCategoryCreated}
                                                    multiple
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
                            Guardar
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