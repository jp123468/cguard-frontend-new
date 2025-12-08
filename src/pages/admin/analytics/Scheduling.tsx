// src/pages/Scheduling.tsx

import React, { useState, useEffect } from "react";
import {
    Filter,
    MoreVertical,
    FileDown,
} from "lucide-react";

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

type Tone = "blue" | "red" | "orange" | "slate";

interface SummaryCard {
    id: string;
    title: string;
    value: number;
    secondaryLabel: string;
    secondaryValue: number;
    tone: Tone;
}

const SUMMARY_CARDS: SummaryCard[] = [
    {
        id: "late-arrival",
        title: "Llegada Tardía",
        value: 0,
        secondaryLabel: "No asistió",
        secondaryValue: 0,
        tone: "blue",
    },
    {
        id: "not-confirmed",
        title: "No Confirmado",
        value: 0,
        secondaryLabel: "Confirmado",
        secondaryValue: 0,
        tone: "red",
    },
    {
        id: "open-shifts",
        title: "Turnos Abiertos",
        value: 0,
        secondaryLabel: "Pendiente",
        secondaryValue: 0,
        tone: "orange",
    },
    {
        id: "time-off",
        title: "Tiempo Libre",
        value: 0,
        secondaryLabel: "Pendiente",
        secondaryValue: 0,
        tone: "slate",
    },
    {
        id: "shift-swap",
        title: "Intercambio de Turno",
        value: 0,
        secondaryLabel: "Pendiente",
        secondaryValue: 0,
        tone: "orange",
    },
    {
        id: "schedule-request",
        title: "Solicitud de Horario",
        value: 0,
        secondaryLabel: "Pendiente",
        secondaryValue: 0,
        tone: "blue",
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
    red: {
        value: "text-red-500",
        title: "text-red-600",
        border: "border-red-100",
    },
    orange: {
        value: "text-orange-500",
        title: "text-orange-600",
        border: "border-orange-100",
    },
    slate: {
        value: "text-slate-600",
        title: "text-slate-700",
        border: "border-slate-100",
    },
};

const Scheduling: React.FC = () => {
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => setIsMenuOpen((prev) => !prev);

    // Cerrar menú al hacer click afuera
    useEffect(() => {
        const close = (e: MouseEvent) => {
            const t = e.target as HTMLElement;
            if (!t.closest(".menu-container")) setIsMenuOpen(false);
        };
        document.addEventListener("click", close);
        return () => document.removeEventListener("click", close);
    }, []);

    const dates = ["Nov 12", "Nov 13", "Nov 14", "Nov 15", "Nov 16", "Nov 17", "Nov 18"];

    return (
        <AppLayout>
            <div className="space-y-8 p-4 lg:p-8">

                {/* 🔶 FILTROS + 3 PUNTOS */}
                <div className="flex items-center justify-end gap-3">

                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsFilterOpen(true)}
                        className="flex items-center gap-2 rounded-full border-orange-300 bg-white px-4 text-sm font-semibold text-orange-600 hover:bg-orange-50"
                    >
                        <Filter className="h-4 w-4" />
                        Filtros
                    </Button>

                    {/* MENU 3 DOTS */}
                    <div className="relative menu-container">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={toggleMenu}
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white p-0 text-slate-600 hover:bg-slate-50"
                        >
                            <MoreVertical className="h-4 w-4" />
                        </Button>

                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-60 rounded-xl border border-slate-100 bg-white p-2 shadow-lg z-50">
                                <button
                                    type="button"
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                >
                                    <FileDown className="h-4 w-4" />
                                    Exportar como PDF
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* 🔶 CARDS SUPERIORES */}
                <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
                    {SUMMARY_CARDS.map((card) => {
                        const tone = toneStyles[card.tone];
                        return (
                            <Card
                                key={card.id}
                                className={`h-full rounded-2xl border bg-white shadow-sm ${tone.border}`}
                            >
                                <CardContent className="flex h-full flex-col justify-between p-4 text-center">
                                    <div>
                                        <p className={`text-3xl font-semibold ${tone.value}`}>
                                            {card.value}
                                        </p>
                                        <p className={`text-sm font-semibold ${tone.title}`}>
                                            {card.title}
                                        </p>
                                    </div>

                                    <p className="mt-4 text-xs text-slate-500">
                                        {card.secondaryLabel}{" "}
                                        <span className="font-semibold text-slate-700">
                                            {card.secondaryValue}
                                        </span>
                                    </p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* 🔶 HORARIO VS HORAS TRABAJADAS */}
                <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold text-slate-900">
                            Horario vs horas trabajadas
                        </CardTitle>
                    </CardHeader>

                    <CardContent>
                        <div className="min-h-[260px] rounded-xl border border-slate-100 bg-white px-10 py-8">
                            <div className="flex h-full flex-col justify-between">
                                <div className="flex flex-1 items-stretch gap-10">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="flex-1 rounded-md bg-slate-100" />
                                    ))}
                                </div>

                                <div className="mt-6">
                                    <div className="relative h-6">
                                        <span className="absolute -left-1 top-1/2 -translate-y-1/2 text-xs text-slate-600">
                                            0
                                        </span>
                                        <div className="ml-6 h-px bg-slate-200" />
                                    </div>

                                    <div className="mt-4 flex justify-between text-xs text-slate-600">
                                        {dates.map((d) => (
                                            <span key={d}>{d}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 🔶 RESUMEN DEL HORARIO */}
                <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold text-slate-900">
                            Resumen del horario
                        </CardTitle>
                    </CardHeader>

                    <CardContent>
                        <div className="grid gap-6 lg:grid-cols-[1.8fr,1.4fr]">
                            {/* izquierda - empty */}
                            <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
                                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50">
                                    <span className="text-3xl">📂</span>
                                </div>
                                <p className="text-sm font-semibold text-slate-800">
                                    No se encontraron resultados
                                </p>
                                <p className="mt-2 max-w-xs text-xs text-slate-500">
                                    No pudimos encontrar ningún elemento que coincida con su búsqueda.
                                </p>
                            </div>

                            {/* derecha */}
                            <div className="grid gap-4 lg:grid-cols-2">
                                {/* horas programadas */}
                                <div className="col-span-2 lg:col-span-1 flex flex-col items-center justify-center rounded-2xl bg-indigo-50 py-6 text-center">
                                    <p className="text-3xl font-semibold text-indigo-700">00:00</p>
                                    <p className="text-xs mt-1 font-semibold text-indigo-700">
                                        Horas programadas
                                    </p>
                                </div>

                                {/* horas trabajadas */}
                                <div className="col-span-2 lg:col-span-1 flex flex-col items-center justify-center rounded-2xl bg-emerald-50 py-6 text-center">
                                    <p className="text-3xl font-semibold text-emerald-700">00:00</p>
                                    <p className="text-xs mt-1 font-semibold text-emerald-700">
                                        Horas trabajadas
                                    </p>
                                </div>

                                {/* 4 cards pequeñas */}
                                {[
                                    "Confirmar turnos",
                                    "Desconfirmar turnos",
                                    "Solicitudes de tiempo libre",
                                    "Solicitud de intercambio de turno",
                                ].map((t, i) => (
                                    <div
                                        key={i}
                                        className="col-span-1 flex flex-col items-center justify-center rounded-2xl bg-slate-50 py-5 text-center"
                                    >
                                        <p className="text-2xl font-semibold text-slate-700">0</p>
                                        <p className="mt-1 text-xs text-slate-600">{t}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Dos cards grandes abajo */}
                        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-6">
                            <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 py-6 text-center">
                                <p className="text-3xl font-semibold text-slate-800">0</p>
                                <p className="mt-1 text-xs text-slate-600">Llegada Tardía</p>
                            </div>

                            <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 py-6 text-center">
                                <p className="text-3xl font-semibold text-slate-800">0</p>
                                <p className="mt-1 text-xs text-slate-600">No asistió</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 🔶 SHEET DE FILTROS */}
            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <SheetContent side="right" className="w-full max-w-md">
                    <SheetHeader>
                        <SheetTitle className="text-base font-semibold text-slate-900">
                            Filtros
                        </SheetTitle>
                    </SheetHeader>

                    <form className="mt-4 space-y-4">
                        {/* Cliente */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700">Cliente</label>
                            <Select>
                                <SelectTrigger className="h-10 rounded-lg border-slate-200 text-xs">
                                    <SelectValue placeholder="Selecciona un cliente" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="central">central (+1 otro)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Sitio */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700">
                                Sitio de publicación
                            </label>
                            <Select>
                                <SelectTrigger className="h-10 rounded-lg border-slate-200 text-xs">
                                    <SelectValue placeholder="Selecciona un sitio" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="catolica">Catolica (+2 otros)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Fechas */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700">
                                    Desde la Fecha
                                </label>
                                <Input type="date" className="h-10 rounded-lg border-slate-200 text-xs" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700">Hora</label>
                                <Input type="time" defaultValue="00:00" className="h-10 rounded-lg border-slate-200 text-xs" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700">
                                    Hasta la Fecha
                                </label>
                                <Input type="date" className="h-10 rounded-lg border-slate-200 text-xs" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700">Hora</label>
                                <Input type="time" defaultValue="23:59" className="h-10 rounded-lg border-slate-200 text-xs" />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full rounded-lg bg-orange-500 text-sm font-semibold text-white hover:bg-orange-600"
                        >
                            Filtro
                        </Button>
                    </form>
                </SheetContent>
            </Sheet>
        </AppLayout>
    );
};

export default Scheduling;
