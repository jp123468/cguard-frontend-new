import { Button } from "@/components/ui/button";
import { getTenantTimezone } from "@/utils/tenantLocation";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, UserCircle2, MapPin, Clock } from "lucide-react";
import { ShiftRecord, guardDisplayName } from "@/lib/api/shiftService";
import { isSameDay, shiftDurationHours } from "./scheduleUtils";

interface ListViewProps {
    currentDate: Date;
    shifts?: ShiftRecord[];
    onCreateShift?: () => void;
    onEditShift?: (shift: ShiftRecord) => void;
}

export default function ListView({ currentDate, shifts = [], onCreateShift, onEditShift }: ListViewProps) {
    // Show 14 days starting from current date
    const days = Array.from({ length: 14 }, (_, i) => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + i);
        return d;
    });

    const today = new Date();

    return (
        <div className="flex-1 relative">
            <div className="divide-y">
                {days.map((day, idx) => {
                    const dayShifts = shifts
                        .filter(s => isSameDay(new Date(s.startTime), day))
                        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
                    const isToday = isSameDay(day, today);

                    return (
                        <div
                            key={idx}
                            className={`${
                                isToday ? 'bg-amber-500/10' : idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'
                            }`}
                        >
                            {/* Day header */}
                            <div className="px-6 py-3 flex items-center gap-3 border-b border-border">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                                    isToday ? 'bg-primary text-white' : 'bg-muted text-foreground'
                                }`}>
                                    {day.getDate()}
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-foreground capitalize">
                                        {day.toLocaleDateString('es-ES', { weekday: 'long', month: 'long', year: 'numeric' })}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {dayShifts.length === 0 ? 'Sin turnos' : `${dayShifts.length} turno${dayShifts.length > 1 ? 's' : ''}`}
                                    </div>
                                </div>
                            </div>

                            {/* Shifts */}
                            {dayShifts.length > 0 && (
                                <div className="px-6 py-3 space-y-2">
                                    {dayShifts.map(shift => {
                                        const startLabel = new Date(shift.startTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: getTenantTimezone() });
                                        const endLabel = new Date(shift.endTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: getTenantTimezone() });
                                        const hours = shiftDurationHours(shift);
                                        return (
                                            <button
                                                key={shift.id}
                                                onClick={() => onEditShift?.(shift)}
                                                className="w-full text-left bg-card border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow flex items-start gap-3"
                                            >
                                                <div className="flex-shrink-0 w-10 text-center">
                                                    <div className="text-xs font-medium text-muted-foreground">{startLabel}</div>
                                                    <div className="text-xs text-muted-foreground my-0.5">|</div>
                                                    <div className="text-xs font-medium text-muted-foreground">{endLabel}</div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <UserCircle2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                        <span className="text-sm font-semibold text-foreground">
                                                            {guardDisplayName(shift.guard) ?? 'Turno abierto'}
                                                        </span>
                                                    </div>
                                                    {shift.station && (
                                                        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                                                            <MapPin className="h-3 w-3" />
                                                            <span>{shift.station.stationName}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-shrink-0 flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    <span>{hours}h</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* FAB */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        size="icon"
                        className="sticky bottom-6 float-right mr-6 h-12 w-12 rounded-full bg-primary hover:bg-primary/90 shadow-lg"
                        title="Agregar"
                    >
                        <Plus className="h-6 w-6 text-white" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={onCreateShift}>Crear Turno Estándar</DropdownMenuItem>
                    <DropdownMenuItem>Crear Turno Abierto</DropdownMenuItem>
                    <DropdownMenuItem>Crear Turno desde Plantilla</DropdownMenuItem>
                    <DropdownMenuItem>Crear Plantilla de Turno</DropdownMenuItem>
                    <DropdownMenuItem>Crear Nota</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
