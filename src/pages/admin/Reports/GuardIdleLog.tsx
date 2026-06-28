import ReportPageShell from "./ReportPageShell";
import { PauseCircle } from "lucide-react";

export default function GuardIdleLog() {
  return <ReportPageShell title="Registros de Vigilante Inactivo" icon={PauseCircle} accent="#14b8a6" />;
}
