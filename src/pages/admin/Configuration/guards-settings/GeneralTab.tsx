import { Settings, MapPin, MessageSquare } from "lucide-react";
import { Section, Stagger } from "@/components/kit";
import { RowCheck, LabeledSelect } from "./parts";

export default function GeneralTab() {
  return (
    <Stagger className="grid gap-6">
      <Section title="Informes y permisos" icon={<Settings />}>
        <div className="space-y-3">
          <RowCheck label="Habilitar aprobación automática de informes" />
          <RowCheck label="Permitir que el vigilante envíe informes por correo electrónico" />
          <RowCheck label="Permitir que el vigilante vea informes enviados por otros vigilantes" defaultChecked />
          <RowCheck label="Permitir al vigilante subir medios desde la galería" defaultChecked />
        </div>
      </Section>

      <Section title="Seguimiento GPS" icon={<MapPin />}>
        <div className="space-y-3">
          <RowCheck label="Habilitar Seguimiento GPS" defaultChecked />
          <div className="grid gap-4 sm:grid-cols-2">
            <LabeledSelect
              label="Actualizar ubicación cada"
              defaultValue="00:05:00"
              items={[
                { value: "00:01:00", label: "00:01:00" },
                { value: "00:05:00", label: "00:05:00" },
                { value: "00:10:00", label: "00:10:00" },
                { value: "00:15:00", label: "00:15:00" },
              ]}
            />
            <LabeledSelect
              label="Seleccionar Precisión"
              defaultValue="media"
              items={[
                { value: "baja", label: "Baja" },
                { value: "media", label: "Media" },
                { value: "alta", label: "Alta" },
              ]}
            />
          </div>
          <LabeledSelect
            label="Habilitar alerta de inactividad después de"
            defaultValue="00:20"
            items={[
              { value: "00:10", label: "00:10" },
              { value: "00:15", label: "00:15" },
              { value: "00:20", label: "00:20" },
              { value: "00:30", label: "00:30" },
            ]}
          />
        </div>
      </Section>

      <Section title="App móvil y comportamiento" icon={<MessageSquare />}>
        <div className="space-y-3">
          <RowCheck label="Deshabilitar creación de chats grupales e individuales para los vigilantes" />
          <RowCheck label="Forzar al vigilante a reconocer y firmar documentos y políticas de la empresa antes de usar la aplicación." />
          <RowCheck label="Permitir a los vigilantes crear tareas para sí mismos en la aplicación móvil" />
          <RowCheck label="Activar alerta de caída del vigilante/dispositivo en la aplicación móvil" />
        </div>
      </Section>
    </Stagger>
  );
}
