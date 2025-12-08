import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { BranchFormData } from "../AddBranch";

type Props = {
    data: BranchFormData;
    updateData: (data: Partial<BranchFormData>) => void;
    onNext: () => void;
    onPrevious: () => void;
};

const plans = [
    { id: "essential", name: "Essential", price: 5 },
    { id: "advance", name: "Advance", price: 8 },
    { id: "professional", name: "Professional", price: 10, popular: true },
];

const modules = [
    { id: "visitors", name: "Gestión de Visitantes", description: "Gestiona los visitantes en tus sitios de puestos", price: 1, unit: "Month / User" },
    { id: "billing", name: "Facturador", description: "Crea fácilmente presupuestos y facturas para tus clientes usando el módulo de facturación", price: 1, unit: "Month / User" },
    { id: "dispatcher", name: "Despachador", description: "Gestiona fácilmente las llamadas de despacho", price: 1, unit: "Month / User" },
    { id: "sms", name: "Motor de SMS", description: "Habilita notificaciones por SMS (1000 SMS / mes)", price: 10, unit: "Month" },
    { id: "scheduler", name: "Programador", description: "Gestiona fácilmente el horario de tus guardias, asistencia y solicitudes de tiempo libre", price: 2, unit: "Month / User" },
    { id: "payroll", name: "Nómina", description: "Gestiona fácilmente las nóminas de tus guardias", price: 1, unit: "Month / User" },
    { id: "patrol", name: "Patrulla vehicular", description: "Gestiona fácilmente las patrullas de vehículos de los guardias", price: 1, unit: "Month / User" },
    { id: "parking", name: "Administrador de estacionamiento", description: "Gestiona fácilmente los vehículos de estacionamiento y los incidentes de estacionamiento", price: 1, unit: "Month / User" },
];

export default function Step2Subscription({ data, updateData, onNext, onPrevious }: Props) {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!data.selectedPlan) {
            alert("Por favor selecciona un plan");
            return;
        }
        onNext();
    };

    const toggleModule = (moduleId: keyof BranchFormData["modules"]) => {
        updateData({
            modules: {
                ...data.modules,
                [moduleId]: !data.modules[moduleId],
            },
        });
    };

    return (
        <Card>
            <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Billing Cycle Toggle */}
                    <div className="flex justify-center gap-2">
                        <Button
                            type="button"
                            variant={data.billingCycle === "monthly" ? "default" : "outline"}
                            onClick={() => updateData({ billingCycle: "monthly" })}
                            className={data.billingCycle === "monthly" ? "bg-gray-200 text-gray-800" : ""}
                        >
                            Mensual
                        </Button>
                        <Button
                            type="button"
                            variant={data.billingCycle === "annual" ? "default" : "outline"}
                            onClick={() => updateData({ billingCycle: "annual" })}
                            className={data.billingCycle === "annual" ? "bg-gray-200 text-gray-800" : ""}
                        >
                            Anual
                        </Button>
                    </div>

                    {/* Plans */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {plans.map((plan) => (
                            <div
                                key={plan.id}
                                className={`border rounded-lg p-6 relative ${data.selectedPlan === plan.id ? "border-blue-500 bg-blue-50" : "border-gray-200"
                                    }`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-3 right-4 bg-blue-600 text-white text-xs px-3 py-1 rounded-full">
                                        POPULAR
                                    </div>
                                )}
                                <h3 className="text-lg font-semibold mb-2">{plan.name}</h3>
                                <div className="mb-4">
                                    <span className="text-3xl font-bold">${plan.price}</span>
                                    <span className="text-gray-600"> / mes / usuario</span>
                                </div>
                                <RadioGroup
                                    value={data.selectedPlan}
                                    onValueChange={(value: string) => updateData({ selectedPlan: value as any })}
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value={plan.id} id={plan.id} />
                                        <Label htmlFor={plan.id} className="cursor-pointer">
                                            Comprar {plan.name}
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        ))}
                    </div>

                    {/* Modules Table */}
                    <div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Módulo</TableHead>
                                    <TableHead>Precio</TableHead>
                                    <TableHead className="text-right">Estado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {modules.map((module) => (
                                    <TableRow key={module.id}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{module.name}</div>
                                                <div className="text-sm text-gray-500">{module.description}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>${module.price} / {module.unit}</TableCell>
                                        <TableCell className="text-right">
                                            <Switch
                                                checked={data.modules[module.id as keyof typeof data.modules]}
                                                onCheckedChange={() => toggleModule(module.id as keyof typeof data.modules)}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex justify-between">
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
                            Siguiente
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
