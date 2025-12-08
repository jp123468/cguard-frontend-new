import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus } from "lucide-react";

interface MonthViewProps {
    currentDate: Date;
}

export default function MonthView({ currentDate }: MonthViewProps) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const daysFromPrevMonth = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    const calendarDays: Date[] = [];

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = daysFromPrevMonth; i > 0; i--) {
        calendarDays.push(new Date(year, month - 1, prevMonthLastDay - i + 1));
    }

    for (let i = 1; i <= daysInMonth; i++) {
        calendarDays.push(new Date(year, month, i));
    }

    const remainingDays = 42 - calendarDays.length;
    for (let i = 1; i <= remainingDays; i++) {
        calendarDays.push(new Date(year, month + 1, i));
    }

    const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    return (
        <div className="flex-1 relative">
            <div className="grid grid-cols-7 border-b bg-gray-50">
                {weekDays.map((day) => (
                    <div key={day} className="p-3 text-center text-sm font-medium text-gray-700 border-r">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7">
                {calendarDays.map((day, idx) => {
                    const isCurrentMonth = day.getMonth() === month;
                    const isToday = day.toDateString() === new Date().toDateString();

                    return (
                        <div
                            key={idx}
                            className={`min-h-[100px] border-r border-b p-2 ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
                                }`}
                        >
                            <div className={`text-sm ${isToday ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''}`}>
                                {day.getDate()}
                            </div>
                        </div>
                    );
                })}
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
