import SplashScreen from "@/components/SplashScreen";
import { ReactNode, useEffect, useState } from "react";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
}

export default function AuthLayout({ children, title }: AuthLayoutProps) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <SplashScreen />;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        
        {/* LADO IZQUIERDO */}
        <div className="flex flex-col justify-center p-12 xl:p-20 bg-transparent relative">
          {/* Logo grande */}
          <div className="mb-10 flex justify-center">
            <img
              src="../assets/logo/logo.png"
              alt="CG Guard"
              width={150}
              height={150}
              className="object-contain"
            />
          </div>

          {/* Título + descripción */}
          <h1
            className="text-5xl font-bold leading-tight mb-4"
            style={{ fontFamily: "'Inter', 'SF Pro Display', sans-serif", color: "#0C2459" }}
          >
            Lleva tus operaciones de seguridad <br />
            al siguiente nivel
          </h1>

          <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
            Usando la plataforma de gestión de seguridad física <span className="font-semibold text-[#F75638]">GuardsPro</span>.
          </p>

          {/* Etiquetas */}
          <div className="flex flex-wrap gap-3">
            {["Basado en la Nube", "Seguimiento en Tiempo Real", "Analíticas"].map((tag) => (
              <span
                key={tag}
                className="rounded-full border px-4 py-2 text-sm font-medium"
                style={{
                  borderColor: "rgba(12,36,89,0.15)",
                  backgroundColor: "rgba(12,36,89,0.05)",
                  color: "#0C2459",
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Fondos decorativos suaves */}
          <div className="absolute top-20 right-20 h-64 w-64 rounded-full bg-gradient-to-br from-[#0C2459]/10 to-[#F75638]/10 blur-3xl" />
          <div className="absolute bottom-20 left-10 h-80 w-80 rounded-full bg-gradient-to-tr from-[#F75638]/10 to-[#0C2459]/10 blur-3xl" />
        </div>

        {/* LADO DERECHO - Autenticación */}
        <div className="flex items-start justify-center p-6 lg:p-12 pt-12 lg:pt-20 relative">
          <div className="w-full max-w-xl relative">
            {/* Tarjeta del formulario */}
            <div className="rounded-2xl border border-slate-200/50 bg-white/90 backdrop-blur-xl p-10 shadow-2xl dark:border-white/10 dark:bg-slate-900/80">
              <div className="mb-8">
                <h2
                  className="text-3xl font-bold"
                  style={{ fontFamily: "'Inter', 'SF Pro Display', sans-serif", color: "#F75638" }}
                >
                  {title}
                </h2>
              </div>
              {children}
            </div>

            <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
              © 2016-{new Date().getFullYear()} GUARDSPRO. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}