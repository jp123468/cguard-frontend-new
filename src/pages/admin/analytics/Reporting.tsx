// src/pages/Reporting.tsx

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
    id: "reports",
    title: "Informes",
    value: 0,
    secondaryLabel: "Pendiente",
    secondaryValue: 0,
    tone: "blue",
  },
  {
    id: "incident",
    title: "Incidente",
    value: 0,
    secondaryLabel: "Abierto",
    secondaryValue: 0,
    tone: "red",
  },
  {
    id: "patrols",
    title: "Recorridos",
    value: 0,
    secondaryLabel: "Completado",
    secondaryValue: 0,
    tone: "orange",
  },
  {
    id: "tasks",
    title: "Tarea",
    value: 0,
    secondaryLabel: "Pendiente",
    secondaryValue: 0,
    tone: "slate",
  },
  {
    id: "checklist",
    title: "Lista de Verificación",
    value: 0,
    secondaryLabel: "Pendiente",
    secondaryValue: 0,
    tone: "blue",
  },
  {
    id: "inactivity",
    title: "Alertas de Inactividad",
    value: 0,
    secondaryLabel: "Alertas de Pánico",
    secondaryValue: 0,
    tone: "orange",
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

interface ReportingProps {
  onExportPdf?: () => void;
}

const Reporting: React.FC<ReportingProps> = ({ onExportPdf }) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const handleExportPdf = () => {
    if (onExportPdf) {
      onExportPdf();
    } else {
      console.log("Exportar como PDF");
    }
  };

  const dates = [
    "Nov 12",
    "Nov 13",
    "Nov 14",
    "Nov 15",
    "Nov 16",
    "Nov 17",
    "Nov 18",
  ];

  return (
    <AppLayout>
      <div className="space-y-8 p-4 lg:p-8">
        {/* ACCIONES SUPERIORES (Filtros + menú PDF) */}
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

        {/* CARDS RESUMEN SUPERIOR */}
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

        {/* INCIDENTE PRINCIPAL + RESUMEN INFERIOR (AÑADIDO / CERRADO) */}
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-900">
              Incidente principal
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            {/* EMPTY STATE */}
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-2 px-6 pb-10 pt-6 text-center">
              <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
                <span className="text-2xl">📂</span>
              </div>
              <p className="text-sm font-semibold text-slate-800">
                No se encontraron resultados
              </p>
              <p className="max-w-xs text-xs text-slate-500">
                No pudimos encontrar ningún elemento que coincida con su
                búsqueda.
              </p>
            </div>

            {/* RESUMEN INFERIOR DENTRO DEL MISMO CARD */}
            <div className="grid border-t border-slate-100 text-center sm:grid-cols-2">
              <div className="flex flex-col items-center justify-center py-6">
                <p className="text-3xl font-semibold text-slate-900">0</p>
                <p className="text-xs text-slate-500">Añadido</p>
              </div>
              <div className="flex flex-col items-center justify-center border-t border-slate-100 py-6 sm:border-l sm:border-t-0">
                <p className="text-3xl font-semibold text-slate-900">0</p>
                <p className="text-xs text-slate-500">Cerrado</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RESUMEN DEL INCIDENTE */}
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-900">
              Resumen del incidente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="min-h-[260px] rounded-xl border border-slate-100 bg-slate-50/50" />
          </CardContent>
        </Card>

        {/* RESUMEN ESTÁNDAR */}
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-900">
              Resumen Estándar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="min-h-[260px] rounded-xl border border-slate-100 bg-slate-50/50" />
          </CardContent>
        </Card>

        {/* RESUMEN DE INFORMES (AJUSTADO COMO LA IMAGEN) */}
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-900">
              Resumen de informes
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid gap-6 lg:grid-cols-[1fr,2fr]">
              {/* COLUMNA IZQUIERDA: FECHAS + LÍNEA + 0 ABAJO */}
              <div className="flex flex-col justify-between">
                <div className="flex flex-1">
                  {/* Fechas */}
                  <div className="flex flex-col justify-between text-xs text-slate-700">
                    {dates.map((date) => (
                      <span key={date}>{date}</span>
                    ))}
                  </div>

                  {/* Línea vertical */}
                  <div className="ml-10 mr-4 flex flex-1 items-stretch">
                    <div className="w-px bg-slate-200" />
                  </div>
                </div>

                {/* 0 al final, pegado a la línea */}
                <div className="mt-4 flex items-center justify-end pr-6 text-xs text-slate-700">
                  <span className="mr-1">0</span>
                </div>
              </div>

              {/* COLUMNA DERECHA: BLOQUES DE RESUMEN */}
              <div className="grid gap-4 lg:grid-cols-4">
                {/* fila superior: 2 bloques grandes */}
                <div className="col-span-4 lg:col-span-2 flex flex-col items-center justify-center rounded-2xl bg-indigo-50 py-6 text-center">
                  <p className="text-3xl font-semibold text-indigo-700">0</p>
                  <p className="mt-1 text-xs font-semibold text-indigo-700">
                    Recorridos del Sitio
                  </p>
                </div>

                <div className="col-span-4 lg:col-span-2 flex flex-col items-center justify-center rounded-2xl bg-emerald-50 py-6 text-center">
                  <p className="text-3xl font-semibold text-emerald-700">0</p>
                  <p className="mt-1 text-xs font-semibold text-emerald-700">
                    Tarea
                  </p>
                </div>

                {/* fila inferior: 4 bloques pequeños */}
                <div className="col-span-2 lg:col-span-1 flex flex-col items-center justify-center rounded-2xl bg-slate-50 py-5 text-center">
                  <p className="text-2xl font-semibold text-slate-700">0</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Lista de Verificación
                  </p>
                </div>

                <div className="col-span-2 lg:col-span-1 flex flex-col items-center justify-center rounded-2xl bg-slate-50 py-5 text-center">
                  <p className="text-2xl font-semibold text-slate-700">0</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Registros de entrada
                  </p>
                </div>

                <div className="col-span-2 lg:col-span-1 flex flex-col items-center justify-center rounded-2xl bg-slate-50 py-5 text-center">
                  <p className="text-2xl font-semibold text-slate-700">0</p>
                  <p className="mt-1 text-xs text-slate-600">Entrega</p>
                </div>

                <div className="col-span-2 lg:col-span-1 flex flex-col items-center justify-center rounded-2xl bg-slate-50 py-5 text-center">
                  <p className="text-2xl font-semibold text-slate-700">0</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Alerta de inactividad
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RESUMEN DE RECORRIDOS DEL SITIO */}
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-900">
              Resumen de recorridos del sitio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="min-h-[260px] rounded-xl border border-slate-100 bg-slate-50/50" />
          </CardContent>
        </Card>
      </div>

      {/* SHEET DE FILTROS (SOLO botón Filtro, sin “Guardar filtro”) */}
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

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">
                Sitio de publicación
              </label>
              <Select>
                <SelectTrigger className="h-10 rounded-lg border-slate-200 text-xs">
                  <SelectValue placeholder="Selecciona un sitio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="catolica">Catolica (+2 otros)</SelectItem>
                  <SelectItem value="site-2">Sitio 2</SelectItem>
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

export default Reporting;
