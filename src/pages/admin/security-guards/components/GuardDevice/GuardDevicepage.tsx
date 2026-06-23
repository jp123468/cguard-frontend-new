import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Smartphone, ShieldCheck, AlertTriangle, RotateCcw, Loader2, BellRing } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import GuardsLayout from '@/layouts/GuardsLayout';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import guardDeviceService, { GuardDevice } from '@/lib/api/guardDeviceService';

type Props = { guard?: any };

function fmt(dt: string | null): string {
  if (!dt) return '—';
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return '—';
  }
}

export default function GuardDevicePage({ guard }: Props) {
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
      <GuardsLayout navKey="keep-safe" title="guards.nav.dispositivo">
        <div className="p-4 sm:p-6 space-y-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
                {t('guards.device.title', { defaultValue: 'Dispositivo del vigilante' })}
              </h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                {t('guards.device.subtitle', {
                  defaultValue:
                    'El primer dispositivo desde el que el vigilante inicia sesión queda vinculado. Si aparece otro dispositivo, se marca como no reconocido (no se bloquea). Restablece el vínculo si el vigilante cambió de teléfono.',
                })}
              </p>
            </div>
            {flaggedCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 text-red-700 border border-red-200 px-3 py-1 text-xs font-semibold">
                <AlertTriangle className="h-3.5 w-3.5" />
                {t('guards.device.flaggedBadge', {
                  defaultValue: '{{n}} no reconocido(s)',
                  n: flaggedCount,
                })}
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-10 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('common.loading', { defaultValue: 'Cargando…' })}
            </div>
          ) : devices.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
              <Smartphone className="h-8 w-8 mx-auto mb-2 opacity-50" />
              {t('guards.device.empty', {
                defaultValue: 'Aún no se ha registrado ningún dispositivo para este vigilante.',
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Bound device */}
              {bound && <DeviceCard device={bound} onReset={reset} resetting={resetting === bound.id} t={t} />}

              {/* Other (unrecognized) devices */}
              {others.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-2">
                    {t('guards.device.otherDevices', { defaultValue: 'Otros dispositivos' })}
                  </p>
                  {others.map((d) => (
                    <DeviceCard key={d.id} device={d} onReset={reset} resetting={resetting === d.id} t={t} />
                  ))}
                </div>
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
      className={`rounded-xl border p-4 ${
        device.flagged
          ? 'border-red-200 bg-red-50/40'
          : device.isBound
            ? 'border-emerald-200 bg-emerald-50/30'
            : 'border-border'
      }`}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium truncate">{name}</span>
            {device.isBound && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[11px] font-semibold">
                <ShieldCheck className="h-3 w-3" />
                {t('guards.device.bound', { defaultValue: 'Vinculado' })}
              </span>
            )}
            {device.flagged && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[11px] font-semibold">
                <AlertTriangle className="h-3 w-3" />
                {t('guards.device.unrecognized', { defaultValue: 'No reconocido' })}
              </span>
            )}
            {device.hasPush && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[11px] font-medium">
                <BellRing className="h-3 w-3" />
                push
              </span>
            )}
          </div>
          <dl className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <Field label={t('guards.device.platform', { defaultValue: 'Plataforma' })} value={device.platform} />
            <Field label={t('guards.device.os', { defaultValue: 'Sistema' })} value={device.osVersion} />
            <Field label={t('guards.device.appVersion', { defaultValue: 'Versión app' })} value={device.appVersion} />
            <Field label={t('guards.device.lastSeen', { defaultValue: 'Visto' })} value={fmt(device.lastSeenAt)} />
            {device.flagged && (
              <Field
                label={t('guards.device.lastMismatch', { defaultValue: 'Última anomalía' })}
                value={fmt(device.lastMismatchAt)}
              />
            )}
            <Field label="ID" value={device.deviceId} mono />
          </dl>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onReset(device)}
          disabled={resetting}
          className="shrink-0"
        >
          {resetting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" />
          )}
          <span className="ml-1.5">{t('guards.device.reset', { defaultValue: 'Restablecer vínculo' })}</span>
        </Button>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wide opacity-70">{label}</dt>
      <dd className={`truncate ${mono ? 'font-mono text-[11px]' : ''}`}>{value || '—'}</dd>
    </div>
  );
}
