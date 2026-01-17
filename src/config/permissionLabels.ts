export const RESOURCE_LABELS: Record<string, string> = {
  user: 'Usuarios',
  category: 'Categorías',
  auditLog: 'Registro de auditoría',
  settings: 'Ajustes',
  bannerSuperiorApp: 'Banner superior',
  service: 'Servicios',
  certification: 'Certificaciones',
  securityGuard: 'Guardias',
  clientAccount: 'Clientes',
  businessInfo: 'Información de negocio',
  representanteEmpresa: 'Representantes',
  incident: 'Incidentes',
  station: 'Postes',
  shift: 'Turnos',
  guardShift: 'Turnos de guardia',
  patrol: 'Patrullas',
  patrolCheckpoint: 'Puntos de control',
  patrolLog: 'Registros de patrulla',
  report: 'Reportes',
  inventory: 'Inventario',
  inventoryHistory: 'Historial de inventario',
  additionalService: 'Servicios adicionales',
  billing: 'Facturación',
  estimate: 'Estimaciones',
  invoice: 'Facturas',
  notification: 'Notificaciones',
  notificationRecipient: 'Destinatarios',
  inquiries: 'Consultas',
  request: 'Solicitudes',
  task: 'Tareas',
  memos: 'Memorandos',
  tutorial: 'Tutoriales',
  videoTutorial: 'Videos tutoriales',
  videoTutorialCategory: 'Categorías de video',
  completionOfTutorial: 'Completitud de tutorial',
  deviceIdInformation: 'Dispositivos',
  insurance: 'Seguros',
  file: 'Archivos',
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

export function formatPermissionLabel(permission: string) {
  // split suffix from resource
  const suffixes = Object.keys(ACTION_LABELS).sort((a,b)=> b.length - a.length);
  for (const s of suffixes) {
    if (permission.endsWith(s)) {
      const resourceKey = permission.slice(0, -s.length);
      const resource = RESOURCE_LABELS[resourceKey] ?? resourceKey;
      const action = ACTION_LABELS[s] ?? s;
      return `${action} ${resource}`;
    }
  }
  return permission;
}
