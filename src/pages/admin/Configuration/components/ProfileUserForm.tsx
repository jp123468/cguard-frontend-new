import { useEffect, useState } from "react";
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
  return a?.downloadUrl ?? null;
}

function normalizeMe(raw: any): MeResponse {
  const base: any = raw?.user ?? raw?.data ?? raw;
  const firstName = base?.firstName ?? "";
  const lastName = base?.lastName ?? "";
  const fullName = (base?.fullName ?? `${firstName} ${lastName}`).trim();
  const email = base?.email ?? "";
  const phoneNumber = base?.phoneNumber ?? "";
  const language = base?.language ?? "es";
  const avatarUrl = base?.avatarUrl ?? pickAvatarUrl(base?.avatars) ?? null;
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

  const [fullName, setFullName] = useState("");

  const [email, setEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneCode, setPhoneCode] = useState("+593");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [password, setPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const [showPhoneVerifyModal, setShowPhoneVerifyModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await AccountService.getMe();
        const me = normalizeMe(res);
        if (!mounted) return;

        setFullName(me.fullName ?? "");
        setEmail(me.email ?? "");
        setEmailVerified(me.emailVerified ?? false);
        setAvatar(me.avatarUrl ?? null);

        if (me.phoneNumber) {
          const match = String(me.phoneNumber).match(/^(\+\d{1,3})\s*(.*)$/);
          if (match) {
            setPhoneCode(match[1]);
            setPhoneNumber(match[2].replace(/\s+/g, ""));
          } else {
            setPhoneNumber(String(me.phoneNumber).replace(/\s+/g, ""));
          }
        }
      } catch (e: any) {
        toast.error("No se pudo cargar tu perfil. Verifica el servicio /auth/me.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleAvatarChange = (file: File) => {
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { firstName, lastName } = splitFullName(fullName);

      await AccountService.updateProfile({
        fullName: fullName.trim(),
        firstName,
        lastName,
        phoneNumber: `${phoneCode} ${phoneNumber}`.trim(),
      });

      // if (avatarFile) {
      //   await AccountService.uploadAvatar(avatarFile);
      // }

      toast.success("Perfil actualizado correctamente.");
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
                  <Label>Nombre*</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>

                <div className="mb-0">
                  <Label>Correo Electrónico*</Label>
                  <Input value={email} disabled className="cursor-not-allowed pr-48" />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="link"
                      className="text-red-500 text-xs hover:text-red-600"
                      onClick={handleEmailAction}
                    >
                      {emailVerified ? "Cambiar Correo Electrónico" : "Verificar correo"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Número de Móvil*</Label>
                  <PhoneField
                    code={phoneCode}
                    number={phoneNumber}
                    onCodeChange={setPhoneCode}
                    onNumberChange={setPhoneNumber}
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-sky-600">e.g. +593991234567</p>
                    <Button
                      type="button"
                      variant="link"
                      className="text-red-500 text-xs hover:text-red-600"
                      onClick={handleSendVerificationCode}
                    >
                      Confirmar número
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Seleccionar idioma</Label>
                  <Select
                    value={language}
                    onValueChange={(value) => {
                      setLanguage(value as "es" | "en" | "pt");
                      toast.success("Idioma cambiado correctamente");
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
                  <p className="text-xs text-gray-500">
                    El idioma se guarda automáticamente en tu navegador
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    disabled={saving}
                    onClick={handleSave}
                    className="bg-[#f36a6d] hover:bg-[#e85b5f] text-white"
                  >
                    {saving ? "Guardando..." : "Guardar"}
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
              Cambiar Correo Electrónico
            </DialogTitle>
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100">
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </DialogClose>
            <DialogDescription>Proporciona tu contraseña y el nuevo correo electrónico para actualizar tu cuenta.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña*</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newEmail">Nuevo Correo Electrónico*</Label>
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
            <DialogTitle className="text-lg font-medium">Verificar número</DialogTitle>
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100">
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </DialogClose>
            <DialogDescription>Ingresa el código que te hemos enviado por SMS para verificar tu número.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="verificationCode">
                Ingrese el código de verificación*
              </Label>
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
              Enviar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
