import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { EllipsisVertical } from "lucide-react";

export type RowAction = {
    label: string;
    icon?: React.ReactNode;
    destructive?: boolean;
    onClick: () => void;
};

type RowActionsMenuProps = {
    actions: RowAction[];
};

export function RowActionsMenu({ actions }: RowActionsMenuProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <EllipsisVertical className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-52">
                {actions.map((act, index) => (
                    <DropdownMenuItem
                        key={index}
                        onClick={act.onClick}
                        className={`flex items-center gap-2 ${act.destructive ? "text-red-600 focus:text-red-600" : ""
                            }`}
                    >
                        {act.icon}
                        <span>{act.label}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
