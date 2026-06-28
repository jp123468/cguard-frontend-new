import { ReactNode } from "react";
import { MapPin, ClipboardCheck, CalendarClock, CheckCircle2, ShieldCheck } from "lucide-react";

/**
 * Tenant-branded two-panel layout for the guard invitation/registration page.
 * Unlike the shared AuthLayout (which shows the CGuardPro PLATFORM brand), this
 * shows the inviting TENANT's logo + name, so an invited guard sees the company
 * that hired them — not the platform.
 */
export default function GuardInviteLayout({
  children,
  tenantName,
  tenantLogoUrl,
  title,
  subtitle,
}: {
  children: ReactNode;
  tenantName?: string | null;
  tenantLogoUrl?: string | null;
  title: string;
  subtitle?: string;
}) {
  const company = (tenantName || "").trim() || "tu empresa de seguridad";
  const initials = (tenantName || "S")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const features = [
    { icon: MapPin, label: "Marca tu entrada y salida con geolocalización" },
    { icon: ClipboardCheck, label: "Reportes, rondas y novedades en tiempo real" },
    { icon: CalendarClock, label: "Tus turnos y horarios siempre a la mano" },
  ];

  return (
    <div className="min-h-screen w-full flex">
      {/* LEFT — tenant brand panel */}
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-3/5 flex-col justify-between p-12 xl:p-16 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #0A0E16 0%, #1C2B3A 55%, #0A0E16 100%)" }}
      >
        {/* grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(#C8860A 1px, transparent 1px), linear-gradient(90deg, #C8860A 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary opacity-10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -left-32 h-[32rem] w-[32rem] rounded-full bg-[#F5C300] opacity-5 blur-3xl pointer-events-none" />

        {/* Tenant logo / name */}
        <div className="relative z-10 flex items-center gap-3">
          {tenantLogoUrl ? (
            <img src={tenantLogoUrl} alt={company} className="h-14 max-w-[220px] object-contain" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-xl text-lg font-extrabold text-white" style={{ background: "rgba(200,134,10,0.18)", border: "1px solid rgba(200,134,10,0.35)" }}>
              {initials}
            </div>
          )}
          <span className="text-lg font-bold text-white">{tenantName || ""}</span>
        </div>

        {/* center content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-12">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest uppercase mb-8 w-fit"
            style={{ background: "rgba(200,134,10,0.15)", color: "#F5C300", border: "1px solid rgba(200,134,10,0.3)" }}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Invitación · Equipo de Seguridad
          </div>

          <h1 className="text-4xl xl:text-5xl font-extrabold leading-[1.12] text-white mb-5">
            Únete al equipo de{" "}
            <span
              className="block"
              style={{ WebkitTextFillColor: "transparent", WebkitBackgroundClip: "text", backgroundClip: "text", backgroundImage: "linear-gradient(90deg, #C8860A, #F5C300)" }}
            >
              {company}
            </span>
          </h1>

          <p className="text-base xl:text-lg text-slate-300/70 leading-relaxed max-w-md mb-10">
            Completa tu registro para empezar a operar desde la app: marca asistencia, envía reportes y consulta tus turnos.
          </p>

          <div className="flex flex-col gap-3">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0" style={{ background: "rgba(200,134,10,0.15)" }}>
                  <Icon className="h-4 w-4" style={{ color: "#F5C300" }} />
                </div>
                <span className="text-sm font-medium text-slate-300/60">{label}</span>
                <CheckCircle2 className="h-4 w-4 ml-auto shrink-0" style={{ color: "#C8860A" }} />
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-slate-400/70">Impulsado por CGuardPro</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>
      </div>

      {/* RIGHT — form */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 lg:p-12 bg-[#F8F7F4] dark:bg-slate-950 relative">
        {/* tenant brand on mobile */}
        <div className="mb-6 flex items-center gap-2 lg:hidden">
          {tenantLogoUrl ? (
            <img src={tenantLogoUrl} alt={company} className="h-10 max-w-[160px] object-contain" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-primary" style={{ background: "rgba(200,134,10,0.12)" }}>{initials}</div>
          )}
          <span className="text-base font-bold text-foreground">{tenantName || ""}</span>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-foreground dark:text-white mb-1">{title}</h2>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
