import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MoreVertical, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import CountryPhoneSelect, { CountryPhoneSelectValue } from "@/components/CountryPhoneSelect";

type Preferred2FA = "none" | "sms" | "totp";

export default function TwoFactorAuthenticationForm() {
  const [preferred, setPreferred] = useState<Preferred2FA>("none");

  const [smsOpenEdit, setSmsOpenEdit] = useState(true); // muestra edición como en tu captura
  const [smsNumber, setSmsNumber] = useState("978804534");
  const [smsCountry, setSmsCountry] = useState<CountryPhoneSelectValue>({
    code: "EC",
    dialCode: "+593",
    name: "Ecuador",
  });

  const [totpSetupVisible, setTotpSetupVisible] = useState(false);
  const [totpCode, setTotpCode] = useState("");

  const otpauthUri = useMemo(() => {
    const label = encodeURIComponent("GuardsPro:usuario@empresa.com");
    const secret = "GI3WCNTBMQ4GCNDD"; // demo
    return `otpauth://totp/${label}?secret=${secret}&issuer=GuardsPro`;
  }, []);

  const handleSavePreferred = (val: Preferred2FA) => {
    setPreferred(val);
    toast.success(
      val === "none"
        ? "Se desactivó el método 2FA preferido."
        : `Método 2FA preferido: ${val === "sms" ? "SMS/Texto" : "Aplicación de Autenticación"}`
    );
  };

  const handleTotpStart = () => {
    setTotpSetupVisible(true);
    toast.message("Siga los pasos para vincular su app de autenticación.");
  };

  const handleTotpVerify = () => {
    if (!totpCode.trim()) {
      toast.error("Ingresa el código de 6 dígitos.");
      return;
    }
    toast.success("Aplicación de autenticación verificada.");
    setTotpSetupVisible(false);
    setTotpCode("");
  };

  const handleTotpCancel = () => {
    setTotpSetupVisible(false);
    setTotpCode("");
  };

  const handleSmsVerify = () => {
    if (!smsNumber.trim()) {
      toast.error("Ingresa tu número de móvil.");
      return;
    }
    toast.success("Código enviado por SMS (demo).");
  };

  return (
    <>
        <div className="max-w-5xl space-y-8">
          <p className="text-sm text-muted-foreground">
            Mantenga su cuenta extra segura con un segundo paso de autenticación.
          </p>

          <div className="space-y-2">
            <Label className="text-base font-semibold">Método 2FA Preferido</Label>
            <Select value={preferred} onValueChange={(v: Preferred2FA) => handleSavePreferred(v)}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Selecciona un método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ninguno</SelectItem>
                <SelectItem value="sms">SMS/Texto</SelectItem>
                <SelectItem value="totp">Aplicación de Autenticación</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <h3 className="text-base font-semibold mb-3">Métodos de dos factores</h3>
            <div className="space-y-4">
              {/* TOTP Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-lg">Aplicación de Autenticación</CardTitle>
                  {!totpSetupVisible && (
                    <Button variant="ghost" className="text-orange-500 hover:text-orange-600" onClick={handleTotpStart}>
                      Agregar
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {!totpSetupVisible ? (
                    <p className="text-sm text-muted-foreground">
                      Utilice una aplicación de autenticación o extensión de navegador para generar códigos de un solo uso.
                    </p>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <h4 className="font-medium">Escanee el código QR</h4>
                        <p className="text-sm text-muted-foreground">
                          Use una aplicación de autenticación o extensión de navegador para escanear.
                        </p>

                        {/* QR simulado */}
                        <div className="w-36 h-36 rounded border bg-muted grid place-items-center">
                          <ShieldCheck className="w-8 h-8 text-muted-foreground" />
                          <span className="sr-only">{otpauthUri}</span>
                        </div>

                        <p className="text-sm">
                          ¿No puede escanear? Puede usar la clave de configuración para configurar manualmente su aplicación de
                          autenticación. <span className="font-semibold">Su clave es GI3WCNTBMQ4GCNDD</span>
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Verifique el código desde la aplicación</Label>
                        <Input
                          inputMode="numeric"
                          placeholder="Ingresa el código de 6 dígitos"
                          value={totpCode}
                          onChange={(e) => setTotpCode(e.target.value.replace(/[^\d]/g, ""))}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button onClick={handleTotpVerify}>Verificar</Button>
                        <Button variant="secondary" onClick={handleTotpCancel}>
                          Cancelar
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* SMS Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-lg">SMS/Texto</CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-orange-500 hover:text-orange-600">
                        <MoreVertical className="h-5 w-5" />
                        <span className="sr-only">Más</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSmsOpenEdit(true)}>Editar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Reciba códigos de autenticación por SMS en su teléfono móvil al iniciar sesión.
                  </p>

                  {smsOpenEdit && (
                    <>
                      <div className="space-y-2">
                        <Label>Número de Móvil*</Label>
                        <div className="flex gap-2">
                          <CountryPhoneSelect value={smsCountry} onChange={setSmsCountry} className="w-44" />
                          <Input
                            inputMode="numeric"
                            placeholder="e.g. 93991234567"
                            value={smsNumber}
                            onChange={(e) => setSmsNumber(e.target.value.replace(/[^\d]/g, ""))}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          e.g. {smsCountry.dialCode}
                          93991234567
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button onClick={handleSmsVerify}>Verificar</Button>
                        <Button variant="secondary" onClick={() => setSmsOpenEdit(false)}>
                          Cancelar
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator />
        </div>
      </>
  );
}
