import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import ClientForm, { Category } from "./ClientForm";
import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";


export default function NewOrEditClientPage() {
    const { id } = useParams<{ id: string }>();
    const [cats, setCats] = useState<Category[]>([]);


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