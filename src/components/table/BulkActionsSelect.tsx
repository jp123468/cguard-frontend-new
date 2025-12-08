import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";

export type BulkAction = {
    value: string;
    label: string;
};

type BulkActionsSelectProps = {
    actions: BulkAction[];
    onChange: (value: string) => void;
};

export function BulkActionsSelect({ actions, onChange }: BulkActionsSelectProps) {
    return (
        <Select onValueChange={onChange}>
            <SelectTrigger className="w-44">
                <SelectValue placeholder="Acción" />
            </SelectTrigger>
            <SelectContent>
                {actions.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                        {a.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
