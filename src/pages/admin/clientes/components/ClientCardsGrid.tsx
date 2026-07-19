/**
 * Vista de tarjetas de clientes (toggle Cards ⇄ Lista en ClientsPage).
 * Cada tarjeta: logo (o inicial con color estable), nombre, estado, acceso a
 * la app, contacto y el tamaño de su operación (sitios · estaciones) — con
 * clic directo al detalle. La meta (logo/conteos) llega por lote desde
 * /client-account/card-meta para no engordar la lista principal.
 */
import { useMemo } from "react";
import { Building2, MapPin, Phone, Mail, Shield, EllipsisVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge, SkeletonCards, EmptyState } from "@/components/kit";
import type { Client } from "@/types/client";

export type ClientCardMeta = { logoUrl: string | null; sites: number; stations: number };

export type CardRowAction = {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    destructive?: boolean;
};

// Deterministic accent hue per client so initials feel "branded" without a logo.
const HUES = [28, 205, 150, 265, 340, 95, 180, 12];
function hueFor(name: string): number {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return HUES[h % HUES.length];
}

function displayName(c: Client): string {
    if (c.commercialName) return c.commercialName;
    const last = (c.lastName || "").toString().trim();
    return last && last.toLowerCase() !== "null" ? `${c.name} ${last}` : c.name;
}

const APP_BADGE: Record<string, { label: string; tone: "slate" | "orange" | "green" | "red" }> = {
    not_invited: { label: "Sin acceso", tone: "slate" },
    invited: { label: "Invitado", tone: "orange" },
    active: { label: "En app", tone: "green" },
    suspended: { label: "Suspendido", tone: "red" },
};

export default function ClientCardsGrid({
    clients,
    meta,
    loading,
    onOpen,
    rowActions,
}: {
    clients: Client[];
    meta: Record<string, ClientCardMeta>;
    loading: boolean;
    onOpen: (c: Client) => void;
    rowActions: (c: Client) => CardRowAction[];
}) {
    const cards = useMemo(() => clients, [clients]);

    if (loading) return <SkeletonCards count={8} className="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" />;
    if (!cards.length) {
        return (
            <EmptyState
                icon={<Building2 />}
                title="Sin clientes"
                description="Crea tu primer cliente con “Agregar cliente”."
            />
        );
    }

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cards.map((c, i) => {
                const m = meta[c.id];
                const name = displayName(c);
                const hue = hueFor(name || "?");
                const app = APP_BADGE[c.onboardingStatus || "not_invited"] || APP_BADGE.not_invited;
                const isActive = c.active === true;
                const actions = rowActions(c);
                return (
                    <div
                        key={c.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => onOpen(c)}
                        onKeyDown={(e) => { if (e.key === "Enter") onOpen(c); }}
                        className="group flex cursor-pointer flex-col rounded-2xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md animate-in fade-in slide-in-from-bottom-2"
                        style={{ animationDelay: `${Math.min(i, 12) * 30}ms`, animationFillMode: "backwards" }}
                    >
                        <div className="flex items-start gap-3">
                            {m?.logoUrl ? (
                                <img
                                    src={m.logoUrl}
                                    alt=""
                                    className="h-12 w-12 shrink-0 rounded-xl border object-cover bg-white"
                                    loading="lazy"
                                />
                            ) : (
                                <div
                                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold"
                                    style={{
                                        backgroundColor: `hsl(${hue} 70% 92%)`,
                                        color: `hsl(${hue} 60% 32%)`,
                                    }}
                                >
                                    {(name || "?").charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold leading-tight group-hover:text-primary">{name}</p>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                    <StatusBadge tone={isActive ? "green" : "red"}>
                                        {isActive ? "Activo" : "Archivado"}
                                    </StatusBadge>
                                    <StatusBadge tone={app.tone}>{app.label}</StatusBadge>
                                </div>
                            </div>
                            {actions.length > 0 && (
                                <div onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                                <EllipsisVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                            {actions.map((a) => (
                                                <DropdownMenuItem
                                                    key={a.label}
                                                    className={a.destructive ? "text-destructive focus:text-destructive" : undefined}
                                                    onClick={a.onClick}
                                                >
                                                    {a.icon}
                                                    <span className={a.icon ? "ml-2" : undefined}>{a.label}</span>
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            )}
                        </div>

                        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                            {c.email && (
                                <p className="flex items-center gap-1.5 truncate">
                                    <Mail className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">{c.email}</span>
                                </p>
                            )}
                            {c.phoneNumber && (
                                <p className="flex items-center gap-1.5 truncate">
                                    <Phone className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">{c.phoneNumber}</span>
                                </p>
                            )}
                            {c.address && (
                                <p className="flex items-center gap-1.5 truncate">
                                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">{c.address}</span>
                                </p>
                            )}
                        </div>

                        <div className="mt-3 flex items-center gap-4 border-t pt-3 text-sm">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                <Building2 className="h-4 w-4 text-primary" />
                                <span className="font-semibold text-foreground">{m ? m.sites : "…"}</span> sitio(s)
                            </span>
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                <Shield className="h-4 w-4 text-primary" />
                                <span className="font-semibold text-foreground">{m ? m.stations : "…"}</span> estación(es)
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
