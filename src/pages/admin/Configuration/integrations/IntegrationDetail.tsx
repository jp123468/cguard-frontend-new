import { Cog, Power, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INTEGRATIONS } from "./integrations.data";
import { Link, useParams, Navigate } from "react-router-dom";
import AppLayout from "@/layouts/app-layout";
import SettingsLayout from '../../../../layouts/SettingsLayout';

function Section({ title, items }: { title: string; items?: string[] }) {
    if (!items?.length) return null;
    return (
        <section className="mt-8">
            <h3 className="text-base font-semibold">{title}</h3>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-sm text-muted-foreground">
                {items.map((t, i) => (
                    <li key={i}>{t}</li>
                ))}
            </ul>
        </section>
    );
}

export default function IntegrationDetail() {
    const { slug } = useParams<{ slug: string }>();

    const data = slug ? INTEGRATIONS[slug] : undefined;

    if (!data) {
        return <Navigate to="/setting/integraciones" replace />;
    }

    return (
        <AppLayout>
            <SettingsLayout navKey="configuracion" title="Integraciones">
                <div className="mx-auto max-w-5xl">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Link
                                to="/setting/integraciones"
                                className="text-muted-foreground hover:text-foreground"
                                aria-label="Volver"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Link>

                            <img
                                src={data.logo}
                                alt={data.name}
                                className="h-12 w-36 object-contain"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            {data.enabled ? (
                                <>
                                    <Button variant="outline" className="gap-2">
                                        <Cog className="h-4 w-4" />
                                        Configuración
                                    </Button>
                                    <Button variant="destructive" className="gap-2">
                                        <Power className="h-4 w-4" />
                                        Deshabilitar
                                    </Button>
                                </>
                            ) : (
                                <Button className="gap-2">
                                    <Power className="h-4 w-4" />
                                    Habilitar
                                </Button>
                            )}
                        </div>
                    </div>

                    <h2 className="mt-8 text-xl font-semibold">
                        {data.headline ?? `Integración con ${data.name}`}
                    </h2>

                    <Section title="Características" items={data.features} />
                    <Section title="Requisitos" items={data.requirements} />
                    <Section title="Cosas que debe saber antes de comenzar" items={data.notes} />
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}