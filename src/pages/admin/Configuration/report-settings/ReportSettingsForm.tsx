import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function ReportSettingsForm() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <RowCheck label="Eliminar el nombre del cliente de los informes al enviar por correo/exportar/imprimir" />
        <RowCheck label="Eliminar el nombre del sitio de publicación de los informes al enviar por correo/exportar/imprimir" />
        <RowCheck label="Eliminar el nombre del guardia de los informes al enviar por correo/exportar/imprimir" />
        <RowCheck label="Agregar punto de control del recorrido al informe DAR" />
      </div>

      <div className="space-y-4">
        <div className="text-sm font-semibold">Encabezado Predeterminado</div>
        <RowCheck label="Nombre de la Empresa" defaultChecked />
        <RowCheck label="Correo Electrónico de la Empresa" defaultChecked />
        <RowCheck label="Dirección de la Empresa" defaultChecked />
        <RowCheck label="Número de Licencia de la Empresa" defaultChecked />
        <RowCheck label="Sitio Web de la Empresa" defaultChecked />
        <RowCheck label="Teléfono de la Empresa" defaultChecked />
      </div>

      <div className="space-y-2">
        <Label>Pie de Página Predeterminado</Label>
        <Textarea placeholder="Escribir Aquí..." rows={5} />
      </div>

      <div className="flex justify-end">
        <Button>Guardar Configuración</Button>
      </div>
    </div>
  );
}

function RowCheck({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-3">
      <Checkbox defaultChecked={defaultChecked} />
      <span className="text-sm">{label}</span>
    </label>
  );
}
