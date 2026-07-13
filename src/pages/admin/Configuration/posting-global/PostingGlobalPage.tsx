/**
 * Configuración Global de Puestos — REAL rules only.
 *
 * Guarda settings.postRules vía el PUT /settings existente (saneado en el
 * backend por postRulesService). Cada toggle tiene motor de verdad:
 *  - requireActiveShiftForRounds → bloquea tag-scans sin turno activo (server)
 *  - geofenceExitAlert/-ReturnAlert → detección de salida/regreso de geocerca
 *    sobre los pings GPS del turno (canal: fila "Excepciones de asistencia").
 * Las reglas que viven en otras páginas se enlazan, no se duplican.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ShieldCheck, Route as RouteIcon, MapPin, ExternalLink, ClipboardList, BellRing } from "lucide-react";
import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import { PageContainer, PageHeader, Section } from "@/components/kit";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import api from "@/lib/api";

type PostRules = {
    requireActiveShiftForRounds: boolean;
    geofenceExitAlert: boolean;
    geofenceReturnAlert: boolean;
};

const DEFAULTS: PostRules = {
    requireActiveShiftForRounds: false,
    geofenceExitAlert: false,
    geofenceReturnAlert: false,
};

const tenantId = () => localStorage.getItem("tenantId") || "";

function RuleRow({
    title,
    description,
    checked,
    onChange,
    disabled,
}: {
    title: string;
    description: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <div className="flex items-start justify-between gap-4 py-4">
            <div className="min-w-0">
                <div className="font-medium">{title}</div>
                <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            </div>
            <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
        </div>
    );
}

function LinkCard({ to, icon, title, description }: { to: string; icon: React.ReactNode; title: string; description: string }) {
    return (
        <Link
            to={to}
            className="flex items-start gap-3 rounded-2xl border bg-card p-4 transition-colors hover:bg-muted/40"
        >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {icon}
            </div>
            <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-medium">
                    {title}
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            </div>
        </Link>
    );
}

export default function PostingGlobalPage() {
    const { hasPermission } = usePermissions();
    const canEdit = hasPermission("settingsEdit");

    const [rules, setRules] = useState<PostRules>(DEFAULTS);
    const [row, setRow] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.get(`/tenant/${tenantId()}/settings`);
                setRow(data || {});
                setRules({ ...DEFAULTS, ...((data && data.postRules) || {}) });
            } catch {
                toast.error("No se pudo cargar la configuración.");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const set = <K extends keyof PostRules>(k: K, v: PostRules[K]) =>
        setRules((r) => ({ ...r, [k]: v }));

    const save = async () => {
        setSaving(true);
        try {
            await api.put(`/tenant/${tenantId()}/settings`, {
                settings: {
                    theme: row?.theme || "default",
                    // Round-trip file relations untouched — the backend recomputes
                    // logoUrl from logos[0], so omitting them would ERASE the logo.
                    logos: row?.logos || [],
                    backgroundImages: row?.backgroundImages || [],
                    postRules: rules,
                },
            });
            toast.success("Reglas de puestos guardadas. Aplican de inmediato.");
        } catch (e: any) {
            toast.error(e?.response?.data?.message || "No se pudo guardar.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <AppLayout>
            <SettingsLayout
                navKey="configuracion"
                title="Configuración Global de Puestos de Vigilancia"
            >
                <PageContainer>
                    <PageHeader
                        icon={<ShieldCheck />}
                        title="Configuración Global de Puestos"
                        subtitle="Reglas operativas aplicadas a todos los puestos de vigilancia del tenant."
                    />

                    <div className="space-y-6">
                        <Section title="Rondas" icon={<RouteIcon />} contentClassName="divide-y divide-border/60">
                            <RuleRow
                                title="Exigir turno activo para escanear rondas"
                                description="El vigilante debe haber marcado su entrada para que un escaneo de punto de control cuente. Evita rondas registradas fuera de turno. Se aplica en el servidor."
                                checked={rules.requireActiveShiftForRounds}
                                onChange={(v) => set("requireActiveShiftForRounds", v)}
                                disabled={!canEdit || loading}
                            />
                        </Section>

                        <Section title="Alertas de geocerca en turno" icon={<MapPin />} contentClassName="divide-y divide-border/60">
                            <RuleRow
                                title="Alertar cuando el vigilante salga de la geocerca"
                                description="Con el GPS del turno, detecta cuando el vigilante abandona el área de su puesto estando de servicio y notifica a los supervisores (requiere 2 lecturas consecutivas fuera, para evitar falsos positivos del GPS). Los puestos móviles quedan exentos."
                                checked={rules.geofenceExitAlert}
                                onChange={(v) => {
                                    set("geofenceExitAlert", v);
                                    if (!v) set("geofenceReturnAlert", false);
                                }}
                                disabled={!canEdit || loading}
                            />
                            <RuleRow
                                title="Alertar también cuando regrese"
                                description="Envía una segunda notificación cuando el vigilante vuelve a entrar a la geocerca."
                                checked={rules.geofenceReturnAlert}
                                onChange={(v) => set("geofenceReturnAlert", v)}
                                disabled={!canEdit || loading || !rules.geofenceExitAlert}
                            />
                            <p className="pt-3 text-xs text-muted-foreground">
                                Los canales (panel, correo, SMS) de estas alertas se controlan en{" "}
                                <Link to="/setting/notifications" className="underline underline-offset-2">
                                    Configuración › Notificaciones
                                </Link>{" "}
                                (fila «Excepciones de asistencia»).
                            </p>
                        </Section>

                        <Section title="Reglas relacionadas (viven en su propia página)" icon={<ClipboardList />}>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <LinkCard
                                    to="/nomina/settings"
                                    icon={<MapPin className="h-4 w-4" />}
                                    title="Geocerca al marcar entrada"
                                    description="Bloquear marcaciones fuera de geocerca, radio por defecto y auto-cierre de turnos sin salida: Nómina › Ajustes."
                                />
                                <LinkCard
                                    to="/setting/notifications"
                                    icon={<BellRing className="h-4 w-4" />}
                                    title="Canales de notificación"
                                    description="Qué llega al panel, correo o SMS por cada tipo de evento."
                                />
                                <LinkCard
                                    to="/post-sites"
                                    icon={<ClipboardList className="h-4 w-4" />}
                                    title="Consignas del puesto"
                                    description="Las órdenes permanentes (consignas específicas) se gestionan por estación, en el detalle de cada puesto."
                                />
                                <LinkCard
                                    to="/setting/rondas"
                                    icon={<RouteIcon className="h-4 w-4" />}
                                    title="Reglas de rondas"
                                    description="Foto/nota obligatoria y geocerca por punto de control: Configuración › Rondas."
                                />
                            </div>
                        </Section>

                        <div className="flex justify-end">
                            <Button variant="brand" className="px-6" onClick={save} disabled={!canEdit || loading || saving}>
                                {saving ? "Guardando…" : "Guardar Configuración"}
                            </Button>
                        </div>
                    </div>
                </PageContainer>
            </SettingsLayout>
        </AppLayout>
    );
}
