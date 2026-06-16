import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Loader2,
  RefreshCw,
  Wallet,
  MessageCircle,
  Smartphone,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Save,
  ListFilter,
  Radio,
} from "lucide-react";

import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  communicationService,
  CommunicationSettings,
  WalletSnapshot,
  CommunicationLog,
  LogsFilters,
  LogsResult,
} from "@/lib/api/communicationService";

const GOLD = "#C8860A";

const CHANNEL_OPTIONS = ["push", "whatsapp", "sms", "email"];
const PROVIDER_OPTIONS = ["fcm", "meta", "twilio", "smtp"];
const STATUS_OPTIONS = ["queued", "sent", "delivered", "read", "failed", "skipped"];
const TYPE_OPTIONS = [
  "otp",
  "shift_reminder",
  "incident_alert",
  "visitor_alert",
  "ronda_alert",
  "task_alert",
  "no_show",
  "panic",
  "new_assignment",
  "escalation",
  "generic",
];

function money(cents: number, currency = "USD") {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency }).format(
    (cents || 0) / 100,
  );
}

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("es-ES", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_STYLES: Record<string, string> = {
  delivered: "bg-green-500/15 text-green-700 border-green-200",
  read: "bg-green-500/15 text-green-700 border-green-200",
  sent: "bg-blue-500/15 text-blue-700 border-blue-200",
  queued: "bg-slate-500/15 text-slate-600 border-slate-200",
  failed: "bg-red-500/15 text-red-700 border-red-200",
  skipped: "bg-amber-500/15 text-amber-700 border-amber-200",
};

const CHANNEL_LABELS: Record<string, string> = {
  push: "Push",
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
};

interface ToggleRowProps {
  title: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({ title, desc, checked, onChange, disabled }: ToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {desc && <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

export default function CommunicationsPage() {
  const { t } = useTranslation();

  const [settings, setSettings] = useState<CommunicationSettings | null>(null);
  const [wallet, setWallet] = useState<WalletSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Logs
  const [logsResult, setLogsResult] = useState<LogsResult | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [filters, setFilters] = useState<LogsFilters>({ page: 1, limit: 25 });

  const loadConfig = async () => {
    setLoading(true);
    try {
      const [s, w] = await Promise.all([
        communicationService.getSettings(),
        communicationService.getWallet(),
      ]);
      setSettings(s);
      setWallet(w);
      setDirty(false);
    } catch (e: any) {
      toast.error(
        e?.data?.message ||
          e?.message ||
          t("comms.loadError", { defaultValue: "No se pudo cargar la configuración de comunicaciones" }),
      );
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async (f: LogsFilters = filters) => {
    setLogsLoading(true);
    try {
      const res = await communicationService.getLogs(f);
      setLogsResult(res);
    } catch (e: any) {
      toast.error(
        e?.data?.message ||
          e?.message ||
          t("comms.logsError", { defaultValue: "No se pudo cargar el historial" }),
      );
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patch = (key: keyof CommunicationSettings, value: any) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
    setDirty(true);
  };

  const onSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const payload: Partial<CommunicationSettings> = {
        whatsapp_enabled: settings.whatsapp_enabled,
        sms_enabled: settings.sms_enabled,
        critical_alert_sms_fallback: settings.critical_alert_sms_fallback,
        whatsapp_shift_reminders: settings.whatsapp_shift_reminders,
        whatsapp_incidents: settings.whatsapp_incidents,
        sms_critical: settings.sms_critical,
        otp_preferred_channel: settings.otp_preferred_channel,
        default_country_code: settings.default_country_code,
        wallet_required_for_paid_channels: settings.wallet_required_for_paid_channels,
        low_balance_threshold: Number(settings.low_balance_threshold) || 0,
        meta_phone_number_id: settings.meta_phone_number_id || null,
        meta_business_account_id: settings.meta_business_account_id || null,
      };
      const updated = await communicationService.updateSettings(payload);
      setSettings(updated);
      setDirty(false);
      toast.success(t("comms.saved", { defaultValue: "Configuración guardada" }));
      // Threshold may affect the wallet snapshot view.
      communicationService.getWallet().then(setWallet).catch(() => undefined);
    } catch (e: any) {
      toast.error(
        e?.data?.message ||
          e?.message ||
          t("comms.saveError", { defaultValue: "No se pudo guardar la configuración" }),
      );
    } finally {
      setSaving(false);
    }
  };

  // Webhook readiness is derived from non-secret config the tenant controls.
  const webhookReady = useMemo(() => {
    if (!settings) return false;
    return (
      !!settings.whatsapp_enabled &&
      !!settings.meta_phone_number_id &&
      !!settings.meta_business_account_id
    );
  }, [settings]);

  const setFilter = (key: keyof LogsFilters, value: any) => {
    const next = { ...filters, [key]: value || undefined, page: 1 };
    setFilters(next);
  };

  const applyFilters = () => loadLogs({ ...filters, page: 1 });
  const clearFilters = () => {
    const reset: LogsFilters = { page: 1, limit: 25 };
    setFilters(reset);
    loadLogs(reset);
  };

  const goPage = (page: number) => {
    const next = { ...filters, page };
    setFilters(next);
    loadLogs(next);
  };

  // Cost summary across the currently loaded page of logs.
  const costSummary = useMemo(() => {
    const rows = logsResult?.rows || [];
    let estimate = 0;
    let billed = 0;
    let paid = 0;
    let failed = 0;
    let currency = wallet?.currency || "USD";
    rows.forEach((r) => {
      estimate += r.costEstimateCents || 0;
      billed += r.billedAmountCents || 0;
      if (r.channel === "whatsapp" || r.channel === "sms") paid += 1;
      if (r.status === "failed") failed += 1;
      if (r.currency) currency = r.currency;
    });
    return { estimate, billed, paid, failed, currency, count: rows.length };
  }, [logsResult, wallet]);

  const currency = wallet?.currency || "USD";

  return (
    <AppLayout>
      <SettingsLayout
        navKey="configuracion"
        title={t("settings.configuracion.comunicaciones", { defaultValue: "Comunicaciones" })}
      >
        <div className="mx-auto max-w-4xl">
          {loading ? (
            <div className="flex min-h-[30vh] items-center justify-center">
              <Loader2 className="animate-spin" size={28} style={{ color: GOLD }} />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Wallet */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wallet size={18} style={{ color: GOLD }} />
                    {t("comms.walletTitle", { defaultValue: "Saldo de comunicaciones" })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <div className="text-3xl font-bold text-foreground">
                        {money(wallet?.balanceCents || 0, currency)}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("comms.walletHint", {
                          defaultValue: "Saldo prepago para canales con costo (WhatsApp y SMS).",
                        })}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={loadConfig}>
                      <RefreshCw size={14} className="mr-1.5" />
                      {t("comms.refresh", { defaultValue: "Actualizar" })}
                    </Button>
                  </div>
                  {wallet?.belowThreshold && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-500/10 p-3 text-xs text-amber-700">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                      <span>
                        {t("comms.lowBalance", {
                          defaultValue:
                            "Saldo bajo: por debajo del umbral configurado. Los canales con costo podrían bloquearse.",
                        })}{" "}
                        ({money(wallet.lowBalanceThresholdCents, currency)})
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Channels & toggles */}
              {settings && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <MessageCircle size={18} style={{ color: GOLD }} />
                      {t("comms.channelsTitle", { defaultValue: "Canales y alertas" })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="divide-y">
                    <ToggleRow
                      title={t("comms.whatsappEnabled", { defaultValue: "Habilitar WhatsApp" })}
                      desc={t("comms.whatsappEnabledDesc", {
                        defaultValue: "Envía mensajes vía Meta Cloud API (consume saldo).",
                      })}
                      checked={!!settings.whatsapp_enabled}
                      onChange={(v) => patch("whatsapp_enabled", v)}
                    />
                    <ToggleRow
                      title={t("comms.smsFallback", { defaultValue: "SMS como respaldo" })}
                      desc={t("comms.smsFallbackDesc", {
                        defaultValue: "Usa SMS (Twilio) cuando push y WhatsApp no estén disponibles.",
                      })}
                      checked={!!settings.sms_enabled}
                      onChange={(v) => patch("sms_enabled", v)}
                    />
                    <ToggleRow
                      title={t("comms.whatsappShiftReminders", {
                        defaultValue: "Recordatorios de turno por WhatsApp",
                      })}
                      desc={t("comms.whatsappShiftRemindersDesc", {
                        defaultValue: "Notifica turnos por WhatsApp si el guardia no tiene push.",
                      })}
                      checked={!!settings.whatsapp_shift_reminders}
                      onChange={(v) => patch("whatsapp_shift_reminders", v)}
                      disabled={!settings.whatsapp_enabled}
                    />
                    <ToggleRow
                      title={t("comms.whatsappIncidents", {
                        defaultValue: "Incidentes por WhatsApp",
                      })}
                      desc={t("comms.whatsappIncidentsDesc", {
                        defaultValue: "Alerta a supervisores y administradores por WhatsApp.",
                      })}
                      checked={!!settings.whatsapp_incidents}
                      onChange={(v) => patch("whatsapp_incidents", v)}
                      disabled={!settings.whatsapp_enabled}
                    />
                    <ToggleRow
                      title={t("comms.smsCritical", {
                        defaultValue: "SMS para alertas críticas",
                      })}
                      desc={t("comms.smsCriticalDesc", {
                        defaultValue: "Envía SMS inmediato en pánico/emergencias.",
                      })}
                      checked={!!settings.sms_critical}
                      onChange={(v) => patch("sms_critical", v)}
                      disabled={!settings.sms_enabled}
                    />
                    <ToggleRow
                      title={t("comms.criticalSmsFallback", {
                        defaultValue: "Respaldo SMS en alertas críticas",
                      })}
                      desc={t("comms.criticalSmsFallbackDesc", {
                        defaultValue: "Permite SMS de respaldo cuando una alerta crítica no se entrega.",
                      })}
                      checked={!!settings.critical_alert_sms_fallback}
                      onChange={(v) => patch("critical_alert_sms_fallback", v)}
                      disabled={!settings.sms_enabled}
                    />
                  </CardContent>
                </Card>
              )}

              {/* OTP / routing preferences */}
              {settings && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Smartphone size={18} style={{ color: GOLD }} />
                      {t("comms.routingTitle", { defaultValue: "Preferencias de enrutamiento" })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <Label className="text-xs">
                          {t("comms.otpChannel", { defaultValue: "Canal preferido para OTP" })}
                        </Label>
                        <select
                          value={settings.otp_preferred_channel}
                          onChange={(e) => patch("otp_preferred_channel", e.target.value)}
                          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                        >
                          <option value="whatsapp">WhatsApp</option>
                          <option value="sms">SMS</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs">
                          {t("comms.defaultCountry", { defaultValue: "Código de país por defecto" })}
                        </Label>
                        <Input
                          value={settings.default_country_code || ""}
                          onChange={(e) => patch("default_country_code", e.target.value)}
                          placeholder="+593"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">
                          {t("comms.lowThreshold", { defaultValue: "Umbral de saldo bajo (USD)" })}
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={
                            settings.low_balance_threshold != null
                              ? settings.low_balance_threshold / 100
                              : 0
                          }
                          onChange={(e) =>
                            patch(
                              "low_balance_threshold",
                              Math.round(Number(e.target.value) * 100) || 0,
                            )
                          }
                        />
                      </div>
                    </div>

                    <ToggleRow
                      title={t("comms.walletRequired", {
                        defaultValue: "Requerir saldo para canales con costo",
                      })}
                      desc={t("comms.walletRequiredDesc", {
                        defaultValue: "Bloquea WhatsApp/SMS cuando no hay saldo suficiente.",
                      })}
                      checked={!!settings.wallet_required_for_paid_channels}
                      onChange={(v) => patch("wallet_required_for_paid_channels", v)}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Meta WhatsApp (non-secret) + webhook status */}
              {settings && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Radio size={18} style={{ color: GOLD }} />
                      {t("comms.metaTitle", { defaultValue: "WhatsApp (Meta Cloud API)" })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
                      <div className="flex items-center gap-2 text-sm">
                        {webhookReady ? (
                          <CheckCircle2 size={16} className="text-green-600" />
                        ) : (
                          <XCircle size={16} className="text-muted-foreground" />
                        )}
                        <span className="font-medium text-foreground">
                          {t("comms.webhookStatus", { defaultValue: "Estado del webhook" })}
                        </span>
                      </div>
                      <Badge
                        className={
                          webhookReady
                            ? "border-green-200 bg-green-500/15 text-green-700"
                            : "border-amber-200 bg-amber-500/15 text-amber-700"
                        }
                        variant="outline"
                      >
                        {webhookReady
                          ? t("comms.webhookReady", { defaultValue: "Configurado" })
                          : t("comms.webhookPending", { defaultValue: "Pendiente" })}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <Label className="text-xs">
                          {t("comms.phoneNumberId", { defaultValue: "Phone Number ID" })}
                        </Label>
                        <Input
                          value={settings.meta_phone_number_id || ""}
                          onChange={(e) => patch("meta_phone_number_id", e.target.value)}
                          placeholder="1234567890"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">
                          {t("comms.businessAccountId", {
                            defaultValue: "Business Account ID",
                          })}
                        </Label>
                        <Input
                          value={settings.meta_business_account_id || ""}
                          onChange={(e) => patch("meta_business_account_id", e.target.value)}
                          placeholder="9876543210"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("comms.metaSecretsHint", {
                        defaultValue:
                          "El token de acceso y el secreto de la app se configuran de forma segura en la plataforma y nunca se muestran aquí.",
                      })}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Save bar */}
              <div className="flex items-center justify-end gap-3">
                {dirty && (
                  <span className="text-xs text-amber-700">
                    {t("comms.unsaved", { defaultValue: "Cambios sin guardar" })}
                  </span>
                )}
                <Button
                  onClick={onSave}
                  disabled={saving || !dirty}
                  className="text-white"
                  style={{ backgroundColor: GOLD }}
                >
                  {saving ? (
                    <Loader2 className="mr-2 animate-spin" size={16} />
                  ) : (
                    <Save className="mr-2" size={16} />
                  )}
                  {t("comms.save", { defaultValue: "Guardar cambios" })}
                </Button>
              </div>

              {/* Usage / logs */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ListFilter size={18} style={{ color: GOLD }} />
                    {t("comms.usageTitle", { defaultValue: "Historial de uso" })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Cost summary */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs text-muted-foreground">
                        {t("comms.sumMessages", { defaultValue: "Mensajes (página)" })}
                      </p>
                      <p className="text-lg font-semibold text-foreground">{costSummary.count}</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs text-muted-foreground">
                        {t("comms.sumPaid", { defaultValue: "Con costo" })}
                      </p>
                      <p className="text-lg font-semibold text-foreground">{costSummary.paid}</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs text-muted-foreground">
                        {t("comms.sumBilled", { defaultValue: "Facturado" })}
                      </p>
                      <p className="text-lg font-semibold text-foreground">
                        {money(costSummary.billed || costSummary.estimate, costSummary.currency)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs text-muted-foreground">
                        {t("comms.sumFailed", { defaultValue: "Fallidos" })}
                      </p>
                      <p className="text-lg font-semibold text-foreground">{costSummary.failed}</p>
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <div>
                      <Label className="text-xs">{t("comms.fChannel", { defaultValue: "Canal" })}</Label>
                      <select
                        value={filters.channel || ""}
                        onChange={(e) => setFilter("channel", e.target.value)}
                        className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
                      >
                        <option value="">{t("comms.all", { defaultValue: "Todos" })}</option>
                        {CHANNEL_OPTIONS.map((c) => (
                          <option key={c} value={c}>
                            {CHANNEL_LABELS[c] || c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">{t("comms.fProvider", { defaultValue: "Proveedor" })}</Label>
                      <select
                        value={filters.provider || ""}
                        onChange={(e) => setFilter("provider", e.target.value)}
                        className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
                      >
                        <option value="">{t("comms.all", { defaultValue: "Todos" })}</option>
                        {PROVIDER_OPTIONS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">{t("comms.fStatus", { defaultValue: "Estado" })}</Label>
                      <select
                        value={filters.status || ""}
                        onChange={(e) => setFilter("status", e.target.value)}
                        className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
                      >
                        <option value="">{t("comms.all", { defaultValue: "Todos" })}</option>
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">{t("comms.fType", { defaultValue: "Tipo" })}</Label>
                      <select
                        value={filters.type || ""}
                        onChange={(e) => setFilter("type", e.target.value)}
                        className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
                      >
                        <option value="">{t("comms.all", { defaultValue: "Todos" })}</option>
                        {TYPE_OPTIONS.map((ty) => (
                          <option key={ty} value={ty}>
                            {ty}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">{t("comms.fFrom", { defaultValue: "Desde" })}</Label>
                      <Input
                        type="date"
                        value={filters.from || ""}
                        onChange={(e) => setFilter("from", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">{t("comms.fTo", { defaultValue: "Hasta" })}</Label>
                      <Input
                        type="date"
                        value={filters.to || ""}
                        onChange={(e) => setFilter("to", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={applyFilters} className="text-white" style={{ backgroundColor: GOLD }}>
                      <ListFilter size={14} className="mr-1.5" />
                      {t("comms.applyFilters", { defaultValue: "Filtrar" })}
                    </Button>
                    <Button size="sm" variant="outline" onClick={clearFilters}>
                      {t("comms.clearFilters", { defaultValue: "Limpiar" })}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => loadLogs()}>
                      <RefreshCw size={14} className="mr-1.5" />
                      {t("comms.refresh", { defaultValue: "Actualizar" })}
                    </Button>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto rounded-lg border">
                    {logsLoading ? (
                      <div className="flex min-h-[140px] items-center justify-center">
                        <Loader2 className="animate-spin" size={22} style={{ color: GOLD }} />
                      </div>
                    ) : !logsResult || logsResult.rows.length === 0 ? (
                      <p className="py-10 text-center text-sm text-muted-foreground">
                        {t("comms.noLogs", { defaultValue: "Sin registros para los filtros aplicados." })}
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("comms.colDate", { defaultValue: "Fecha" })}</TableHead>
                            <TableHead>{t("comms.colChannel", { defaultValue: "Canal" })}</TableHead>
                            <TableHead>{t("comms.colType", { defaultValue: "Tipo" })}</TableHead>
                            <TableHead>{t("comms.colRecipient", { defaultValue: "Destinatario" })}</TableHead>
                            <TableHead>{t("comms.colStatus", { defaultValue: "Estado" })}</TableHead>
                            <TableHead className="text-right">
                              {t("comms.colCost", { defaultValue: "Costo" })}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {logsResult.rows.map((row: CommunicationLog) => (
                            <TableRow key={row.id}>
                              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                                {fmtDate(row.createdAt)}
                              </TableCell>
                              <TableCell className="text-sm">
                                {CHANNEL_LABELS[row.channel] || row.channel}
                                <span className="ml-1 text-xs text-muted-foreground">{row.provider}</span>
                              </TableCell>
                              <TableCell className="text-xs">{row.messageType}</TableCell>
                              <TableCell className="max-w-[160px] truncate text-xs" title={row.recipient}>
                                {row.recipient}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={STATUS_STYLES[row.status] || ""}
                                  title={row.errorMessage || undefined}
                                >
                                  {row.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right text-xs">
                                {row.billedAmountCents != null
                                  ? money(row.billedAmountCents, row.currency || currency)
                                  : row.costEstimateCents != null
                                  ? money(row.costEstimateCents, row.currency || currency)
                                  : "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>

                  {/* Pagination */}
                  {logsResult && logsResult.totalPages > 1 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {t("comms.pageOf", {
                          defaultValue: "Página {{page}} de {{total}} · {{count}} registros",
                          page: logsResult.page,
                          total: logsResult.totalPages,
                          count: logsResult.count,
                        })}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={logsResult.page <= 1 || logsLoading}
                          onClick={() => goPage(logsResult.page - 1)}
                        >
                          {t("comms.prev", { defaultValue: "Anterior" })}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={logsResult.page >= logsResult.totalPages || logsLoading}
                          onClick={() => goPage(logsResult.page + 1)}
                        >
                          {t("comms.next", { defaultValue: "Siguiente" })}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </SettingsLayout>
    </AppLayout>
  );
}
