/**
 * Vista de tarjetas de usuarios administrativos (toggle Cards ⇄ Lista), al mismo
 * estilo que Clientes/Vigilantes. Cada tarjeta: avatar (inicial con color estable),
 * nombre → detalle, estado, correo y sus roles. El menú de acciones se inyecta
 * desde la página (mismos handlers que la tabla) según el estado del usuario.
 */
import { EllipsisVertical, Mail, ShieldCheck, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge, SkeletonCards, EmptyState } from "@/components/kit";

export type AdminUserCardAction = {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    destructive?: boolean;
    disabled?: boolean;
};

const HUES = [28, 205, 150, 265, 340, 95, 180, 12];
function hueFor(name: string): number {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return HUES[h % HUES.length];
}

function nameOf(u: any): string {
    return u.fullName || [u.firstName, u.lastName].filter(Boolean).join(" ") || u.name || u.email || "—";
}
function photoOf(u: any): string | null {
    const a = u.avatars ?? u.avatar ?? u.profileImage;
    const f = Array.isArray(a) ? a[0] : a;
    return (f?.downloadUrl || f?.publicUrl || (typeof f === "string" ? f : null)) || u.photoUrl || null;
}
function rolesOf(u: any): string {
    if (u._rolesDisplay) return u._rolesDisplay;
    const roles = u.roles ?? u.role ?? [];
    if (Array.isArray(roles)) return roles.map((r: any) => (typeof r === "string" ? r : (r && (r.name || r.role)) || "")).filter(Boolean).join(", ");
    if (typeof roles === "string") return roles;
    if (roles && typeof roles === "object") return roles.name || roles.role || "";
    return "";
}
function statusOf(u: any): { label: string; tone: "green" | "orange" | "red" | "slate" } {
    const s = (u.status || "").toString().toLowerCase();
    if (s === "archived" || s === "archivado") return { label: "Archivado", tone: "red" };
    if (s === "invited" || s === "pending") return { label: "Pendiente", tone: "orange" };
    if (u.active === false) return { label: "Inactivo", tone: "slate" };
    return { label: "Activo", tone: "green" };
}

export default function AdminUserCardsGrid({
    users,
    loading,
    selectedIds,
    canSelect,
    onSelect,
    onOpen,
    actions,
}: {
    users: any[];
    loading: boolean;
    selectedIds: string[];
    canSelect: (u: any) => boolean;
    onSelect: (id: string, checked: boolean) => void;
    onOpen: (u: any) => void;
    actions: (u: any) => AdminUserCardAction[];
}) {
    if (loading) return <SkeletonCards count={8} className="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" />;
    if (!users.length) {
        return <EmptyState icon={<UserCog />} title="Sin usuarios" description="Crea tu primer usuario administrativo con “Nuevo Usuario”." />;
    }

    return (
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {users.map((u, i) => {
                const id = String(u.id || u._id || u.raw?.id || "");
                const name = nameOf(u);
                const hue = hueFor(name);
                const st = statusOf(u);
                const roles = rolesOf(u);
                const photo = photoOf(u);
                const acts = actions(u).filter((a) => !a.disabled);
                return (
                    <div
                        key={id || i}
                        role="button"
                        tabIndex={0}
                        onClick={() => onOpen(u)}
                        onKeyDown={(e) => { if (e.key === "Enter") onOpen(u); }}
                        className="group relative flex cursor-pointer flex-col rounded-2xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md animate-in fade-in slide-in-from-bottom-2"
                        style={{ animationDelay: `${Math.min(i, 12) * 30}ms`, animationFillMode: "backwards" }}
                    >
                        <div className="flex items-start gap-3">
                            <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
                                <Checkbox disabled={!canSelect(u)} checked={selectedIds.includes(id)} onCheckedChange={(v) => onSelect(id, Boolean(v))} aria-label={`Seleccionar ${name}`} />
                            </div>
                            {photo ? (
                                <img src={photo} alt={name} loading="lazy" className="h-12 w-12 shrink-0 rounded-full border object-cover bg-muted" />
                            ) : (
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold" style={{ backgroundColor: `hsl(${hue} 70% 92%)`, color: `hsl(${hue} 60% 32%)` }}>
                                    {name.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold leading-tight group-hover:text-primary">{name}</p>
                                <div className="mt-1"><StatusBadge tone={st.tone}>{st.label}</StatusBadge></div>
                            </div>
                            {acts.length > 0 && (
                                <div onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><EllipsisVertical className="h-4 w-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-52">
                                            {acts.map((a) => (
                                                <DropdownMenuItem key={a.label} className={a.destructive ? "text-destructive focus:text-destructive" : undefined} onClick={a.onClick}>
                                                    {a.icon}<span className={a.icon ? "ml-2" : undefined}>{a.label}</span>
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            )}
                        </div>

                        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                            {u.email && <p className="flex items-center gap-1.5 truncate"><Mail className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{u.email}</span></p>}
                        </div>

                        <div className="mt-3 flex items-center gap-1.5 border-t pt-3 text-sm text-muted-foreground">
                            <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                            {roles ? <span className="truncate capitalize text-foreground">{roles}</span> : <span>Sin rol</span>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
