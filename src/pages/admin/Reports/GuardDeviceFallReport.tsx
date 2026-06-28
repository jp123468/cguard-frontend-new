import ReportPageShell from "./ReportPageShell";
import { TriangleAlert } from "lucide-react";

export default function GuardDeviceFallReport() {
  return <ReportPageShell title="Registros de Alerta de Caída" icon={TriangleAlert} accent="#ef4444" />;
}
