import type { ShiftRecord } from "@/lib/api/shiftService";

/** True when two dates fall on the same calendar day (local time). */
export function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();
}

/** Duration of a shift in hours, rounded to one decimal. */
export function shiftDurationHours(shift: ShiftRecord): number {
    const ms = new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime();
    return Math.round((ms / (1000 * 60 * 60)) * 10) / 10;
}

/** Palette used to colour shift blocks per guard. */
export const SHIFT_COLORS = [
    'bg-blue-500/15 border-blue-400 text-blue-900',
    'bg-green-100 border-green-400 text-green-900',
    'bg-purple-500/15 border-purple-400 text-purple-900',
    'bg-orange-500/15 border-orange-400 text-orange-900',
    'bg-teal-100 border-teal-400 text-teal-900',
];

/** Deterministic colour class for a guard id (or neutral for open shifts). */
export function colorForGuard(guardId: string | null): string {
    if (!guardId) return 'bg-muted border-gray-400 text-foreground';
    const code = guardId.charCodeAt(0) + guardId.charCodeAt(guardId.length - 1);
    return SHIFT_COLORS[code % SHIFT_COLORS.length];
}
