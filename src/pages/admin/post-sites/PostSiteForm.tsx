import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { categoryService } from "@/lib/api/categoryService";
import { stationService } from "@/lib/api/stationService";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    CategorySelect,
    CategoryOption,
} from "@/components/categories/CategorySelect";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
    categories: initialCategories,
    onSaved,
}: PostSiteFormProps) {
    const { t } = useTranslation();
    const { selectedClient } = useClientSelection();
    const navigate = useNavigate();
    const [categories, setCategories] = useState<Category[]>(initialCategories || []);
    const [loadingCategories, setLoadingCategories] = useState(false);

    const form = useForm<PostSiteInput>({
        resolver: zodResolver(postSiteSchema as any),
        defaultValues: {
            name: "",
            description: "",
            clientId: "",
            categoryId: "",
            status: "active",
        },
    });

    // Auto-inject clientId from context
    useEffect(() => {
        if (selectedClient?.id) {
            form.setValue('clientId', String(selectedClient.id), { shouldValidate: true, shouldDirty: true });
        }
    }, [selectedClient]);

    useEffect(() => {
        loadCategories();
        if (mode === "edit" && id) {
            loadPostSite(id);
        }
    }, []);

    const loadCategories = async () => {
        setLoadingCategories(true);
        try {
            const response = await categoryService.list({
                filter: { module: "postSite" },
                limit: 1000,
                offset: 0,
            });
            setCategories(response?.rows || []);
        } catch {
            toast.error("No se pudieron cargar los sectores");
        } finally {
            setLoadingCategories(false);
        }
    };

    const loadPostSite = async (siteId: string) => {
        try {
            const data = await stationService.get(siteId);
            form.reset({
                name: (data as any).companyName ?? (data as any).name ?? "",
                description: (data as any).description ?? "",
                clientId: (data as any).clientAccountId ?? (data as any).clientId ?? "",
                categoryId:
                    Array.isArray((data as any).categoryIds) && (data as any).categoryIds.length > 0
                        ? (data as any).categoryIds[0]
                        : (data as any).categoryId || "",
                status:
                    typeof (data as any).active === "boolean"
                        ? (data as any).active
                            ? "active"
                            : "inactive"
                        : (data as any).status ?? "active",
            });
        } catch (e) {
            console.error(e);
            toast.error(t('postSites.notFound', 'Puesto de vigilancia no encontrado o error al cargar los datos.'));
            navigate('/post-sites', { replace: true });
        }
    };

    const handleCategoryCreated = () => {
        loadCategories();
    };

    const cats: CategoryOption[] = useMemo(() => {
        if (!Array.isArray(categories)) return [];
        return categories.map((c) => ({ id: c.id, name: c.name }));
    }, [categories]);

    const onSubmit = async (values: PostSiteInput) => {
        try {
            const sc = selectedClient as any;
            const payload: any = {
                ...values,
                companyName: values.name,
                categoryId:
                    values.categoryId && String(values.categoryId).length > 0
                        ? values.categoryId
                        : undefined,
                // Auto-fill address fields from selected client
                address: sc?.address || '',
                city: sc?.city || '',
                postalCode: sc?.postalCode || '',
                country: sc?.country || '',
                email: sc?.contactEmail || sc?.email || sc?.mail || '',
                phone: sc?.contactPhone || sc?.phone || sc?.phoneNumber || sc?.mobile || '',
                latitud: String(sc?.latitud ?? sc?.latitude ?? ''),
                longitud: String(sc?.longitud ?? sc?.longitude ?? ''),
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

    return (
        <div className="max-w-2xl mx-auto">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField<PostSiteInput>
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('postSites.form.siteName', 'Nombre del puesto *')}</FormLabel>
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
                        name="description"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('postSites.form.description', 'Descripción *')}</FormLabel>
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

                    <FormField<PostSiteInput>
                        control={form.control}
                        name="categoryId"
                        render={({ field }) => (
                            <FormItem>
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
                                <CategorySelect
                                    options={cats}
                                    value={field.value ? String(field.value) : undefined}
                                    onChange={field.onChange}
                                    placeholder={
                                        loadingCategories
                                            ? t('categories.loading', 'Cargando...')
                                            : t('postSites.form.selectcategory', 'Seleccionar sector de seguridad')
                                    }
                                    module="postSite"
                                    onCategoryCreated={handleCategoryCreated}
                                />
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" className="min-w-28" onClick={handleCancel}>
                            {t('postSites.form.cancel', 'Cancelar')}
                        </Button>
                        <Button
                            type="submit"
                            className="min-w-28 bg-orange-500 text-white cursor-pointer border border-orange-500 hover:bg-orange-600"
                        >
                            {t('postSites.form.submit', 'Enviar')}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
