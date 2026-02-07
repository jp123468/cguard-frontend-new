import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import PostSiteForm, { Client, Category } from "./PostSiteForm";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { postSiteService } from "@/lib/api/postSiteService";
import { categoryService } from "@/lib/api/categoryService";
import { Loader2 } from "lucide-react";
import { clientService } from "@/lib/api/clientService";
import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";
import { useTranslation } from "react-i18next";

export default function NewOrEditPostSitePage() {
    const { id } = useParams<{ id: string }>();
    const [clients, setClients] = useState<Client[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [site, setSite] = useState<any | null>(null);
    const [loadingSite, setLoadingSite] = useState(false);
    const { t } = useTranslation();
    useEffect(() => {
        // Cargar clientes desde backend oficial y mostrar name + lastName
        (async () => {
            try {
                const data = await clientService.getClients({});
                const rows = Array.isArray(data?.rows) ? data.rows : [];
                const mapped: Client[] = rows.map((c: any) => ({
                    id: c.id,
                    name: [c.name, c.lastName].filter(Boolean).join(" "),
                }));
                setClients(mapped);
            } catch (e) {
                console.error(e);
            }
        })();

        // Cargar categorías
        (async () => {
            try {
                const response = await categoryService.list({ filter: { module: "postSite" }, limit: 1000, offset: 0 });
                const rows = Array.isArray(response?.rows) ? response.rows : [];
                const mapped = rows.map((c: any) => ({ id: c.id, name: c.name }));
                setCategories(mapped);
            } catch (e) {
                console.error(e);
            }
        })();
    }, []);

    // Load site details when editing for the Details tab
    useEffect(() => {
        if (!id) return;
        (async () => {
            setLoadingSite(true);
            try {
                const data = await postSiteService.get(id);
                setSite(data);

                const ids = (data as any).categoryIds || [];
                if (Array.isArray(ids) && ids.length > 0) {
                    try {
                        const cats = await Promise.all(ids.map((cid: string) => categoryService.findById(cid)));
                        // merge into local categories list for display fallback
                        setCategories((prev) => {
                            const existing = new Map(prev.map((c) => [c.id, c]));
                            cats.forEach((c: any) => existing.set(c.id, { id: c.id, name: c.name }));
                            return Array.from(existing.values());
                        });
                    } catch (err) {
                        console.error("Error loading category names:", err);
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingSite(false);
            }
        })();
    }, [id]);

    return (
        <AppLayout>
            <Breadcrumb
                items={[
                    { label: t('postSites.postsitdash', 'Panel de control'), path: "/dashboard" },
                    { label: id ? t('postSites.editPostSite', 'Editar sitio de publicación') : t('postSites.newPostSite', 'Nuevo sitio de publicación') },
                ]}
            />
            <section className="p-4">
                {id ? (
                    <Tabs defaultValue="edit">
                        
                        <TabsContent value="edit">
                            <PostSiteForm
                                mode={id ? "edit" : "create"}
                                id={id}
                                clients={clients}
                                categories={categories}
                            />
                        </TabsContent>
                        <TabsContent value="details">
                            <div className="max-w-[900px] mx-auto">
                                {loadingSite ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                                    </div>
                                ) : site ? (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold">{(site as any).companyName || site.name}</h3>
                                        <p className="text-sm text-gray-600">{(site as any).description || '-'}</p>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <p className="text-xs text-gray-600">Correo</p>
                                                <p className="text-sm">{(site as any).contactEmail ?? site.email ?? '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-600">Teléfono</p>
                                                <p className="text-sm">{(site as any).contactPhone ?? site.phone ?? '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-600">Fax</p>
                                                <p className="text-sm">{(site as any).fax ?? '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-600">Categorías</p>
                                                <p className="text-sm">
                                                    {Array.isArray((site as any).categoryIds) && (site as any).categoryIds.length > 0
                                                        ? ((site as any).categoryIds.map((cid: string) => {
                                                            const found = categories.find((c) => c.id === cid);
                                                            return found ? found.name : cid;
                                                        }).join(', '))
                                                        : '-'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="border-t pt-3">
                                            <h4 className="text-sm font-semibold mb-2">Dirección</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <p className="text-xs text-gray-600">Dirección</p>
                                                    <p className="text-sm">{(site as any).address || '-'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-600">Dirección complementaria</p>
                                                    <p className="text-sm">{(site as any).secondAddress || '-'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-600">Código postal</p>
                                                    <p className="text-sm">{(site as any).postalCode || '-'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-600">Ciudad</p>
                                                    <p className="text-sm">{(site as any).city || '-'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-600">País</p>
                                                    <p className="text-sm">{(site as any).country || '-'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-600">Latitud</p>
                                                    <p className="text-sm">{(site as any).latitud ?? '-'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-600">Longitud</p>
                                                    <p className="text-sm">{(site as any).longitud ?? '-'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p>{t('postSites.form.notLocationSet')}</p>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                ) : (
                    <PostSiteForm
                        mode="create"
                        clients={clients}
                        categories={categories}
                    />
                )}
            </section>
        </AppLayout>
    );
}