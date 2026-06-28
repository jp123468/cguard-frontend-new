import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { EyeOff, LayoutPanelTop, FileText } from "lucide-react";
import { Section, Stagger } from "@/components/kit";

export default function ReportSettingsForm() {
  return (
    <Stagger className="space-y-6">
      <Section title="Privacidad en informes" icon={<EyeOff />} contentClassName="space-y-4">
        <RowCheck label="Eliminar el nombre del cliente de los informes al enviar por correo/exportar/imprimir" />
        <RowCheck label="Eliminar el nombre del Puesto de seguridad de los informes al enviar por correo/exportar/imprimir" />
        <RowCheck label="Eliminar el nombre del vigilante de los informes al enviar por correo/exportar/imprimir" />
        <RowCheck label="Agregar punto de control del recorrido al informe DAR" />
      </Section>

      <Section title="Encabezado Predeterminado" icon={<LayoutPanelTop />} contentClassName="space-y-4">
        <RowCheck label="Nombre de la Empresa" defaultChecked />
        <RowCheck label="Correo Electrónico de la Empresa" defaultChecked />
        <RowCheck label="Dirección de la Empresa" defaultChecked />
        <RowCheck label="Número de Licencia de la Empresa" defaultChecked />
        <RowCheck label="Sitio Web de la Empresa" defaultChecked />
        <RowCheck label="Teléfono de la Empresa" defaultChecked />
      </Section>

      <Section title="Pie de Página Predeterminado" icon={<FileText />} contentClassName="space-y-2">
        <Label>Pie de Página Predeterminado</Label>
        <Textarea placeholder="Escribir Aquí..." rows={5} />
      </Section>

      <div className="flex justify-end">
        <Button variant="brand">Guardar Configuración</Button>
      </div>
    </Stagger>
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
