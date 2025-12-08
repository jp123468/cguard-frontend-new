export type IntegrationInfo = {
    slug: string;
    name: string;
    logo: string;
    enabled: boolean;
    headline?: string;
    features: string[];
    requirements: string[];
    notes?: string[];
};

export const INTEGRATIONS: Record<string, IntegrationInfo> = {
    "quickbooks-online": {
        slug: "quickbooks-online",
        name: "QuickBooks Online",
        logo: "https://app.guardspro.com/assets/icons/custom/logo-qb.png",
        enabled: false,
        headline:
            "Configurar integración con QuickBooks Online para gestionar la nómina con facilidad.",
        features: ["Enviar hojas de tiempo a QuickBooks Online"],
        requirements: ["QuickBooks Online Plus con Nómina"],
        notes: [
            "Asegúrese de que todos los guardias en nuestro sistema también estén en su cuenta de QuickBooks Online y viceversa.",
            "Todas las horas se transfieren a QuickBooks Online como horas regulares. Si hay tiempo libre/vacaciones/permiso, ajuste manualmente en QuickBooks después de exportar."
        ]
    },

    "adp-workforce-now": {
        slug: "adp-workforce-now",
        name: "ADP Workforce Now CSV",
        logo: "https://app.guardspro.com/assets/icons/custom/adpworkforcenow.png",
        enabled: true,
        headline:
            "Configure la integración con ADP para gestionar la nómina con facilidad.",
        features: [
            "Exportar nómina en un formato compatible con ADP Workforce Now",
            "Incluir horas de tiempo",
            "Incluir horas extras",
            "Vacaciones y tiempo libre pagado"
        ],
        requirements: ["Una cuenta de ADP Workforce Now"],
        notes: [
            "Código de Empresa",
            "Número de Lote",
            "Número de archivo para cada empleado"
        ]
    },

    "paychex-csv": {
        slug: "paychex-csv",
        name: "Paychex CSV",
        logo: "https://app.guardspro.com/assets/icons/custom/paychex_logo.png",
        enabled: false,
        headline:
            "Configure la integración con Paychex Flex® para gestionar la nómina con facilidad.",
        features: [
            "Exportar nómina en un formato compatible con Paychex",
            "Incluir horas de tiempo",
            "Incluir horas extras",
            "Incluir tiempo libre pagado"
        ],
        requirements: ["Una cuenta de Paychex Flex®"],
        notes: ["ID de Cliente", "ID de trabajador para cada empleado"]
    },

    "gusto-csv": {
        slug: "gusto-csv",
        name: "Gusto CSV",
        logo: "https://app.guardspro.com/assets/icons/custom/gusto_logo.png",
        enabled: false,
        headline:
            "Configure la integración con Gusto para gestionar la nómina con facilidad.",
        features: [
            "Exportar nómina en formato compatible con Gusto",
            "Incluir horas de tiempo",
            "Incluir horas extras",
            "Vacaciones y tiempo libre pagado"
        ],
        requirements: ["Cuenta de Gusto"]
    },

    "xero-uk": {
        slug: "xero-uk",
        name: "Xero (Reino Unido)",
        logo: "https://app.guardspro.com/assets/icons/custom/xero_logo.png",
        enabled: false,
        features: [
            "Sincroniza automáticamente hojas de tiempo y optimiza el procesamiento de nóminas",
        ],
        requirements: ["Xero (Reino Unido) con Nómina"],
        notes: [
            "Asegúrese de que los guardias existan también en Xero (UK) y viceversa.",
            "Verifique que las reglas de pago estén asignadas a tasas de ganancias en Xero.",
            "Asigne tipos de permisos/tiempos libres en nuestro sistema a los de Xero.",
            "Asocie a los empleados al calendario de nómina relevante en Xero (UK).",
            "Cree una corrida de pago preliminar en Xero antes de exportar."
        ]
    },

    "xero-au": {
        slug: "xero-au",
        name: "Xero (AU)",
        logo: "https://app.guardspro.com/assets/icons/custom/xero_logo.png",
        enabled: false,
        features: [
            "Sincroniza automáticamente hojas de tiempo y optimiza el procesamiento de nóminas",
        ],
        requirements: ["Xero (AU) con Nómina"],
        notes: [
            "Guías y reglas de pago en ambos sistemas deben coincidir.",
            "Mapear permisos/tiempos libres con los tipos de Xero.",
            "Asociar empleados con el calendario de nómina en Xero (AU).",
            "Cree una corrida de pago preliminar en Xero.",
            "Las hojas de tiempo ya aprobadas no se actualizarán."
        ]
    },

    "adp-run-csv": {
        slug: "adp-run-csv",
        name: "ADP Run CSV",
        logo: "https://app.guardspro.com/assets/icons/custom/adp.svg",
        enabled: true,
        headline:
            "Configurar integración con ADP Run para gestionar la nómina con facilidad.",
        features: [
            "Exportar Nómina en formato compatible con ADP Run",
            "Incluir horas de trabajo",
            "Incluir horas extras con multiplicador 1.5X o 2X",
            "Vacaciones y PTO"
        ],
        requirements: ["Una cuenta de ADP Run"],
        notes: ["IID", "Frecuencia de Pago", "ID del Empleado para cada empleado"]
    },

    "square-payroll": {
        slug: "square-payroll",
        name: "Square Payroll",
        logo: "https://app.guardspro.com/assets/icons/custom/square_payroll_logo_light.png",
        enabled: false,
        headline:
            "Configurar integración con Square Payroll para gestionar la nómina con facilidad.",
        features: ["Enviar registros de tiempo de GuardsPro a Square Payroll"],
        requirements: ["Una cuenta de Square Payroll"],
        notes: [
            "ID de Ubicación",
            "ID del Miembro del Equipo para cada empleado",
            "Disponible solo para clientes de EE. UU.",
            "Todas las horas se transfieren como horas regulares; ajuste manualmente si hay tiempo libre o permisos.",
            "Los descansos no remunerados no se sincronizan.",
            "Los usuarios deben usar GuardsPro para registrar horas trabajadas; no se integra con el reloj de Square."
        ]
    }
};
