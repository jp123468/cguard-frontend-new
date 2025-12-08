import SectionBar from "@/components/section-bar";
import SubSidebar from "@/components/sub-sidebar";
import { useState } from "react";

export default function SettingsLayout({
  navKey,
  title,
  children,
}: {
  navKey: "configuracion" | "suscripcion" | string;
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="relative flex h-[calc(100vh-56px)] overflow-hidden bg-white">
      {/* Sidebar desktop */}
      <aside
        className={[
          "hidden lg:block shrink-0 bg-white border-gray-200 transition-[width] duration-300",
          open ? "w-64 border-r" : "w-0 border-transparent",
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
        <SectionBar title={title} onHamburger={() => setOpen((v) => !v)} />

        {/* ✅ scroll solo aquí */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">{children}</div>
        </div>
      </div>

      {/* Drawer móvil */}
      <div
        className={[
          "fixed left-0 top-0 z-[60] w-64 h-screen bg-white border-r border-gray-200 lg:hidden transform transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <SubSidebar navKey={navKey} heightOffset={0} className="h-full" />
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[55] bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}
