export type ReportingTone = "blue" | "red" | "orange" | "slate";

export interface ReportingSummaryCard {
  id: string;
  title: string;
  value: number;
  secondaryLabel: string;
  secondaryValue: number;
  tone: ReportingTone;
}

export const REPORTING_SUMMARY_CARDS: ReportingSummaryCard[] = [
  {
    id: "reports",
    title: "Informes",
    value: 0,
    secondaryLabel: "Pendiente",
    secondaryValue: 0,
    tone: "blue",
  },
  {
    id: "incidents",
    title: "Incidente",
    value: 0,
    secondaryLabel: "Abierto",
    secondaryValue: 0,
    tone: "red",
  },
  {
    id: "patrols",
    title: "Recorridos",
    value: 0,
    secondaryLabel: "Completado",
    secondaryValue: 0,
    tone: "orange",
  },
  {
    id: "tasks",
    title: "Tarea",
    value: 0,
    secondaryLabel: "Pendiente",
    secondaryValue: 0,
    tone: "slate",
  },
  {
    id: "checklists",
    title: "Lista de Verificación",
    value: 0,
    secondaryLabel: "Pendiente",
    secondaryValue: 0,
    tone: "blue",
  },
  {
    id: "inactivity",
    title: "Alertas de Inactividad",
    value: 0,
    secondaryLabel: "Alertas de Pánico",
    secondaryValue: 0,
    tone: "orange",
  },
];
