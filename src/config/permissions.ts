export const PERMISSIONS: string[] = [
  "tenantEdit","tenantDestroy","planEdit","planRead","userEdit","userDestroy","userCreate","userImport","userRead","userAutocomplete","userExport",
  "categoryImport","categoryCreate","categoryEdit","categoryDestroy","categoryRead","categoryAutocomplete","auditLogRead","settingsEdit","settingsRead",
  "bannerSuperiorAppImport","bannerSuperiorAppCreate","bannerSuperiorAppEdit","bannerSuperiorAppDestroy","bannerSuperiorAppRead","bannerSuperiorAppAutocomplete",
  "serviceImport","serviceCreate","serviceEdit","serviceDestroy","serviceRead","serviceAutocomplete",
  "certificationImport","certificationCreate","certificationEdit","certificationDestroy","certificationRead","certificationAutocomplete",
  "securityGuardImport","securityGuardCreate","securityGuardRestore","securityGuardArchive","securityGuardEdit","securityGuardDestroy","securityGuardRead","securityGuardAutocomplete",
  "clientAccountImport","clientAccountCreate","clientAccountEdit","clientAccountDestroy","clientAccountRead","clientAccountAutocomplete",
  "businessInfoImport","businessInfoCreate","businessInfoEdit","businessInfoDestroy","businessInfoRead","businessInfoAutocomplete",
  "representanteEmpresaImport","representanteEmpresaCreate","representanteEmpresaEdit","representanteEmpresaDestroy","representanteEmpresaRead","representanteEmpresaAutocomplete",
  "incidentImport","incidentCreate","incidentEdit","incidentDestroy","incidentRead","incidentAutocomplete",
  "stationImport","stationCreate","stationEdit","stationDestroy","stationRead","stationAutocomplete",
  "shiftImport","shiftCreate","shiftEdit","shiftDestroy","shiftRead","shiftAutocomplete",
  "guardShiftImport","guardShiftCreate","guardShiftEdit","guardShiftDestroy","guardShiftRead","guardShiftAutocomplete",
  "patrolImport","patrolCreate","patrolEdit","patrolDestroy","patrolRead","patrolAutocomplete",
  "patrolCheckpointImport","patrolCheckpointCreate","patrolCheckpointEdit","patrolCheckpointDestroy","patrolCheckpointRead","patrolCheckpointAutocomplete",
  "patrolLogImport","patrolLogCreate","patrolLogEdit","patrolLogDestroy","patrolLogRead","patrolLogAutocomplete",
  "reportImport","reportCreate","reportEdit","reportDestroy","reportRead","reportAutocomplete",
  "inventoryImport","inventoryCreate","inventoryEdit","inventoryDestroy","inventoryRead","inventoryAutocomplete",
  "inventoryHistoryImport","inventoryHistoryCreate","inventoryHistoryEdit","inventoryHistoryDestroy","inventoryHistoryRead","inventoryHistoryAutocomplete",
  "additionalServiceImport","additionalServiceCreate","additionalServiceEdit","additionalServiceDestroy","additionalServiceRead","additionalServiceAutocomplete",
  "billingImport","billingCreate","billingEdit","billingDestroy","billingRead","billingAutocomplete",
  "notificationImport","notificationCreate","notificationEdit","notificationDestroy","notificationRead","notificationAutocomplete",
  "notificationRecipientImport","notificationRecipientCreate","notificationRecipientEdit","notificationRecipientDestroy","notificationRecipientRead","notificationRecipientAutocomplete",
  "inquiriesImport","inquiriesCreate","inquiriesEdit","inquiriesDestroy","inquiriesRead","inquiriesAutocomplete",
  "requestImport","requestCreate","requestEdit","requestDestroy","requestRead","requestAutocomplete",
  "taskImport","taskCreate","taskEdit","taskDestroy","taskRead","taskAutocomplete",
  "memosImport","memosCreate","memosEdit","memosDestroy","memosRead","memosAutocomplete",
  "tutorialImport","tutorialCreate","tutorialEdit","tutorialDestroy","tutorialRead","tutorialAutocomplete",
  "videoTutorialImport","videoTutorialCreate","videoTutorialEdit","videoTutorialDestroy","videoTutorialRead","videoTutorialAutocomplete",
  "videoTutorialCategoryImport","videoTutorialCategoryCreate","videoTutorialCategoryEdit","videoTutorialCategoryDestroy","videoTutorialCategoryRead","videoTutorialCategoryAutocomplete",
  "completionOfTutorialImport","completionOfTutorialCreate","completionOfTutorialEdit","completionOfTutorialDestroy","completionOfTutorialRead","completionOfTutorialAutocomplete",
  "deviceIdInformationImport","deviceIdInformationCreate","deviceIdInformationEdit","deviceIdInformationDestroy","deviceIdInformationRead","deviceIdInformationAutocomplete",
  "insuranceImport","insuranceCreate","insuranceEdit","insuranceDestroy","insuranceRead","insuranceAutocomplete",
  "fileCreate","fileEdit","fileDestroy","fileRead"
];

const ACTION_SUFFIXES = [
  'Import','Create','Edit','Destroy','Read','Autocomplete','Export','Restore','Archive'
];

export function groupPermissions(perms: string[]) {
  const groups: Record<string, string[]> = {};
  for (const p of perms) {
    // derive resource by stripping known action suffixes
    let resource = p;
    for (const s of ACTION_SUFFIXES) {
      if (resource.endsWith(s)) {
        resource = resource.slice(0, -s.length);
        break;
      }
    }
    resource = resource || p;
    if (!groups[resource]) groups[resource] = [];
    groups[resource].push(p);
  }
  return groups;
}
