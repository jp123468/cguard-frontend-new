import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PostSiteWizard from "./PostSiteWizard";

type Category = { id: string; name: string };
import { clientService } from "@/lib/api/clientService";
import { Loader2 } from "lucide-react";
import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";
import { useTranslation } from "react-i18next";
import type { Client } from "./PostSiteForm";

export default function NewOrEditPostSitePage() {
    const { id } = useParams<{ id: string }>();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const { t } = useTranslation();

    useEffect(() => {
        (async () => {
            try {
                const data = await clientService.getClients({});
                const rows = Array.isArray(data?.rows) ? data.rows : [];
                setClients(rows.map((c: any) => ({
                    id: c.id,
                    name: c.commercialName || [c.name, c.lastName].filter(Boolean).join(' '),
                })));
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return (
        <AppLayout>
            <Breadcrumb
                items={[
                    { label: t('postSites.postsitdash', 'Panel de control'), path: '/dashboard' },
                    { label: id ? t('postSites.editPostSite', 'Editar Puesto de seguridad') : t('postSites.newPostSite', 'Nuevo Puesto de seguridad') },
                ]}
            />
            <section className="p-4">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-6 w-6 animate-spin text-[#C8860A]" />
                    </div>
                ) : (
                    <PostSiteWizard clients={clients} mode={id ? 'edit' : 'create'} id={id} />
                )}
            </section>
        </AppLayout>
    );
}