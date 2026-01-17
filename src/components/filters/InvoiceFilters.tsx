import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateFrom?: Date | undefined;
  setDateFrom: (d?: Date | undefined) => void;
  dateTo?: Date | undefined;
  setDateTo: (d?: Date | undefined) => void;
  clients?: any[];
  clientValue?: string | null;
  setClientValue?: (v: string | null) => void;
  statusValue?: string | null;
  setStatusValue?: (v: string | null) => void;
  applyLabel?: string;
  showTimeFields?: boolean;
  showClearButton?: boolean;
}

export default function InvoiceFilters({
  open,
  onOpenChange,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  clients = [],
  clientValue,
  setClientValue,
  statusValue,
  setStatusValue,
  applyLabel = "Filtro",
  showTimeFields = false,
  showClearButton = true,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" className="text-orange-600 border-orange-200">
          <Filter className="mr-2 h-4 w-4" />
          Filtros
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[460px]">
        <SheetHeader className="flex flex-row items-center justify-between border-b pb-4">
          <SheetTitle>Filtros</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={clientValue ?? "todos"} onValueChange={(v) => setClientValue && setClientValue(v === "todos" ? null : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los clientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {clients.map((c: any) => (
                  <SelectItem key={c.id ?? c._id ?? c.value} value={String(c.id ?? c._id ?? c.value)}>
                    {c.name ?? c.label ?? c.fullName ?? c.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Estado*</Label>
            <Select value={statusValue ?? "todos"} onValueChange={(v) => setStatusValue && setStatusValue(v === "todos" ? null : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Todo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todo</SelectItem>
                <SelectItem value="borrador">Borrador</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
                <SelectItem value="pagado">Pagado</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className={cn("space-y-2", !showTimeFields && "col-span-2")}>
              <Label>Desde la Fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "PPP", { locale: es }) : <span>Seleccionar</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-3 rounded-lg shadow-lg">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            {showTimeFields ? (
              <div className="space-y-2">
                <Label>Hora*</Label>
                <input type="time" defaultValue="00:00" className="w-full rounded-md border px-3 py-2" />
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className={cn("space-y-2", !showTimeFields && "col-span-2")}>
              <Label>Hasta la Fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "PPP", { locale: es }) : <span>Seleccionar</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-3 rounded-lg shadow-lg">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            {showTimeFields ? (
              <div className="space-y-2">
                <Label>Hora*</Label>
                <input type="time" defaultValue="23:59" className="w-full rounded-md border px-3 py-2" />
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white mt-2" onClick={() => onOpenChange(false)}>
              {applyLabel}
            </Button>
            {showClearButton ? (
              <Button
                variant="outline"
                className="w-full mt-1"
                onClick={() => {
                  if (setClientValue) setClientValue(null);
                  if (setStatusValue) setStatusValue(null);
                  setDateFrom(undefined);
                  setDateTo(undefined);
                }}
              >
                Limpiar
              </Button>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
