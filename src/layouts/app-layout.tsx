import { useEffect, useState } from "react";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { Toaster } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { setTenantId } from "@/lib/api/clientService";
import { setTenantId as setCategoryTenantId } from "@/lib/api/categoryService";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user } = useAuth();

  const toggleSidebar = () => setSidebarOpen((v) => !v);
  const closeSidebar = () => setSidebarOpen(false);

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 1023px)").matches;
    document.body.style.overflow = isMobile && sidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  // Configurar tenantId globalmente cuando el usuario cambia
  useEffect(() => {
    if (user && user.tenants && user.tenants.length > 0) {
      const tenantId = user.tenants[0].tenant.id;
      setTenantId(tenantId);
      setCategoryTenantId(tenantId);
    }
  }, [user]);


  return (
    <div className="h-screen w-full bg-gray-50">
      <div className={["sticky top-0 z-50 bg-white border-b border-gray-200 h-14 transition-[margin] duration-300", sidebarOpen ? "lg:ml-64" : "lg:ml-0"].join(" ")}>
        <Header toggleSidebar={toggleSidebar} />
      </div>

      <aside
        className={[
          "hidden lg:block fixed left-0 top-0 h-screen bg-white border-r border-gray-200 overflow-hidden transition-[width] duration-300",
          sidebarOpen ? "w-64" : "w-0",
        ].join(" ")}
      >
        <Sidebar />
      </aside>

      <div
        className={[
          "fixed left-0 top-0 z-[60] w-64 h-screen bg-white border-r border-gray-200 lg:hidden transform transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <Sidebar />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-[55] bg-black/30 lg:hidden" onClick={closeSidebar} />
      )}

      <main
        className={[
          "relative h-[calc(100vh-56px)] overflow-y-auto transition-[margin] duration-300",
          sidebarOpen ? "lg:ml-64" : "lg:ml-0",
        ].join(" ")}
      >
        {children}
      </main>

      {/* Global toaster for notifications */}
      <Toaster position="top-right" />


    </div>
  );
}
