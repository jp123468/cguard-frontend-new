import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Smartphone, ShieldCheck, AlertTriangle, RotateCcw, Loader2, BellRing, Clock } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import GuardsLayout from '@/layouts/GuardsLayout';
import { toast } from 'sonner';
import guardDeviceService, { GuardDevice } from '@/lib/api/guardDeviceService';
import type { GuardDetail } from '../../guardDetailTypes';

// navKey/title default to the guard layout; a supervisor route can override them
// to render the same device screen under the supervisor sidebar (the device
// endpoint is user-keyed, so it works for any user id).
type Props = { guard?: GuardDetail; navKey?: string; title?: string };

const GOLD = '#C8860A';

function fmt(dt: string | null): string {
  if (!dt) return '—';
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return '—';
  }
}

// ── Small presentational helpers ────────────────────────────────────────────
const Section = ({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="bg-card border rounded-2xl p-5 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <h4 className="font-semibold text-sm tracking-tight">{title}</h4>
      </div>
      {action}
    </div>
    {children}
  </div>
);

export default function GuardDevicePage({ guard, navKey = 'keep-safe', title = 'guards.nav.dispositivo' }: Props) {
  const { id } = useParams();
  const { t } = useTranslation();
  const userId = guard?.userId || guard?.user?.id || (id as string);

  const [devices, setDevices] = useState<GuardDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      setDevices(await guardDeviceService.list(userId));
    } catch (e) {
      console.error('load guard devices', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const reset = async (d: GuardDevice) => {
    setResetting(d.id);
    try {
      await guardDeviceService.resetBinding(d.id);
      toast.success(
        t('guards.device.resetDone', {
          defaultValue: 'Vínculo restablecido. El próximo dispositivo del vigilante quedará vinculado.',
        }),
      );
      await load();
    } catch (e) {
      toast.error(t('guards.device.resetError', { defaultValue: 'No se pudo restablecer el vínculo.' }));
    } finally {
      setResetting(null);
    }
  };

  const bound = devices.find((d) => d.isBound) || null;
  const others = devices.filter((d) => !d.isBound);
  const flaggedCount = devices.filter((d) => d.flagged).length;

  return (
    <AppLayout>
      <GuardsLayout navKey={navKey} title={title}>
        <div className="mx-auto max-w-5xl space-y-6 pb-12">
          {/* ── HERO ─────────────────────────────────────────────────────────── */}
          <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card to-muted/40 shadow-sm">
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-r from-primary/15 to-transparent" />
            <div className="relative p-6 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-muted ring-4 ring-background flex items-center justify-center shadow-md shrink-0">
                <Smartphone className="w-7 h-7" style={{ color: GOLD }} />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold tracking-tight">
                  {t('guards.device.title', { defaultValue: 'Dispositivo del vigilante' })}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
                  {t('guards.device.subtitle', {
                    defaultValue:
                      'El primer dispositivo desde el que el vigilante inicia sesión queda vinculado. Si aparece otro dispositivo, se marca como no reconocido (no se bloquea). Restablece el vínculo si el vigilante cambió de teléfono.',
                  })}
                </p>
                {(devices.length > 0 || flaggedCount > 0) && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {devices.length > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-foreground/70">
                        <Smartphone className="w-3 h-3" />
                        {t('guards.device.deviceCount', {
                          defaultValue: '{{n}} dispositivo(s)',
                          n: devices.length,
                        })}
                      </span>
                    )}
                    {flaggedCount > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        {t('guards.device.flaggedBadge', {
                          defaultValue: '{{n}} no reconocido(s)',
                          n: flaggedCount,
                        })}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── BODY ─────────────────────────────────────────────────────────── */}
          {loading ? (
            <div className="bg-card border rounded-2xl p-12 shadow-sm flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('common.loading', { defaultValue: 'Cargando…' })}
            </div>
          ) : devices.length === 0 ? (
            <div className="bg-card border rounded-2xl p-12 shadow-sm text-center">
              <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <Smartphone className="h-7 w-7 text-muted-foreground opacity-60" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {t('guards.device.emptyTitle', { defaultValue: 'Sin dispositivos todavía' })}
              </p>
              <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
                {t('guards.device.empty', {
                  defaultValue: 'Aún no se ha registrado ningún dispositivo para este vigilante.',
                })}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Bound device */}
              {bound && (
                <Section
                  title={t('guards.device.boundDevice', { defaultValue: 'Dispositivo vinculado' })}
                  icon={<ShieldCheck className="w-4 h-4" />}
                >
                  <DeviceCard device={bound} onReset={reset} resetting={resetting === bound.id} t={t} />
                </Section>
              )}

              {/* Other (unrecognized) devices */}
              {others.length > 0 && (
                <Section
                  title={t('guards.device.otherDevices', { defaultValue: 'Otros dispositivos' })}
                  icon={<Smartphone className="w-4 h-4" />}
                >
                  <div className="space-y-3">
                    {others.map((d) => (
                      <DeviceCard key={d.id} device={d} onReset={reset} resetting={resetting === d.id} t={t} />
                    ))}
                  </div>
                </Section>
              )}
            </div>
          )}
        </div>
      </GuardsLayout>
    </AppLayout>
  );
}

function DeviceCard({
  device,
  onReset,
  resetting,
  t,
}: {
  device: GuardDevice;
  onReset: (d: GuardDevice) => void;
  resetting: boolean;
  t: any;
}) {
  const name =
    [device.manufacturer, device.model].filter(Boolean).join(' ') ||
    device.platform ||
    t('guards.device.unknownDevice', { defaultValue: 'Dispositivo desconocido' });

  return (
    <div
      className={`rounded-xl border p-4 transition hover:shadow-sm ${
        device.flagged
          ? 'border-red-500/30 bg-red-500/[0.04]'
          : device.isBound
            ? 'border-green-500/30 bg-green-500/[0.04]'
            : 'border-border bg-background'
      }`}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${
                device.isBound ? 'bg-green-500/15 text-green-700' : 'bg-muted text-muted-foreground'
              }`}
            >
              <Smartphone className="h-4 w-4" />
            </span>
            <span className="font-semibold text-sm truncate">{name}</span>
            {device.isBound && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/15 text-green-700 text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                {t('guards.device.bound', { defaultValue: 'Vinculado' })}
              </span>
            )}
            {device.flagged && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 text-red-700 text-[11px] font-semibold">
                <AlertTriangle className="h-3 w-3" />
                {t('guards.device.unrecognized', { defaultValue: 'No reconocido' })}
              </span>
            )}
            {device.hasPush && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px] font-medium">
                <BellRing className="h-3 w-3" />
                push
              </span>
            )}
          </div>
          <dl className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2.5">
            <Field label={t('guards.device.platform', { defaultValue: 'Plataforma' })} value={device.platform} />
            <Field label={t('guards.device.os', { defaultValue: 'Sistema' })} value={device.osVersion} />
            <Field label={t('guards.device.appVersion', { defaultValue: 'Versión app' })} value={device.appVersion} />
            <Field
              label={t('guards.device.lastSeen', { defaultValue: 'Visto' })}
              value={fmt(device.lastSeenAt)}
              icon={<Clock className="h-3 w-3 opacity-60" />}
            />
            {device.flagged && (
              <Field
                label={t('guards.device.lastMismatch', { defaultValue: 'Última anomalía' })}
                value={fmt(device.lastMismatchAt)}
              />
            )}
            <Field label="ID" value={device.deviceId} mono />
          </dl>
        </div>
        <button
          onClick={() => onReset(device)}
          disabled={resetting}
          className="shrink-0 inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg border hover:bg-muted transition disabled:opacity-50"
        >
          {resetting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" />
          )}
          {t('guards.device.reset', { defaultValue: 'Restablecer vínculo' })}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  icon,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">{label}</dt>
      <dd className={`flex items-center gap-1 font-medium text-sm text-foreground truncate ${mono ? 'font-mono text-[12px]' : ''}`}>
        {icon}
        <span className="truncate">{value || '—'}</span>
      </dd>
    </div>
  );
}
