import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import ClientForm, { Category } from "./ClientForm";
import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";


export default function NewOrEditClientPage() {
    const { id } = useParams<{ id: string }>();
    const [cats, setCats] = useState<Category[]>([]);
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();

    useEffect(() => {
        // If creating, require create permission. If editing, require edit permission.
        if (!id && !hasPermission('clientAccountCreate')) {
            toast.error('No tienes permiso para crear clientes');
            navigate('/clients');
        }
        if (id && !hasPermission('clientAccountEdit')) {
            toast.error('No tienes permiso para editar clientes');
            navigate('/clients');
        }
    }, [id, hasPermission, navigate]);


    useEffect(() => {
        (async () => {
            const { data } = await axios.get("/api/categories", { params: { type: "client" } });
            setCats(data ?? []);
        })().catch(console.error);
    }, []);


    return (
        <AppLayout>
            <Breadcrumb
                items={[
                    { label: "Panel de control", path: "/dashboard" },
                    { label: id ? "Editar cliente" : "Nuevo cliente" },
                ]}
            />
            <section className="p-4">
                <ClientForm mode={id ? "edit" : "create"} id={id} categories={cats} />
            </section>
        </AppLayout>
    );
}