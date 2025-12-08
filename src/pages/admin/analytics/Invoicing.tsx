// src/pages/Invoicing.tsx

import React, { useState } from "react";
import { Filter, MoreVertical, FileDown } from "lucide-react";

import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Tone = "blue" | "orange" | "slate" | "red";

interface SummaryCard {
    id: string;
    title: string;
    value: string;
    tone: Tone;
}

const SUMMARY_CARDS: SummaryCard[] = [
    {
        id: "service-items",
        title: "Artículos de Servicio",
        value: "0",
        tone: "blue",
    },
    {
        id: "quotes-created",
        title: "Presupuesto Creado",
        value: "0",
        tone: "orange",
    },
    {
        id: "invoices-created",
        title: "Factura Creada",
        value: "0",
        tone: "slate",
    },
    {
        id: "amount-paid",
        title: "Monto Pagado",
        value: "$0",
        tone: "blue",
    },
    {
        id: "amount-overdue",
        title: "Monto Vencido",
        value: "$0",
        tone: "orange",
    },
    {
        id: "invoice-overdue",
        title: "Factura Vencida",
        value: "0",
        tone: "red",
    },
];

const toneStyles: Record<
    Tone,
    { value: string; title: string; border: string }
> = {
    blue: {
        value: "text-sky-500",
        title: "text-sky-600",
        border: "border-sky-100",
    },
    orange: {
        value: "text-orange-500",
        title: "text-orange-600",
        border: "border-orange-100",
    },
    slate: {
        value: "text-slate-700",
        title: "text-slate-800",
        border: "border-slate-100",
    },
    red: {
        value: "text-red-500",
        title: "text-red-600",
        border: "border-red-100",
    },
};

interface InvoicingProps {
    onExportPdf?: () => void;
}

const Invoicing: React.FC<InvoicingProps> = ({ onExportPdf }) => {
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const handleExportPdf = () => {
        if (onExportPdf) {
            onExportPdf();
        } else {
            console.log("Exportar como PDF");
        }
    };

    return (
        <AppLayout>
            <div className="space-y-8 p-4 lg:p-8">
                <div className="flex items-center justify-end gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        className="flex items-center gap-2 rounded-full border-orange-200 bg-white px-4 text-sm font-semibold text-orange-500 hover:bg-orange-50"
                        onClick={() => setIsFilterOpen(true)}
                    >
                        <Filter className="h-4 w-4" />
                        Filtros
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50"
                            >
                                <MoreVertical className="h-4 w-4" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem onClick={handleExportPdf}>
                                <FileDown className="mr-2 h-4 w-4" />
                                <span>Exportar como PDF</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
                    {SUMMARY_CARDS.map((card) => {
                        const tone = toneStyles[card.tone];
                        return (
                            <Card
                                key={card.id}
                                className={`h-full rounded-2xl border bg-white shadow-sm ${tone.border}`}
                            >
                                <CardContent className="flex h-full flex-col justify-between p-4">
                                    <div className="space-y-1">
                                        <p
                                            className={`text-3xl font-semibold leading-none ${tone.value}`}
                                        >
                                            {card.value}
                                        </p>
                                        <p
                                            className={`text-sm font-semibold tracking-tight ${tone.title}`}
                                        >
                                            {card.title}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-sm font-semibold text-slate-900">
                                Resumen de facturas
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="p-0">
                            <div className="flex min-h-[260px] flex-col items-center justify-center gap-2 px-6 pb-10 pt-6 text-center">
                                <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
                                    <span className="text-2xl">📂</span>
                                </div>
                                <p className="text-sm font-semibold text-slate-800">
                                    No se encontraron resultados
                                </p>
                                <p className="max-w-xs text-xs text-slate-500">
                                    No pudimos encontrar ningún elemento que coincida con su
                                    búsqueda
                                </p>
                            </div>

                            <div className="grid border-t border-slate-100 text-center sm:grid-cols-2">
                                <div className="flex flex-col items-center justify-center py-6">
                                    <p className="text-3xl font-semibold text-slate-900">0</p>
                                    <p className="text-xs text-slate-500">Factura Creada</p>
                                </div>
                                <div className="flex flex-col items-center justify-center border-t border-slate-100 py-6 sm:border-l sm:border-t-0">
                                    <p className="text-3xl font-semibold text-slate-900">0</p>
                                    <p className="text-xs text-slate-500">No pagado</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-sm font-semibold text-slate-900">
                                Clientes principales
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <table className="w-full text-sm border-separate border-spacing-0 mb-4">
                                <thead>
                                    <tr className="bg-slate-50 text-gray-600">
                                        <th className="text-left font-medium px-4 py-3 rounded-tl-xl border-b border-slate-100">
                                            Cliente
                                        </th>
                                        <th className="text-left font-medium px-4 py-3 border-b border-slate-100">
                                            Monto de la Factura
                                        </th>
                                        <th className="text-left font-medium px-4 py-3 rounded-tr-xl border-b border-slate-100">
                                            Monto Pagado
                                        </th>
                                    </tr>
                                </thead>
                            </table>

                            <div className="flex flex-col items-center py-10 text-center">
                                <div className="w-24 h-24 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                                    <span className="text-4xl">📄</span>
                                </div>
                                <p className="font-semibold text-gray-700 mb-1">
                                    No se encontraron resultados
                                </p>
                                <p className="text-gray-500 text-sm max-w-xs">
                                    No pudimos encontrar ningún elemento que coincida con su
                                    búsqueda
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold text-slate-900">
                            Resumen de montos pagados
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="relative w-full h-[320px]">
                            <div className="absolute inset-4 flex flex-col justify-end">
                                <div className="flex-1 border-t border-slate-200 border-l relative">
                                    <div className="absolute inset-0 flex">
                                        {Array.from({ length: 11 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className="flex-1 border-r border-dashed border-slate-100 last:border-r-0"
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-3 flex justify-between text-xs text-gray-500">
                                    <span>Nov 2025</span>
                                    <span>Oct 2025</span>
                                    <span>Sep 2025</span>
                                    <span>Aug 2025</span>
                                    <span>Jul 2025</span>
                                    <span>Jun 2025</span>
                                    <span>May 2025</span>
                                    <span>Apr 2025</span>
                                    <span>Mar 2025</span>
                                    <span>Feb 2025</span>
                                    <span>Jan 2025</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <SheetContent side="right" className="w-full max-w-md">
                    <SheetHeader className="mb-4">
                        <SheetTitle className="text-base font-semibold text-slate-900">
                            Filtros
                        </SheetTitle>
                    </SheetHeader>

                    <form className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-700">
                                Cliente
                            </label>
                            <Select>
                                <SelectTrigger className="h-10 rounded-lg border-slate-200 text-xs">
                                    <SelectValue placeholder="Selecciona un cliente" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="central">central (+1 otro)</SelectItem>
                                    <SelectItem value="cliente-2">Cliente 2</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-700">
                                    Desde la Fecha
                                </label>
                                <Input
                                    type="date"
                                    className="h-10 rounded-lg border-slate-200 text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-700">
                                    Hora
                                </label>
                                <Input
                                    type="time"
                                    defaultValue="00:00"
                                    className="h-10 rounded-lg border-slate-200 text-xs"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-700">
                                    Hasta la Fecha
                                </label>
                                <Input
                                    type="date"
                                    className="h-10 rounded-lg border-slate-200 text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-700">
                                    Hora
                                </label>
                                <Input
                                    type="time"
                                    defaultValue="23:59"
                                    className="h-10 rounded-lg border-slate-200 text-xs"
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button
                                type="submit"
                                className="w-full rounded-lg bg-orange-500 text-sm font-semibold text-white hover:bg-orange-600"
                            >
                                Filtro
                            </Button>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>
        </AppLayout>
    );
};

export default Invoicing;
