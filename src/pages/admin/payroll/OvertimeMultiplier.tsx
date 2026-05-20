import { useMemo, useState } from "react";
import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";
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
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type ViewMode = "list" | "create";
type OvertimeType = "dias" | "festivos" | "semanal";
type DayKey = "dom" | "lun" | "mar" | "mie" | "jue" | "vie" | "sab";

const dayLabels: { key: DayKey; label: string }[] = [
    { key: "dom", label: "Dom" },
    { key: "lun", label: "Lun" },
    { key: "mar", label: "Mar" },
    { key: "mie", label: "Mié" },
    { key: "jue", label: "Jue" },
    { key: "vie", label: "Vie" },
    { key: "sab", label: "Sáb" },
];

interface Rule {
    id: number;
    startsAfter: string;
    multiplier: string;
}

export default function OvertimeMultiplier() {
    const [mode, setMode] = useState<ViewMode>("list");
    const [perPage, setPerPage] = useState("10");

    const [name, setName] = useState("");
    const [guard, setGuard] = useState("");
    const [type, setType] = useState<OvertimeType>("dias");
    const [selectedDays, setSelectedDays] = useState<DayKey[]>([]);
    const [rules, setRules] = useState<Rule[]>([
        { id: Date.now(), startsAfter: "", multiplier: "" },
    ]);

    const perPageText = useMemo(() => {
        if (perPage === "10") return "10";
        if (perPage === "25") return "25";
        return "50";
    }, [perPage]);

    const toggleDay = (day: DayKey) => {
        setSelectedDays((prev) =>
            prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
        );
    };

    const handleRuleChange = (
        id: number,
        field: "startsAfter" | "multiplier",
        value: string
    ) => {
        setRules((prev) =>
            prev.map((rule) =>
                rule.id === id ? { ...rule, [field]: value } : rule
            )
        );
    };

    const handleAddRule = () => {
        setRules((prev) => [
            ...prev,
            { id: Date.now(), startsAfter: "", multiplier: "" },
        ]);
    };

    const handleRemoveRule = (id: number) => {
        setRules((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.id !== id)));
    };

    const handleSubmit = () => {
        if (!name || !guard || !type || selectedDays.length === 0) return;
        const filteredRules = rules.filter(
            (r) => r.startsAfter.trim() !== "" && r.multiplier.trim() !== ""
        );
        if (filteredRules.length === 0) return;

        console.log({
            name,
            guard,
            type,
            days: selectedDays,
            rules: filteredRules,
        });
    };

    if (mode === "create") {
        return (
            <AppLayout>
                <Breadcrumb
                    items={[
                        { label: "Panel de control", path: "/dashboard" },
                        { label: "Nuevo multiplicador" },
                    ]}
                />

                <section className="p-6 pb-10">
                    <div className="space-y-5 max-w-4xl">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-foreground">
                                Nombre*
                            </Label>
                            <Input
                                className="h-11 rounded-lg border-slate-200 text-sm"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Nombre del multiplicador"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-foreground">
                                Guardia*
                            </Label>
                            <Select value={guard} onValueChange={setGuard}>
                                <SelectTrigger className="h-11 rounded-lg border-slate-200 text-sm">
                                    <SelectValue placeholder="Seleccionar guardia" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos los guardias</SelectItem>
                                    <SelectItem value="guardia-1">Guardia 1</SelectItem>
                                    <SelectItem value="guardia-2">Guardia 2</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-foreground">
                                Tipo*
                            </Label>
                            <Select
                                value={type}
                                onValueChange={(v) => setType(v as OvertimeType)}
                            >
                                <SelectTrigger className="h-11 rounded-lg border-slate-200 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="dias">Días</SelectItem>
                                    <SelectItem value="festivos">Días festivos</SelectItem>
                                    <SelectItem value="semanal">Semanalmente</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-3 pt-2">
                            <Label className="text-xs font-medium text-foreground">
                                Seleccionar Día(s)
                            </Label>
                            <div className="inline-flex rounded-md border border-slate-200 bg-card">
                                {dayLabels.map((day) => {
                                    const active = selectedDays.includes(day.key);
                                    return (
                                        <button
                                            key={day.key}
                                            type="button"
                                            className={[
                                                "px-4 py-2 text-xs font-medium transition-colors",
                                                "border-r border-slate-200 last:border-r-0",
                                                active
                                                    ? "bg-[#C8860A] text-white"
                                                    : "bg-card text-foreground hover:bg-[#C8860A]/10",
                                            ].join(" ")}
                                            onClick={() => toggleDay(day.key)}
                                        >
                                            {day.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="pt-2">
                            {rules.map((rule, index) => (
                                <div
                                    key={rule.id}
                                    className={`relative ${index > 0 ? "mt-6 border-t border-slate-100 pt-6" : ""
                                        }`}
                                >
                                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium text-foreground">
                                                Comienza después de*
                                            </Label>
                                            <div className="flex items-center gap-3">
                                                <Input
                                                    type="number"
                                                    inputMode="numeric"
                                                    min={0}
                                                    className="h-11 rounded-lg border-slate-200 text-sm"
                                                    value={rule.startsAfter}
                                                    onChange={(e) =>
                                                        handleRuleChange(
                                                            rule.id,
                                                            "startsAfter",
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                                <span className="text-xs text-muted-foreground">
                                                    Horas / Día
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium text-foreground">
                                                Multiplicador de Tasa*
                                            </Label>
                                            <div className="flex items-center gap-3">
                                                <Input
                                                    className="h-11 rounded-lg border-slate-200 text-sm"
                                                    value={rule.multiplier}
                                                    onChange={(e) =>
                                                        handleRuleChange(
                                                            rule.id,
                                                            "multiplier",
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="1.5x, 2x, etc."
                                                />
                                                <span className="text-xs text-muted-foreground">
                                                    X Pago Base
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {rules.length > 1 && (
                                        <button
                                            type="button"
                                            className="absolute right-0 top-2 text-muted-foreground hover:text-red-500"
                                            onClick={() => handleRemoveRule(rule.id)}
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            ))}

                            <div className="mt-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="rounded-lg border-[#C8860A]/30 bg-card px-6 text-sm font-semibold text-[#C8860A] hover:bg-[#C8860A]/10"
                                    onClick={handleAddRule}
                                >
                                    Agregar
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 flex justify-end gap-3 border-t border-slate-100 pt-6">
                        <Button
                            type="button"
                            variant="outline"
                            className="rounded-lg border-slate-200 px-6 text-sm font-semibold text-[#C8860A] hover:bg-slate-50"
                            onClick={() => setMode("list")}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            className="rounded-lg bg-[#C8860A] px-8 text-sm font-semibold text-white hover:bg-[#B37809]"
                            onClick={handleSubmit}
                        >
                            Enviar
                        </Button>
                    </div>
                </section>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <Breadcrumb
                items={[
                    { label: "Panel de control", path: "/dashboard" },
                    { label: "Multiplicador de Horas Extras" },
                ]}
            />

            <section className="p-6">
                <div className="mb-4 flex items-center justify-between">
                    <div />
                    <Button
                        className="rounded-lg bg-[#C8860A] px-5 text-sm font-semibold text-white hover:bg-[#B37809]"
                        type="button"
                        onClick={() => setMode("create")}
                    >
                        Nuevo Multiplicador
                    </Button>
                </div>

                <div className="overflow-hidden rounded-lg border border-slate-200 bg-card">
                    <table className="min-w-full border-collapse text-left text-sm">
                        <thead className="bg-slate-50">
                            <tr className="border-b border-slate-200">
                                <th className="px-6 py-3 font-semibold text-foreground">
                                    Nombre
                                </th>
                                <th className="px-6 py-3 font-semibold text-foreground">Tipo</th>
                                <th className="px-6 py-3 font-semibold text-foreground">Tasa</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td
                                    colSpan={3}
                                    className="py-20 text-center text-sm text-muted-foreground"
                                >
                                    No hay multiplicadores registrados
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="flex items-center justify-between bg-slate-50 px-4 py-3 text-sm text-foreground/70">
                        <div className="flex items-center gap-2">
                            <span>Elementos por página</span>
                            <Select value={perPage} onValueChange={setPerPage}>
                                <SelectTrigger className="h-8 w-20 rounded-md border-slate-300 bg-card text-xs">
                                    <SelectValue placeholder={perPageText} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="25">25</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-4">
                            <span>0 of 0</span>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-card text-muted-foreground hover:bg-slate-100"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-card text-muted-foreground hover:bg-slate-100"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </AppLayout>
    );
}
