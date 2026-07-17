/**
 * Hero del detalle de cliente — visible en TODAS las pestañas.
 * Identidad (logo o inicial con color estable), estado, acceso a la app y
 * acciones rápidas (editar, nuevo sitio, llamar/correo) sin buscar en menús.
 */
import { useNavigate } from "react-router-dom";
import { Building2, Mail, MapPin, Pencil, Phone, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge, FadeIn } from "@/components/kit";
import { useClientSelection } from "@/contexts/ClientSelectionContext";
import { usePermissions } from "@/hooks/usePermissions";

const HUES = [28, 205, 150, 265, 340, 95, 180, 12];
function hueFor(name: string): number {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return HUES[h % HUES.length];
}

const APP_BADGE: Record<string, { label: string; tone: "slate" | "orange" | "green" | "red" }> = {
    not_invited: { label: "Sin acceso a la app", tone: "slate" },
    invited: { label: "Invitado", tone: "orange" },
    active: { label: "En la app", tone: "green" },
    suspended: { label: "Suspendido", tone: "red" },
};

export default function ClientHero({ client }: { client: any }) {
    const navigate = useNavigate();
    const { setSelectedClient } = useClientSelection();
    const { hasPermission } = usePermissions();

    if (!client) return null;

    const name = client.commercialName
        || `${client.name || ""} ${client.lastName && String(client.lastName).toLowerCase() !== "null" ? client.lastName : ""}`.trim();
    const logo = Array.isArray(client.logoUrl) ? client.logoUrl[0]?.downloadUrl : null;
    const hue = hueFor(name || "?");
    const isActive = client.active === true;
    const app = APP_BADGE[client.onboardingStatus || "not_invited"] || APP_BADGE.not_invited;
    // Persona jurídica: el nombre comercial manda y la persona queda de subtítulo.
    const subtitle = client.commercialName
        ? `${client.name || ""} ${client.lastName && String(client.lastName).toLowerCase() !== "null" ? client.lastName : ""}`.trim()
        : null;

    return (
        <FadeIn>
            <div className="mb-4 rounded-2xl border bg-gradient-to-r from-primary/10 via-card to-card p-4 md:p-5">
                <div className="flex flex-wrap items-center gap-4">
                    {logo ? (
                        <img src={logo} alt="" className="h-16 w-16 shrink-0 rounded-2xl border bg-white object-cover" />
                    ) : (
                        <div
                            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold"
                            style={{ backgroundColor: `hsl(${hue} 70% 92%)`, color: `hsl(${hue} 60% 32%)` }}
                        >
                            {(name || "?").charAt(0).toUpperCase()}
                        </div>
                    )}

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-xl font-bold leading-tight">{name || "—"}</h2>
                            <StatusBadge tone={isActive ? "green" : "red"}>{isActive ? "Activo" : "Archivado"}</StatusBadge>
                            <StatusBadge tone={app.tone}>{app.label}</StatusBadge>
                        </div>
                        {subtitle && <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p>}
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            {client.phoneNumber && (
                                <a href={`tel:${client.phoneNumber}`} className="flex items-center gap-1.5 hover:text-primary">
                                    <Phone className="h-3.5 w-3.5" />
                                    {client.phoneNumber}
                                </a>
                            )}
                            {client.email && (
                                <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 hover:text-primary">
                                    <Mail className="h-3.5 w-3.5" />
                                    <span className="truncate">{client.email}</span>
                                </a>
                            )}
                            {client.address && (
                                <span className="flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5" />
                                    <span className="truncate">{client.address}</span>
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        {hasPermission("businessInfoCreate") && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setSelectedClient(client);
                                    navigate("/post-sites/new");
                                }}
                            >
                                <Plus className="mr-1.5 h-4 w-4" />
                                Nuevo sitio
                            </Button>
                        )}
                        {hasPermission("clientAccountEdit") && client.active === true && (
                            <Button variant="brand" size="sm" onClick={() => navigate(`/clients/edit/${client.id}`)}>
                                <Pencil className="mr-1.5 h-4 w-4" />
                                Editar
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </FadeIn>
    );
}
