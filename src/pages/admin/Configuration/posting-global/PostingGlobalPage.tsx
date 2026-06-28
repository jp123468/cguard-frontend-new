import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import { ShieldCheck } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/kit";
import PostingGlobalForm, { PostingGlobalValues } from "./PostingGlobalForm";

export default function PostingGlobalPage() {
    const handleSubmit = async (_values: PostingGlobalValues) => { };

    return (
        <AppLayout>
            <SettingsLayout
                navKey="configuracion"
                title="Configuración Global de Puestos de Vigilancia"
            >
                <PageContainer>
                    <PageHeader
                        icon={<ShieldCheck />}
                        title="Configuración Global de Puestos"
                        subtitle="Reglas de fichaje, geocercas y entregas aplicadas a todos los puestos de vigilancia."
                    />
                    <PostingGlobalForm onSubmit={handleSubmit} />
                </PageContainer>
            </SettingsLayout>
        </AppLayout>
    );
}
