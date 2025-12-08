import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus } from "lucide-react";

interface DayViewProps {
    currentDate: Date;
}

export default function DayView({ currentDate }: DayViewProps) {
    const dateString = currentDate.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

    return (
        <div className="flex-1 relative">
            <div className="p-6 text-center border-b">
                <div className="text-base font-medium text-gray-700">{dateString}</div>
            </div>

            <div className="bg-blue-50 min-h-[400px] relative">
                {/* Empty state */}
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
