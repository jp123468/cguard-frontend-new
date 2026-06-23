import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search, X } from "lucide-react";
import { securityGuardService } from "@/lib/api/securityGuardService";
import { postSiteService } from "@/lib/api/postSiteService";
import { stationService } from "@/lib/api/stationService";
import shiftService, { ShiftRecord, guardDisplayName } from "@/lib/api/shiftService";
import { toast } from "sonner";

interface Option {
  id: string;
  label: string;
}

interface SearchSelectProps {
  label: string;
  value: Option | null;
  onChange: (opt: Option | null) => void;
  onSearch: (query: string) => Promise<Option[]>;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

function SearchSelect({
  label,
  value,
  onChange,
  onSearch,
  placeholder = "Buscar...",
  disabled = false,
  required = false,
}: SearchSelectProps) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  const handleSearch = useCallback(
    async (q: string) => {
      setSearching(true);
      try {
        const results = await onSearch(q);
        setOptions(results);
      } catch {
        setOptions([]);
      } finally {
        setSearching(false);
      }
    },
    [onSearch]
  );

  useEffect(() => {
    if (open) handleSearch(query);
  }, [open, query]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setOpen(true);
  };

  const handleSelect = (opt: Option) => {
    onChange(opt);
    setQuery(opt.label);
    setOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="grid gap-1.5">
      <Label>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-8 pr-8"
          placeholder={placeholder}
          value={value && !open ? value.label : query}
          onChange={handleInputChange}
          onFocus={() => {
            setQuery("");
            setOpen(true);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          disabled={disabled}
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/70"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {open && (
          <div className="absolute z-50 w-full mt-1 bg-card border rounded-md shadow-lg max-h-48 overflow-y-auto">
            {searching ? (
              <div className="p-3 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando...
              </div>
            ) : options.length === 0 ? (
              <div className="p-3 text-center text-sm text-muted-foreground">
                Sin resultados
              </div>
            ) : (
              options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted focus:bg-muted"
                  onMouseDown={() => handleSelect(opt)}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function toLocalDateTimeInput(isoString: string): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalDateTimeInput(value: string): string {
  if (!value) return "";
  return new Date(value).toISOString();
}

interface ShiftFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: Date;
  editShift?: ShiftRecord | null;
}

export default function ShiftFormModal({
  open,
  onClose,
  onSuccess,
  initialDate,
  editShift,
}: ShiftFormModalProps) {
  const isEdit = !!editShift;

  const defaultStart = initialDate
    ? (() => {
        const d = new Date(initialDate);
        d.setHours(8, 0, 0, 0);
        return toLocalDateTimeInput(d.toISOString());
      })()
    : "";

  const defaultEnd = initialDate
    ? (() => {
        const d = new Date(initialDate);
        d.setHours(16, 0, 0, 0);
        return toLocalDateTimeInput(d.toISOString());
      })()
    : "";

  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(defaultEnd);
  const [guard, setGuard] = useState<Option | null>(null);
  const [postSite, setPostSite] = useState<Option | null>(null);
  const [station, setStation] = useState<Option | null>(null);
  const [stationOptions, setStationOptions] = useState<Option[]>([]);
  const [saving, setSaving] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (editShift && open) {
      setStartTime(toLocalDateTimeInput(editShift.startTime));
      setEndTime(toLocalDateTimeInput(editShift.endTime));
      if (editShift.guard) {
        setGuard({
          id: editShift.guard.id,
          label: guardDisplayName(editShift.guard) || "Vigilante",
        });
      }
      if (editShift.station) {
        setStation({
          id: editShift.station.id,
          label: editShift.station.stationName,
        });
      }
    } else if (!editShift && open) {
      setStartTime(defaultStart);
      setEndTime(defaultEnd);
      setGuard(null);
      setPostSite(null);
      setStation(null);
    }
  }, [editShift, open]);

  // Load stations when postSite changes
  useEffect(() => {
    if (!postSite) {
      setStationOptions([]);
      setStation(null);
      return;
    }
    stationService
      .list({ postSite: postSite.id } as any, { limit: 100, offset: 0 })
      .then((res: any) => {
        setStationOptions(
          (res.rows ?? []).map((s: any) => ({ id: s.id, label: s.name || s.stationName || s.id }))
        );
      })
      .catch(() => setStationOptions([]));
  }, [postSite]);

  const searchGuards = async (q: string): Promise<Option[]> => {
    const resp = await securityGuardService.autocomplete(q, 20);
    const items = Array.isArray(resp) ? resp : (resp as any)?.data ?? [];
    return items.map((g: any) => ({ id: g.id, label: g.label || g.fullName || g.email || g.id }));
  };

  const searchPostSites = async (q: string): Promise<Option[]> => {
    const resp = await postSiteService.autocomplete(q);
    const items = Array.isArray(resp) ? resp : (resp as any)?.data ?? [];
    return items.map((p: any) => ({ id: p.id, label: p.label || p.name || p.id }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime || !endTime) {
      toast.error("Ingresa la fecha y hora de inicio y fin");
      return;
    }
    if (new Date(startTime) >= new Date(endTime)) {
      toast.error("La hora de fin debe ser posterior a la hora de inicio");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        startTime: fromLocalDateTimeInput(startTime),
        endTime: fromLocalDateTimeInput(endTime),
        guard: guard?.id,
        postSite: postSite?.id,
        station: station?.id,
      };
      if (isEdit && editShift) {
        await shiftService.update(editShift.id, payload);
        toast.success("Turno actualizado");
      } else {
        await shiftService.create(payload);
        toast.success("Turno creado");
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.errors?.[0]?.message || "Error al guardar el turno");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Turno" : "Nuevo Turno"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Guard */}
          <SearchSelect
            label="Vigilante"
            value={guard}
            onChange={setGuard}
            onSearch={searchGuards}
            placeholder="Buscar vigilante..."
          />

          {/* Post Site */}
          <SearchSelect
            label="Puesto de Seguridad"
            value={postSite}
            onChange={(opt) => {
              setPostSite(opt);
              setStation(null);
            }}
            onSearch={searchPostSites}
            placeholder="Buscar puesto..."
          />

          {/* Station — only shown when postSite is selected */}
          {postSite && (
            <div className="grid gap-1.5">
              <Label>Estación</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={station?.id ?? ""}
                onChange={(e) => {
                  const opt = stationOptions.find((s) => s.id === e.target.value);
                  setStation(opt ?? null);
                }}
              >
                <option value="">— Sin estación específica —</option>
                {stationOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date/Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>
                Inicio <span className="text-red-500">*</span>
              </Label>
              <Input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label>
                Fin <span className="text-red-500">*</span>
              </Label>
              <Input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="bg-[#C8860A] hover:bg-[#B37809] text-white">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? "Guardar Cambios" : "Crear Turno"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
