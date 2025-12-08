import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { BranchFormData } from "../AddBranch";

type Props = {
    data: BranchFormData;
    updateData: (data: Partial<BranchFormData>) => void;
    onNext: () => void;
};

export default function Step1Details({ data, updateData, onNext }: Props) {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onNext();
    };

    return (
        <Card>
            <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Nombre de la sucursal */}
                        <div className="space-y-2">
                            <Label htmlFor="name">
                                Nombre de la sucursal*
                            </Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) => updateData({ name: e.target.value })}
                                required
                            />
                        </div>

                        {/* Correo Electrónico */}
                        <div className="space-y-2">
                            <Label htmlFor="email">
                                Correo Electrónico*
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                value={data.email}
                                onChange={(e) => updateData({ email: e.target.value })}
                                required
                            />
                        </div>

                        {/* Dirección */}
                        <div className="space-y-2">
                            <Label htmlFor="address">
                                Dirección*
                            </Label>
                            <Input
                                id="address"
                                value={data.address}
                                onChange={(e) => updateData({ address: e.target.value })}
                                required
                            />
                        </div>

                        {/* Número de Teléfono */}
                        <div className="space-y-2">
                            <Label htmlFor="phone">
                                Número de Teléfono
                            </Label>
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="e.g. +12015550123"
                                value={data.phone}
                                onChange={(e) => updateData({ phone: e.target.value })}
                            />
                        </div>

                        {/* Sitio Web */}
                        <div className="space-y-2">
                            <Label htmlFor="website">
                                Sitio Web
                            </Label>
                            <Input
                                id="website"
                                type="url"
                                value={data.website}
                                onChange={(e) => updateData({ website: e.target.value })}
                            />
                        </div>

                        {/* Número de Licencia */}
                        <div className="space-y-2">
                            <Label htmlFor="license">
                                Número de Licencia
                            </Label>
                            <Input
                                id="license"
                                value={data.licenseNumber}
                                onChange={(e) => updateData({ licenseNumber: e.target.value })}
                            />
                        </div>

                        {/* Zona Horaria */}
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="timezone">
                                Zona Horaria
                            </Label>
                            <Select
                                value={data.timezone}
                                onValueChange={(value) => updateData({ timezone: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar zona horaria" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="America/Guayaquil">
                                        (GMT-5:00) Ecuador - Guayaquil
                                    </SelectItem>
                                    <SelectItem value="America/New_York">
                                        (GMT-5:00) Eastern Time (US & Canada)
                                    </SelectItem>
                                    <SelectItem value="America/Chicago">
                                        (GMT-6:00) Central Time (US & Canada)
                                    </SelectItem>
                                    <SelectItem value="America/Denver">
                                        (GMT-7:00) Mountain Time (US & Canada)
                                    </SelectItem>
                                    <SelectItem value="America/Los_Angeles">
                                        (GMT-8:00) Pacific Time (US & Canada)
                                    </SelectItem>
                                    <SelectItem value="America/Mexico_City">
                                        (GMT-6:00) Mexico City
                                    </SelectItem>
                                    <SelectItem value="America/Bogota">
                                        (GMT-5:00) Bogota, Lima, Quito
                                    </SelectItem>
                                    <SelectItem value="America/Sao_Paulo">
                                        (GMT-3:00) Brasilia
                                    </SelectItem>
                                    <SelectItem value="Europe/Madrid">
                                        (GMT+1:00) Madrid
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            className="bg-[#f36a6d] hover:bg-[#e85b5f] text-white px-8"
                        >
                            Siguiente
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
