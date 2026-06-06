import { Button } from "@/components/ui/button";
import { getTenantTimezone } from "@/utils/tenantLocation";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  UserCircle2,
  AlertTriangle,
} from "lucide-react";
import { ShiftRecord, guardDisplayName } from "@/lib/api/shiftService";

function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();
}

const SHIFT_COLORS = [
    'bg-blue-500/15 border-blue-400 text-blue-900',
    'bg-green-100 border-green-400 text-green-900',
    'bg-purple-500/15 border-purple-400 text-purple-900',
    'bg-orange-500/15 border-orange-400 text-orange-900',
    'bg-teal-100 border-teal-400 text-teal-900',
];

function colorForGuard(guardId: string | null): string {
    if (!guardId) return 'bg-muted border-gray-400 text-foreground';
    const code = guardId.charCodeAt(0) + guardId.charCodeAt(guardId.length - 1);
    return SHIFT_COLORS[code % SHIFT_COLORS.length];
}

interface WeekViewProps {
    currentDate: Date;
    shifts?: ShiftRecord[];
    gaps?: Array<{ startTime: string; endTime: string; hoursUncovered: number; stationName?: string }>;
    onCreateShift?: () => void;
    onEditShift?: (shift: ShiftRecord) => void;
}

export default function WeekView({ currentDate, shifts = [], gaps = [], onCreateShift, onEditShift }: WeekViewProps) {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1);

    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        return day;
    });

    const today = new Date();

    return (
        <div className="flex-1 relative">
            {/* Week Header */}
            <div className="grid grid-cols-7 border-b">
                {weekDays.map((day, idx) => {
                    const isToday = isSameDay(day, today);
                    const dayShifts = shifts.filter(s => isSameDay(new Date(s.startTime), day));
                    const dayGaps   = gaps.filter(g => isSameDay(new Date(g.startTime), day));
                    return (
                        <div key={idx} className={`p-3 border-r text-center ${isToday ? 'bg-blue-500/10' : 'bg-muted/30'}`}>
                            <div className="text-xs font-medium uppercase text-muted-foreground">
                                {day.toLocaleDateString('es-ES', { weekday: 'short' })}
                            </div>
                            <div className={`text-lg font-bold mt-0.5 w-8 h-8 flex items-center justify-center mx-auto rounded-full ${
                                isToday ? 'bg-[#C8860A] text-white' : 'text-foreground'
                            }`}>
                                {day.getDate()}
                            </div>
                            {dayShifts.length > 0 && (
                                <div className="text-xs text-blue-600 mt-1">{dayShifts.length} turno{dayShifts.length > 1 ? 's' : ''}</div>
                            )}
                            {dayGaps.length > 0 && (
                                <div className="text-xs text-red-500 mt-0.5"><AlertTriangle className="inline h-3 w-3 mr-0.5" />{dayGaps.length} brecha{dayGaps.length > 1 ? 's' : ''}</div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Week Grid */}
            <div className="grid grid-cols-7 min-h-[500px]">
                {weekDays.map((day, idx) => {
                    const dayShifts = shifts
                        .filter(s => isSameDay(new Date(s.startTime), day))
                        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
                    return (
                        <div key={idx} className="border-r p-1.5 space-y-1">
                            {dayShifts.length === 0 ? (
                                <div className="h-full flex items-start justify-center pt-4">
                                    <span className="text-xs text-muted-foreground/60">—</span>
                                </div>
                            ) : (
                                dayShifts.map(shift => {
                                    const startLabel = new Date(shift.startTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: getTenantTimezone() });
                                    const endLabel = new Date(shift.endTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: getTenantTimezone() });
                                    const color = colorForGuard(shift.guardId);
                                    return (
                                        <button
                                            key={shift.id}
                                            onClick={() => onEditShift?.(shift)}
                                            className={`w-full text-left rounded border-l-2 px-1.5 py-1 text-xs ${color} hover:shadow-sm transition-shadow`}
                                        >
                                            <div className="flex items-center gap-1">
                                                <UserCircle2 className="h-3 w-3 flex-shrink-0" />
                                                <span className="font-medium truncate">{guardDisplayName(shift.guard) ?? 'Abierto'}</span>
                                            </div>
                                            <div className="opacity-70 mt-0.5">{startLabel}–{endLabel}</div>
                                            {shift.station && (
                                                <div className="opacity-60 truncate">{shift.station.stationName}</div>
                                            )}
                                        </button>
                                    );
                                })
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
                        className="absolute bottom-6 right-6 h-12 w-12 rounded-full bg-[#C8860A] hover:bg-[#B37809] shadow-lg"
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
