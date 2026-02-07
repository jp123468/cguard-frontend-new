import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Menu,
  Search,
  MessageSquare,
  HelpCircle,
  Bell,
  ChevronDown,
  ChevronRight,
  Settings,
  CreditCard,
  Clock,
  History,
  LogOut,
  Droplet,
  Sun,
  Moon,
  Star,
  StoreIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from 'react-i18next';
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type HeaderProps = {
  toggleSidebar: () => void;
  notificationsCount?: number;
  onChangeTheme?: (theme: "light" | "dark") => void;
  theme?: "light" | "dark";
};

function getDisplayName(user?: any) {
  const first = user?.firstName?.trim();
  const last = user?.lastName?.trim();
  if (first || last) return [first, last].filter(Boolean).join(" ");
  const email = user?.email || "";
  return email.split("@")[0] || "Usuario";
}
function getInitials(text: string) {
  const parts = (text || "").trim().split(/\s+/);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function Header({
  toggleSidebar,
  notificationsCount = 1,
  onChangeTheme,
  theme = "light",
}: HeaderProps) {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const userName = getDisplayName(user);
  const userEmail = user?.email ?? "";
  const avatar: string | undefined = user?.avatar || user?.photoURL || undefined;
  const tenantName =
    (user && (user.tenant && (user.tenant.tenant?.name || user.tenant.name))) ||
    (user && Array.isArray(user.tenants) && user.tenants[0] && (user.tenants[0].tenant?.name || user.tenants[0].tenantName)) ||
    "";

  const showTenant = Boolean(
    (user && user.tenant) || (user && Array.isArray(user.tenants) && user.tenants.length > 0)
  );

  const [openUser, setOpenUser] = useState(false);
  const [openTheme, setOpenTheme] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setOpenUser(false);
        setOpenTheme(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login");
      toast.success(t('auth.logout_success'));
    } catch {
      toast.error(t('auth.logout_failed'));
    }
  };

  const handleFeedbackSubmit = () => {
    if (rating === 0) {
      toast.error(t('header.select_rating'));
      return;
    }
    console.log({ rating, feedback: feedbackText });
    toast.success(t('header.feedback_thanks'));
    setFeedbackOpen(false);
    setRating(0);
    setHoverRating(0);
    setFeedbackText("");
  };

  const handleFeedbackClose = () => {
    setFeedbackOpen(false);
    setRating(0);
    setHoverRating(0);
    setFeedbackText("");
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm h-14">
      <div className="h-14 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded hover:bg-gray-100"
            aria-label={t('header.openMenu')}
            title={t('header.openMenu')}
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFeedbackOpen(true)}
            className="p-2 rounded hover:bg-gray-100"
            aria-label={t('header.feedback')}
            title={t('header.feedback')}
          >
            <MessageSquare className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-2 rounded hover:bg-gray-100" aria-label={t('header.search')} title={t('header.search')}>
            <Search className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => setHelpOpen(true)}
            className="p-2 rounded hover:bg-gray-100"
            aria-label={t('header.help')}
            title={t('header.help')}
          >
            <HelpCircle className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => setNotificationsOpen(true)}
            className="relative p-2 rounded hover:bg-gray-100"
            aria-label={t('header.notifications')}
            title={t('header.notifications')}
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {notificationsCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 h-4 min-w-4 px-1 rounded-full bg-emerald-500 text-white text-[10px] leading-4 text-center">
                {notificationsCount}
              </span>
            )}
          </button>

          <div ref={userRef} className="relative">
            <button
              onClick={() => {
                setOpenUser((v) => !v);
                setOpenTheme(false);
              }}
              className="flex items-center gap-2 rounded px-2 py-1 hover:bg-gray-100"
              title={userName || t('header.account')}
              aria-label={t('header.account')}
            >
              {avatar ? (
                <img src={avatar} alt={userName} className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gray-300 text-gray-700 text-xs font-semibold grid place-items-center">
                  {getInitials(userName)}
                </div>
              )}
              <div className="leading-tight hidden sm:block mr-1">
                <div className="text-[11px] text-gray-500">{showTenant ? tenantName : ''}</div>
                <div className="text-[11px] text-gray-800">{userName}</div>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-600" />
            </button>

            {openUser && (
              <div className="absolute right-0 mt-2 w-[320px] rounded-md border border-gray-200 bg-white shadow-lg">
                <div className="px-4 py-3 border-b border-gray-200">
                  <div className="text-[12px] text-gray-600">Conectado como</div>
                  <div className="text-[13px] font-medium text-gray-800 truncate">{userEmail}</div>
                </div>

                <div className="py-1">
                  <NavLink to="/setting/user-profile" className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-sm text-gray-800">
                    <Settings className="w-4 h-4 text-gray-600" />
                    {t('header.settings')}
                  </NavLink>
                  <NavLink to="/billing" className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-sm text-gray-800">
                    <CreditCard className="w-4 h-4 text-gray-600" />
                    {t('header.subscription')}
                  </NavLink>
                  <NavLink to="/branch" className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-sm text-gray-800">
                    <StoreIcon className="w-4 h-4 text-gray-600" />
                    {t('header.branches')}
                  </NavLink>
                  <NavLink to="/registros-sistema" className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-sm text-gray-800">
                    <Clock className="w-4 h-4 text-gray-600" />
                    {t('header.system_logs')}
                  </NavLink>
                  <NavLink to="/historial-inicio-sesion" className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-sm text-gray-800">
                    <History className="w-4 h-4 text-gray-600" />
                    {t('header.login_history')}
                  </NavLink>

                  <div className="relative">
                    <button
                      onClick={() => setOpenTheme((v) => !v)}
                      className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-50 text-sm text-gray-800"
                    >
                        <span className="inline-flex items-center gap-3">
                        <Droplet className="w-4 h-4 text-gray-600" />
                        {t('header.light_mode')}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>

                    {openTheme && (
                      <div className="absolute right-full top-0 mr-2 w-44 rounded-md border border-gray-200 bg-white shadow-lg">
                        <button
                          onClick={() => {
                            onChangeTheme?.("dark");
                            setOpenUser(false);
                            setOpenTheme(false);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${theme === "dark" ? "font-semibold text-gray-900" : "text-gray-800"}`}
                        >
                          <Moon className="w-4 h-4 text-gray-600" />
                          {t('header.dark_mode')}
                        </button>
                        <button
                          onClick={() => {
                            onChangeTheme?.("light");
                            setOpenUser(false);
                            setOpenTheme(false);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${theme === "light" ? "font-semibold text-gray-900" : "text-gray-800"}`}
                        >
                          <Sun className="w-4 h-4 text-gray-600" />
                          Modo claro
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-200 p-1">
                    <button onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                    <LogOut className="w-4 h-4" />
                    {t('header.logout')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feedback Modal */}
      <Dialog open={feedbackOpen} onOpenChange={handleFeedbackClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-normal">GuardsPro</DialogTitle>
            <DialogDescription>{t('header.feedback_modal_desc')}</DialogDescription>
          </DialogHeader>

          <div className="py-6">
            <h3 className="text-center text-base text-gray-700 mb-8">{t('header.feedback_modal_title')}</h3>

            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-10 h-10 ${star <= (hoverRating || rating)
                      ? "fill-gray-800 text-gray-800"
                      : "fill-none text-gray-400"
                      }`}
                  />
                </button>
              ))}
            </div>

            <Textarea
              placeholder={t('header.feedback_placeholder')}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              className="min-h-[120px] resize-none"
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleFeedbackSubmit}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8"
            >
              {t('header.send')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Help Modal */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-normal">¿Cómo podemos ayudar?</DialogTitle>
            <DialogDescription>Encuentra artículos, videos y soporte para resolver tus dudas.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-6">
            <button className="flex flex-col items-center gap-3 p-6 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-colors">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <HelpCircle className="w-6 h-6 text-gray-600" />
              </div>
              <div className="text-center">
                <div className="font-medium text-orange-600 mb-1">Centro de Soporte</div>
                <div className="text-sm text-gray-500">Lista de artículos</div>
              </div>
            </button>

            <button className="flex flex-col items-center gap-3 p-6 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-colors">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                </svg>
              </div>
              <div className="text-center">
                <div className="font-medium text-orange-600 mb-1">Video de Youtube</div>
                <div className="text-sm text-gray-500">Videos instructivos</div>
              </div>
            </button>

            <button className="flex flex-col items-center gap-3 p-6 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-colors">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-gray-600" />
              </div>
              <div className="text-center">
                <div className="font-medium text-orange-600 mb-1">Soporte por Chat</div>
                <div className="text-sm text-gray-500">Soporte por Chat en Vivo</div>
              </div>
            </button>

            <button className="flex flex-col items-center gap-3 p-6 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-colors">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <div className="text-center">
                <div className="font-medium text-orange-600 mb-1">Enviar Ticket</div>
                <div className="text-sm text-gray-500">Tickets de Soporte</div>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notifications Modal */}
      <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-medium">Actividad</DialogTitle>
              <button className="p-1 rounded hover:bg-gray-100">
                <Search className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <DialogDescription>Lista de actividad y notificaciones recientes.</DialogDescription>
          </DialogHeader>

          <div className="py-6">
            <div className="flex flex-col items-center justify-center text-center py-12">
              <img
                src="https://app.guardspro.com/assets/icons/custom/no-data-found.png"
                alt="Sin notificaciones"
                className="mb-4 h-32"
              />
              <h3 className="text-base font-semibold text-slate-700 mb-2">No se encontraron resultados</h3>
              <p className="text-sm text-gray-500 max-w-xs">
                No pudimos encontrar ningún elemento que coincida con su búsqueda
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
