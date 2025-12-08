import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export function RowCheck({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-3">
      <Checkbox defaultChecked={defaultChecked} />
      <span className="text-sm">{label}</span>
    </label>
  );
}

export function TimeSelect({ defaultValue }: { defaultValue: string }) {
  return (
    <Select defaultValue={defaultValue}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="00:05">00:05</SelectItem>
        <SelectItem value="00:10">00:10</SelectItem>
        <SelectItem value="00:15">00:15</SelectItem>
        <SelectItem value="00:30">00:30</SelectItem>
        <SelectItem value="01:00">01:00</SelectItem>
        <SelectItem value="02:00">02:00</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function LabeledSelect({
  label,
  defaultValue,
  items,
}: {
  label: string;
  defaultValue?: string;
  items: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select defaultValue={defaultValue}>
        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
        <SelectContent>
          {items.map(i => (
            <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function NumberWithSuffix({
  label,
  defaultValue,
  suffix,
}: {
  label: string;
  defaultValue: number;
  suffix: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2 max-w-xs">
        <Input type="number" defaultValue={defaultValue} />
        <span className="text-sm text-muted-foreground">{suffix}</span>
      </div>
    </div>
  );
}
