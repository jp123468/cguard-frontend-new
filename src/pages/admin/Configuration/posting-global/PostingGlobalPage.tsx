import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import PostingGlobalForm, { PostingGlobalValues } from "./PostingGlobalForm";

export default function PostingGlobalPage() {
    const handleSubmit = async (_values: PostingGlobalValues) => { };

    return (
        <AppLayout>
            <SettingsLayout
                navKey="configuracion"
                title="Configuración Global de Sitios de Publicación"
            >
                <PostingGlobalForm onSubmit={handleSubmit} />
            </SettingsLayout>
        </AppLayout>
    );
}
