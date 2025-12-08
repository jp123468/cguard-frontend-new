import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import ProtectedRoute, { PublicOnlyRoute } from "@/components/ProtectedRoute"
import Login from "./pages/auth/login"
import ForgotPassword from "./pages/auth/forgot-password"
import DashboardPage from "./pages/admin/dashboard/dasboard"
import LanguagePage from "./pages/idioma/configuracion"

import { AuthProvider } from "./contexts/AuthContext"
import { LanguageProvider } from "./contexts/LanguageContext"
import Register from "./pages/auth/register"
import ProfileUser from "./pages/admin/Configuration/ProfileUserPage"
import ProfileCompany from "./pages/admin/Configuration/ProfileCompanyPage"
import TwoFactorAuthentication from "./pages/admin/Configuration/TwoFactorAuthenticationPage"
import Notification from "./pages/admin/Configuration/NotificationPage"
import { ArrowLeftCircle } from "lucide-react"
import CompanyPoliciesPage from './pages/admin/Configuration/company-policies/CompanyPoliciesPage';
import IncidentTypesPage from "./pages/admin/Configuration/types-incidents/IncidentTypePage"
import LicenseTypePage from "./pages/admin/Configuration/types-licenses/LicensesTypePage"
import DepartmentPage from "./pages/admin/Configuration/department/DepartmentPage"
import SkillSetsPage from "./pages/admin/Configuration/skill-sets/SkillSetsPage"
import TaxesPage from "./pages/admin/Configuration/taxes/TaxesPage"
import UserRolesPage from "./pages/admin/Configuration/user-roles/UserRolesPage"
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
import DeveloperTokensPage from "./pages/admin/Configuration/developer-tokens/DeveloperTokensPage"
import SubscriptionDetailsPage from "./pages/admin/Subscription/subscription/SubscriptionDetailsPage"
import ModulesPage from "./pages/admin/Subscription/modules/ModulesPage"
import PaymentMethodsPage from "./pages/admin/Subscription/payment-methods/PaymentMethodsPage"
import InvoicesPage from "./pages/admin/Subscription/invoices/InvoicesPage"
import ActivitiesPage from "./pages/admin/actividades/ActivitiesPage"
import ClientesPage from "./pages/admin/clientes/ClientsPage"
import NewOrEditClientPage from "./pages/admin/clientes/NewOrEditClientPage"
import PostSitePage from "./pages/admin/post-sites/PostSitePage"
import NewOrEditPostSitePage from "./pages/admin/post-sites/NewOrEditPostSitePage"
import SecurityGuardsPage from "./pages/admin/security-guards/SecurityGuardsPage"
import NewSecurityGuardPage from "./pages/admin/security-guards/NewSecurityGuardPage"
import AdminOfficeUsersPage from "./pages/admin/administrative-office-users/AdminOfficeUsersPage"
import NewAdminUserPage from "./pages/admin/administrative-office-users/NewAdminUserPage"
import MessengerPage from "./pages/admin/messenger/MessengerPage"
import DispatcherPage from "./pages/admin/dispatcher/DispatcherPage"
import NewDispatchPage from "./pages/admin/dispatcher/NewDispatchPage"
import VehiclesPage from "./pages/admin/vehicles/VehiclesPage"
import BranchList from "./pages/admin/branch/BranchList"
import AddBranch from "./pages/admin/branch/AddBranch"
import NewVehiclePage from "./pages/admin/vehicles/NewVehiclePage"
import RoutesPage from "./pages/admin/routes/RoutesPage"
import NewRoutePage from "./pages/admin/routes/NewRoutePage"
import LiveTrackingPage from "./pages/admin/gps-tracker/LiveTracking"
import TrackingHistoryPage from "./pages/admin/gps-tracker/TrackingHistory"
import TimeRecorder from "./pages/admin/time-clock/TimeRecorder"
import TimeCard from "./pages/admin/time-clock/TimeCard"
import Breaks from "./pages/admin/time-clock/Breaks"
import Reports from "./pages/admin/reports/Reports"
import Reporting from "./pages/admin/analytics/Reporting"
import Scheduling from "./pages/admin/analytics/Scheduling"
import Invoicing from "./pages/admin/analytics/Invoicing"
import GeneratePayroll from "./pages/admin/payroll/GeneratePayroll"
import PastPayroll from "./pages/admin/payroll/PastPayroll"
import OvertimeMultiplier from "./pages/admin/payroll/OvertimeMultiplier"
import Visitors from "./pages/admin/visitor-management/Visitors"
import Vehicles from "./pages/admin/visitor-management/Vehicles"
import Visits from "./pages/admin/visitor-management/Visits"
import PostSite from "./pages/admin/analytics/PostSite"
import Guard from "./pages/admin/analytics/Guard"
import Estimates from "./pages/admin/billing/Estimates"
import NewEstimate from "./pages/admin/billing/NewEstimate"
import Invoices from "./pages/admin/billing/Invoices"
import NewInvoice from "./pages/admin/billing/NewInvoice"
import Items from "./pages/admin/billing/Items"
import ParkingContact from "./pages/admin/parking-manager/ParkingContact"
import ParkingVehicles from "./pages/admin/parking-manager/ParkingVehicles"
import ParkingArea from "./pages/admin/parking-manager/ParkingArea"
import ParkingLot from "./pages/admin/parking-manager/ParkingLot"
import ParkingIncident from "./pages/admin/parking-manager/ParkingIncident"
import ParkingIncidentType from "./pages/admin/parking-manager/ParkingIncidentType"
import NewIncidentType from "./pages/admin/parking-manager/NewIncidentType"
import TimeOff from "./pages/admin/programmer/TimeOff"
import Attendance from "./pages/admin/programmer/Attendance"
import Schedule from "./pages/admin/programmer/Schedule"
import ShiftExchange from "./pages/admin/programmer/ShiftExchange"
import ShiftStatus from "./pages/admin/programmer/ShiftStatus"
import ShiftTemplates from "./pages/admin/programmer/ShiftTemplates"
import OpenShifts from "./pages/admin/programmer/OpenShifts"
import CheckInOut from "./pages/admin/reports/CheckInOut"
import SiteTour from "./pages/admin/reports/SiteTour"
import Task from "./pages/admin/reports/Task"
import Dar from "./pages/admin/reports/Dar"
import VehiclePatrol from "./pages/admin/reports/VehiclePatrol"
import Checklist from "./pages/admin/reports/Checklist"
import PostKpi from "./pages/admin/reports/PostKpi"
import GuardKpi from "./pages/admin/reports/GuardKpi"
import Incident from "./pages/admin/reports/Incident"
import Passdown from "./pages/admin/reports/Passdown"
import WatchMode from "./pages/admin/reports/WatchMode"
import TourCheckPoint from "./pages/admin/reports/TourCheckPoint"
import GuardIdleLog from "./pages/admin/reports/GuardIdleLog"
import PanicButtonLog from "./pages/admin/reports/PanicButtonLog"
import GeoFenceLog from "./pages/admin/reports/GeoFenceLog"
import GuardDeviceFallReport from "./pages/admin/reports/GuardDeviceFallReport"
import PostOrderAck from "./pages/admin/reports/PostOrderAck"
import DocPolicyAck from "./pages/admin/reports/DocPolicyAck"
import License from "./pages/admin/reports/License"

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
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
              path="/login"
              element={
                <PublicOnlyRoute>
                  <Login />
                </PublicOnlyRoute>
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
              path="/forgot-password"
              element={
                <PublicOnlyRoute>
                  <ForgotPassword />
                </PublicOnlyRoute>
              }
            />

            {/* Rutas protegidas (requieren autenticación) */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
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
              path="/post-sites/edit/:id"
              element={
                <ProtectedRoute>
                  <NewOrEditPostSitePage />
                </ProtectedRoute>
              }
            />
            {/* FIN CLIENTES */}

            {/* SUCURSALES */}
            <Route
              path="/branch"
              element={
                <ProtectedRoute>
                  <BranchList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/branch/add-branch"
              element={
                <ProtectedRoute>
                  <AddBranch />
                </ProtectedRoute>
              }
            />
            {/* FIN SUCURSALES */}

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
              path="/analytics/invoicer"
              element={
                <ProtectedRoute>
                  <Invoicing />
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


            <Route
              path="/messenger"
              element={
                <ProtectedRoute>
                  <MessengerPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/time-log"
              element={
                <ProtectedRoute>
                  <TimeRecorder />
                </ProtectedRoute>
              }
            />
            <Route
              path="/time-card"
              element={
                <ProtectedRoute>
                  <TimeCard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/breaks"
              element={
                <ProtectedRoute>
                  <Breaks />
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

            <Route
              path="/payroll/generate-payroll"
              element={
                <ProtectedRoute>
                  <GeneratePayroll />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll/past-payroll"
              element={
                <ProtectedRoute>
                  <PastPayroll />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll/overtime-multiplier"
              element={
                <ProtectedRoute>
                  <OvertimeMultiplier />
                </ProtectedRoute>
              }
            />
            {/* <Route
            path="/payroll/overtime-multiplier/new-overtime-multiplier"
            element={
              <ProtectedRoute>
                <OvertimeMultiplier />
              </ProtectedRoute>
            }
          /> */}

            {/* FIN NOMINA */}


            {/* INTEGRACIONES */}
            <Route
              path="/estimates"
              element={
                <ProtectedRoute>
                  <Estimates />
                </ProtectedRoute>
              }
            />
            <Route
              path="/estimates/add-new"
              element={
                <ProtectedRoute>
                  <NewEstimate />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoices"
              element={
                <ProtectedRoute>
                  <Invoices />
                </ProtectedRoute>
              }
            />
            <Route
              path="/billing/invoices/new"
              element={
                <ProtectedRoute>
                  <NewInvoice />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoicer/items"
              element={
                <ProtectedRoute>
                  <Items />
                </ProtectedRoute>
              }
            />
            <Route
              path="/parking-manager/parking-contact"
              element={
                <ProtectedRoute>
                  <ParkingContact />
                </ProtectedRoute>
              }
            />
            <Route
              path="/parking-manager/parking-vehicle"
              element={
                <ProtectedRoute>
                  <ParkingVehicles />
                </ProtectedRoute>
              }
            />
            <Route
              path="/parking-manager/parking-area"
              element={
                <ProtectedRoute>
                  <ParkingArea />
                </ProtectedRoute>
              }
            />
            <Route
              path="/parking-manager/parking-lot"
              element={
                <ProtectedRoute>
                  <ParkingLot />
                </ProtectedRoute>
              }
            />
            <Route
              path="/parking-manager/parking-incident"
              element={
                <ProtectedRoute>
                  <ParkingIncident />
                </ProtectedRoute>
              }
            />
            <Route
              path="/parking-manager/incident-type"
              element={
                <ProtectedRoute>
                  <ParkingIncidentType />
                </ProtectedRoute>
              }
            />
            <Route
              path="/parking-manager/incident-type/new"
              element={
                <ProtectedRoute>
                  <NewIncidentType />
                </ProtectedRoute>
              }
            />

            {/* PROGRAMADOR */}
            <Route
              path="/time-off"
              element={
                <ProtectedRoute>
                  <TimeOff />
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance"
              element={
                <ProtectedRoute>
                  <Attendance />
                </ProtectedRoute>
              }
            />
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

            {/* FIN DESPACHADOR */}

            {/* GESTION DE VISITANTES */}
            <Route
              path="/visitors"
              element={
                <ProtectedRoute>
                  <Visitors />
                </ProtectedRoute>
              }
            />
            <Route
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
            />
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
              path="/vehicle-patrol/routes"
              element={
                <ProtectedRoute>
                  <RoutesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vehicle-patrol/routes/add-new"
              element={
                <ProtectedRoute>
                  <NewRoutePage />
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
              path="/setting/two-factor-authentication"
              element={
                <ProtectedRoute>
                  <TwoFactorAuthentication />
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
              path="/setting/impuestos"
              element={
                <ProtectedRoute>
                  <TaxesPage />
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
            <Route
              path="/setting/payroll-setup"
              element={
                <ProtectedRoute>
                  <PayrollSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/setting/payroll-setup"
              element={
                <ProtectedRoute>
                  <PayrollSettingsPage />
                </ProtectedRoute>
              }
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

            {/* SUSCIPCIONES */}
            <Route
              path="/billing"
              element={
                <ProtectedRoute>
                  <SubscriptionDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/billing-modulos"
              element={
                <ProtectedRoute>
                  <ModulesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/billing-metodos"
              element={
                <ProtectedRoute>
                  <PaymentMethodsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/billing-facturas"
              element={
                <ProtectedRoute>
                  <InvoicesPage />
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




            {/* Ruta raíz - redirige según estado de autenticación */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* 404 - Página no encontrada */}
            <Route path="*" element={<NotFound />} />

          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  )
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="text-center">
        <ArrowLeftCircle className="mx-auto h-16 w-16 text-emerald-500 mb-4" />
        <h1 className="text-6xl font-extrabold text-emerald-600">404</h1>
        <p className="mt-4 text-lg text-gray-600">Página no encontrada</p>
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

