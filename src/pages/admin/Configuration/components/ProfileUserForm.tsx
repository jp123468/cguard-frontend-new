import { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { X } from "lucide-react";
import AccountService from "@/services/accountService";
import { useAuth } from "@/contexts/AuthContext";
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import AvatarUploader from "./profile/AvatarUploader";
import PhoneField from "./profile/PhoneField";
import { useLanguage } from "@/contexts/LanguageContext";

type MeTenantSetting = { theme?: string; logoUrl?: string | null };
type MeTenant = { name?: string; settings?: MeTenantSetting[] };
type MeAvatar = { downloadUrl?: string } | string;

type MeResponse = {
  id: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email: string;
  phoneNumber?: string;
  language?: string;
  avatarUrl?: string | null;
  avatars?: MeAvatar[];
  tenants?: Array<{ tenant?: MeTenant }>;
  emailVerified?: boolean;
};

function pickAvatarUrl(avatars?: MeAvatar[] | null): string | null {
  if (!avatars || avatars.length === 0) return null;
  const a = avatars[0];
  if (typeof a === "string") return a;
  // Prefer an explicit full download URL
  if ((a as any).downloadUrl) return String((a as any).downloadUrl);
  // Some APIs return a privateUrl path; build a download endpoint if it's relative
  if ((a as any).privateUrl) {
    const privateUrl = String((a as any).privateUrl);
    // If it's already an absolute URL, return it; otherwise construct download path
    if (/^https?:\/\//i.test(privateUrl)) return privateUrl;
    return `/file/download?privateUrl=${encodeURIComponent(privateUrl)}`;
  }
  // Fallback to other common fields
  if ((a as any).url) return String((a as any).url);
  if ((a as any).src) return String((a as any).src);
  return null;
}

function normalizeMe(raw: any): MeResponse {
  const base: any = raw?.user ?? raw?.data ?? raw;
  const firstName = base?.firstName ?? "";
  const lastName = base?.lastName ?? "";
  const fullName = (base?.fullName ?? `${firstName} ${lastName}`).trim();
  const email = base?.email ?? "";
  const phoneNumber = base?.phoneNumber ?? "";
  const language = base?.language ?? "es";
  let avatarUrl = base?.avatarUrl ?? pickAvatarUrl(base?.avatars) ?? null;
  if (avatarUrl) {
    try {
      // Encode spaces and other characters in the URL path
      avatarUrl = encodeURI(String(avatarUrl));
    } catch (e) {
      // if encoding fails, keep original
    }
  }
  const tenants = base?.tenants ?? [];
  const emailVerified = base?.emailVerified ?? false;

  return {
    id: base?.id,
    firstName,
    lastName,
    fullName,
    email,
    phoneNumber,
    language,
    avatarUrl,
    avatars: base?.avatars ?? [],
    tenants,
    emailVerified,
  };
}

function splitFullName(name: string): { firstName: string; lastName: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { firstName: "", lastName: "" };
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export default function ProfileUserForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();

  const [fullName, setFullName] = useState("");

  const [email, setEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneCode, setPhoneCode] = useState("+593");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [password, setPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const [showPhoneVerifyModal, setShowPhoneVerifyModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const { loading: authLoading } = useAuth();
  useEffect(() => {
    let mounted = true;
    // Wait until auth provider finished initializing to avoid calling without token
    if (authLoading) {
      // we will re-run when authLoading changes
      return;
    }

    (async () => {
      try {
        const res = await AccountService.getMe();
        const raw = res?.user ?? res?.data ?? res;
        const me = normalizeMe(res);
        console.log('[ProfileUserForm] /auth/me response raw:', raw, 'normalized:', me);
        setCurrentUserId(raw?.id ?? null);
        const tid = raw?.tenants && raw.tenants.length ? raw.tenants[0].tenant?.id : localStorage.getItem('tenantId');
        setCurrentTenantId(tid ?? null);
        if (!mounted) return;

        // Prefer explicit fullName (non-empty), otherwise try first/last, otherwise fallback to email
        const resolvedFullName = (me.fullName && String(me.fullName).trim())
          ? String(me.fullName).trim()
          : ((me.firstName || me.lastName)
              ? `${me.firstName ?? ''} ${me.lastName ?? ''}`.trim()
              : (me.email ?? ""));
        setFullName(resolvedFullName);
        setEmail(me.email ?? "");
        setEmailVerified(me.emailVerified ?? false);
        setAvatar(me.avatarUrl ?? null);

        // phoneNumber may be stored on the user or on the tenant object
        const tenantPhone = (me.tenants && Array.isArray(me.tenants) && me.tenants[0] && me.tenants[0].tenant && (me.tenants[0].tenant as any).phone)
          ? (me.tenants[0].tenant as any).phone
          : null;
        // Treat empty string as absent: prefer explicit non-empty user phone, otherwise tenant phone
        const phoneSource = (me.phoneNumber && String(me.phoneNumber).trim() !== "")
          ? me.phoneNumber
          : (tenantPhone && String(tenantPhone).trim() !== "")
            ? tenantPhone
            : null;
        if (phoneSource) {
          try {
            const parsed = parsePhoneNumberFromString(String(phoneSource));
            if (parsed && parsed.country) {
              setPhoneCode(`+${parsed.countryCallingCode}`);
              setPhoneNumber(parsed.nationalNumber ?? String(phoneSource).replace(/\s+/g, ""));
            } else {
              const match = String(phoneSource).match(/^(\+\d{1,3})\s*(.*)$/);
              if (match) {
                setPhoneCode(match[1]);
                setPhoneNumber(match[2].replace(/\s+/g, ""));
              } else {
                setPhoneNumber(String(phoneSource).replace(/\s+/g, ""));
              }
            }
          } catch (err) {
            const match = String(phoneSource).match(/^(\+\d{1,3})\s*(.*)$/);
            if (match) {
              setPhoneCode(match[1]);
              setPhoneNumber(match[2].replace(/\s+/g, ""));
            } else {
              setPhoneNumber(String(phoneSource).replace(/\s+/g, ""));
            }
          }
        }
      } catch (e: any) {
        toast.error("No se pudo cargar tu perfil.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [authLoading]);

  const handleAvatarChange = (file: File | null) => {
    setAvatarFile(file);
    if (file) setAvatar(URL.createObjectURL(file));
    else setAvatar(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { firstName, lastName } = splitFullName(fullName);

      // Build payload only with non-empty values to avoid overwriting DB with empty strings
      const payload: any = {};
      const trimmedFull = fullName.trim();
      if (trimmedFull) payload.fullName = trimmedFull;
      if (firstName && String(firstName).trim() !== "") payload.firstName = firstName;
      if (lastName && String(lastName).trim() !== "") payload.lastName = lastName;

      // Normalize phone to E.164 when possible before sending
      let phoneToSend = `${phoneCode} ${phoneNumber}`.trim();
      try {
        const parsedSend = parsePhoneNumberFromString(phoneToSend);
        if (parsedSend && parsedSend.isValid()) {
          phoneToSend = parsedSend.number; // E.164
        }
      } catch (err) {
        // keep raw value
      }
      if (phoneToSend && String(phoneToSend).trim() !== "") payload.phoneNumber = phoneToSend;

      let didUpdate = false;
      if (Object.keys(payload).length > 0) {
        await AccountService.updateProfile(payload);
        didUpdate = true;
      }
      if (avatarFile && currentTenantId && currentUserId) {
        try {
          await AccountService.uploadAvatar(avatarFile, currentTenantId, currentUserId);
          const refreshed = await AccountService.getMe();
          const refreshedMe = normalizeMe(refreshed);
          setAvatar(refreshedMe.avatarUrl ?? null);
          didUpdate = true;
        } catch (err) {
          // ignore upload errors here and let user know via toast
          console.error('Avatar upload failed', err);
          toast.error('No se pudo subir el avatar.');
        }
      }
      if (didUpdate) {
        toast.success("Perfil actualizado correctamente.");
      } else {
        toast.success("No hubo cambios para guardar.");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Error al guardar el perfil.");
    } finally {
      setSaving(false);
    }
  };

  const handleEmailAction = () => {
    if (emailVerified) {
      setShowEmailModal(true);
      setNewEmail("");
      setPassword("");
    } else {
      handleVerifyEmail();
    }
  };

  const handleVerifyEmail = async () => {
    try {
      await AccountService.sendVerifyEmail(email);
      toast.success("Se envió un correo de verificación.");
    } catch {
      toast.error("No se pudo enviar el correo de verificación.");
    }
  };

  const handleChangeEmail = async () => {
    if (!password || !newEmail) {
      toast.error("Por favor completa todos los campos.");
      return;
    }

    try {
      await AccountService.changeEmail({ password, newEmail });
      toast.success("Correo actualizado correctamente. Verifica tu nuevo correo.");
      setEmail(newEmail);
      setEmailVerified(false);
      setShowEmailModal(false);
      setPassword("");
      setNewEmail("");
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Error al cambiar el correo.");
    }
  };

  const handleVerifyPhone = async () => {
    if (!verificationCode) {
      toast.error("Por favor ingresa el código de verificación.");
      return;
    }

    try {
      toast.success("Número verificado correctamente.");
      setShowPhoneVerifyModal(false);
      setVerificationCode("");
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Error al verificar el número.");
    }
  };

  const handleSendVerificationCode = async () => {
    try {
      toast.success("Código de verificación enviado.");
      setShowPhoneVerifyModal(true);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Error al enviar el código.");
    }
  };

  return (
    <>
      <div>
        <div className="flex justify-center mb-8">
          {loading ? (
            <Skeleton className="w-32 h-32 rounded-md" />
          ) : (
            <AvatarUploader src={avatar ?? undefined} onChange={handleAvatarChange} size={128} />
          )}
        </div>

        <Card>
          <CardContent className="space-y-6 p-6">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-5 w-56" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>{t('profile.name')}</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>

                <div className="mb-0">
                  <Label>{t('profile.email')}</Label>
                  <Input value={email} disabled className="cursor-not-allowed pr-48" />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="link"
                      className="text-red-500 text-xs hover:text-red-600"
                      onClick={handleEmailAction}
                    >
                      {emailVerified ? t('profile.changeEmail') : t('profile.verifyEmail')}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('profile.phone')}</Label>
                  <PhoneField
                    code={phoneCode}
                    number={phoneNumber}
                    onCodeChange={setPhoneCode}
                    onNumberChange={setPhoneNumber}
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-sky-600">{t('profile.phoneExample')}</p>
                    <Button
                      type="button"
                      variant="link"
                      className="text-red-500 text-xs hover:text-red-600"
                      onClick={handleSendVerificationCode}
                    >
                      {t('profile.confirmNumber')}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('profile.selectLanguage')}</Label>
                  <Select
                    value={language}
                    onValueChange={(value) => {
                      setLanguage(value as "es" | "en" | "pt");
                      toast.success(t('profile.languageSaved'));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Idioma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">🇪🇸 Español</SelectItem>
                      <SelectItem value="en">🇺🇸 English</SelectItem>
                      <SelectItem value="pt">🇧🇷 Português</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">{t('profile.languageSaved')}</p>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    disabled={saving}
                    onClick={handleSave}
                    className="bg-[#f36a6d] hover:bg-[#e85b5f] text-white"
                  >
                    {saving ? t('profile.saving') : t('profile.save')}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
            <DialogTitle className="text-lg font-medium">
              {t('profile.changeEmailTitle')}
            </DialogTitle>
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100">
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </DialogClose>
            <DialogDescription>{t('profile.changeEmailDesc')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t('profile.password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newEmail">{t('profile.newEmail')}</Label>
              <Input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="nuevo@correo.com"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleChangeEmail}
              className="bg-[#f36a6d] hover:bg-[#e85b5f] text-white"
            >
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPhoneVerifyModal} onOpenChange={setShowPhoneVerifyModal}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
            <DialogTitle className="text-lg font-medium">{t('profile.verifyNumberTitle')}</DialogTitle>
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100">
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </DialogClose>
            <DialogDescription>{t('profile.verifyNumberDesc')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="verificationCode">{t('profile.enterVerificationCode')}</Label>
              <Input
                id="verificationCode"
                type="text"
                placeholder="123456"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleVerifyPhone}
              className="text-gray-400 hover:text-gray-600"
              variant="ghost"
            >
              {t('profile.send')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
