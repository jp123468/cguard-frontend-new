import { uiLang } from "@/config/roleLabels";

/**
 * Human labels for permission ids, in the user's chosen language (es/en/pt).
 * RESOURCE_LABELS / ACTION_LABELS keep their original Spanish shape because
 * older code indexes them directly; use getResourceLabel()/
 * formatPermissionLabel() for locale-aware rendering.
 */
export const RESOURCE_LABELS: Record<string, string> = {
  user: 'Usuarios',
  category: 'Sectores',
  auditLog: 'Registro de auditoría',
  settings: 'Ajustes',
  bannerSuperiorApp: 'Banner superior',
  service: 'Servicios',
  certification: 'Certificaciones',
  securityGuard: 'Vigilantes',
  clientAccount: 'Clientes',
  businessInfo: 'Información de negocio',
  representanteEmpresa: 'Representantes',
  incident: 'Incidentes',
  station: 'Postes',
  shift: 'Turnos',
  guardShift: 'Turnos de vigilante',
  patrol: 'Patrullas',
  patrolCheckpoint: 'Puntos de control',
  patrolLog: 'Registros de patrulla',
  report: 'Reportes',
  inventory: 'Inventario',
  inventoryHistory: 'Historial de inventario',
  additionalService: 'Servicios adicionales',
  notification: 'Notificaciones',
  notificationRecipient: 'Destinatarios',
  inquiries: 'Consultas',
  request: 'Solicitudes',
  dispatch: 'Incidentes',
  task: 'Tareas',
  memos: 'Memorandos',
  tutorial: 'Tutoriales',
  videoTutorial: 'Videos tutoriales',
  videoTutorialCategory: 'Sectores de video',
  completionOfTutorial: 'Completitud de tutorial',
  deviceIdInformation: 'Dispositivos',
  insurance: 'Seguros',
  file: 'Archivos',
};

const RESOURCE_LABELS_EN: Record<string, string> = {
  user: 'Users',
  category: 'Sectors',
  auditLog: 'Audit log',
  settings: 'Settings',
  bannerSuperiorApp: 'Top banner',
  service: 'Services',
  certification: 'Certifications',
  securityGuard: 'Guards',
  clientAccount: 'Clients',
  businessInfo: 'Business info',
  representanteEmpresa: 'Representatives',
  incident: 'Incidents',
  station: 'Posts',
  shift: 'Shifts',
  guardShift: 'Guard shifts',
  patrol: 'Patrols',
  patrolCheckpoint: 'Checkpoints',
  patrolLog: 'Patrol logs',
  report: 'Reports',
  inventory: 'Inventory',
  inventoryHistory: 'Inventory history',
  additionalService: 'Additional services',
  notification: 'Notifications',
  notificationRecipient: 'Recipients',
  inquiries: 'Inquiries',
  request: 'Requests',
  dispatch: 'Incidents',
  task: 'Tasks',
  memos: 'Memos',
  tutorial: 'Tutorials',
  videoTutorial: 'Video tutorials',
  videoTutorialCategory: 'Video sectors',
  completionOfTutorial: 'Tutorial completion',
  deviceIdInformation: 'Devices',
  insurance: 'Insurance',
  file: 'Files',
};

const RESOURCE_LABELS_PT: Record<string, string> = {
  user: 'Usuários',
  category: 'Setores',
  auditLog: 'Registro de auditoria',
  settings: 'Configurações',
  bannerSuperiorApp: 'Banner superior',
  service: 'Serviços',
  certification: 'Certificações',
  securityGuard: 'Vigilantes',
  clientAccount: 'Clientes',
  businessInfo: 'Informações do negócio',
  representanteEmpresa: 'Representantes',
  incident: 'Incidentes',
  station: 'Postos',
  shift: 'Turnos',
  guardShift: 'Turnos de vigilante',
  patrol: 'Patrulhas',
  patrolCheckpoint: 'Pontos de controle',
  patrolLog: 'Registros de patrulha',
  report: 'Relatórios',
  inventory: 'Inventário',
  inventoryHistory: 'Histórico de inventário',
  additionalService: 'Serviços adicionais',
  notification: 'Notificações',
  notificationRecipient: 'Destinatários',
  inquiries: 'Consultas',
  request: 'Solicitações',
  dispatch: 'Incidentes',
  task: 'Tarefas',
  memos: 'Memorandos',
  tutorial: 'Tutoriais',
  videoTutorial: 'Vídeos tutoriais',
  videoTutorialCategory: 'Setores de vídeo',
  completionOfTutorial: 'Conclusão de tutorial',
  deviceIdInformation: 'Dispositivos',
  insurance: 'Seguros',
  file: 'Arquivos',
};

export const ACTION_LABELS: Record<string, string> = {
  Import: 'Importar',
  Create: 'Agregar',
  Edit: 'Editar',
  Destroy: 'Eliminar',
  Read: 'Ver',
  Autocomplete: 'Autocompletar',
  Export: 'Exportar',
  Restore: 'Restaurar',
  Archive: 'Archivar',
};

const ACTION_LABELS_EN: Record<string, string> = {
  Import: 'Import',
  Create: 'Create',
  Edit: 'Edit',
  Destroy: 'Delete',
  Read: 'View',
  Autocomplete: 'Autocomplete',
  Export: 'Export',
  Restore: 'Restore',
  Archive: 'Archive',
};

const ACTION_LABELS_PT: Record<string, string> = {
  Import: 'Importar',
  Create: 'Adicionar',
  Edit: 'Editar',
  Destroy: 'Excluir',
  Read: 'Ver',
  Autocomplete: 'Autocompletar',
  Export: 'Exportar',
  Restore: 'Restaurar',
  Archive: 'Arquivar',
};

function resourceMap(): Record<string, string> {
  const l = uiLang();
  return l === 'en' ? RESOURCE_LABELS_EN : l === 'pt' ? RESOURCE_LABELS_PT : RESOURCE_LABELS;
}

function actionMap(): Record<string, string> {
  const l = uiLang();
  return l === 'en' ? ACTION_LABELS_EN : l === 'pt' ? ACTION_LABELS_PT : ACTION_LABELS;
}

/** Locale-aware group/resource label (falls back to the raw key). */
export function getResourceLabel(resourceKey: string): string {
  return resourceMap()[resourceKey] ?? RESOURCE_LABELS[resourceKey] ?? resourceKey;
}

export function formatPermissionLabel(permission: string) {
  // split suffix from resource
  const actions = actionMap();
  const suffixes = Object.keys(ACTION_LABELS).sort((a, b) => b.length - a.length);
  for (const s of suffixes) {
    if (permission.endsWith(s)) {
      const resourceKey = permission.slice(0, -s.length);
      const resource = getResourceLabel(resourceKey);
      const action = actions[s] ?? s;
      return `${action} ${resource}`;
    }
  }
  return permission;
}
