// src/config/reports-config.ts

export type ReportCard = {
  id: string;
  title: string;
  description: string;
  href: string;
  openCount?: number;
  closedCount?: number;
};

export type ReportSection = {
  id: string;
  title: string;
  viewAllHref?: string;
  settingsHref?: string;
  reports: ReportCard[];
};

export const REPORT_SECTIONS: ReportSection[] = [
  {
    id: "general",
    title: "Informes generales",
    reports: [
      {
        id: "entry-exit",
        title: "Informe de Entrada/Salida",
        description:
          "Ver cuando su guardia de seguridad registra entrada y salida del sitio",
        href: "/reports/check-in-out",
      },
      {
        id: "site-tours",
        title: "Informe de Recorridos del Sitio",
        description:
          "Ver recorridos completados y perdidos por guardias de seguridad",
        href: "/reports/site-tour",
      },
      {
        id: "tasks",
        title: "Informe de Tareas",
        description:
          "Ver las tareas completadas por los guardias de seguridad",
        href: "/reports/tasks",
      },
      {
        id: "dar",
        title: "Informe DAR",
        description:
          "Ver actividad diaria de los guardias de seguridad",
        href: "/reports/dar",
      },
      {
        id: "vehicle-patrol",
        title: "Informe de Patrulla Vehicular",
        description: "Ver actividad de patrulla vehicular",
        href: "/reports/vehicle-patrol",
      },
      {
        id: "checklist",
        title: "Informe de lista de verificación",
        description:
          "Ver las listas de verificación completadas por los guardias",
        href: "/reports/checklist",
      },
      {
        id: "post-kpi",
        title: "Informe de KPI del Sitio de Publicación",
        description: "Ver informe de KPI del sitio de publicación",
        href: "/reports/post-kpi",
      },
      {
        id: "guard-kpi",
        title: "Informe de KPI del Guardia",
        description: "Ver informe de KPI del guardia",
        href: "/reports/guard-kpi",
      },
    ],
  },
  {
    id: "incidents",
    title: "Informes de Incidentes",
    viewAllHref: "/reports/incidents",
    settingsHref: "/reports/incidents/settings",
    reports: [
      {
        id: "general-incident",
        title: "General Incident report",
        description:
          "General incident report with an option to select any incident",
        href: "/reports/incidents/general",
        openCount: 0,
        closedCount: 0,
      },
      {
        id: "detailed-incident",
        title: "Detailed Incident Report",
        description: "Detailed Incident Report",
        href: "/reports/incidents/detailed",
        openCount: 0,
        closedCount: 0,
      },
      {
        id: "parking-violation",
        title: "Parking Violation",
        description:
          "This report is used to check the parking violation.",
        href: "/reports/incidents/parking-violation",
        openCount: 0,
        closedCount: 0,
      },
      {
        id: "break-in",
        title: "Break-In",
        description: "This report covers break-in incident.",
        href: "/reports/incidents/break-in",
        openCount: 0,
        closedCount: 0,
      },
      {
        id: "fire-alarm",
        title: "Fire Alarm",
        description:
          "This report is created to address fire alarm.",
        href: "/reports/incidents/fire-alarm",
        openCount: 0,
        closedCount: 0,
      },
      {
        id: "vandalism",
        title: "Vandalism",
        description: "This report covers vandalism incident.",
        href: "/reports/incidents/vandalism",
        openCount: 0,
        closedCount: 0,
      },
      {
        id: "suspicious-activity",
        title: "Suspicious Activity",
        description: "This report covers suspicious activity.",
        href: "/reports/incidents/suspicious-activity",
        openCount: 0,
        closedCount: 0,
      },
      {
        id: "police-onsite",
        title: "Police Onsite",
        description: "This report covers police reports.",
        href: "/reports/incidents/police-onsite",
        openCount: 0,
        closedCount: 0,
      },
      {
        id: "trespassing",
        title: "Trespassing",
        description: "This report is to address trespassing incident.",
        href: "/reports/incidents/trespassing",
        openCount: 0,
        closedCount: 0,
      },
    ],
  },
  {
    id: "standard",
    title: "Informes Estándar",
    viewAllHref: "/reports/standard",
    settingsHref: "/reports/standard",
    reports: [
      {
        id: "hourly-report",
        title: "Hourly Report",
        description: "Hourly Report",
        href: "/reports/standard/hourly",
        openCount: 0,
      },
      {
        id: "vehicle-inspection",
        title: "Vehicle Inspection Report",
        description: "Vehicle Inspection Report",
        href: "/reports/standard/vehicle-inspection",
      },
      {
        id: "equipment-inspection",
        title: "Equipment Inspection Report",
        description: "Equipment Inspection Report",
        href: "/reports/standard/equipment-inspection",
      },
    ],
  },
  {
    id: "timecard",
    title: "Informes de Registro de Tiempo",
    reports: [
      {
        id: "timecard-client",
        title: "Horas de Tarjeta de Tiempo por Cliente",
        description: "Ver horas de tarjeta de tiempo por cliente",
        href: "/reports/timecard/by-client",
      },
      {
        id: "timecard-post",
        title: "Horas de Tarjeta de Tiempo por Sitio de Publicación",
        description:
          "Ver horas de tarjeta de tiempo por sitio de publicación",
        href: "/reports/timecard/by-post",
      },
      {
        id: "timecard-guard",
        title: "Horas de Tarjeta de Tiempo por Guardia",
        description:
          "Ver horas de tarjeta de tiempo por guardia",
        href: "/reports/timecard/by-guard",
      },
    ],
  },
  {
    id: "payroll",
    title: "Informes de Horas de Nómina",
    reports: [
      {
        id: "payroll-client",
        title: "Horas de Nómina por Cliente",
        description: "Ver horas de nómina por cliente",
        href: "/reports/payroll/by-client",
      },
      {
        id: "payroll-post",
        title: "Horas de Nómina por Sitio de Publicación",
        description:
          "Ver horas de nómina por sitio de publicación",
        href: "/reports/payroll/by-post",
      },
      {
        id: "payroll-skillset",
        title: "Horas de Nómina por Conjunto de Habilidades",
        description:
          "Ver horas de nómina por conjunto de habilidades",
        href: "/reports/payroll/by-skillset",
      },
      {
        id: "payroll-department",
        title: "Horas de Nómina por Departamento",
        description:
          "Ver horas de nómina por departamento",
        href: "/reports/payroll/by-department",
      },
    ],
  },
  {
    id: "logs",
    title: "Informes de registro",
    reports: [
      {
        id: "delivery-logs",
        title: "Registros de Entrega",
        description:
          "Ver entregas compartidas por guardias de seguridad",
        href: "/reports/passdown",
      },
      {
        id: "watch-mode-logs",
        title: "Registros de Modo Vigilancia",
        description:
          "Ver los archivos multimedia enviados por los guardias de seguridad",
        href: "/reports/watch-mode",
      },
      {
        id: "checkpoint-logs",
        title: "Registros de Puntos de Control de Recorridos",
        description:
          "Ver los puntos de control escaneados por los guardias de seguridad",
        href: "/reports/tour-check-point",
      },
      {
        id: "inactive-guard-logs",
        title: "Registros de Guardia Inactivo",
        description:
          "Ver registros de inactividad de los guardias de seguridad",
        href: "/reports/guard-idle-log",
      },
      {
        id: "panic-button-logs",
        title: "Registros del Botón de Pánico",
        description:
          "Ver registros del botón de pánico presionado por los guardias",
        href: "/reports/panic-button-log",
      },
      {
        id: "geofence-logs",
        title: "Registros de Geo Vallas",
        description:
          "Ver registros de geovalla de los guardias de seguridad",
        href: "/reports/geo-fence-log",
      },
      {
        id: "fall-alert-logs",
        title: "Registros de Alerta de Caída de Guardia",
        description:
          "Ver registros de alerta de caída de guardias/dispositivos de seguridad",
        href: "/reports/guard-device-fall-report",
      },
      {
        id: "order-ack-logs",
        title: "Reconocimiento de Órdenes de Publicación",
        description:
          "Reconocimiento de Órdenes de Publicación",
        href: "/reports/post-order-ack",
      },
      {
        id: "document-ack-logs",
        title: "Reconocimiento de Documentos y Políticas",
        description:
          "Reconocimiento de Documentos y Políticas",
        href: "/reports/doc-policy-ack",
      },
      {
        id: "license-logs",
        title: "Registro de Licencias",
        description:
          "Ver registro de licencias de los guardias",
        href: "/reports/license",
      },
    ],
  },
];
