import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface ScheduleSidebarProps {
    selectedView: string;
    onViewChange: (value: string) => void;
}

export default function ScheduleSidebar({ selectedView, onViewChange }: ScheduleSidebarProps) {
    return (
        <div className="w-40 border-r p-4 space-y-6 flex-shrink-0">
            <div>
                <Label className="text-xs text-gray-500 mb-2 block">Ver Por</Label>
                <Select value={selectedView} onValueChange={onViewChange}>
                    <SelectTrigger className="h-9">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Guardia">Guardia</SelectItem>
                        <SelectItem value="Sitio">Sitio</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div>
                <div className="text-xs text-gray-700 mb-2">Notas</div>
                <div className="h-20 bg-blue-50 border border-blue-100 rounded"></div>
            </div>

            <div>
                <div className="text-xs text-blue-600 font-medium">Turnos sin guardias</div>
            </div>
        </div>
    );
}
