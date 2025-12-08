// src/pages/messenger/index.tsx
import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";
import { Messenger } from "./Messenger";

export default function MessengerPage() {
  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Mensajero" },
        ]}
      />
      <Messenger
        inbox={[]}         // ← pon tus conversaciones
        archived={[]}      // ← pon tus conversaciones archivadas
        guards={[]}        // ← tus usuarios
        sites={[]}         // ← tus sitios
        // onCreateMessage, onCreateGroup, onArchive, etc...
      />
    </AppLayout>
  );
}
