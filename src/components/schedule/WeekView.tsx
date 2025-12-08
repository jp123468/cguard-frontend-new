import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus } from "lucide-react";

interface WeekViewProps {
    currentDate: Date;
}

export default function WeekView({ currentDate }: WeekViewProps) {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1);

    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        return day;
    });

    return (
        <div className="flex-1 relative">
            {/* Week Header */}
            <div className="grid grid-cols-7 border-b">
                {weekDays.map((day, idx) => (
                    <div key={idx} className="p-4 border-r text-center bg-gray-50">
                        <div className="text-sm font-medium">
                            {day.toLocaleDateString('es-ES', { weekday: 'short' })}
                        </div>
                        <div className="text-xs text-gray-600">
                            {day.getDate()}/{day.getMonth() + 1}
                        </div>
                    </div>
                ))}
            </div>

            {/* Week Grid */}
            <div className="grid grid-cols-7 min-h-[400px]">
                {weekDays.map((_, idx) => (
                    <div key={idx} className="border-r p-2">
                        {/* Empty cells for now */}
                    </div>
                ))}
            </div>

            <div className="p-8 text-center text-gray-500">
                <p className="text-sm">Turnos sin guardias</p>
            </div>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        size="icon"
                        className="absolute bottom-6 right-6 h-12 w-12 rounded-full bg-gray-700 hover:bg-gray-800 shadow-lg"
                        title="Agregar"
                    >
                        <Plus className="h-6 w-6 text-white" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuItem>Crear Turno Estándar</DropdownMenuItem>
                    <DropdownMenuItem>Crear Turno Abierto</DropdownMenuItem>
                    <DropdownMenuItem>Crear Turno desde Plantilla</DropdownMenuItem>
                    <DropdownMenuItem>Crear Plantilla de Turno</DropdownMenuItem>
                    <DropdownMenuItem>Crear Nota</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
