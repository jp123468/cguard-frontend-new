import { BrowserRouter, Routes, Route, Navigate, useNavigate, useSearchParams } from "react-router-dom"
import { useEffect, lazy, Suspense } from "react"
import ProtectedRoute, { PublicOnlyRoute } from "@/components/ProtectedRoute"
import Login from "./pages/auth/login";
import ForgotPassword from "./pages/auth/forgot-password";
import ResetPassword from "./pages/auth/reset-password";
const DashboardPage = lazy(() => import("./pages/admin/dashboard/control-center/ControlCenter"));
const OperationsMapFull = lazy(() => import("./pages/admin/dashboard/control-center/OperationsMapFull"));
const LanguagePage = lazy(() => import("./pages/idioma/configuracion"));
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import { ThemeProvider } from "./contexts/ThemeContext"
import { LanguageProvider } from "./contexts/LanguageContext"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "./lib/queryClient"
import "./i18n"
import Register from "./pages/auth/register";
import VerifyEmail from "./pages/auth/verify-email";
import AcceptInvitation from "./pages/auth/accept-invitation";
import { ApiService } from '@/services/api/apiService';

const ProfileUser = lazy(() => import("./pages/admin/Configuration/ProfileUserPage"));
const ProfileCompany = lazy(() => import("./pages/admin/Configuration/ProfileCompanyPage"));
const Notification = lazy(() => import("./pages/admin/Configuration/NotificationPage"));
const MobilPage = lazy(() => import("./pages/admin/Configuration/mobil/MobilPage"));
const MobileHubPage = lazy(() => import("./pages/admin/Configuration/mobile-hub/MobileHubPage"));
import { ArrowLeftCircle } from "lucide-react"
const CompanyPoliciesPage = lazy(() => import("./pages/admin/Configuration/company-policies/CompanyPoliciesPage"));
const IncidentTypesPage = lazy(() => import("./pages/admin/Configuration/types-incidents/IncidentTypePage"));
const LicenseTypePage = lazy(() => import("./pages/admin/Configuration/types-licenses/LicensesTypePage"));
const DepartmentPage = lazy(() => import("./pages/admin/Configuration/department/DepartmentPage"));
const SkillSetsPage = lazy(() => import("./pages/admin/Configuration/skill-sets/SkillSetsPage"));
const UserRolesPage = lazy(() => import("./pages/admin/Configuration/user-roles/UserRolesPage"));
const SettingsHome = lazy(() => import("./pages/admin/Configuration/SettingsHome"));
const IntegrationsList = lazy(() => import("./pages/admin/Configuration/integrations/IntegrationsList"));
const ProfileFieldsPage = lazy(() => import("./pages/admin/Configuration/profile-fields/ProfileFieldsPage"));
const IntegrationDetail = lazy(() => import("./pages/admin/Configuration/integrations/IntegrationDetail"));
const PayrollSettingsPage = lazy(() => import("./pages/admin/Configuration/payroll/PayrollSettingsPage"));
const PasswordChangePage = lazy(() => import("./pages/admin/Configuration/change-password/ChangePasswordPage"));
const PostingGlobalPage = lazy(() => import("./pages/admin/Configuration/posting-global/PostingGlobalPage"));
const DeveloperRequestsPage = lazy(() => import("./pages/admin/Configuration/application-records/DeveloperRequestsPage"));
const ReportSettingsPage = lazy(() => import("./pages/admin/Configuration/report-settings/ReportSettingsPage"));
const OtherSettingsPage = lazy(() => import("./pages/admin/Configuration/other-settings/OtherSettingsPage"));
const GuardsGlobalSettingsPage = lazy(() => import("./pages/admin/Configuration/guards-settings/GuardsGlobalSettingsPage"));
const RondasSettingsPage = lazy(() => import("./pages/admin/Configuration/rondas-settings/RondasSettingsPage"));
const EmailPreferencesPage = lazy(() => import("./pages/admin/Configuration/email-preferences/EmailPreferencesPage"));
const SmsBalancePage = lazy(() => import("./pages/admin/Configuration/sms/SmsBalancePage"));
const CommunicationsPage = lazy(() => import("./pages/admin/Configuration/communications/CommunicationsPage"));
const BillingPage = lazy(() => import("./pages/admin/Configuration/billing/BillingPage"));
const DeveloperTokensPage = lazy(() => import("./pages/admin/Configuration/developer-tokens/DeveloperTokensPage"));
const ActivitiesPage = lazy(() => import("./pages/admin/actividades/ActivitiesPage"));
const ClientesPage = lazy(() => import("./pages/admin/clientes/ClientsPage"));
const NewOrEditClientPage = lazy(() => import("./pages/admin/clientes/NewOrEditClientPage"));
const ClientsDetails = lazy(() => import("./pages/admin/clientes/ClientsDetails"));
const NewOrEditPostSitePage = lazy(() => import("./pages/admin/post-sites/NewOrEditPostSitePage"));
const PostSiteDetailsPage = lazy(() => import("./pages/admin/post-sites/PostSiteDetailsPage"));
const AddStationPage = lazy(() => import("./pages/admin/post-sites/AddStationPage"));
const StationDetailPage = lazy(() => import("./pages/admin/post-sites/station-detail/StationDetailPage"));
const GlobalInventoryPage = lazy(() => import("./pages/admin/inventory/GlobalInventoryPage"));
const ProjectsPage = lazy(() => import("./pages/admin/projects/ProjectsPage"));
const TrainingCoursesPage = lazy(() => import("./pages/admin/training/TrainingCoursesPage"));
const TrainingCourseDetailPage = lazy(() => import("./pages/admin/training/TrainingCourseDetailPage"));
const TrainingEnrollmentsPage = lazy(() => import("./pages/admin/training/TrainingEnrollmentsPage"));
const TrainingCatalogPage = lazy(() => import("./pages/admin/training/TrainingCatalogPage"));
const NewOrEditProjectPage = lazy(() => import("./pages/admin/projects/NewOrEditProjectPage"));
const SecurityGuardsPage = lazy(() => import("./pages/admin/security-guards/SecurityGuardsPage"));
const NewSecurityGuardPage = lazy(() => import("./pages/admin/security-guards/NewSecurityGuardPage"));
const SupervisorsPage = lazy(() => import("./pages/admin/supervisors/SupervisorsPage"));
const SupervisorDetailPage = lazy(() => import("./pages/admin/supervisors/SupervisorDetailPage"));
const SupervisorKpisPage = lazy(() => import("./pages/admin/supervisors/SupervisorKpisPage"));
const SupervisorNotesPage = lazy(() => import("./pages/admin/supervisors/SupervisorNotesPage"));
const SupervisorLicensesPage = lazy(() => import("./pages/admin/supervisors/SupervisorLicensesPage"));
const SupervisorPositionsPage = lazy(() => import("./pages/admin/supervisors/SupervisorPositionsPage"));
const GuardRegistration = lazy(() => import("./pages/guard/registration"));
const ClientRegistration = lazy(() => import("./pages/client/registration"));
const AdminOfficeUsersPage = lazy(() => import("./pages/admin/administrative-office-users/AdminOfficeUsersPage"));
const NewAdminUserPage = lazy(() => import("./pages/admin/administrative-office-users/NewAdminUserPage"));
const EditAdminUserPage = lazy(() => import("./pages/admin/administrative-office-users/EditAdminUserPage"));
const MessengerPage = lazy(() => import("./pages/admin/messenger/MessengerPage"));
const RadioDispatch = lazy(() => import("./pages/radio/RadioDispatch"));
const RadioDevices = lazy(() => import("./pages/admin/radio/RadioDevices"));
const DispatcherPage = lazy(() => import("./pages/admin/dispatcher/DispatcherPage"));
const CustomerRequests = lazy(() => import("./pages/admin/requests/CustomerRequests"));
const GuardRatings = lazy(() => import("./pages/admin/guard-ratings/GuardRatings"));
const NewDispatchPage = lazy(() => import("./pages/admin/dispatcher/NewDispatchPage"));
const EditDispatchPage = lazy(() => import("./pages/admin/dispatcher/EditDispatchPage"));
const VehiclesPage = lazy(() => import("./pages/admin/vehicles/VehiclesPage"));
const DispatchDetailsPage = lazy(() => import("@/pages/admin/dispatcher/DispatchDetailsPage"));
const DispatchPrintablePage = lazy(() => import("@/pages/admin/dispatcher/DispatchPrintablePage"));
const DispatchPublicView = lazy(() => import("@/pages/public/DispatchPublicView"));
const NewVehiclePage = lazy(() => import("./pages/admin/vehicles/NewVehiclePage"));
const RoutesPage = lazy(() => import("./pages/admin/routes/RoutesPage"));
const PatrullaBoardPage = lazy(() => import("./pages/admin/vehicle-patrol/PatrullaBoardPage"));
const NewRoutePage = lazy(() => import("./pages/admin/routes/NewRoutePage"));
const EditRoutePage = lazy(() => import("./pages/admin/routes/EditRoutePage"));
const PatrolExecutionPage = lazy(() => import("./pages/guard/PatrolExecutionPage"));
const LiveTrackingPage = lazy(() => import("./pages/admin/gps-tracker/LiveTracking"));
const TrackingHistoryPage = lazy(() => import("./pages/admin/gps-tracker/TrackingHistory"));
const Reports = lazy(() => import("./pages/admin/Reports/Reports"));
const Reporting = lazy(() => import("./pages/admin/analytics/Reporting"));
const Scheduling = lazy(() => import("./pages/admin/analytics/Scheduling"));
const VideoMonitoring = lazy(() => import("./pages/admin/video/VideoMonitoring"));
const VideoDevices = lazy(() => import("./pages/admin/video/VideoDevices"));
const VideoRelaySites = lazy(() => import("./pages/admin/video/VideoRelaySites"));
const VideoEvents = lazy(() => import("./pages/admin/video/VideoEvents"));
const VideoSharedClip = lazy(() => import("./pages/admin/video/VideoSharedClip"));
const AlarmQueue = lazy(() => import("./pages/admin/alarm/AlarmQueue"));
const AlarmPanels = lazy(() => import("./pages/admin/alarm/AlarmPanels"));
const AlarmSignals = lazy(() => import("./pages/admin/alarm/AlarmSignals"));
const AlarmCaseDetail = lazy(() => import("./pages/admin/alarm/AlarmCaseDetail"));
const AlarmReports = lazy(() => import("./pages/admin/alarm/AlarmReports"));
const AlarmAnalytics = lazy(() => import("./pages/admin/alarm/AlarmAnalytics"));
const AuditLogs = lazy(() => import("./pages/admin/security/AuditLogs"));
const SystemLogs = lazy(() => import("./pages/admin/security/SystemLogs"));
const LoginHistory = lazy(() => import("./pages/admin/security/LoginHistory"));
const NominaDashboard = lazy(() => import("./pages/admin/nomina/NominaDashboard"));
const NominaTimeClock = lazy(() => import("./pages/admin/nomina/NominaTimeClock"));
const NominaRecords = lazy(() => import("./pages/admin/nomina/NominaRecords"));
const NominaExceptions = lazy(() => import("./pages/admin/nomina/NominaExceptions"));
const NominaApprovals = lazy(() => import("./pages/admin/nomina/NominaApprovals"));
const TaskApprovals = lazy(() => import("./pages/admin/tasks/TaskApprovals"));
const TaskTracking = lazy(() => import("./pages/admin/tasks/TaskTracking"));
const PassdownsPage = lazy(() => import("./pages/admin/passdown/PassdownsPage"));
const NominaPayrollSummary = lazy(() => import("./pages/admin/nomina/NominaPayrollSummary"));
const NominaRolDePagos = lazy(() => import("./pages/admin/nomina/NominaRolDePagos"));
const NominaSettings = lazy(() => import("./pages/admin/nomina/NominaSettings"));
const Visitors = lazy(() => import("./pages/admin/visitor-management/Visitors"));
const Vehicles = lazy(() => import("./pages/admin/visitor-management/Vehicles"));
const Visits = lazy(() => import("./pages/admin/visitor-management/Visits"));
const PostSite = lazy(() => import("./pages/admin/analytics/PostSite"));
const Guard = lazy(() => import("./pages/admin/analytics/Guard"));
const TimeOff = lazy(() => import("./pages/admin/programmer/TimeOff"));
const Schedule = lazy(() => import("./pages/admin/programmer/Schedule"));
const ShiftExchange = lazy(() => import("./pages/admin/programmer/ShiftExchange"));
const ShiftStatus = lazy(() => import("./pages/admin/programmer/ShiftStatus"));
const ShiftTemplates = lazy(() => import("./pages/admin/programmer/ShiftTemplates"));
const OpenShifts = lazy(() => import("./pages/admin/programmer/OpenShifts"));
const CheckInOut = lazy(() => import("./pages/admin/Reports/CheckInOut"));
const SiteTour = lazy(() => import("./pages/admin/Reports/SiteTour"));
const Task = lazy(() => import("./pages/admin/Reports/Task"));
const Dar = lazy(() => import("./pages/admin/Reports/Dar"));
const VehiclePatrol = lazy(() => import("./pages/admin/Reports/VehiclePatrol"));
const Checklist = lazy(() => import("./pages/admin/Reports/Checklist"));
const PostKpi = lazy(() => import("./pages/admin/Reports/PostKpi"));
const GuardKpi = lazy(() => import("./pages/admin/Reports/GuardKpi"));
const Incident = lazy(() => import("./pages/admin/Reports/Incident"));
const Passdown = lazy(() => import("./pages/admin/Reports/Passdown"));
const WatchMode = lazy(() => import("./pages/admin/Reports/WatchMode"));
const TourCheckPoint = lazy(() => import("./pages/admin/Reports/TourCheckPoint"));
const GuardIdleLog = lazy(() => import("./pages/admin/Reports/GuardIdleLog"));
const PanicButtonLog = lazy(() => import("./pages/admin/Reports/PanicButtonLog"));
const GeoFenceLog = lazy(() => import("./pages/admin/Reports/GeoFenceLog"));
const GuardDeviceFallReport = lazy(() => import("./pages/admin/Reports/GuardDeviceFallReport"));
const PostOrderAck = lazy(() => import("./pages/admin/Reports/PostOrderAck"));
const DocPolicyAck = lazy(() => import("./pages/admin/Reports/DocPolicyAck"));
const License = lazy(() => import("./pages/admin/Reports/License"));
const EditSecurityGuardPage = lazy(() => import("./pages/admin/security-guards/EditSecurityGuardPage"));
const GuardOverview = lazy(() => import("./pages/admin/security-guards/SegurityGuardsDetails"));
const GuardResumenPage = lazy(() => import("./pages/admin/security-guards/components/GuardOverview/GuardOverviewPage"));
const GuardPerfilPage = lazy(() => import("./pages/admin/security-guards/components/GuardProfile/GuardProfilepage"));
const GuardAvailabilityPage = lazy(() => import("./pages/admin/security-guards/components/GuardAvailability/GuardAvailabilitypage"));
const GuardIndicadoresPage = lazy(() => import("./pages/admin/security-guards/components/GuardKPIs/GuardKPIspage"));
const GuardDispositivoPage = lazy(() => import("./pages/admin/security-guards/components/GuardDevice/GuardDevicepage"));
const GuardLicenciasPage = lazy(() => import("./pages/admin/security-guards/components/GuardLicenses/GuardLicensespage"));
const GuardNotasPage = lazy(() => import("./pages/admin/security-guards/components/GuardNotes/GuardNotespage"));
const GuardMemosPage = lazy(() => import("./pages/admin/security-guards/components/GuardMemos/GuardMemosPage"));
const GuardRemindersPage = lazy(() => import("./pages/admin/security-guards/components/GuardReminders/GuardRemindersPage"));
const GuardFilesPage = lazy(() => import("./pages/admin/security-guards/components/GuardFiles/GuardFilesPage"));
const GuardAsignarSitiosPage = lazy(() => import("./pages/admin/security-guards/components/GuardAssign-Sites/GuardAsignarSitiosPage"));
const GuardSkillsPage = lazy(() => import("./pages/admin/security-guards/components/GuardSkills/GuardSkillsPage"));
const GuardDepartamentoPage = lazy(() => import("./pages/admin/security-guards/components/GuardDepartment/GuardDepartamentoPage"));
const GuardConfiguracionPage = lazy(() => import("./pages/admin/security-guards/components/GuardConfiguration/GuardConfiguracionPage"));
import GuardAppLayout from "./layouts/GuardAppLayout";
const GuardDashboard = lazy(() => import("./pages/guard/dashboard/GuardDashboard"));
const GuardSchedulePage = lazy(() => import("./pages/guard/dashboard/GuardSchedule"));
const GuardTimeOffPage = lazy(() => import("./pages/guard/dashboard/GuardTimeOff"));
const MemosPage = lazy(() => import("./pages/admin/memos/MemosPage"));
const StyleGuide = lazy(() => import("./pages/StyleGuide"));
const TenantsPage = lazy(() => import("./pages/admin/superadmin/TenantsPage"));
import RequireGlobalAdmin from "./components/RequireGlobalAdmin";

import { ClientSelectionProvider } from "./contexts/ClientSelectionContext";

function normalizeInviteToken(value: string | null | undefined) {
  return value && value !== 'null' && value !== 'undefined' ? value : undefined;
}

function LoginRouteResolver() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const inviteToken = normalizeInviteToken(searchParams.get('token') || searchParams.get('invitationToken') || searchParams.get('invite') || undefined);
  const inviteType = normalizeInviteToken(searchParams.get('inviteType') || undefined);
  const securityGuardId = normalizeInviteToken(searchParams.get('securityGuardId') || undefined);

  useEffect(() => {
    if (!inviteToken) return;

    // If token explicitly marks a client invite, go to client registration
    if (inviteType === 'client') {
      navigate(`/client/registration?token=${encodeURIComponent(inviteToken)}&inviteType=client`, { replace: true });
      return;
    }

    // Administrative / internal staff invites: they work in THIS CRM, so send
    // them to the panel onboarding (NOT the customer registration view).
    if (inviteType === 'staff' || inviteType === 'admin') {
      navigate(`/auth/accept-invitation?token=${encodeURIComponent(inviteToken)}&inviteType=staff`, { replace: true });
      return;
    }

    // Default behavior: treat as guard invitation and open the public invitation
    // registration page directly. Avoid probing backend endpoints here because
    // that can return 400/204 preflight errors and leave the user on the login page.
    navigate(`/auth/invitation?token=${encodeURIComponent(inviteToken)}${securityGuardId ? `&securityGuardId=${encodeURIComponent(securityGuardId)}` : ''}&inviteType=guard`, { replace: true });
  }, [inviteToken, inviteType, securityGuardId, navigate]);

  return (
    <PublicOnlyRoute>
      <Login />
    </PublicOnlyRoute>
  );
}

/** Role-based redirect: guards go to /guard, others go to /dashboard */
function RoleBasedRedirect() {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // Check if user is ONLY a security guard (not also admin/supervisor)
  const roles: string[] = (() => {
    const r = user?.roles ?? user?.role ?? [];
    const arr = Array.isArray(r) ? r : [r];
    // also include tenant-scoped roles
    const tenantRoles: string[] = Array.isArray(user?.tenants)
      ? user.tenants.flatMap((t: any) => {
          const tr = t.roles ?? t.role ?? [];
          return Array.isArray(tr) ? tr : [tr];
        })
      : [];
    return [...arr, ...tenantRoles].map((x: any) => String(x || '').toLowerCase()).filter(Boolean);
  })();
  const adminRoles = ['admin', 'superadmin', 'operationsmanager', 'securitysupervisor', 'hrmanager', 'dispatcher', 'clientaccountmanager', 'administrativesupervisor', 'administrativeassistant', 'secretary'];
  const hasAdminRole = roles.some(r => adminRoles.includes(r));
  const isGuardOnly = roles.includes('securityguard') && !hasAdminRole;
  if (isGuardOnly) return <Navigate to="/guard" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <LanguageProvider>
      <AuthProvider>
        <ClientSelectionProvider>
          <BrowserRouter>
            <Suspense fallback={<div style={{minHeight:"60vh",display:"flex",alignItems:"center",justifyContent:"center"}}><div className="animate-spin" aria-label="Cargando" style={{width:28,height:28,border:"3px solid var(--border,#e5e7eb)",borderTopColor:"var(--primary,#C8860A)",borderRadius:"50%"}}/></div>}>
            <Routes>
              {/* Enlace público de video compartido (cliente, sin login) */}
              <Route path="/video/shared/:token" element={<VideoSharedClip />} />

              {/* Guía de estilo / sistema de diseño */}
              <Route path="/style-guide" element={<StyleGuide />} />

              {/* Rutas públicas (solo accesibles si NO estás logueado) */}
              <Route
                path="/"
                element={
                  <PublicOnlyRoute>
                    <Login />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/client/registration"
                element={
                  <PublicOnlyRoute>
                    <ClientRegistration />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/login"
                element={
                  <LoginRouteResolver />
                }
              />
              <Route
                path="/register"
                element={
                  <PublicOnlyRoute>
                    <Register />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/guard_registration"
                element={
                  <PublicOnlyRoute>
                    <GuardRegistration />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/auth/invitation"
                element={
                  <PublicOnlyRoute>
                    <GuardRegistration />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/auth/accept-invitation"
                element={
                  <PublicOnlyRoute>
                    <AcceptInvitation />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/auth/verify-email"
                element={
                  <PublicOnlyRoute>
                    <VerifyEmail />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/forgot-password"
                element={
                  <PublicOnlyRoute>
                    <ForgotPassword />
                  </PublicOnlyRoute>
                }
              />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/auth/password-reset" element={<ResetPassword />} />

              {/* Rutas protegidas (requieren autenticación) */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              {/* Full-screen operations map — opened in a new tab (no app chrome). */}
              <Route
                path="/dashboard/operations-map"
                element={
                  <ProtectedRoute>
                    <OperationsMapFull />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/activities"
                element={
                  <ProtectedRoute>
                    <ActivitiesPage />
                  </ProtectedRoute>
                }
              />

              {/* CLIENTES */}
              <Route
                path="/clients"
                element={
                  <ProtectedRoute>
                    <ClientesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/superadmin/tenants"
                element={
                  <ProtectedRoute>
                    <RequireGlobalAdmin>
                      <TenantsPage />
                    </RequireGlobalAdmin>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients/add-new"
                element={
                  <ProtectedRoute>
                    <NewOrEditClientPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients/edit/:id"
                element={
                  <ProtectedRoute>
                    <NewOrEditClientPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients/:id/overview"
                element={
                  <ProtectedRoute>
                    <ClientsDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients/:id/profile"
                element={
                  <ProtectedRoute>
                    <ClientsDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients/:id/contacts"
                element={
                  <ProtectedRoute>
                    <ClientsDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients/:id/notes"
                element={
                  <ProtectedRoute>
                    <ClientsDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients/:id/files"
                element={
                  <ProtectedRoute>
                    <ClientsDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients/:id/post-sites"
                element={
                  <ProtectedRoute>
                    <ClientsDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients/:id/portal"
                element={
                  <ProtectedRoute>
                    <ClientsDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients/:id/user-access"
                element={
                  <ProtectedRoute>
                    <ClientsDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients/:id/email-reports"
                element={
                  <ProtectedRoute>
                    <ClientsDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients/:id/projects"
                element={
                  <ProtectedRoute>
                    <ClientsDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects"
                element={
                  <ProtectedRoute>
                    <ProjectsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/new"
                element={
                  <ProtectedRoute>
                    <NewOrEditProjectPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/:id/edit"
                element={
                  <ProtectedRoute>
                    <NewOrEditProjectPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/training/courses"
                element={
                  <ProtectedRoute>
                    <TrainingCoursesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/training/catalog"
                element={
                  <ProtectedRoute>
                    <TrainingCatalogPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/training/courses/:id"
                element={
                  <ProtectedRoute>
                    <TrainingCourseDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/training/courses/:courseId/enrollments"
                element={
                  <ProtectedRoute>
                    <TrainingEnrollmentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory"
                element={
                  <ProtectedRoute>
                    <GlobalInventoryPage />
                  </ProtectedRoute>
                }
              />
              {/* "Sitios de servicio" listing retired — sites/stations are now
                  managed from Clientes. Redirect old links there. Detail routes
                  (/post-sites/:id/...) stay: stations are reached via Clientes. */}
              <Route path="/post-sites" element={<Navigate to="/clients" replace />} />
              <Route
                path="/post-sites/new"
                element={
                  <ProtectedRoute>
                    <NewOrEditPostSitePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/post-sites/:id/edit"
                element={
                  <ProtectedRoute>
                    <NewOrEditPostSitePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/post-sites/:id/stations/new"
                element={
                  <ProtectedRoute>
                    <AddStationPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/post-sites/:id"
                element={
                  <ProtectedRoute>
                    <PostSiteDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/post-sites/:id/overview"
                element={
                  <ProtectedRoute>
                    <PostSiteDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/post-sites/:id/profile"
                element={
                  <ProtectedRoute>
                    <PostSiteDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/post-sites/:id/contacts"
                element={
                  <ProtectedRoute>
                    <PostSiteDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/post-sites/:id/kpis"
                element={
                  <ProtectedRoute>
                    <PostSiteDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/post-sites/:id/post-orders"
                element={
                  <ProtectedRoute>
                    <PostSiteDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/post-sites/:id/notes"
                element={
                  <ProtectedRoute>
                    <PostSiteDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/post-sites/:id/incidents"
                element={
                  <ProtectedRoute>
                    <PostSiteDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/post-sites/:id/files"
                element={
                  <ProtectedRoute>
                    <PostSiteDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/post-sites/:id/assign-guards"
                element={
                  <ProtectedRoute>
                    <PostSiteDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/post-sites/:id/stations"
                element={
                  <ProtectedRoute>
                    <PostSiteDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/post-sites/:id/inventory"
                element={
                  <ProtectedRoute>
                    <PostSiteDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/post-sites/:id/tasks"
                element={
                  <ProtectedRoute>
                    <PostSiteDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/post-sites/:id/site-tours"
                element={
                  <ProtectedRoute>
                    <PostSiteDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/post-sites/:id/site-tour-tags"
                element={
                  <ProtectedRoute>
                    <PostSiteDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/post-sites/:id/tag-scans"
                element={
                  <ProtectedRoute>
                    <PostSiteDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/post-sites/:id/geo-fence"
                element={
                  <ProtectedRoute>
                    <PostSiteDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/post-sites/:id/assign-reports"
                element={
                  <ProtectedRoute>
                    <PostSiteDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/post-sites/:id/checklists"
                element={
                  <ProtectedRoute>
                    <PostSiteDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/post-sites/:id/email-reports"
                element={
                  <ProtectedRoute>
                    <PostSiteDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/post-sites/:id/settings"
                element={
                  <ProtectedRoute>
                    <PostSiteDetailsPage />
                  </ProtectedRoute>
                }
              />
              {/* STATION DETAIL ROUTES */}
              <Route path="/post-sites/:postSiteId/stations/:stationId" element={<ProtectedRoute><StationDetailPage /></ProtectedRoute>} />
              <Route path="/post-sites/:postSiteId/stations/:stationId/overview" element={<ProtectedRoute><StationDetailPage /></ProtectedRoute>} />
              <Route path="/post-sites/:postSiteId/stations/:stationId/visitors" element={<ProtectedRoute><StationDetailPage /></ProtectedRoute>} />
              <Route path="/post-sites/:postSiteId/stations/:stationId/guards" element={<ProtectedRoute><StationDetailPage /></ProtectedRoute>} />
              <Route path="/post-sites/:postSiteId/stations/:stationId/shifts" element={<ProtectedRoute><StationDetailPage /></ProtectedRoute>} />
              <Route path="/post-sites/:postSiteId/stations/:stationId/orders" element={<ProtectedRoute><StationDetailPage /></ProtectedRoute>} />
              <Route path="/post-sites/:postSiteId/stations/:stationId/site-tours" element={<ProtectedRoute><StationDetailPage /></ProtectedRoute>} />
              <Route path="/post-sites/:postSiteId/stations/:stationId/tag-scans" element={<ProtectedRoute><StationDetailPage /></ProtectedRoute>} />
              <Route path="/post-sites/:postSiteId/stations/:stationId/inventory" element={<ProtectedRoute><StationDetailPage /></ProtectedRoute>} />
              <Route path="/post-sites/:postSiteId/stations/:stationId/incidents" element={<ProtectedRoute><StationDetailPage /></ProtectedRoute>} />
              <Route path="/post-sites/:postSiteId/stations/:stationId/etiquetas" element={<ProtectedRoute><StationDetailPage /></ProtectedRoute>} />
              <Route path="/post-sites/:postSiteId/stations/:stationId/parking" element={<ProtectedRoute><StationDetailPage /></ProtectedRoute>} />
              {/* FIN CLIENTES */}


              {/* EQUIPOS DE SEGURIDAD */}
              <Route
                path="/security-guards"
                element={
                  <ProtectedRoute>
                    <SecurityGuardsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/security-guards/new"
                element={
                  <ProtectedRoute>
                    <NewSecurityGuardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/guards/:id/overview"
                element={
                  <ProtectedRoute>
                    <GuardOverview />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/security-guards/edit/:id"
                element={
                  <ProtectedRoute>
                    <EditSecurityGuardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/guards/:id/resumen"
                element={
                  <ProtectedRoute>
                    <GuardResumenPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/guards/:id/perfil"
                element={
                  <ProtectedRoute>
                    <GuardPerfilPage {...({} as any)} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/guards/:id/dispositivo"
                element={
                  <ProtectedRoute>
                    <GuardDispositivoPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/guards/:id/availability"
                element={
                  <ProtectedRoute>
                    <GuardAvailabilityPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/guards/:id/indicadores"
                element={
                  <ProtectedRoute>
                    <GuardIndicadoresPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/guards/:id/licencias"
                element={
                  <ProtectedRoute>
                    <GuardLicenciasPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/guards/:id/notas"
                element={
                  <ProtectedRoute>
                    <GuardNotasPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/guards/:id/memos"
                element={
                  <ProtectedRoute>
                    <GuardMemosPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/guards/:id/recordatorios"
                element={
                  <ProtectedRoute>
                    <GuardRemindersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/guards/:id/archivos"
                element={
                  <ProtectedRoute>
                    <GuardFilesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/guards/:id/asignar-sitios"
                element={
                  <ProtectedRoute>
                    <GuardAsignarSitiosPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/guards/:id/habilidades"
                element={
                  <ProtectedRoute>
                    <GuardSkillsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/guards/:id/departamento"
                element={
                  <ProtectedRoute>
                    <GuardDepartamentoPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/guards/:id/configuracion"
                element={
                  <ProtectedRoute>
                    <GuardConfiguracionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/memos"
                element={
                  <ProtectedRoute>
                    <MemosPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/back-office"
                element={
                  <ProtectedRoute>
                    <AdminOfficeUsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/back-office/new"
                element={
                  <ProtectedRoute>
                    <NewAdminUserPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/back-office/edit/:id"
                element={
                  <ProtectedRoute>
                    <EditAdminUserPage />
                  </ProtectedRoute>
                }
              />
              {/* FIN DE EQUIPOS DE SEGURIDAD */}

              {/* ANALITICAS */}
              <Route
                path="/analytics/reporting"
                element={
                  <ProtectedRoute>
                    <Reporting />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics/scheduling"
                element={
                  <ProtectedRoute>
                    <Scheduling />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics/postsite"
                element={
                  <ProtectedRoute>
                    <PostSite />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics/guard"
                element={
                  <ProtectedRoute>
                    <Guard />
                  </ProtectedRoute>
                }
              />

              {/* VIDEOVIGILANCIA */}
              <Route path="/video/monitoring" element={<ProtectedRoute><VideoMonitoring /></ProtectedRoute>} />
              <Route path="/video/devices" element={<ProtectedRoute><VideoDevices /></ProtectedRoute>} />
              <Route path="/video/relays" element={<ProtectedRoute><VideoRelaySites /></ProtectedRoute>} />
              <Route path="/video/events" element={<ProtectedRoute><VideoEvents /></ProtectedRoute>} />
              {/* FIN VIDEOVIGILANCIA */}

              {/* CENTRAL DE MONITOREO (ALARMAS) */}
              <Route path="/alarm/queue" element={<ProtectedRoute><AlarmQueue /></ProtectedRoute>} />
              <Route path="/alarm/panels" element={<ProtectedRoute><AlarmPanels /></ProtectedRoute>} />
              <Route path="/alarm/signals" element={<ProtectedRoute><AlarmSignals /></ProtectedRoute>} />
              <Route path="/alarm/case/:id" element={<ProtectedRoute><AlarmCaseDetail /></ProtectedRoute>} />
              <Route path="/alarm/reports" element={<ProtectedRoute><AlarmReports /></ProtectedRoute>} />
              <Route path="/alarm/analytics" element={<ProtectedRoute><AlarmAnalytics /></ProtectedRoute>} />
              {/* FIN CENTRAL DE MONITOREO */}

              <Route path="/security/audit" element={<ProtectedRoute><AuditLogs /></ProtectedRoute>} />
              <Route path="/registros-sistema" element={<ProtectedRoute><SystemLogs /></ProtectedRoute>} />
              <Route path="/historial-inicio-sesion" element={<ProtectedRoute><LoginHistory /></ProtectedRoute>} />
              {/* FIN ANALITICAS */}

              <Route
                path="/live-tracking"
                element={
                  <ProtectedRoute>
                    <LiveTrackingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tracking-history"
                element={
                  <ProtectedRoute>
                    <TrackingHistoryPage />
                  </ProtectedRoute>
                }
              />


              {/* Keep any ?conversation=… so notification deep-links still open the thread. */}
              <Route path="/messenger" element={<Navigate to={`/messenger/operativos${window.location.search}`} replace />} />
              <Route
                path="/messenger/operativos"
                element={
                  <ProtectedRoute>
                    {/* key per scope: both routes render the same MessengerPage
                        type at the same tree position, so without a distinct key
                        React reuses the instance and just swaps the prop —
                        leaving the previously selected (client) thread on screen.
                        The key forces a fresh remount when switching scopes. */}
                    <MessengerPage key="messenger-operational" scope="operational" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/messenger/clientes"
                element={
                  <ProtectedRoute>
                    <MessengerPage key="messenger-client" scope="client" />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/radio"
                element={
                  <ProtectedRoute>
                    <RadioDispatch />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/radio/devices"
                element={
                  <ProtectedRoute>
                    <RadioDevices />
                  </ProtectedRoute>
                }
              />

              {/* INFORMES */}
              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <Reports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports/check-in-out"
                element={
                  <ProtectedRoute>
                    <CheckInOut />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports/site-tour"
                element={
                  <ProtectedRoute>
                    <SiteTour />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports/tasks"
                element={
                  <ProtectedRoute>
                    <Task />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports/dar"
                element={
                  <ProtectedRoute>
                    <Dar />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports/vehicle-patrol"
                element={
                  <ProtectedRoute>
                    <VehiclePatrol />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports/checklist"
                element={
                  <ProtectedRoute>
                    <Checklist />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports/post-kpi"
                element={
                  <ProtectedRoute>
                    <PostKpi />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports/guard-kpi"
                element={
                  <ProtectedRoute>
                    <GuardKpi />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports/incident/:id"
                element={
                  <ProtectedRoute>
                    <Incident />
                  </ProtectedRoute>
                }
              />
              {/* The reports-config "General Incident report" card + "Ver todos"
                  point here (plural); route them to the real incident report. */}
              <Route path="/reports/incidents" element={<ProtectedRoute><Incident /></ProtectedRoute>} />
              <Route path="/reports/incidents/general" element={<ProtectedRoute><Incident /></ProtectedRoute>} />
              <Route
                path="/reports/passdown"
                element={
                  <ProtectedRoute>
                    <Passdown />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports/watch-mode"
                element={
                  <ProtectedRoute>
                    <WatchMode />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports/tour-check-point"
                element={
                  <ProtectedRoute>
                    <TourCheckPoint />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports/guard-idle-log"
                element={
                  <ProtectedRoute>
                    <GuardIdleLog />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports/panic-button-log"
                element={
                  <ProtectedRoute>
                    <PanicButtonLog />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports/geo-fence-log"
                element={
                  <ProtectedRoute>
                    <GeoFenceLog />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports/guard-device-fall-report"
                element={
                  <ProtectedRoute>
                    <GuardDeviceFallReport />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports/post-order-ack"
                element={
                  <ProtectedRoute>
                    <PostOrderAck />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports/doc-policy-ack"
                element={
                  <ProtectedRoute>
                    <DocPolicyAck />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports/license"
                element={
                  <ProtectedRoute>
                    <License />
                  </ProtectedRoute>
                }
              />



              {/* FIN DE INFORMES */}

              {/* NOMINA */}

              {/* NÓMINA · Time & Attendance.
                  Payroll output lives in /nomina/payroll-summary (the old /payroll/*
                  stub pages were removed — they had no backend). */}
              <Route path="/nomina/dashboard" element={<ProtectedRoute><NominaDashboard /></ProtectedRoute>} />
              <Route path="/nomina/time-clock" element={<ProtectedRoute><NominaTimeClock /></ProtectedRoute>} />
              <Route path="/nomina/records" element={<ProtectedRoute><NominaRecords /></ProtectedRoute>} />
              <Route path="/nomina/exceptions" element={<ProtectedRoute><NominaExceptions /></ProtectedRoute>} />
              <Route path="/nomina/approvals" element={<ProtectedRoute><NominaApprovals /></ProtectedRoute>} />
              <Route path="/supervisors" element={<ProtectedRoute><SupervisorsPage /></ProtectedRoute>} />
              <Route path="/supervisor-positions" element={<ProtectedRoute><SupervisorPositionsPage /></ProtectedRoute>} />
              <Route path="/supervisors/:id" element={<ProtectedRoute><SupervisorDetailPage /></ProtectedRoute>} />
              <Route path="/supervisors/:id/perfil" element={<ProtectedRoute><SupervisorDetailPage /></ProtectedRoute>} />
              <Route path="/supervisors/:id/dispositivo" element={<ProtectedRoute><GuardDispositivoPage navKey="supervisors" title="Dispositivo" /></ProtectedRoute>} />
              <Route path="/supervisors/:id/indicadores" element={<ProtectedRoute><SupervisorKpisPage /></ProtectedRoute>} />
              <Route path="/supervisors/:id/notas" element={<ProtectedRoute><SupervisorNotesPage /></ProtectedRoute>} />
              <Route path="/supervisors/:id/licencias" element={<ProtectedRoute><SupervisorLicensesPage /></ProtectedRoute>} />
              <Route path="/tasks" element={<ProtectedRoute><TaskTracking /></ProtectedRoute>} />
              <Route path="/tasks/approvals" element={<ProtectedRoute><TaskApprovals /></ProtectedRoute>} />
              <Route path="/passdowns" element={<ProtectedRoute><PassdownsPage /></ProtectedRoute>} />
              <Route path="/nomina/payroll-summary" element={<ProtectedRoute><NominaPayrollSummary /></ProtectedRoute>} />
              <Route path="/nomina/rol-de-pagos" element={<ProtectedRoute><NominaRolDePagos /></ProtectedRoute>} />
              <Route path="/nomina/settings" element={<ProtectedRoute><NominaSettings /></ProtectedRoute>} />

              {/* FIN NOMINA */}


              {/* PROGRAMADOR */}
              <Route
                path="/time-off"
                element={
                  <ProtectedRoute>
                    <TimeOff />
                  </ProtectedRoute>
                }
              />
              {/* /attendance (Programador · Asistencia) removed — merged into
                  /nomina/records, which now shows patrols/incidents per shift. */}
              <Route
                path="/schedule"
                element={
                  <ProtectedRoute>
                    <Schedule />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/shift-exchange"
                element={
                  <ProtectedRoute>
                    <ShiftExchange />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/shift-status"
                element={
                  <ProtectedRoute>
                    <ShiftStatus />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/shift-templates"
                element={
                  <ProtectedRoute>
                    <ShiftTemplates />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/open-shifts"
                element={
                  <ProtectedRoute>
                    <OpenShifts />
                  </ProtectedRoute>
                }
              />
              {/* FIN PROGRAMADOR */}


              {/* DESPACHADOR */}
              <Route
                path="/dispatch-tickets"
                element={
                  <ProtectedRoute>
                    <DispatcherPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dispatch-tickets/new"
                element={
                  <ProtectedRoute>
                    <NewDispatchPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dispatch-tickets/:id/edit"
                element={
                  <ProtectedRoute>
                    <EditDispatchPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dispatch-tickets/:id"
                element={
                  <ProtectedRoute>
                    <DispatchDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dispatch-tickets/:id/print"
                element={
                  <ProtectedRoute>
                    <DispatchPrintablePage />
                  </ProtectedRoute>
                }
              />

              {/* Public shared dispatch view (no auth) */}
              <Route path="/public/dispatch/:token" element={<DispatchPublicView />} />

              {/* FIN DESPACHADOR */}

              {/* SOLICITUDES Y CALIFICACIONES DE CLIENTES */}
              <Route
                path="/customer-requests"
                element={
                  <ProtectedRoute>
                    <CustomerRequests />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/guard-ratings"
                element={
                  <ProtectedRoute>
                    <GuardRatings />
                  </ProtectedRoute>
                }
              />
              {/* FIN SOLICITUDES Y CALIFICACIONES DE CLIENTES */}

              {/* GESTION DE VISITANTES */}
              <Route
                path="/visitors"
                element={
                  <ProtectedRoute>
                    <Visitors />
                  </ProtectedRoute>
                }
              />
              {/* <Route
                path="/visitor/vehicle-list"
                element={
                  <ProtectedRoute>
                    <Vehicles />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/visitor/visit-list"
                element={
                  <ProtectedRoute>
                    <Visits />
                  </ProtectedRoute>
                }
              />*/}
              {/* FIN GESTION DE VISITANTES */}


              {/* VEHICLES */}
              <Route
                path="/vehicle-patrol/vehicles"
                element={
                  <ProtectedRoute>
                    <VehiclesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vehicle-patrol/vehicles/add-vehicle"
                element={
                  <ProtectedRoute>
                    <NewVehiclePage />
                  </ProtectedRoute>
                }
              />

              {/* RUTAS */}
              <Route
                path="/vehicle-patrol"
                element={
                  <ProtectedRoute>
                    <PatrullaBoardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vehicle-patrol/routes"
                element={
                  <ProtectedRoute>
                    <RoutesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tenant/:tenantId/vehicle-patrol/routes/add-new"
                element={
                  <ProtectedRoute>
                    <NewRoutePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tenant/:tenantId/vehicle-patrol/routes/:id/edit"
                element={
                  <ProtectedRoute>
                    <EditRoutePage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/patrol/:id/execute"
                element={
                  <ProtectedRoute>
                    <PatrolExecutionPage />
                  </ProtectedRoute>
                }
              />



              {/* CONFIGURACIONES */}
              <Route
                path="/setting/user-profile"
                element={
                  <ProtectedRoute>
                    <ProfileUser />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/setting/company-profile"
                element={
                  <ProtectedRoute>
                    <ProfileCompany />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/setting/change-password"
                element={
                  <ProtectedRoute>
                    <PasswordChangePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/setting/mobil"
                element={
                  <ProtectedRoute>
                    <MobilPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/setting/mobile-hub"
                element={
                  <ProtectedRoute>
                    <MobileHubPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/setting/notifications"
                element={
                  <ProtectedRoute>
                    <Notification />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/setting/politicas"
                element={
                  <ProtectedRoute>
                    <CompanyPoliciesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/setting/tipos-incidentes"
                element={
                  <ProtectedRoute>
                    <IncidentTypesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/setting/tipos-licencias"
                element={
                  <ProtectedRoute>
                    <LicenseTypePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/setting/conjunto-habilidades"
                element={
                  <ProtectedRoute>
                    <SkillSetsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/setting/Departamentos"
                element={
                  <ProtectedRoute>
                    <DepartmentPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/setting/campos-perfil"
                element={
                  <ProtectedRoute>
                    <ProfileFieldsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/setting"
                element={
                  <ProtectedRoute>
                    <SettingsHome />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/setting/roles"
                element={
                  <ProtectedRoute>
                    <UserRolesPage />
                  </ProtectedRoute>
                }
              />




              <Route
                path="/setting/integraciones"
                element={
                  <ProtectedRoute>
                    <IntegrationsList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/setting/integracion/:slug"
                element={
                  <ProtectedRoute>
                    <IntegrationDetail />
                  </ProtectedRoute>
                }
              />
              {/* The real payroll/nómina config lives at /nomina/settings (salary basis,
                  monthly, extra-hour types). /setting/payroll-setup was a no-op stub —
                  redirect it to the working page. */}
              <Route
                path="/setting/payroll-setup"
                element={<Navigate to="/nomina/settings" replace />}
              />
              <Route
                path="/setting/publishing-sites"
                element={
                  <ProtectedRoute>
                    <PostingGlobalPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/setting/keep-safe"
                element={
                  <ProtectedRoute>
                    <GuardsGlobalSettingsPage />
                    {/* FALTA */}
                  </ProtectedRoute>
                }
              />
              <Route
                path="/setting/rondas"
                element={
                  <ProtectedRoute>
                    <RondasSettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/setting/email-preferences"
                element={
                  <ProtectedRoute>
                    <EmailPreferencesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/setting/sms"
                element={
                  <ProtectedRoute>
                    <SmsBalancePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/setting/comunicaciones"
                element={
                  <ProtectedRoute>
                    <CommunicationsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/billing" element={<Navigate to="/setting/billing" replace />} />
              <Route
                path="/setting/billing"
                element={
                  <ProtectedRoute>
                    <BillingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/setting/report-configuration"
                element={
                  <ProtectedRoute>
                    <ReportSettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/setting/other-settings"
                element={
                  <ProtectedRoute>
                    <OtherSettingsPage />
                  </ProtectedRoute>
                }
              />



              <Route
                path="/setting/access-token"
                element={
                  <ProtectedRoute>
                    <DeveloperTokensPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/setting/request-records"
                element={
                  <ProtectedRoute>
                    <DeveloperRequestsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/idioma"
                element={
                  <ProtectedRoute>
                    <LanguagePage />
                  </ProtectedRoute>
                }
              />




              {/* GUARD APP (role-based) */}
              <Route path="/guard" element={<ProtectedRoute><GuardAppLayout /></ProtectedRoute>}>
                <Route index element={<GuardDashboard />} />
                <Route path="schedule" element={<GuardSchedulePage />} />
                <Route path="time-off" element={<GuardTimeOffPage />} />
              </Route>

              {/* Ruta raíz - redirige según estado de autenticación */}
              <Route path="/" element={<RoleBasedRedirect />} />

              {/* 404 - Página no encontrada */}
              <Route path="*" element={<NotFound />} />

            </Routes>
            </Suspense>
          </BrowserRouter>
        </ClientSelectionProvider>
      </AuthProvider>
    </LanguageProvider>
    </ThemeProvider>
    </QueryClientProvider>
  )
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-6">
      <div className="text-center">
        <ArrowLeftCircle className="mx-auto h-16 w-16 text-emerald-500 mb-4" />
        <h1 className="text-6xl font-extrabold text-emerald-600">404</h1>
        <p className="mt-4 text-lg text-foreground/70">Página no encontrada</p>
        <a
          href="/dashboard"
          className="mt-6 inline-block rounded-lg bg-emerald-600 px-6 py-2 text-white font-semibold shadow hover:bg-emerald-700 transition-all"
        >
          Ir al Dashboard
        </a>
      </div>
    </div>
  )
}

