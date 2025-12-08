import { useMemo, useState } from "react";
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
};

export function PhoneInput({ value, onChange, placeholder }: PhoneInputProps) {
    const defaultCountry = COUNTRIES[0];
    const [open, setOpen] = useState(false);
    const [country, setCountry] = useState<Country>(defaultCountry);

    const displayValue = useMemo(() => value ?? "", [value]);

    const handleCountrySelect = (c: Country) => {
        setCountry(c);

        if (!displayValue || !displayValue.startsWith("+")) {
            onChange(`+${c.dialCode}`);
            return;
        }

        const rest = displayValue.replace(/^\+\d+\s*/, "");
        onChange(`+${c.dialCode}${rest ? " " + rest : ""}`);
    };

    return (
        <div className="w-full">
            <div className="flex w-full">
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            className="flex h-10 w-[220px] items-center gap-2 rounded-r-none border-r-0 px-3"
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
                        className="p-0 w-[420px] max-h-[320px] overflow-auto"
                    >
                        <Command>
                            <CommandInput placeholder="Search..." />
                            <CommandList>
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
                    className="flex-1 rounded-l-none"
                    value={displayValue}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder ?? "e.g. +12015550123"}
                />
            </div>
        </div>
    );
}
