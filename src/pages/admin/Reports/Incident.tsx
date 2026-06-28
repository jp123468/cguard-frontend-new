import ReportPageShell from "./ReportPageShell";
import { AlertTriangle } from "lucide-react";

export default function Incident() {
  return <ReportPageShell title="Informe de Incidente" icon={AlertTriangle} accent="#ef4444" />;
}
