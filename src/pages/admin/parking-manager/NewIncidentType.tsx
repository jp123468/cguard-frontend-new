import { useState } from "react";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select";
import Breadcrumb from "@/components/ui/breadcrumb";
import {
    Type,
    Hash,
    Calendar,
    Clock,
    ListTodo,
    List,
    ChevronDown,
    Info,
    Heading,
    PenTool,
    Image as ImageIcon,
    Mic,
    Video,
    X,
    GripVertical,
    Plus,
    Trash2,
    Save
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

// --- Types ---

type FieldType =
    | "text"
    | "number"
    | "date"
    | "time"
    | "checklist"
    | "option_group"
    | "dropdown"
    | "instruction"
    | "header"
    | "signature"
    | "image"
    | "audio"
    | "video";

interface FormField {
    id: string;
    type: FieldType;
    label: string;
    required: boolean;
    options?: string[];
    instructionText?: string;
}

// --- Constants ---

const FIELD_TYPES: { type: FieldType; label: string; icon: any }[] = [
    { type: "text", label: "Entrada de texto", icon: Type },
    { type: "number", label: "Número", icon: Hash },
    { type: "date", label: "Fecha", icon: Calendar },
    { type: "time", label: "Hora", icon: Clock },
    { type: "checklist", label: "Lista de Verificación", icon: ListTodo },
    { type: "option_group", label: "Grupo de opciones", icon: List },
    { type: "dropdown", label: "Desplegable", icon: ChevronDown },
    { type: "instruction", label: "Instrucción", icon: Info },
    { type: "header", label: "Encabezado", icon: Heading },
    { type: "signature", label: "Firma", icon: PenTool },
    { type: "image", label: "Imagen", icon: ImageIcon },
    { type: "audio", label: "Audio", icon: Mic },
    { type: "video", label: "Video", icon: Video },
];

// --- Component ---

export default function NewIncidentType() {
    const [incidentName, setIncidentName] = useState("");
    const [fields, setFields] = useState<FormField[]>([]);
    const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

    // --- Actions ---

    const handleAddField = (type: FieldType) => {
        const newField: FormField = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            label: getLabelForType(type),
            required: false,
            options: ["dropdown", "option_group", "checklist"].includes(type) ? ["Opción 1", "Opción 2"] : undefined,
            instructionText: type === "instruction" ? "Ingrese las instrucciones aquí..." : undefined,
        };
        setFields([...fields, newField]);
        setSelectedFieldId(newField.id);
    };

    const handleRemoveField = (id: string) => {
        setFields(fields.filter((f) => f.id !== id));
        if (selectedFieldId === id) {
            setSelectedFieldId(null);
        }
    };

    const updateField = (id: string, updates: Partial<FormField>) => {
        setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
    };

    const addOption = (fieldId: string) => {
        const field = fields.find((f) => f.id === fieldId);
        if (field && field.options) {
            const newOptions = [...field.options, `Opción ${field.options.length + 1}`];
            updateField(fieldId, { options: newOptions });
        }
    };

    const updateOption = (fieldId: string, index: number, value: string) => {
        const field = fields.find((f) => f.id === fieldId);
        if (field && field.options) {
            const newOptions = [...field.options];
            newOptions[index] = value;
            updateField(fieldId, { options: newOptions });
        }
    };

    const removeOption = (fieldId: string, index: number) => {
        const field = fields.find((f) => f.id === fieldId);
        if (field && field.options) {
            const newOptions = field.options.filter((_, i) => i !== index);
            updateField(fieldId, { options: newOptions });
        }
    };

    const getLabelForType = (type: FieldType) => {
        const found = FIELD_TYPES.find((t) => t.type === type);
        return found ? found.label : "Campo";
    };

    // --- Render Helpers ---

    const renderFieldPreview = (field: FormField, isPhone: boolean = false) => {
        const commonClasses = isPhone ? "text-sm" : "";

        switch (field.type) {
            case "text":
                return <Input disabled placeholder="Texto de respuesta..." className={commonClasses} />;
            case "number":
                return <Input disabled type="number" placeholder="0" className={commonClasses} />;
            case "date":
                return (
                    <div className={cn("border rounded-md p-2 text-slate-400 flex justify-between items-center bg-white", commonClasses)}>
                        <span>dd/mm/aaaa</span>
                        <Calendar className="h-4 w-4" />
                    </div>
                );
            case "time":
                return (
                    <div className={cn("border rounded-md p-2 text-slate-400 flex justify-between items-center bg-white", commonClasses)}>
                        <span>--:--</span>
                        <Clock className="h-4 w-4" />
                    </div>
                );
            case "dropdown":
                return (
                    <Select disabled>
                        <SelectTrigger className={cn("bg-white", commonClasses)}>
                            <SelectValue placeholder="Seleccionar opción" />
                        </SelectTrigger>
                        <SelectContent>
                            {field.options?.map((opt, i) => (
                                <SelectItem key={i} value={opt}>{opt}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );
            case "option_group":
                return (
                    <div className="space-y-2">
                        {field.options?.map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className="h-4 w-4 rounded-full border border-slate-300 bg-white" />
                                <span className={cn("text-slate-700", commonClasses)}>{opt}</span>
                            </div>
                        ))}
                    </div>
                );
            case "checklist":
                return (
                    <div className="space-y-2">
                        {field.options?.map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className="h-4 w-4 rounded border border-slate-300 bg-white" />
                                <span className={cn("text-slate-700", commonClasses)}>{opt}</span>
                            </div>
                        ))}
                    </div>
                );
            case "instruction":
                return <p className={cn("text-slate-500 italic", commonClasses)}>{field.instructionText || field.label}</p>;
            case "header":
                return <h3 className={cn("font-bold text-slate-800 border-b pb-1", isPhone ? "text-base" : "text-lg")}>{field.label}</h3>;
            case "image":
            case "audio":
            case "video":
            case "signature":
                return (
                    <div className={cn("border-2 border-dashed rounded-md flex flex-col items-center justify-center text-slate-400 bg-slate-50", isPhone ? "p-2 h-20" : "p-6 h-32")}>
                        {field.type === "image" && <ImageIcon className={isPhone ? "h-6 w-6" : "h-8 w-8"} />}
                        {field.type === "audio" && <Mic className={isPhone ? "h-6 w-6" : "h-8 w-8"} />}
                        {field.type === "video" && <Video className={isPhone ? "h-6 w-6" : "h-8 w-8"} />}
                        {field.type === "signature" && <PenTool className={isPhone ? "h-6 w-6" : "h-8 w-8"} />}
                        <span className="text-xs uppercase mt-2 font-medium">{getLabelForType(field.type)}</span>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <AppLayout>
            <Breadcrumb
                items={[
                    { label: "Panel de control", path: "/dashboard" },
                    { label: "Nuevo Tipo de Incidente" },
                ]}
            />

            <div className="p-6 space-y-6">
                {/* Incident Name */}
                <div className="space-y-2">
                    <Label htmlFor="incidentName" className="text-sm font-medium">Nombre del Incidente*</Label>
                    <Input
                        id="incidentName"
                        value={incidentName}
                        onChange={(e) => setIncidentName(e.target.value)}
                        placeholder="Nombre del Incidente*"
                        className="max-w-4xl"
                    />
                </div>

                {/* Description */}
                <p className="text-sm text-slate-600 max-w-4xl">
                    Personalice su formulario arrastrando y soltando los campos a continuación en el área del formulario.
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Sidebar: Field Types */}
                    <div className="lg:col-span-1">
                        <ScrollArea className="h-[600px] border rounded-lg bg-white p-4">
                            <div className="space-y-2">
                                {FIELD_TYPES.map((item) => (
                                    <Button
                                        key={item.type}
                                        variant="outline"
                                        className="w-full justify-start gap-3 h-auto py-3 font-normal text-slate-700 hover:bg-slate-50"
                                        onClick={() => handleAddField(item.type)}
                                    >
                                        <item.icon className="h-4 w-4 shrink-0" />
                                        <span>{item.label}</span>
                                    </Button>
                                ))}
                            </div>
                        </ScrollArea>
                        <p className="text-xs text-red-500 mt-2">Los campos del formulario son requeridos.</p>
                    </div>

                    {/* Center: Canvas */}
                    <div className="lg:col-span-1">
                        <div className="border rounded-lg bg-white p-6 min-h-[600px]">
                            {fields.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-slate-400">
                                    <p className="text-sm">No hay campos para mostrar</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {fields.map((field) => (
                                        <div
                                            key={field.id}
                                            className={cn(
                                                "border rounded-md p-4 relative group cursor-pointer transition-all",
                                                selectedFieldId === field.id ? "ring-2 ring-blue-500 border-transparent" : "hover:border-slate-300"
                                            )}
                                            onClick={() => setSelectedFieldId(field.id)}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <GripVertical className="h-4 w-4 text-slate-300 cursor-move" />
                                                    <Label className="font-medium text-slate-700">{field.label}</Label>
                                                    {field.required && <span className="text-red-500">*</span>}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoveField(field.id);
                                                    }}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            {/* Field Preview */}
                                            <div className="pointer-events-none">
                                                {renderFieldPreview(field)}
                                            </div>

                                            {/* Edit Panel */}
                                            {selectedFieldId === field.id && (
                                                <div className="mt-4 pt-4 border-t space-y-4" onClick={(e) => e.stopPropagation()}>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs">Etiqueta</Label>
                                                        <Input
                                                            value={field.label}
                                                            onChange={(e) => updateField(field.id, { label: e.target.value })}
                                                            className="h-9"
                                                        />
                                                    </div>

                                                    {field.type === "instruction" && (
                                                        <div className="space-y-2">
                                                            <Label className="text-xs">Texto de Instrucción</Label>
                                                            <Input
                                                                value={field.instructionText}
                                                                onChange={(e) => updateField(field.id, { instructionText: e.target.value })}
                                                                className="h-9"
                                                            />
                                                        </div>
                                                    )}

                                                    <div className="flex items-center justify-between">
                                                        <Label htmlFor={`req-${field.id}`} className="text-xs">Requerido</Label>
                                                        <Switch
                                                            id={`req-${field.id}`}
                                                            checked={field.required}
                                                            onCheckedChange={(checked) => updateField(field.id, { required: checked })}
                                                        />
                                                    </div>

                                                    {/* Options Editor */}
                                                    {(field.type === "dropdown" || field.type === "option_group" || field.type === "checklist") && (
                                                        <div className="space-y-2">
                                                            <Label className="text-xs">Opciones</Label>
                                                            <div className="space-y-2">
                                                                {field.options?.map((option, index) => (
                                                                    <div key={index} className="flex items-center gap-2">
                                                                        <Input
                                                                            value={option}
                                                                            onChange={(e) => updateOption(field.id, index, e.target.value)}
                                                                            className="h-8"
                                                                        />
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 text-slate-400 hover:text-red-500"
                                                                            onClick={() => removeOption(field.id, index)}
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="w-full border-dashed text-slate-500"
                                                                onClick={() => addOption(field.id)}
                                                            >
                                                                <Plus className="h-4 w-4 mr-2" /> Agregar Opción
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Phone Preview */}
                    <div className="lg:col-span-1">
                        <div className="border rounded-lg bg-white p-6 min-h-[600px] flex flex-col items-center justify-center">
                            {/* Simple Phone Frame */}
                            <div className="w-[280px] h-[560px] border-[14px] border-black rounded-[3rem] bg-white shadow-xl overflow-hidden flex flex-col relative">
                                {/* Notch */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-10"></div>

                                {/* Screen Content */}
                                <div className="flex-1 overflow-y-auto bg-white pt-8">
                                    {incidentName || fields.length > 0 ? (
                                        <div className="p-4 space-y-4">
                                            {incidentName && (
                                                <div className="font-semibold text-slate-800">{incidentName}</div>
                                            )}
                                            {fields.map((field) => (
                                                <div key={field.id} className="space-y-1">
                                                    {field.type !== "header" && field.type !== "instruction" && (
                                                        <label className="text-xs font-medium text-slate-600">
                                                            {field.label} {field.required && "*"}
                                                        </label>
                                                    )}
                                                    {renderFieldPreview(field, true)}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-slate-300 text-sm">
                                            Vista previa vacía
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-3 pt-6 border-t">
                    <Link to="/parking-manager/incident-type">
                        <Button variant="outline">Cancelar</Button>
                    </Link>
                    <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                        <Save className="h-4 w-4 mr-2" />
                        Enviar
                    </Button>
                </div>
            </div>
        </AppLayout>
    );
}
