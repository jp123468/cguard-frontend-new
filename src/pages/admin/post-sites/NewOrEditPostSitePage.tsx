import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import PostSiteForm, { Client, Category } from "./PostSiteForm";
import { clientService } from "@/lib/api/clientService";
import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";

export default function NewOrEditPostSitePage() {
    const { id } = useParams<{ id: string }>();
    const [clients, setClients] = useState<Client[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

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
                const { data } = await axios.get("/api/categories", { params: { type: "post-site" } });
                setCategories(data ?? []);
            } catch (e) {
                console.error(e);
            }
        })();
    }, []);

    return (
        <AppLayout>
            <Breadcrumb
                items={[
                    { label: "Panel de control", path: "/dashboard" },
                    { label: id ? "Editar sitio de publicación" : "Nuevo sitio de publicación" },
                ]}
            />
            <section className="p-4">
                <PostSiteForm
                    mode={id ? "edit" : "create"}
                    id={id}
                    clients={clients}
                    categories={categories}
                />
            </section>
        </AppLayout>
    );
}