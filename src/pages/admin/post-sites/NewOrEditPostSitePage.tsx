import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import PostSiteForm, { Client, Category } from "./PostSiteForm";
import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";

export default function NewOrEditPostSitePage() {
    const { id } = useParams<{ id: string }>();
    const [clients, setClients] = useState<Client[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

    useEffect(() => {
        // Cargar clientes
        (async () => {
            const { data } = await axios.get("/api/clients");
            setClients(data ?? []);
        })().catch(console.error);

        // Cargar categorías
        (async () => {
            const { data } = await axios.get("/api/categories", { params: { type: "post-site" } });
            setCategories(data ?? []);
        })().catch(console.error);
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