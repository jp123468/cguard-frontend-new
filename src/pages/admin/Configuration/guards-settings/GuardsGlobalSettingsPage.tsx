import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import { PageContainer, PageHeader, FadeIn } from "@/components/kit";
import GeneralTab from "./GeneralTab";
import TimeClockTab from "./TimeClockTab";
import SchedulerTab from "./SchedulerTab";
import NotificationsTab from "./NotificationsTab";

export default function GuardsGlobalSettingsPage() {
  return (
    <AppLayout>
      <SettingsLayout navKey="configuracion" title="Configuración Global de Vigilantes">
        <PageContainer>
          <PageHeader
            icon={<ShieldCheck />}
            title="Configuración Global de Vigilantes"
            subtitle="Estas preferencias aplican a todos los vigilantes de la organización"
            badges={
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-700 dark:text-red-400">
                <AlertTriangle className="size-3.5" />
                Los cambios se reflejarán en todos los vigilantes
              </span>
            }
          />

          <FadeIn>
            <Tabs defaultValue="general" className="space-y-6">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="reloj">Reloj de Tiempo</TabsTrigger>
                <TabsTrigger value="programador">Programador</TabsTrigger>
                <TabsTrigger value="notificaciones">Notificaciones</TabsTrigger>
              </TabsList>

              <TabsContent value="general"><GeneralTab /></TabsContent>
              <TabsContent value="reloj"><TimeClockTab /></TabsContent>
              <TabsContent value="programador"><SchedulerTab /></TabsContent>
              <TabsContent value="notificaciones"><NotificationsTab /></TabsContent>
            </Tabs>
          </FadeIn>

          <div className="flex justify-end">
            <Button variant="brand">Guardar Configuración</Button>
          </div>
        </PageContainer>
      </SettingsLayout>
    </AppLayout>
  );
}
