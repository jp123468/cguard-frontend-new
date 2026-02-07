import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  className?: string;
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const presets = [
    {
      label: "Hoy",
      getValue: () => ({
        from: startOfDay(new Date()),
        to: endOfDay(new Date()),
      }),
    },
    {
      label: "Ayer",
      getValue: () => ({
        from: startOfDay(subDays(new Date(), 1)),
        to: endOfDay(subDays(new Date(), 1)),
      }),
    },
    {
      label: "Últimos 7 días",
      getValue: () => ({
        from: startOfDay(subDays(new Date(), 6)),
        to: endOfDay(new Date()),
      }),
    },
    {
      label: "Últimos 2 semanas",
      getValue: () => ({
        from: startOfDay(subDays(new Date(), 13)),
        to: endOfDay(new Date()),
      }),
    },
    {
      label: "Últimos 3 semanas",
      getValue: () => ({
        from: startOfDay(subDays(new Date(), 20)),
        to: endOfDay(new Date()),
      }),
    },
    {
      label: "Este mes",
      getValue: () => {
        const now = new Date();
        return {
          from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
          to: endOfDay(new Date()),
        };
      },
    },
    {
      label: "Último mes",
      getValue: () => {
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return {
          from: startOfDay(lastMonth),
          to: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
        };
      },
    },
    {
      label: "Últimos 2 meses",
      getValue: () => ({
        from: startOfDay(subDays(new Date(), 60)),
        to: endOfDay(new Date()),
      }),
    },
    {
      label: "Últimos 3 meses",
      getValue: () => ({
        from: startOfDay(subDays(new Date(), 90)),
        to: endOfDay(new Date()),
      }),
    },
  ];

  const handlePresetClick = (preset: any) => {
    const range = preset.getValue();
    onDateRangeChange(range);
    setIsOpen(false);
  };

  const formatDateRange = () => {
    if (!dateRange?.from) {
      return "Seleccionar rango";
    }
    if (!dateRange.to) {
      return format(dateRange.from, "d/MM/yyyy", { locale: es });
    }
    return `${format(dateRange.from, "d/MM/yyyy", { locale: es })} – ${format(
      dateRange.to,
      "d/MM/yyyy",
      { locale: es }
    )}`;
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "justify-start text-left font-normal text-xs h-8",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
            {formatDateRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="flex">
            {/* Sidebar with presets */}
            <div className="border-r bg-orange-600 text-white p-1.5 w-40">
              <div className="space-y-0.5">
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePresetClick(preset)}
                    className="w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-blue-700 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Calendar */}
            <div className="p-2">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={onDateRangeChange}
                numberOfMonths={1}
                locale={es}
                className="[--cell-size:1.75rem]"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
