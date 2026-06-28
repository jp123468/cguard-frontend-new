import SectionBar from "@/components/section-bar";
import SubSidebar from "@/components/sub-sidebar";
import { useEffect, useRef, useState } from "react";

export default function SettingsLayout({
  navKey,
  title,
  children,
}: {
  navKey: "configuracion" | "suscripcion" | string;
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setOpen(window.innerWidth >= 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Al cambiar la opción (navKey) cerramos ambos en móvil; en desktop no modificamos
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth < 1024) {
      setOpen(false);
    }
  }, [navKey]);

  const handleHamburger = () => setOpen((v) => !v);

  return (
    <div className="relative flex h-[calc(100vh-56px)] overflow-hidden bg-muted/20">
      {/* Sidebar desktop */}
      <aside
        className={[
          "hidden lg:block shrink-0 overflow-hidden bg-card transition-[width] duration-300",
          open ? "w-64 border-r border-border/70 shadow-sm" : "w-0 border-transparent",
        ].join(" ")}
      >
        {open && (
          <div className="sticky top-0 h-full">
            <SubSidebar navKey={navKey} heightOffset={0} className="h-full" />
          </div>
        )}
      </aside>

      {/* Columna principal */}
      <div className="flex-1 min-w-0 flex flex-col">
        <SectionBar title={title} onHamburger={handleHamburger} />

        {/* ✅ scroll solo aquí */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">{children}</div>
        </div>
      </div>

      {/* Drawer móvil */}
      <div
        className={[
          "fixed left-0 top-0 z-[60] w-64 h-screen bg-card border-r border-border/70 shadow-xl lg:hidden transform transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <SubSidebar navKey={navKey} heightOffset={0} className="h-full" />
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}
