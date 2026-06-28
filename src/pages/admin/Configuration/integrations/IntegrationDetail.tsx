import { Cog, Power, ArrowLeft } from "lucide-react";
import { Link, useParams, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { INTEGRATIONS } from "./integrations.data";
import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "../../../../layouts/SettingsLayout";
import { PageContainer, Section, FadeIn, StatusBadge } from "@/components/kit";

function DetailSection({ title, items }: { title: string; items?: string[] }) {
    if (!items?.length) return null;
    return (
        <Section title={title}>
            <ul className="list-disc space-y-2 pl-6 text-sm text-muted-foreground">
                {items.map((t, i) => (
                    <li key={i}>{t}</li>
                ))}
            </ul>
        </Section>
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
                <PageContainer width="wide">
                    <FadeIn className="cg-gradient-hero relative overflow-hidden rounded-2xl border p-6 shadow-sm">
                        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
                        <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                            <div className="flex items-center gap-3">
                                <Link
                                    to="/setting/integraciones"
                                    className="text-muted-foreground transition-colors hover:text-foreground"
                                    aria-label="Volver"
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Link>

                                <img
                                    src={data.logo}
                                    alt={data.name}
                                    className="h-12 w-36 object-contain"
                                />

                                {data.enabled && <StatusBadge tone="green">Habilitado</StatusBadge>}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
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
                                    <Button variant="brand" className="gap-2">
                                        <Power className="h-4 w-4" />
                                        Habilitar
                                    </Button>
                                )}
                            </div>
                        </div>
                    </FadeIn>

                    <Section>
                        <h2 className="font-display text-xl font-semibold tracking-tight">
                            {data.headline ?? `Integración con ${data.name}`}
                        </h2>
                    </Section>

                    <DetailSection title="Características" items={data.features} />
                    <DetailSection title="Requisitos" items={data.requirements} />
                    <DetailSection title="Cosas que debe saber antes de comenzar" items={data.notes} />
                </PageContainer>
            </SettingsLayout>
        </AppLayout>
    );
}
