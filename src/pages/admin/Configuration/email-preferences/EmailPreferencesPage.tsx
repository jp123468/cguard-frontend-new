import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Save, Mail, Lock } from "lucide-react";

import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader, Section, SkeletonCards } from "@/components/kit";
import {
  emailPreferencesService,
  EmailCatalogItem,
} from "@/lib/api/emailPreferencesService";

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

export default function EmailPreferencesPage() {
  const { t } = useTranslation();
  const [catalog, setCatalog] = useState<EmailCatalogItem[]>([]);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    emailPreferencesService
      .get()
      .then((res) => {
        setCatalog(res.catalog || []);
        setPrefs(res.preferences || {});
      })
      .catch(() =>
        toast.error(t("emailPreferences.loadError", { defaultValue: "No se pudieron cargar las preferencias" })),
      )
      .finally(() => setLoading(false));
  }, []);

  // Group catalog items by category, preserving order.
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

  const setPref = (key: string, value: boolean) =>
    setPrefs((p) => ({ ...p, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      // Only send non-locked keys.
      const payload: Record<string, boolean> = {};
      for (const item of catalog) {
        if (!item.locked) payload[item.key] = prefs[item.key] !== false;
      }
      const res = await emailPreferencesService.update(payload);
      setCatalog(res.catalog || catalog);
      setPrefs(res.preferences || prefs);
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
        <PageContainer width="narrow">
          <PageHeader
            icon={<Mail />}
            title={t("settings.configuracion.preferencias-correo", { defaultValue: "Preferencias de correo" })}
            subtitle={t("emailPreferences.intro", {
              defaultValue:
                "Activa o desactiva cada correo que envía la plataforma. Los correos marcados como \"Requerido\" no se pueden desactivar por seguridad.",
            })}
          />

          {loading ? (
            <SkeletonCards count={4} />
          ) : (
            <div className="space-y-6">
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

              <div className="flex justify-end">
                <Button onClick={save} disabled={saving} variant="brand">
                  {saving ? <Loader2 className="mr-2 animate-spin" size={16} /> : <Save className="mr-2" size={16} />}
                  {t("emailPreferences.save", { defaultValue: "Guardar preferencias" })}
                </Button>
              </div>
            </div>
          )}
        </PageContainer>
      </SettingsLayout>
    </AppLayout>
  );
}
