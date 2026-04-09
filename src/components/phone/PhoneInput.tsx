import { useMemo, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
} from "@/components/ui/popover";
import {
    Command,
    CommandInput,
    CommandList,
    CommandEmpty,
    CommandGroup,
    CommandItem,
} from "@/components/ui/command";
import { ChevronsUpDown, Check } from "lucide-react";
import { COUNTRIES, Country } from "@/lib/data/countries";
import { cn } from "@/lib/utils";

type PhoneInputProps = {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    onCountryChange?: (country: Country) => void;
    /**
     * Optional override for the maximum number of local digits (excluding country code).
     * If provided, takes precedence over the country default maxLength.
     */
    maxLocalDigits?: number;
};

export function PhoneInput({ value, onChange, placeholder, onCountryChange, maxLocalDigits }: PhoneInputProps) {
    // notify parent of selected country via onCountryChange when provided
    const defaultCountry = COUNTRIES[0];
    const [open, setOpen] = useState(false);
    const [country, setCountry] = useState<Country>(defaultCountry);

    // notify initial country to parent once
    useEffect(() => {
        if (onCountryChange) onCountryChange(country);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const displayValue = useMemo(() => value ?? "", [value]);

    // Si el valor comienza con un prefijo +<código>, detectar el país correspondiente
    useEffect(() => {
        if (!displayValue || !displayValue.startsWith("+")) return;

        // Normalizar: tomar solo los dígitos inmediatamente después del + hasta el primer espacio
        const normalized = displayValue.replace(/^\+/, "");
        const local = normalized.split(" ")[0];

        // Buscar la mejor coincidencia (código más largo primero)
        const sorted = COUNTRIES.slice().sort((a, b) => b.dialCode.length - a.dialCode.length);
        const match = sorted.find((c) => local.startsWith(c.dialCode));
        if (match && match.code !== country.code) {
            setCountry(match);
            if (onCountryChange) onCountryChange(match);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [displayValue]);

    // Calcular el máximo total: código de país + espacios + dígitos
    const maxPhoneLength = useMemo(() => {
        const codeLength = country.dialCode.length + 1; // +1 para el "+"
        const maxDigits = maxLocalDigits ?? country.maxLength ?? 15;
        return codeLength + maxDigits;
    }, [country, maxLocalDigits]);

    const handleCountrySelect = (c: Country) => {
        setCountry(c);
        if (onCountryChange) onCountryChange(c);

        if (!displayValue || !displayValue.startsWith("+")) {
            onChange(`+${c.dialCode}`);
            return;
        }

        const rest = displayValue.replace(/^\+\d+\s*/, "");
        onChange(`+${c.dialCode}${rest ? " " + rest : ""}`);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;

        // Solo permitir números, +, y espacios
        if (!/^[\d+\s]*$/.test(newValue)) {
            return;
        }

        // Limitar la longitud total
        if (newValue.length <= maxPhoneLength) {
            onChange(newValue);
        }
    };

    return (
        <div className="w-full">
            <div className="flex w-full">
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            className="flex h-10 w-20 md:w-28 items-center gap-2 rounded-r-none border-r-0 px-2"
                        >
                            <span className="text-lg leading-none">{country.flag}</span>
                            <span className="text-sm text-muted-foreground">
                                +{country.dialCode}
                            </span>
                            <ChevronsUpDown className="ml-auto h-3 w-3 opacity-50" />
                        </Button>
                    </PopoverTrigger>

                    <PopoverContent
                        align="start"
                        className="p-0 w-[320px] max-h-[320px] overflow-hidden"
                    >
                        <Command>
                            <CommandInput placeholder="Search..." />
                                    <CommandList
                                        className="max-h-[240px] overflow-auto overscroll-contain touch-auto"
                                        onWheel={(e: any) => {
                                            const el = e.currentTarget as HTMLElement;
                                            const delta = e.deltaY;

                                            const atTop = el.scrollTop === 0;
                                            const atBottom = Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight;

                                            // If trying to scroll beyond the list, let parent handle it.
                                            if ((delta < 0 && atTop) || (delta > 0 && atBottom)) {
                                                return;
                                            }

                                            // Within list: manually adjust scroll. Avoid calling preventDefault
                                            // to prevent passive event listener warnings in some browsers.
                                            el.scrollTop += delta;
                                        }}
                                    >
                                <CommandEmpty>No se encontraron países.</CommandEmpty>
                                <CommandGroup>
                                    {COUNTRIES.map((c) => (
                                        <CommandItem
                                            key={c.code}
                                            value={`${c.name} +${c.dialCode}`}
                                            onSelect={() => {
                                                handleCountrySelect(c);
                                                setOpen(false);
                                            }}
                                            className="flex items-center gap-2"
                                        >
                                            <span className="text-lg">{c.flag}</span>
                                            <span className="flex-1 text-sm">{c.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                                +{c.dialCode}
                                            </span>
                                            <Check
                                                className={cn(
                                                    "ml-1 h-3 w-3",
                                                    c.code === country.code
                                                        ? "opacity-100"
                                                        : "opacity-0"
                                                )}
                                            />
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>

                <Input
                    className="flex-1 min-w-0 rounded-l-none"
                    value={displayValue}
                    onChange={handleInputChange}
                    placeholder={placeholder ?? "e.g. +12015550123"}
                                maxLength={maxPhoneLength}
                />
            </div>
        </div>
    );
}
