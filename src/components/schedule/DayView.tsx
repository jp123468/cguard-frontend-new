import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, UserCircle2, MapPin } from "lucide-react";
import { ShiftRecord } from "@/lib/api/shiftService";

const HOUR_HEIGHT = 64; // px per hour
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(h: number) {
    return `${String(h).padStart(2, '0')}:00`;
}

function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();
}

function getShiftTop(shift: ShiftRecord): number {
    const start = new Date(shift.startTime);
    return (start.getHours() + start.getMinutes() / 60) * HOUR_HEIGHT;
}

function getShiftHeight(shift: ShiftRecord): number {
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return Math.max(hours * HOUR_HEIGHT, HOUR_HEIGHT * 0.5);
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

interface CoverageGap {
    startTime: string;
    endTime: string;
    hoursUncovered: number;
    stationName?: string;
}

interface DayViewProps {
    currentDate: Date;
    shifts?: ShiftRecord[];
    gaps?: CoverageGap[];
    onCreateShift?: () => void;
    onEditShift?: (shift: ShiftRecord) => void;
}

export default function DayView({ currentDate, shifts = [], gaps = [], onCreateShift, onEditShift }: DayViewProps) {
    const dateString = currentDate.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const dayShifts = shifts.filter(s => isSameDay(new Date(s.startTime), currentDate));
    const dayGaps   = gaps.filter(g => isSameDay(new Date(g.startTime), currentDate));

    return (
        <div className="flex-1 relative overflow-hidden">
            {/* Date header */}
            <div className="p-4 border-b bg-card sticky top-0 z-10">
                <div className="text-base font-semibold text-foreground capitalize">{dateString}</div>
                <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                        {dayShifts.length === 0 ? 'Sin turnos programados' : `${dayShifts.length} turno${dayShifts.length > 1 ? 's' : ''}`}
                    </span>
                    {dayGaps.length > 0 && (
                        <span className="text-xs text-red-600 font-medium bg-red-500/10 px-2 py-0.5 rounded-full">
                            {dayGaps.length} brecha{dayGaps.length > 1 ? 's' : ''} sin cobertura
                        </span>
                    )}
                </div>
            </div>

            {/* Timeline */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                <div className="relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
                    {/* Hour grid lines */}
                    {HOURS.map(hour => (
                        <div
                            key={hour}
                            className="absolute w-full border-t border-border flex"
                            style={{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                        >
                            <div className="w-14 flex-shrink-0 text-right pr-3 pt-1">
                                <span className="text-xs text-muted-foreground">{formatHour(hour)}</span>
                            </div>
                            <div className="flex-1 border-l border-border" />
                        </div>
                    ))}

                    {/* Gap overlays (red stripes for uncovered windows) */}
                    <div className="absolute left-14 right-2 pointer-events-none">
                        {dayGaps.map((gap, i) => {
                            const gapStart = new Date(gap.startTime);
                            const gapEnd   = new Date(gap.endTime);
                            const top = (gapStart.getHours() + gapStart.getMinutes() / 60) * HOUR_HEIGHT;
                            const hours = (gapEnd.getTime() - gapStart.getTime()) / (1000 * 60 * 60);
                            const height = Math.max(hours * HOUR_HEIGHT, 6);
                            return (
                                <div
                                    key={i}
                                    className="absolute left-0 right-1 rounded bg-red-500/15/70 border-l-4 border-red-400"
                                    style={{ top: `${top}px`, height: `${height}px` }}
                                    title={`Sin cobertura: ${gap.hoursUncovered}h${gap.stationName ? ` — ${gap.stationName}` : ''}`}
                                >
                                    {height >= 20 && (
                                        <span className="text-[10px] text-red-600 font-medium px-1.5 leading-none flex items-center h-full gap-1">
                                            ⚠ Sin cobertura{gap.stationName ? ` · ${gap.stationName}` : ''} ({gap.hoursUncovered}h)
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Shift blocks */}
                    <div className="absolute left-14 right-2">
                        {dayShifts.map((shift) => {
                            const top = getShiftTop(shift);
                            const height = getShiftHeight(shift);
                            const color = colorForGuard(shift.guardId);
                            const startLabel = new Date(shift.startTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                            const endLabel = new Date(shift.endTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                            return (
                                <button
                                    key={shift.id}
                                    onClick={() => onEditShift?.(shift)}
                                    className={`absolute left-0 right-1 rounded border-l-4 px-2 py-1 text-left shadow-sm hover:shadow-md transition-shadow ${color}`}
                                    style={{ top: `${top}px`, height: `${height}px`, minHeight: '32px' }}
                                >
                                    <div className="flex items-center gap-1 overflow-hidden">
                                        <UserCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                                        <span className="text-xs font-semibold truncate">
                                            {shift.guard?.fullName ?? 'Turno abierto'}
                                        </span>
                                    </div>
                                    {height >= 40 && (
                                        <div className="text-xs opacity-70 mt-0.5">{startLabel} – {endLabel}</div>
                                    )}
                                    {height >= 56 && shift.station && (
                                        <div className="flex items-center gap-1 text-xs opacity-60 mt-0.5">
                                            <MapPin className="h-3 w-3" />
                                            <span className="truncate">{shift.station.stationName}</span>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
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
