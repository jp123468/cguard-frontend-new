import { BrowserRouter, Routes, Route, Navigate, useNavigate, useSearchParams } from "react-router-dom"
import { useEffect } from "react"
import ProtectedRoute, { PublicOnlyRoute } from "@/components/ProtectedRoute"
import Login from "./pages/auth/login"
import ForgotPassword from "./pages/auth/forgot-password"
import ResetPassword from "./pages/auth/reset-password"
import DashboardPage from "./pages/admin/dashboard/control-center/ControlCenter"
import OperationsMapFull from "./pages/admin/dashboard/control-center/OperationsMapFull"
import LanguagePage from "./pages/idioma/configuracion"
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import { ThemeProvider } from "./contexts/ThemeContext"
import { LanguageProvider } from "./contexts/LanguageContext"
import "./i18n"
import Register from "./pages/auth/register"
import VerifyEmail from "./pages/auth/verify-email"
import AcceptInvitation from "./pages/auth/accept-invitation"
import { ApiService } from '@/services/api/apiService';

import ProfileUser from "./pages/admin/Configuration/ProfileUserPage"
import ProfileCompany from "./pages/admin/Configuration/ProfileCompanyPage"
import Notification from "./pages/admin/Configuration/NotificationPage"
import MobilPage from "./pages/admin/Configuration/mobil/MobilPage"
import { ArrowLeftCircle } from "lucide-react"
import CompanyPoliciesPage from './pages/admin/Configuration/company-policies/CompanyPoliciesPage';
import IncidentTypesPage from "./pages/admin/Configuration/types-incidents/IncidentTypePage"
import LicenseTypePage from "./pages/admin/Configuration/types-licenses/LicensesTypePage"
import DepartmentPage from "./pages/admin/Configuration/department/DepartmentPage"
import SkillSetsPage from "./pages/admin/Configuration/skill-sets/SkillSetsPage"
import UserRolesPage from "./pages/admin/Configuration/user-roles/UserRolesPage"
import SettingsHome from "./pages/admin/Configuration/SettingsHome"
import IntegrationsList from "./pages/admin/Configuration/integrations/IntegrationsList"
import ProfileFieldsPage from "./pages/admin/Configuration/profile-fields/ProfileFieldsPage"
import IntegrationDetail from "./pages/admin/Configuration/integrations/IntegrationDetail"
import PayrollSettingsPage from "./pages/admin/Configuration/payroll/PayrollSettingsPage"
import PasswordChangePage from "./pages/admin/Configuration/change-password/ChangePasswordPage"
import PostingGlobalPage from './pages/admin/Configuration/posting-global/PostingGlobalPage';
import DeveloperRequestsPage from "./pages/admin/Configuration/application-records/DeveloperRequestsPage"
import ReportSettingsPage from "./pages/admin/Configuration/report-settings/ReportSettingsPage"
import OtherSettingsPage from "./pages/admin/Configuration/other-settings/OtherSettingsPage"
import GuardsGlobalSettingsPage from "./pages/admin/Configuration/guards-settings/GuardsGlobalSettingsPage"
import RondasSettingsPage from "./pages/admin/Configuration/rondas-settings/RondasSettingsPage"
import EmailPreferencesPage from "./pages/admin/Configuration/email-preferences/EmailPreferencesPage"
import SmsBalancePage from "./pages/admin/Configuration/sms/SmsBalancePage"
import CommunicationsPage from "./pages/admin/Configuration/communications/CommunicationsPage"
import BillingPage from "./pages/admin/Configuration/billing/BillingPage"
import DeveloperTokensPage from "./pages/admin/Configuration/developer-tokens/DeveloperTokensPage"
import ActivitiesPage from "./pages/admin/actividades/ActivitiesPage"
import ClientesPage from "./pages/admin/clientes/ClientsPage"
import NewOrEditClientPage from "./pages/admin/clientes/NewOrEditClientPage"
import ClientsDetails from "./pages/admin/clientes/ClientsDetails"
import PostSitePage from "./pages/admin/post-sites/PostSitePage"
import NewOrEditPostSitePage from "./pages/admin/post-sites/NewOrEditPostSitePage"
import PostSiteDetailsPage from "./pages/admin/post-sites/PostSiteDetailsPage"
import AddStationPage from "./pages/admin/post-sites/AddStationPage"
import StationDetailPage from "./pages/admin/post-sites/station-detail/StationDetailPage"
import GlobalInventoryPage from "./pages/admin/inventory/GlobalInventoryPage"
import ProjectsPage from "./pages/admin/projects/ProjectsPage"
import TrainingCoursesPage from "./pages/admin/training/TrainingCoursesPage"
import TrainingCourseDetailPage from "./pages/admin/training/TrainingCourseDetailPage"
import TrainingEnrollmentsPage from "./pages/admin/training/TrainingEnrollmentsPage"
import TrainingCatalogPage from "./pages/admin/training/TrainingCatalogPage"
import NewOrEditProjectPage from "./pages/admin/projects/NewOrEditProjectPage"
import SecurityGuardsPage from "./pages/admin/security-guards/SecurityGuardsPage"
import NewSecurityGuardPage from "./pages/admin/security-guards/NewSecurityGuardPage"
import SupervisorsPage from "./pages/admin/supervisors/SupervisorsPage"
import SupervisorDetailPage from "./pages/admin/supervisors/SupervisorDetailPage"
import GuardRegistration from "./pages/guard/registration"
import ClientRegistration from "./pages/client/registration"
import AdminOfficeUsersPage from "./pages/admin/administrative-office-users/AdminOfficeUsersPage"
import NewAdminUserPage from "./pages/admin/administrative-office-users/NewAdminUserPage"
import EditAdminUserPage from "./pages/admin/administrative-office-users/EditAdminUserPage";
import MessengerPage from "./pages/admin/messenger/MessengerPage"
import RadioDispatch from "./pages/radio/RadioDispatch"
import RadioDevices from "./pages/admin/radio/RadioDevices"
import DispatcherPage from "./pages/admin/dispatcher/DispatcherPage"
import CustomerRequests from "./pages/admin/requests/CustomerRequests"
import GuardRatings from "./pages/admin/guard-ratings/GuardRatings"
import NewDispatchPage from "./pages/admin/dispatcher/NewDispatchPage"
import EditDispatchPage from "./pages/admin/dispatcher/EditDispatchPage"
import VehiclesPage from "./pages/admin/vehicles/VehiclesPage"
import DispatchDetailsPage from '@/pages/admin/dispatcher/DispatchDetailsPage';
import DispatchPrintablePage from '@/pages/admin/dispatcher/DispatchPrintablePage';
import DispatchPublicView from '@/pages/public/DispatchPublicView';
import NewVehiclePage from "./pages/admin/vehicles/NewVehiclePage"
import RoutesPage from "./pages/admin/routes/RoutesPage"
import PatrullaBoardPage from "./pages/admin/vehicle-patrol/PatrullaBoardPage"
import NewRoutePage from "./pages/admin/routes/NewRoutePage"
import EditRoutePage from "./pages/admin/routes/EditRoutePage"
import PatrolExecutionPage from "./pages/guard/PatrolExecutionPage"
import LiveTrackingPage from "./pages/admin/gps-tracker/LiveTracking"
import TrackingHistoryPage from "./pages/admin/gps-tracker/TrackingHistory"
import Reports from "./pages/admin/Reports/Reports"
import Reporting from "./pages/admin/analytics/Reporting"
import Scheduling from "./pages/admin/analytics/Scheduling"
import VideoMonitoring from "./pages/admin/video/VideoMonitoring"
import VideoDevices from "./pages/admin/video/VideoDevices"
import VideoRelaySites from "./pages/admin/video/VideoRelaySites"
import VideoEvents from "./pages/admin/video/VideoEvents"
import VideoSharedClip from "./pages/admin/video/VideoSharedClip"
import AlarmQueue from "./pages/admin/alarm/AlarmQueue"
import AlarmPanels from "./pages/admin/alarm/AlarmPanels"
import AlarmSignals from "./pages/admin/alarm/AlarmSignals"
import AlarmCaseDetail from "./pages/admin/alarm/AlarmCaseDetail"
import AlarmReports from "./pages/admin/alarm/AlarmReports"
import AlarmAnalytics from "./pages/admin/alarm/AlarmAnalytics"
import AuditLogs from "./pages/admin/security/AuditLogs"
import SystemLogs from "./pages/admin/security/SystemLogs"
import LoginHistory from "./pages/admin/security/LoginHistory"
import NominaDashboard from "./pages/admin/nomina/NominaDashboard"
import NominaTimeClock from "./pages/admin/nomina/NominaTimeClock"
import NominaRecords from "./pages/admin/nomina/NominaRecords"
import NominaExceptions from "./pages/admin/nomina/NominaExceptions"
import NominaApprovals from "./pages/admin/nomina/NominaApprovals"
import TaskApprovals from "./pages/admin/tasks/TaskApprovals"
import TaskTracking from "./pages/admin/tasks/TaskTracking"
import PassdownsPage from "./pages/admin/passdown/PassdownsPage"
import NominaPayrollSummary from "./pages/admin/nomina/NominaPayrollSummary"
import NominaSettings from "./pages/admin/nomina/NominaSettings"
import Visitors from "./pages/admin/visitor-management/Visitors"
import Vehicles from "./pages/admin/visitor-management/Vehicles"
import Visits from "./pages/admin/visitor-management/Visits"
import PostSite from "./pages/admin/analytics/PostSite"
import Guard from "./pages/admin/analytics/Guard"
import TimeOff from "./pages/admin/programmer/TimeOff"
import Schedule from "./pages/admin/programmer/Schedule"
import ShiftExchange from "./pages/admin/programmer/ShiftExchange"
import ShiftStatus from "./pages/admin/programmer/ShiftStatus"
import ShiftTemplates from "./pages/admin/programmer/ShiftTemplates"
import OpenShifts from "./pages/admin/programmer/OpenShifts"
import CheckInOut from "./pages/admin/Reports/CheckInOut"
import SiteTour from "./pages/admin/Reports/SiteTour"
import Task from "./pages/admin/Reports/Task"
import Dar from "./pages/admin/Reports/Dar"
import VehiclePatrol from "./pages/admin/Reports/VehiclePatrol"
import Checklist from "./pages/admin/Reports/Checklist"
import PostKpi from "./pages/admin/Reports/PostKpi"
import GuardKpi from "./pages/admin/Reports/GuardKpi"
import Incident from "./pages/admin/Reports/Incident"
import Passdown from "./pages/admin/Reports/Passdown"
import WatchMode from "./pages/admin/Reports/WatchMode"
import TourCheckPoint from "./pages/admin/Reports/TourCheckPoint"
import GuardIdleLog from "./pages/admin/Reports/GuardIdleLog"
import PanicButtonLog from "./pages/admin/Reports/PanicButtonLog"
import GeoFenceLog from "./pages/admin/Reports/GeoFenceLog"
import GuardDeviceFallReport from "./pages/admin/Reports/GuardDeviceFallReport"
import PostOrderAck from "./pages/admin/Reports/PostOrderAck"
import DocPolicyAck from "./pages/admin/Reports/DocPolicyAck"
import License from "./pages/admin/Reports/License"
import EditSecurityGuardPage from "./pages/admin/security-guards/EditSecurityGuardPage";
import GuardOverview from "./pages/admin/security-guards/SegurityGuardsDetails";
import GuardResumenPage from "./pages/admin/security-guards/components/GuardOverview/GuardOverviewPage";
import GuardPerfilPage from "./pages/admin/security-guards/components/GuardProfile/GuardProfilepage";
import GuardAvailabilityPage from "./pages/admin/security-guards/components/GuardAvailability/GuardAvailabilitypage";
import GuardIndicadoresPage from "./pages/admin/security-guards/components/GuardKPIs/GuardKPIspage";
import GuardDispositivoPage from "./pages/admin/security-guards/components/GuardDevice/GuardDevicepage";
import GuardLicenciasPage from "./pages/admin/security-guards/components/GuardLicenses/GuardLicensespage";
import GuardNotasPage from "./pages/admin/security-guards/components/GuardNotes/GuardNotespage";
import GuardMemosPage from "./pages/admin/security-guards/components/GuardMemos/GuardMemosPage";
import GuardRemindersPage from "./pages/admin/security-guards/components/GuardReminders/GuardRemindersPage";
import GuardFilesPage from "./pages/admin/security-guards/components/GuardFiles/GuardFilesPage";
import GuardAsignarSitiosPage from "./pages/admin/security-guards/components/GuardAssign-Sites/GuardAsignarSitiosPage";
import GuardSkillsPage from "./pages/admin/security-guards/components/GuardSkills/GuardSkillsPage";
import GuardDepartamentoPage from "./pages/admin/security-guards/components/GuardDepartment/GuardDepartamentoPage";
import GuardConfiguracionPage from "./pages/admin/security-guards/components/GuardConfiguration/GuardConfiguracionPage";
import GuardAppLayout from "./layouts/GuardAppLayout";
import GuardDashboard from "./pages/guard/dashboard/GuardDashboard";
import GuardSchedulePage from "./pages/guard/dashboard/GuardSchedule";
import GuardTimeOffPage from "./pages/guard/dashboard/GuardTimeOff";
import MemosPage from "./pages/admin/memos/MemosPage";
import StyleGuide from "./pages/StyleGuide";
import TenantsPage from "./pages/admin/superadmin/TenantsPage";
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
    <ThemeProvider>
    <LanguageProvider>
      <AuthProvider>
        <ClientSelectionProvider>
          <BrowserRouter>
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
              <Route
                path="/post-sites"
                element={
                  <ProtectedRoute>
                    <PostSitePage />
                  </ProtectedRoute>
                }
              />
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
              <Route path="/supervisors/:id" element={<ProtectedRoute><SupervisorDetailPage /></ProtectedRoute>} />
              <Route path="/tasks" element={<ProtectedRoute><TaskTracking /></ProtectedRoute>} />
              <Route path="/tasks/approvals" element={<ProtectedRoute><TaskApprovals /></ProtectedRoute>} />
              <Route path="/passdowns" element={<ProtectedRoute><PassdownsPage /></ProtectedRoute>} />
              <Route path="/nomina/payroll-summary" element={<ProtectedRoute><NominaPayrollSummary /></ProtectedRoute>} />
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
          </BrowserRouter>
        </ClientSelectionProvider>
      </AuthProvider>
    </LanguageProvider>
    </ThemeProvider>
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

