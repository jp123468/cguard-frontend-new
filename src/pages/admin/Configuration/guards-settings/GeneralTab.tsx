import { RowCheck, LabeledSelect } from "./parts";

export default function GeneralTab() {
  return (
    <div className="space-y-6">
      <RowCheck label="Habilitar aprobación automática de informes" />
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

      <RowCheck label="Permitir que el guardia envíe informes por correo electrónico" />
      <RowCheck label="Deshabilitar creación de chats grupales e individuales para los guardias" />
      <RowCheck label="Permitir que el guardia vea informes enviados por otros guardias" defaultChecked />
      <RowCheck label="Permitir al guardia subir medios desde la galería" defaultChecked />
      <RowCheck label="Forzar al guardia a reconocer y firmar documentos y políticas de la empresa antes de usar la aplicación." />
      <RowCheck label="Permitir a los guardias crear tareas para sí mismos en la aplicación móvil" />
      <RowCheck label="Activar alerta de caída del guardia/dispositivo en la aplicación móvil" />
    </div>
  );
}
