import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import GeneralTab from "./GeneralTab";
import TimeClockTab from "./TimeClockTab";
import SchedulerTab from "./SchedulerTab";
import NotificationsTab from "./NotificationsTab";

export default function GuardsGlobalSettingsPage() {
  return (
    <AppLayout>
      <SettingsLayout navKey="configuracion" title="Configuración Global de Guardias">
        <div className="text-sm font-semibold text-red-600 mb-4">
          Los cambios se reflejarán en todos los guardias
        </div>

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

        <div className="mt-8 flex justify-end">
          <Button>Guardar Configuración</Button>
        </div>
      </SettingsLayout>
    </AppLayout>
  );
}
