import { useEffect, useRef, useState, useMemo } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Menu,
  Search,
  MessageSquare,
  HelpCircle,
  ChevronDown,
  Settings,
  CreditCard,
  Clock,
  History,
  LogOut,
  Sun,
  Moon,
  Star,
  ArrowRight,
  Radio,
} from "lucide-react";
import { useSyncExternalStore } from "react";
import { subscribeRadio, getRadioSnapshot, toggleWidget, radioResume } from "@/lib/radioVoiceManager";
import { useAuth } from "@/contexts/AuthContext";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useTranslation } from 'react-i18next';
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useNotificationStream, type PlatformNotification } from "@/hooks/useNotificationStream";
import { NotificationsPanel } from "@/components/notifications/NotificationsPanel";
import { showNotificationToast } from "@/components/notifications/notificationToast";
import { PanicAlertOverlay } from "@/components/notifications/PanicAlertOverlay";
import TrialDaysBadge from "@/components/TrialDaysBadge";

type HeaderProps = {
  toggleSidebar: () => void;
  notificationsCount?: number;
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
}: HeaderProps) {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useThemeContext();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const radio = useSyncExternalStore(subscribeRadio, getRadioSnapshot);

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

  // Derive tenantId for SSE notification stream
  const tenantId = useMemo(() => {
    if (user && Array.isArray(user.tenants) && user.tenants.length > 0) {
      return user.tenants[0].tenantId || user.tenants[0].tenant?.id || null;
    }
    try { return localStorage.getItem('tenantId'); } catch { return null; }
  }, [user]);

  // Active panic alerts (from the realtime stream). A panic shows a full-screen
  // red alarm overlay instead of a passing toast.
  const [panicAlerts, setPanicAlerts] = useState<PlatformNotification[]>([]);
  const dismissPanic = (id: string) =>
    setPanicAlerts((prev) => prev.filter((a) => a.id !== id));

  const { notifications, unreadCount, connected, markRead, markAllRead } =
    useNotificationStream(tenantId, (n) => {
      if (n.eventType === "panic.alert") {
        setPanicAlerts((prev) =>
          prev.some((a) => a.id === n.id) ? prev : [n, ...prev],
        );
      } else {
        showNotificationToast(n, navigate);
      }
    });

  const [openUser, setOpenUser] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setOpenUser(false);
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
    // NOTE: no feedback submit endpoint exists yet, so this is currently a
    // local-only acknowledgement. Do not log the free-text feedback (PII).
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
    <>
    <PanicAlertOverlay alerts={panicAlerts} onDismiss={dismissPanic} />
    <header className="sticky top-0 z-50 bg-background border-b border-border shadow-sm h-14" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div className="h-14 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
            aria-label={t('header.openMenu')}
            title={t('header.openMenu')}
          >
            <Menu className="w-4.5 h-4.5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <div className="mr-1 hidden xs:block sm:block">
            <TrialDaysBadge />
          </div>
          <button
            onClick={() => setFeedbackOpen(true)}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
            aria-label={t('header.feedback')}
            title={t('header.feedback')}
          >
            <MessageSquare className="w-4.5 h-4.5 text-muted-foreground" />
          </button>
          <button className="p-2 rounded-lg hover:bg-accent transition-colors" aria-label={t('header.search')} title={t('header.search')}>
            <Search className="w-4.5 h-4.5 text-muted-foreground" />
          </button>
          <button
            onClick={() => setHelpOpen(true)}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
            aria-label={t('header.help')}
            title={t('header.help')}
          >
            <HelpCircle className="w-4.5 h-4.5 text-muted-foreground" />
          </button>

          {/* Radio: opens the persistent general-channel widget. */}
          <button
            onClick={() => { radioResume(); toggleWidget(); }}
            className="relative p-2 rounded-lg hover:bg-accent transition-colors"
            aria-label="Radio"
            title="Radio · Canal general"
          >
            <Radio className={`w-4.5 h-4.5 ${radio.on ? "text-amber-500" : "text-muted-foreground"}`} />
            {radio.on && (
              <span className={`absolute right-1 top-1 h-2 w-2 rounded-full ring-2 ring-card ${radio.speaker ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
            )}
          </button>

          {/* Real-time notification bell */}
          <NotificationsPanel
            notifications={notifications}
            unreadCount={unreadCount}
            connected={connected}
            onMarkRead={markRead}
            onMarkAllRead={markAllRead}
          />

          <div className="w-px h-6 bg-border mx-1" />

          <div ref={userRef} className="relative">
            <button
              onClick={() => {
                setOpenUser((v) => !v);
              }}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 hover:bg-accent transition-colors"
              title={userName || t('header.account')}
              aria-label={t('header.account')}
            >
              {avatar ? (
                <img src={avatar} alt={userName} className="w-7 h-7 rounded-full object-cover ring-2 ring-primary/30" />
              ) : (
                <div
                  className="w-7 h-7 rounded-full text-white text-xs font-semibold grid place-items-center"
                  style={{ background: "linear-gradient(135deg, #C8860A, #F5C300)" }}
                >
                  {getInitials(userName)}
                </div>
              )}
              <div className="leading-tight hidden sm:block">
                {showTenant && <div className="text-[10px] text-muted-foreground font-medium">{tenantName}</div>}
                <div className="text-[12px] font-medium text-foreground">{userName}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>

            {openUser && (
              <div className="absolute right-0 mt-2 w-[300px] rounded-xl border border-border bg-card shadow-xl overflow-hidden">
                <div className="px-4 py-3.5 bg-gradient-to-r from-muted to-amber-50/40 dark:to-amber-950/20 border-b border-border">
                  <div className="text-[11px] text-muted-foreground mb-0.5">Conectado como</div>
                  <div className="text-[13px] font-semibold text-foreground truncate">{userEmail}</div>
                </div>

                <div className="py-1.5">
                  <NavLink to="/setting" className="flex items-center gap-3 px-4 py-2 hover:bg-accent text-sm text-foreground transition-colors">
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    {t('header.settings')}
                  </NavLink>
                  <NavLink to="/setting/billing" className="flex items-center gap-3 px-4 py-2 hover:bg-accent text-sm text-foreground transition-colors">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    {t('header.subscription')}
                  </NavLink>
                  <NavLink to="/registros-sistema" className="flex items-center gap-3 px-4 py-2 hover:bg-accent text-sm text-foreground transition-colors">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    {t('header.system_logs')}
                  </NavLink>
                  <NavLink to="/historial-inicio-sesion" className="flex items-center gap-3 px-4 py-2 hover:bg-accent text-sm text-foreground transition-colors">
                    <History className="w-4 h-4 text-muted-foreground" />
                    {t('header.login_history')}
                  </NavLink>

                  <button
                    onClick={() => { const next = theme === 'dark' ? 'light' : 'dark'; setTheme(next); setOpenUser(false); }}
                    className="w-full flex items-center justify-between px-4 py-2 hover:bg-accent text-sm text-foreground transition-colors"
                  >
                    <span className="inline-flex items-center gap-3">
                      {theme === 'dark'
                        ? <Moon className="w-4 h-4 text-muted-foreground" />
                        : <Sun className="w-4 h-4 text-muted-foreground" />
                      }
                      {theme === 'dark' ? 'Modo oscuro' : 'Modo claro'}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <ArrowRight className="h-3 w-3" />{theme === 'dark' ? 'claro' : 'oscuro'}
                    </span>
                  </button>
                </div>

                <div className="border-t border-border p-1.5">
                  <button onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
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
            <h3 className="text-center text-base text-foreground mb-8">{t('header.feedback_modal_title')}</h3>

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
                      ? "fill-gray-800 text-foreground"
                      : "fill-none text-muted-foreground"
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
              className="bg-primary hover:bg-primary/90 text-white px-8"
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
            <button className="flex flex-col items-center gap-3 p-6 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/10 transition-colors">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <HelpCircle className="w-6 h-6 text-foreground/70" />
              </div>
              <div className="text-center">
                <div className="font-medium text-primary mb-1">Centro de Soporte</div>
                <div className="text-sm text-muted-foreground">Lista de artículos</div>
              </div>
            </button>

            <button className="flex flex-col items-center gap-3 p-6 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/10 transition-colors">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <svg className="w-6 h-6 text-foreground/70" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                </svg>
              </div>
              <div className="text-center">
                <div className="font-medium text-primary mb-1">Video de Youtube</div>
                <div className="text-sm text-muted-foreground">Videos instructivos</div>
              </div>
            </button>

            <button className="flex flex-col items-center gap-3 p-6 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/10 transition-colors">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-foreground/70" />
              </div>
              <div className="text-center">
                <div className="font-medium text-primary mb-1">Soporte por Chat</div>
                <div className="text-sm text-muted-foreground">Soporte por Chat en Vivo</div>
              </div>
            </button>

            <button className="flex flex-col items-center gap-3 p-6 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/10 transition-colors">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <svg className="w-6 h-6 text-foreground/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <div className="text-center">
                <div className="font-medium text-primary mb-1">Enviar Ticket</div>
                <div className="text-sm text-muted-foreground">Tickets de Soporte</div>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

    </header>
    </>
  );
}
