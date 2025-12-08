import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CreditCard } from "lucide-react";
import { BranchFormData } from "../AddBranch";

type Props = {
    data: BranchFormData;
    updateData: (data: Partial<BranchFormData>) => void;
    onPrevious: () => void;
    onSubmit: () => void;
};

const paymentMethods = [
    { id: "card", name: "Tarjeta", icon: CreditCard },
    { id: "google", name: "Google Pay", icon: null },
    { id: "cash", name: "Cash App Pay", icon: null },
    { id: "amazon", name: "Amazon Pay", icon: null },
    { id: "bank", name: "Cuenta bancaria de EE. UU.", icon: null },
];

export default function Step3Payment({ data, updateData, onPrevious, onSubmit }: Props) {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit();
    };

    return (
        <Card>
            <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Payment Method Selector */}
                    <div className="flex gap-2 border-b pb-4">
                        {paymentMethods.map((method) => (
                            <button
                                key={method.id}
                                type="button"
                                onClick={() => updateData({ paymentMethod: method.id as any })}
                                className={`flex items-center gap-2 px-4 py-2 rounded border ${data.paymentMethod === method.id
                                    ? "border-blue-500 bg-blue-50 text-blue-700"
                                    : "border-gray-200 hover:bg-gray-50"
                                    }`}
                            >
                                {method.icon && <method.icon className="h-4 w-4" />}
                                <span className="text-sm">{method.name}</span>
                            </button>
                        ))}
                    </div>

                    {/* Dropdown for mobile */}
                    <div className="md:hidden">
                        <Select
                            value={data.paymentMethod}
                            onValueChange={(value) => updateData({ paymentMethod: value as any })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {paymentMethods.map((method) => (
                                    <SelectItem key={method.id} value={method.id}>
                                        {method.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Card Payment Form */}
                    {data.paymentMethod === "card" && (
                        <div className="space-y-4">
                            {/* Card Number */}
                            <div className="space-y-2">
                                <Label htmlFor="cardNumber">Número de tarjeta</Label>
                                <div className="relative">
                                    <Input
                                        id="cardNumber"
                                        placeholder="1234 1234 1234 1234"
                                        value={data.cardNumber}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/\s/g, "");
                                            const formatted = value.match(/.{1,4}/g)?.join(" ") || value;
                                            updateData({ cardNumber: formatted });
                                        }}
                                        maxLength={19}
                                        required
                                    />
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex gap-1">
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg" alt="Visa" className="h-6" />
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6" />
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/3/30/American_Express_logo.svg" alt="Amex" className="h-6" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Expiry Date */}
                                <div className="space-y-2">
                                    <Label htmlFor="expiryDate">Fecha de vencimiento</Label>
                                    <Input
                                        id="expiryDate"
                                        placeholder="MM/AA"
                                        value={data.expiryDate}
                                        onChange={(e) => {
                                            let value = e.target.value.replace(/\D/g, "");
                                            if (value.length >= 2) {
                                                value = value.slice(0, 2) + "/" + value.slice(2, 4);
                                            }
                                            updateData({ expiryDate: value });
                                        }}
                                        maxLength={5}
                                        required
                                    />
                                </div>

                                {/* CVC */}
                                <div className="space-y-2">
                                    <Label htmlFor="cvc">Código de seguridad</Label>
                                    <Input
                                        id="cvc"
                                        placeholder="CVC"
                                        value={data.cvc}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/\D/g, "");
                                            updateData({ cvc: value });
                                        }}
                                        maxLength={4}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Country */}
                            <div className="space-y-2">
                                <Label htmlFor="country">País</Label>
                                <Select
                                    value={data.country}
                                    onValueChange={(value) => updateData({ country: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Ecuador">Ecuador</SelectItem>
                                        <SelectItem value="United States">United States</SelectItem>
                                        <SelectItem value="Colombia">Colombia</SelectItem>
                                        <SelectItem value="Peru">Peru</SelectItem>
                                        <SelectItem value="Mexico">Mexico</SelectItem>
                                        <SelectItem value="Argentina">Argentina</SelectItem>
                                        <SelectItem value="Chile">Chile</SelectItem>
                                        <SelectItem value="Spain">Spain</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Legal Notice */}
                            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                                Al suministrar tus datos de tarjeta, le permites a GuardPro LLC efectuar futuros cargos en
                                tu tarjeta conforme a las condiciones estipuladas.
                            </div>
                        </div>
                    )}

                    {/* Other Payment Methods Placeholder */}
                    {data.paymentMethod !== "card" && (
                        <div className="py-12 text-center text-gray-500">
                            <p>Método de pago {paymentMethods.find(m => m.id === data.paymentMethod)?.name} no disponible aún</p>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex justify-between pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onPrevious}
                        >
                            Anterior
                        </Button>
                        <Button
                            type="submit"
                            className="bg-[#f36a6d] hover:bg-[#e85b5f] text-white px-8"
                        >
                            Suscribir
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
