"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CountryPhoneSelect, { CountryPhoneSelectValue } from "@/components/CountryPhoneSelect";
import { toast } from "sonner";
import { Camera } from "lucide-react";

export default function ProfileCompanyForm() {
  const [logo, setLogo] = useState<string | null>(null);

  const [country, setCountry] = useState<CountryPhoneSelectValue>({
    code: "US",
    dialCode: "+1",
    name: "United States",
    flag: "🇺🇸",
  });

  const [form, setForm] = useState({
    name: "Seguridad BAS",
    phone: "8014004269",
    website: "",
    address: "Antonio Miguel de solier N29-26 y bartolome de las casas",
    email: "",
    license: "",
    timezone: "America/Guayaquil",
  });

  const onPickLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(String(reader.result));
    reader.readAsDataURL(f);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Datos de la empresa guardados");
  };

  return (
    <>
      <form onSubmit={onSubmit}>
        <div className="w-full flex flex-col items-center gap-3 mb-8">
          <div className="relative">
            <div className="w-28 h-28 rounded-full border bg-muted overflow-hidden grid place-items-center">
              {logo ? (
                <img src={logo} alt="logo" className="w-full h-full object-cover" />
              ) : (
                <div className="text-4xl">🏢</div>
              )}
            </div>
            <label
              htmlFor="logo"
              className="absolute -right-2 -bottom-2 h-8 w-8 rounded-full bg-muted grid place-items-center cursor-pointer border"
            >
              <Camera className="h-4 w-4 text-muted-foreground" />
            </label>
            <input id="logo" type="file" accept="image/*" className="hidden" onChange={onPickLogo} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-2">
            <Label>Nombre de la Empresa*</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="Nombre"
            />
          </div>

          <div className="space-y-2">
            <Label>Número de Teléfono de la Empresa*</Label>
            <div className="flex gap-2">
              <CountryPhoneSelect value={country} onChange={setCountry} className="w-44" />
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) =>
                  setForm((s) => ({ ...s, phone: e.target.value.replace(/[^\d]/g, "") }))
                }
                placeholder="e.g. 12015550123"
              />
            </div>
            <p className="text-xs text-muted-foreground">e.g. {country.dialCode}2015550123</p>
          </div>

          <div className="space-y-2">
            <Label>Sitio Web de la Empresa</Label>
            <Input
              type="url"
              value={form.website}
              onChange={(e) => setForm((s) => ({ ...s, website: e.target.value }))}
              placeholder="https://tu-dominio.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Dirección de la Empresa*</Label>
            <Textarea
              rows={2}
              value={form.address}
              onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
              placeholder="Dirección"
            />
          </div>

          <div className="space-y-2">
            <Label>Correo Electrónico de la Empresa</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
              placeholder="correo@empresa.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Número de Licencia de la Empresa</Label>
            <Input
              value={form.license}
              onChange={(e) => setForm((s) => ({ ...s, license: e.target.value }))}
              placeholder="Licencia"
            />
          </div>

          <div className="space-y-2">
            <Label>Zona Horaria</Label>
            <Select
              value={form.timezone}
              onValueChange={(v) => setForm((s) => ({ ...s, timezone: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar zona horaria" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="America/Guayaquil">UTC-5 Quito (America/Guayaquil)</SelectItem>
                <SelectItem value="America/Bogota">UTC-5 Bogotá (America/Bogota)</SelectItem>
                <SelectItem value="America/Lima">UTC-5 Lima (America/Lima)</SelectItem>
                <SelectItem value="America/Mexico_City">UTC-6 Ciudad de México</SelectItem>
                <SelectItem value="America/Santiago">UTC-3 Santiago</SelectItem>
                <SelectItem value="America/Buenos_Aires">UTC-3 Buenos Aires</SelectItem>
                <SelectItem value="Europe/Madrid">UTC+1 Madrid</SelectItem>
                <SelectItem value="UTC">UTC</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end">
            <Button
              className="bg-[#f36a6d] hover:bg-[#e85b5f] text-white"
            >
              Guardar
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}
