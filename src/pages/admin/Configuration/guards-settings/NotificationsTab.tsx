import { RowCheck, TimeSelect, NumberWithSuffix } from "./parts";

export default function NotificationsTab() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <RowCheck label="Enviar notificación de expiración de licencia antes de" defaultChecked />
        <NumberWithSuffix label="" defaultValue={60} suffix="Día" />
      </div>

      <div className="space-y-3">
        <RowCheck label="Enviar notificación de inicio de patrulla vehicular antes de" />
        <div className="max-w-xs"><TimeSelect defaultValue="01:00" /></div>
      </div>

      <div className="space-y-3">
        <RowCheck label="Enviar notificación de retraso en la ruta de patrulla vehicular" />
        <div className="max-w-xs"><TimeSelect defaultValue="00:15" /></div>
      </div>

      <div className="space-y-3">
        <RowCheck label="Notificación de inicio de tarea/recorrido antes" defaultChecked />
        <div className="max-w-xs"><TimeSelect defaultValue="00:15" /></div>
      </div>

      <div className="space-y-3">
        <RowCheck label="Enviar notificación de retraso de tarea/recorrido después" defaultChecked />
        <div className="max-w-xs"><TimeSelect defaultValue="00:05" /></div>
      </div>

      <div className="space-y-3">
        <RowCheck label="Enviar notificación de inicio de turno antes" defaultChecked />
        <div className="max-w-xs"><TimeSelect defaultValue="01:00" /></div>
      </div>

      <div className="space-y-3">
        <RowCheck label="Enviar notificación de retraso de turno" defaultChecked />
        <div className="max-w-xs"><TimeSelect defaultValue="00:15" /></div>
      </div>
    </div>
  );
}
