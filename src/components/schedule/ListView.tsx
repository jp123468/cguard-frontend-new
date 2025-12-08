import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus } from "lucide-react";

interface ListViewProps {
    currentDate: Date;
}

export default function ListView({ currentDate }: ListViewProps) {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1);

    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        return day;
    });

    return (
        <div className="flex-1 relative">
            <div className="divide-y">
                {weekDays.map((day, idx) => (
                    <div
                        key={idx}
                        className={`p-6 ${idx % 2 === 0 ? 'bg-blue-50' : 'bg-white'}`}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium text-gray-900">
                                    {day.toLocaleDateString('es-ES', {
                                        weekday: 'short',
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric'
                                    })}
                                </div>
                                <div className="text-sm text-blue-600 mt-1">
                                    No se encontró el turno
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
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
