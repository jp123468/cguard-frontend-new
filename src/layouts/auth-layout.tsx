import SplashScreen from "@/components/SplashScreen";
import { ReactNode, useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { Shield, Clock, BarChart3, CheckCircle2, MapPin, AlertTriangle } from "lucide-react";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  /**
   * 'field' renders the guard-app variant (used by the worker-app password-reset
   * link) so field users see app-focused content, not the tenant platform
   * marketing. Defaults to the standard admin/tenant variant.
   */
  variant?: 'admin' | 'field';
  /** Optional override for the right-side subtitle under the page title. */
  subtitle?: string;
}

export default function AuthLayout({ children, title, variant = 'admin', subtitle }: AuthLayoutProps) {
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <SplashScreen />;

  const isField = variant === 'field';

  const features = isField
    ? [
        { icon: Clock, label: t('auth.fieldLanding.tag_clock', { defaultValue: 'Marca tu entrada y salida' }) },
        { icon: MapPin, label: t('auth.fieldLanding.tag_patrol', { defaultValue: 'Rondas y patrullajes' }) },
        { icon: AlertTriangle, label: t('auth.fieldLanding.tag_incidents', { defaultValue: 'Reporta incidentes' }) },
      ]
    : [
        { icon: Shield, label: t('auth.landing.tag_cloud') },
        { icon: Clock, label: t('auth.landing.tag_realtime') },
        { icon: BarChart3, label: t('auth.landing.tag_analytics') },
      ];

  const eyebrow = isField
    ? t('auth.fieldLanding.eyebrow', { defaultValue: 'App para Vigilantes' })
    : t('auth.landing.eyebrow', { defaultValue: 'Plataforma de Seguridad' });
  const titlePart1 = isField
    ? t('auth.fieldLanding.title_part1', { defaultValue: 'Tu turno,' })
    : t('auth.landing.title_part1');
  const titlePart2 = isField
    ? t('auth.fieldLanding.title_part2', { defaultValue: 'bajo control.' })
    : t('auth.landing.title_part2');
  const panelDesc = isField
    ? t('auth.fieldLanding.desc', { defaultValue: 'Restablece la contraseña de tu cuenta de vigilante para volver a entrar a la app C-Guard Pro.' })
    : t('auth.landing.desc', { product: 'CGUARD' });
  const formSubtitle = subtitle ?? panelDesc;

  return (
    <div className="min-h-screen w-full flex">
      {/* LADO IZQUIERDO — panel de marca oscuro */}
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-3/5 flex-col justify-between p-12 xl:p-16 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #0F1923 0%, #1C2B3A 50%, #0F1923 100%)" }}
      >
        {/* Patrón de cuadrícula sutil */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#C8860A 1px, transparent 1px), linear-gradient(90deg, #C8860A 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Orbes decorativos */}
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-[#C8860A] opacity-10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -left-32 h-[32rem] w-[32rem] rounded-full bg-[#F5C300] opacity-5 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-[#C8860A] opacity-5 blur-2xl pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10">
          <img
            src="/assets/logo/c-guard-logo.png"
            alt="C-Guard"
            className="h-16 object-contain brightness-0 invert"
          />
        </div>

        {/* Contenido central */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-12">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest uppercase mb-8 w-fit"
            style={{ background: "rgba(200,134,10,0.15)", color: "#F5C300", border: "1px solid rgba(200,134,10,0.3)" }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#F5C300] animate-pulse" />
            {eyebrow}
          </div>

          <h1 className="text-5xl xl:text-6xl font-extrabold leading-[1.1] text-white mb-6">
            {titlePart1}{" "}
            <span
              className="block"
              style={{ WebkitTextFillColor: "transparent", WebkitBackgroundClip: "text", backgroundClip: "text", backgroundImage: "linear-gradient(90deg, #C8860A, #F5C300)" }}
            >
              {titlePart2}
            </span>
          </h1>

          <p className="text-base xl:text-lg text-muted-foreground leading-relaxed max-w-md mb-10">
            {panelDesc}
          </p>

          {/* Feature pills */}
          <div className="flex flex-col gap-3">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
                  style={{ background: "rgba(200,134,10,0.15)" }}
                >
                  <Icon className="h-4 w-4" style={{ color: "#F5C300" }} />
                </div>
                <span className="text-sm font-medium text-muted-foreground/60">{label}</span>
                <CheckCircle2 className="h-4 w-4 ml-auto shrink-0" style={{ color: "#C8860A" }} />
              </div>
            ))}
          </div>
        </div>

        {/* Footer izquierdo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-muted-foreground">Seguridad Inteligente</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>
      </div>

      {/* LADO DERECHO — formulario */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 lg:p-12 bg-[#F8F7F4] dark:bg-slate-950 relative">
        {/* Logo solo en móvil */}
        <div className="mb-8 lg:hidden">
          <img src="/assets/logo/c-guard-logo.png" alt="C-Guard" className="h-12 object-contain dark:brightness-0 dark:invert" />
        </div>

        <div className="w-full max-w-md">
          {/* Encabezado de la tarjeta */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground dark:text-white mb-1">
              {title}
            </h2>
            <p className="text-sm text-muted-foreground dark:text-muted-foreground">
              {formSubtitle}
            </p>
          </div>

          {/* Tarjeta del formulario */}
          <div className="rounded-2xl bg-card dark:bg-slate-900 p-8 shadow-xl shadow-slate-200/60 dark:shadow-slate-900/60 border border-slate-100 dark:border-white/5">
            {children}
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground dark:text-muted-foreground">
            {t('auth.footer_copyright', { defaultValue: `© 2025-{{year}} CGUARD. All rights reserved.`, year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </div>
  );
}