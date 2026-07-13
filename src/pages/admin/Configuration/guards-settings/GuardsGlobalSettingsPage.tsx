/**
 * Configuración Global de Vigilantes — REAL rules only.
 *
 * Guarda settings.guardSettings vía el PUT /settings existente (saneado en el
 * backend por guardSettingsService). Cada control tiene motor de verdad:
 *  - inactivityAlert/-ThresholdMin → barrido cada 5 min (guard.inactive)
 *  - shiftRemindersEnabled → recordatorios de turno (2d/1d/12h/1h/10m)
 *  - licenseExpiryAlert/-Days → barrido diario de credenciales (aviso a RRHH)
 * Lo que vive en otras páginas se enlaza, no se duplica. Reemplaza el clon
 * de 25 toggles falsos (4 tabs, botón Guardar sin handler).
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
    ShieldCheck, SatelliteDish, BellRing, IdCard, ExternalLink,
    MapPin, Route as RouteIcon, Smartphone, Wallet, CalendarClock,
} from "lucide-react";
import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import { PageContainer, PageHeader, Section } from "@/components/kit";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermissions } from "@/hooks/usePermissions";
import api from "@/lib/api";

type GuardSettings = {
    inactivityAlert: boolean;
    inactivityThresholdMin: number;
    shiftRemindersEnabled: boolean;
    licenseExpiryAlert: boolean;
    licenseExpiryDays: number;
};

const DEFAULTS: GuardSettings = {
    inactivityAlert: false,
    inactivityThresholdMin: 20,
    shiftRemindersEnabled: true,
    licenseExpiryAlert: true,
    licenseExpiryDays: 30,
};

const tenantId = () => localStorage.getItem("tenantId") || "";

function RuleRow({
    title,
    description,
    checked,
    onChange,
    disabled,
    children,
}: {
    title: string;
    description: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
    children?: React.ReactNode;
}) {
    return (
        <div className="py-4">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="font-medium">{title}</div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
                </div>
                <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
            </div>
            {children}
        </div>
    );
}

function LinkCard({ to, icon, title, description }: { to: string; icon: React.ReactNode; title: string; description: string }) {
    return (
        <Link to={to} className="flex items-start gap-3 rounded-2xl border bg-card p-4 transition-colors hover:bg-muted/40">
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

export default function GuardsGlobalSettingsPage() {
    const { hasPermission } = usePermissions();
    const canEdit = hasPermission("settingsEdit");

    const [cfg, setCfg] = useState<GuardSettings>(DEFAULTS);
    const [row, setRow] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.get(`/tenant/${tenantId()}/settings`);
                setRow(data || {});
                setCfg({ ...DEFAULTS, ...((data && data.guardSettings) || {}) });
            } catch {
                toast.error("No se pudo cargar la configuración.");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const set = <K extends keyof GuardSettings>(k: K, v: GuardSettings[K]) =>
        setCfg((c) => ({ ...c, [k]: v }));

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
                    guardSettings: cfg,
                },
            });
            toast.success("Configuración de vigilantes guardada. Aplica de inmediato.");
        } catch (e: any) {
            toast.error(e?.response?.data?.message || "No se pudo guardar.");
        } finally {
            setSaving(false);
        }
    };

    const disabled = !canEdit || loading;

    return (
        <AppLayout>
            <SettingsLayout navKey="configuracion" title="Configuración Global de Vigilantes">
                <PageContainer>
                    <PageHeader
                        icon={<ShieldCheck />}
                        title="Configuración Global de Vigilantes"
                        subtitle="Estas preferencias aplican a todos los vigilantes de tu empresa."
                    />

                    <div className="space-y-6">
                        <Section title="Supervisión en tiempo real" icon={<SatelliteDish />} contentClassName="divide-y divide-border/60">
                            <RuleRow
                                title="Alerta de inactividad en turno"
                                description="Avisa a los supervisores cuando un vigilante de servicio deja de reportar ubicación (teléfono apagado, sin señal o app cerrada). Es tu red de seguridad para saber que cada vigilante sigue activo en su puesto."
                                checked={cfg.inactivityAlert}
                                onChange={(v) => set("inactivityAlert", v)}
                                disabled={disabled}
                            >
                                {cfg.inactivityAlert && (
                                    <div className="mt-3 flex items-center gap-3">
                                        <span className="text-sm text-muted-foreground">Alertar tras</span>
                                        <Select
                                            value={String(cfg.inactivityThresholdMin)}
                                            onValueChange={(v) => set("inactivityThresholdMin", Number(v))}
                                            disabled={disabled}
                                        >
                                            <SelectTrigger className="w-40">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="10">10 minutos</SelectItem>
                                                <SelectItem value="15">15 minutos</SelectItem>
                                                <SelectItem value="20">20 minutos</SelectItem>
                                                <SelectItem value="30">30 minutos</SelectItem>
                                                <SelectItem value="60">1 hora</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <span className="text-sm text-muted-foreground">sin señal</span>
                                    </div>
                                )}
                            </RuleRow>
                        </Section>

                        <Section title="Recordatorios de turno" icon={<CalendarClock />} contentClassName="divide-y divide-border/60">
                            <RuleRow
                                title="Recordar a los vigilantes sus próximos turnos"
                                description="Avisos automáticos antes de cada turno (2 días, 1 día, 12 horas, 1 hora y 10 minutos antes) para que nadie falte después de sus días de descanso."
                                checked={cfg.shiftRemindersEnabled}
                                onChange={(v) => set("shiftRemindersEnabled", v)}
                                disabled={disabled}
                            />
                        </Section>

                        <Section title="Credenciales y licencias" icon={<IdCard />} contentClassName="divide-y divide-border/60">
                            <RuleRow
                                title="Avisar cuando una credencial esté por vencer"
                                description="RR.HH. recibe un aviso semanal por cada credencial o licencia próxima a vencer (o ya vencida) hasta que se renueve. Las credenciales se registran en el perfil de cada vigilante."
                                checked={cfg.licenseExpiryAlert}
                                onChange={(v) => set("licenseExpiryAlert", v)}
                                disabled={disabled}
                            >
                                {cfg.licenseExpiryAlert && (
                                    <div className="mt-3 flex items-center gap-3">
                                        <span className="text-sm text-muted-foreground">Empezar a avisar</span>
                                        <Input
                                            type="number"
                                            min={7}
                                            max={120}
                                            className="w-24"
                                            value={cfg.licenseExpiryDays}
                                            onChange={(e) => set("licenseExpiryDays", Number(e.target.value) || 30)}
                                            disabled={disabled}
                                        />
                                        <span className="text-sm text-muted-foreground">días antes del vencimiento</span>
                                    </div>
                                )}
                            </RuleRow>
                        </Section>

                        <Section title="Más configuraciones de vigilantes" icon={<Smartphone />}>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <LinkCard
                                    to="/nomina/settings"
                                    icon={<Wallet className="h-4 w-4" />}
                                    title="Marcaciones y geocerca"
                                    description="Bloqueo fuera de geocerca, tolerancias de entrada/salida y cierre automático de turnos: Nómina › Ajustes."
                                />
                                <LinkCard
                                    to="/setting/publishing-sites"
                                    icon={<MapPin className="h-4 w-4" />}
                                    title="Reglas globales de puestos"
                                    description="Exigir turno activo para rondas y alertas de salida de geocerca durante el turno."
                                />
                                <LinkCard
                                    to="/setting/rondas"
                                    icon={<RouteIcon className="h-4 w-4" />}
                                    title="Reglas de rondas"
                                    description="Foto o nota obligatoria y validación de ubicación en cada punto de control."
                                />
                                <LinkCard
                                    to="/setting/notifications"
                                    icon={<BellRing className="h-4 w-4" />}
                                    title="Canales de notificación"
                                    description="Decide qué alertas llegan al panel, al correo o por SMS — incluidas las de esta página."
                                />
                                <LinkCard
                                    to="/setting/mobile-hub"
                                    icon={<Smartphone className="h-4 w-4" />}
                                    title="Hub móvil del equipo"
                                    description="Apariencia de la app del vigilante y qué módulos ve tu equipo (entrenamiento, visitas, mapa…)."
                                />
                                <LinkCard
                                    to="/setting/roles"
                                    icon={<ShieldCheck className="h-4 w-4" />}
                                    title="Roles y permisos"
                                    description="Qué puede hacer cada rol, incluido el rol Vigilante, en la plataforma y las apps."
                                />
                            </div>
                        </Section>

                        <div className="flex justify-end">
                            <Button variant="brand" className="px-6" onClick={save} disabled={disabled || saving}>
                                {saving ? "Guardando…" : "Guardar Configuración"}
                            </Button>
                        </div>
                    </div>
                </PageContainer>
            </SettingsLayout>
        </AppLayout>
    );
}
