import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PostSiteWizard from "./PostSiteWizard";

type Category = { id: string; name: string };
type Client = { id: string; name: string; lastName?: string };
import { clientService } from "@/lib/api/clientService";
import { MapPin, Pencil } from "lucide-react";
import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";
import { useTranslation } from "react-i18next";
import { PageContainer, PageHeader, SkeletonCards } from "@/components/kit";

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
                <PageContainer width="narrow">
                    <PageHeader
                        icon={id ? <Pencil /> : <MapPin />}
                        title={id ? t('postSites.editPostSite', 'Editar Puesto de seguridad') : t('postSites.newPostSite', 'Nuevo Puesto de seguridad')}
                        subtitle={t('postSites.wizardSubtitle', 'Configura el sitio, su ubicación, servicio y estaciones paso a paso.')}
                    />
                    {loading ? (
                        <SkeletonCards count={4} />
                    ) : (
                        <PostSiteWizard clients={clients} mode={id ? 'edit' : 'create'} id={id} />
                    )}
                </PageContainer>
            </section>
        </AppLayout>
    );
}