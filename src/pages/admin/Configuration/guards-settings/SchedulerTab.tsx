import { RowCheck, LabeledSelect } from "./parts";

export default function SchedulerTab() {
  return (
    <div className="space-y-6">
      <RowCheck label="Permitir que los guardias registren entrada antes de la hora programada" />
      <RowCheck label="Permitir que los guardias intercambien turno sin aprobación" />
      <RowCheck label="Permitir que el sistema registre automáticamente según el horario programado" />
      <RowCheck label="Permitir que el sistema salga automáticamente según el horario programado" />
      <LabeledSelect
        label="Solicite una razón para permanecer registrado cuando el turno haya terminado después"
        defaultValue="00:05"
        items={[
          { value: "00:05", label: "00:05" },
          { value: "00:10", label: "00:10" },
          { value: "00:15", label: "00:15" },
          { value: "00:30", label: "00:30" },
        ]}
      />
      <RowCheck label="Permitir que los guardias establezcan disponibilidad" defaultChecked />
      <RowCheck label="Habilitar aprobación automática de horas de disponibilidad" />
      <RowCheck label="Asignar y confirmar automáticamente el turno abierto para el primer guardia que acepte el turno" />
      <RowCheck label="Confirmar automáticamente los turnos publicados" />
      <LabeledSelect
        label="Permitir que el guardia cancele el turno antes de"
        defaultValue="00:30"
        items={[
          { value: "00:15", label: "15 minutos antes" },
          { value: "00:30", label: "30 minutos antes" },
          { value: "01:00", label: "1 hora antes" },
          { value: "02:00", label: "2 horas antes" },
        ]}
      />
    </div>
  );
}
