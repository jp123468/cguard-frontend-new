import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Save, Mail, Lock, Palette, RotateCcw, Eye } from "lucide-react";

import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader, Section, SkeletonCards } from "@/components/kit";
import {
  emailPreferencesService,
  EmailCatalogItem,
  EmailBranding,
} from "@/lib/api/emailPreferencesService";

const DEFAULT_BRAND = "#C8860A";
const DEFAULT_HEADER = "#0A0E16";
const PRESET_BRANDS = ["#C8860A", "#1E63C8", "#0E9F6E", "#DC2626", "#7C3AED", "#0891B2"];
const PRESET_HEADERS = ["#0A0E16", "#1F2937", "#0F3D2E", "#1E293B", "#3B1D5E"];

function ToggleRow({ item, checked, onCheckedChange }: {
  item: EmailCatalogItem;
  checked: boolean;
  onCheckedChange: (b: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">{item.label}</Label>
          {item.locked && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              <Lock size={10} /> Requerido
            </span>
          )}
        </div>
        {item.description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
        )}
      </div>
      <Switch
        checked={checked}
        disabled={item.locked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

function Swatches({ presets, value, onPick }: { presets: string[]; value: string; onPick: (c: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onPick(c)}
          aria-label={`Color ${c}`}
          className={`h-9 w-9 rounded-full border-2 transition-transform hover:scale-110 ${value.toLowerCase() === c.toLowerCase() ? "border-foreground scale-110" : "border-transparent"}`}
          style={{ background: c }}
        />
      ))}
      <label className="ml-1 flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted">
        <input
          type="color"
          value={value}
          onChange={(e) => onPick(e.target.value)}
          className="h-6 w-8 cursor-pointer border-0 bg-transparent p-0"
        />
        Personalizado
      </label>
    </div>
  );
}

export default function EmailPreferencesPage() {
  const { t } = useTranslation();
  const [catalog, setCatalog] = useState<EmailCatalogItem[]>([]);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [branding, setBranding] = useState<EmailBranding>({ brandColor: DEFAULT_BRAND, headerColor: DEFAULT_HEADER });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLoading(true);
    emailPreferencesService
      .get()
      .then((res) => {
        setCatalog(res.catalog || []);
        setPrefs(res.preferences || {});
        if (res.branding) {
          setBranding({
            brandColor: res.branding.brandColor || DEFAULT_BRAND,
            headerColor: res.branding.headerColor || DEFAULT_HEADER,
          });
        }
      })
      .catch(() =>
        toast.error(t("emailPreferences.loadError", { defaultValue: "No se pudieron cargar las preferencias" })),
      )
      .finally(() => setLoading(false));
  }, []);

  // Live preview — debounced re-render whenever the colors change.
  useEffect(() => {
    if (loading) return;
    if (previewTimer.current) clearTimeout(previewTimer.current);
    setPreviewLoading(true);
    previewTimer.current = setTimeout(() => {
      emailPreferencesService
        .preview(branding)
        .then((res) => setPreviewHtml(res.html || ""))
        .catch(() => setPreviewHtml(""))
        .finally(() => setPreviewLoading(false));
    }, 300);
    return () => { if (previewTimer.current) clearTimeout(previewTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branding.brandColor, branding.headerColor, loading]);

  const groups = useMemo(() => {
    const order: string[] = [];
    const byCat: Record<string, EmailCatalogItem[]> = {};
    for (const item of catalog) {
      if (!byCat[item.category]) {
        byCat[item.category] = [];
        order.push(item.category);
      }
      byCat[item.category].push(item);
    }
    return order.map((category) => ({ category, items: byCat[category] }));
  }, [catalog]);

  const setPref = (key: string, value: boolean) => setPrefs((p) => ({ ...p, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const payload: Record<string, boolean> = {};
      for (const item of catalog) {
        if (!item.locked) payload[item.key] = prefs[item.key] !== false;
      }
      const res = await emailPreferencesService.update(payload, branding);
      setCatalog(res.catalog || catalog);
      setPrefs(res.preferences || prefs);
      if (res.branding) setBranding({ brandColor: res.branding.brandColor, headerColor: res.branding.headerColor });
      toast.success(t("emailPreferences.saved", { defaultValue: "Preferencias guardadas" }));
    } catch (e: any) {
      toast.error(e?.message || t("emailPreferences.saveError", { defaultValue: "Error al guardar" }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <SettingsLayout navKey="configuracion" title={t("settings.configuracion.preferencias-correo", { defaultValue: "Preferencias de correo" })}>
        <PageContainer width="wide">
          <PageHeader
            icon={<Mail />}
            title={t("settings.configuracion.preferencias-correo", { defaultValue: "Preferencias de correo" })}
            subtitle={t("emailPreferences.intro", {
              defaultValue:
                "Personaliza el color de tus correos y activa o desactiva cada notificación. Los correos marcados como \"Requerido\" no se pueden desactivar por seguridad.",
            })}
            actions={
              !loading ? (
                <Button onClick={save} disabled={saving} variant="brand">
                  {saving ? <Loader2 className="mr-2 animate-spin" size={16} /> : <Save className="mr-2" size={16} />}
                  {t("emailPreferences.save", { defaultValue: "Guardar" })}
                </Button>
              ) : undefined
            }
          />

          {loading ? (
            <SkeletonCards count={4} />
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
              {/* LEFT: branding + toggles */}
              <div className="space-y-6">
                <Section title={t("emailPreferences.branding", { defaultValue: "Personalización de marca" })} icon={<Palette />}>
                  <div className="space-y-6">
                    <div>
                      <Label className="mb-2 block">{t("emailPreferences.brandColor", { defaultValue: "Color de la marca" })}</Label>
                      <Swatches presets={PRESET_BRANDS} value={branding.brandColor} onPick={(c) => setBranding((b) => ({ ...b, brandColor: c }))} />
                      <p className="mt-2 text-xs text-muted-foreground">
                        {t("emailPreferences.brandColorHint", { defaultValue: "Colorea el acento, la línea superior y el botón de acción de tus correos." })}
                      </p>
                    </div>

                    <div>
                      <Label className="mb-2 block">{t("emailPreferences.headerColor", { defaultValue: "Color del encabezado" })}</Label>
                      <Swatches presets={PRESET_HEADERS} value={branding.headerColor} onPick={(c) => setBranding((b) => ({ ...b, headerColor: c }))} />
                      <p className="mt-2 text-xs text-muted-foreground">
                        {t("emailPreferences.headerColorHint", { defaultValue: "Fondo de la cabecera (con tu logo). Se recomienda un tono oscuro para que el texto blanco se lea bien." })}
                      </p>
                    </div>

                    {(branding.brandColor.toLowerCase() !== DEFAULT_BRAND.toLowerCase() ||
                      branding.headerColor.toLowerCase() !== DEFAULT_HEADER.toLowerCase()) && (
                      <Button variant="ghost" size="sm" onClick={() => setBranding({ brandColor: DEFAULT_BRAND, headerColor: DEFAULT_HEADER })}>
                        <RotateCcw size={14} className="mr-1" /> {t("emailPreferences.reset", { defaultValue: "Restaurar colores originales" })}
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {t("emailPreferences.logoHint", { defaultValue: "El logo de tus correos es el de tu empresa. Cámbialo en Configuración › Perfil de la empresa." })}
                    </p>
                  </div>
                </Section>

                {groups.map((group) => (
                  <Section key={group.category} title={group.category} icon={<Mail />}>
                    <div className="divide-y">
                      {group.items.map((item) => (
                        <ToggleRow
                          key={item.key}
                          item={item}
                          checked={item.locked ? true : prefs[item.key] !== false}
                          onCheckedChange={(b) => setPref(item.key, b)}
                        />
                      ))}
                    </div>
                  </Section>
                ))}
              </div>

              {/* RIGHT: live preview */}
              <div className="lg:sticky lg:top-24 lg:self-start">
                <Section title={t("emailPreferences.preview", { defaultValue: "Vista previa" })} icon={<Eye />}>
                  <p className="mb-3 text-xs text-muted-foreground">
                    {t("emailPreferences.previewHint", { defaultValue: "Ejemplo de cómo se verá un correo transaccional con tu marca." })}
                  </p>
                  <div className="relative overflow-hidden rounded-xl border bg-[#eef1f5]">
                    {previewLoading && (
                      <div className="absolute right-2 top-2 z-10 rounded-full bg-white/90 p-1.5 shadow">
                        <Loader2 className="animate-spin text-primary" size={14} />
                      </div>
                    )}
                    <iframe
                      title="email-preview"
                      srcDoc={previewHtml || "<p style='font-family:sans-serif;color:#888;padding:24px'>Generando vista previa…</p>"}
                      className="h-[560px] w-full border-0"
                      sandbox=""
                    />
                  </div>
                </Section>
              </div>
            </div>
          )}
        </PageContainer>
      </SettingsLayout>
    </AppLayout>
  );
}
