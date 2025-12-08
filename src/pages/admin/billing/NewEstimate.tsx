import { useState } from "react";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Plus, Trash2 } from "lucide-react";


interface EstimateItem {
    id: string;
    name: string;
    quantity: number;
    rate: number;
    tax: number;
}

export default function NewEstimate() {
    const [isPreviewMode, setIsPreviewMode] = useState(false);

    // Form State
    const [title, setTitle] = useState("Estimate");
    const [summary, setSummary] = useState("");
    const [client, setClient] = useState("");
    const [site, setSite] = useState("");
    const [estimateNumber, setEstimateNumber] = useState("1");
    const [poSoNumber, setPoSoNumber] = useState("");
    const [notes, setNotes] = useState("");

    const [date, setDate] = useState<Date | undefined>(new Date());
    const [expiryDate, setExpiryDate] = useState<Date | undefined>(new Date());

    const [items, setItems] = useState<EstimateItem[]>([
        { id: "1", name: "", quantity: 1, rate: 0, tax: 0 },
    ]);

    const addItem = () => {
        setItems([
            ...items,
            { id: Math.random().toString(36).substr(2, 9), name: "", quantity: 1, rate: 0, tax: 0 },
        ]);
    };

    const removeItem = (id: string) => {
        if (items.length > 1) {
            setItems(items.filter((item) => item.id !== id));
        }
    };

    const updateItem = (id: string, field: keyof EstimateItem, value: string | number) => {
        setItems(
            items.map((item) =>
                item.id === id ? { ...item, [field]: value } : item
            )
        );
    };

    const calculateSubtotal = () => {
        return items.reduce((acc, item) => acc + item.quantity * item.rate, 0);
    };

    const calculateTotal = () => {
        return calculateSubtotal();
    };

    const handlePreview = () => {
        if (!client || !site) {
            alert("Por favor seleccione un Cliente y un Sitio de publicación para ver la vista previa.");
            return;
        }
        setIsPreviewMode(true);
    };

    if (isPreviewMode) {
        return (
            <AppLayout>
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-xl font-semibold">Estimaciones</h1>
                        <div className="flex gap-4">
                            <Button
                                variant="outline"
                                className="text-orange-500 border-orange-200 hover:bg-orange-50"
                                onClick={() => setIsPreviewMode(false)}
                            >
                                Editar Presupuesto
                            </Button>
                            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                                Save and continue
                            </Button>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-lg border shadow-sm space-y-8">
                        {/* Header */}
                        <div className="flex justify-between items-start">
                            <div></div> {/* Logo placeholder if needed */}
                            <div className="text-right">
                                <h2 className="text-2xl font-bold text-slate-800">Presupuesto</h2>
                                <h3 className="font-semibold text-lg text-slate-700 mt-2">Seguridad BAS</h3>
                                <p className="text-sm text-slate-500">Antonio Miguel de solier N29-26 y bartolome de las casas</p>
                                <p className="text-sm text-slate-500">+18014004269</p>
                            </div>
                        </div>

                        <div className="border-t pt-6">
                            <h3 className="font-bold text-lg mb-4">{title}</h3>
                            {summary && <p className="text-gray-600 mb-4">{summary}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-12">
                            <div>
                                <h3 className="text-lg font-medium text-slate-700 mb-4">Facturar a</h3>
                                <div className="space-y-1">
                                    <p className="font-semibold text-slate-800">{client === "central" ? "Central" : client === "norte" ? "Norte" : client}</p>
                                    <p className="text-sm text-slate-500">Fray Bartolomé de las Casas & Antonio De San Miguel y Solier, 170129 Quito, Ecuador</p>
                                    <p className="text-sm text-slate-500">{client === "central" ? "Central" : client === "norte" ? "Norte" : client}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="font-semibold text-slate-700">Número de Presupuesto</span>
                                    <span className="text-slate-600">{estimateNumber}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-semibold text-slate-700">Número PO/SO</span>
                                    <span className="text-slate-600">{poSoNumber || "-"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-semibold text-slate-700">Fecha del Presupuesto</span>
                                    <span className="text-slate-600">{date ? format(date, "MMM dd, yyyy", { locale: es }) : "-"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-semibold text-slate-700">Fecha de Expiración</span>
                                    <span className="text-slate-600">{expiryDate ? format(expiryDate, "MMM dd, yyyy", { locale: es }) : "-"}</span>
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="mt-8 border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader className="bg-gray-50">
                                    <TableRow>
                                        <TableHead className="w-[40%] font-bold text-slate-700">Artículo</TableHead>
                                        <TableHead className="w-[15%] font-bold text-slate-700">Cantidad</TableHead>
                                        <TableHead className="w-[15%] font-bold text-slate-700">Tasa</TableHead>
                                        <TableHead className="w-[15%] font-bold text-slate-700">Impuesto</TableHead>
                                        <TableHead className="w-[15%] text-right font-bold text-slate-700">Monto</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.length === 0 || (items.length === 1 && !items[0].name) ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-4 text-slate-500">
                                                No ha añadido ningún artículo.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        items.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell>{item.name}</TableCell>
                                                <TableCell>{item.quantity}</TableCell>
                                                <TableCell>${item.rate}</TableCell>
                                                <TableCell>{item.tax ? `${item.tax}%` : "-"}</TableCell>
                                                <TableCell className="text-right font-medium">
                                                    ${(item.quantity * item.rate).toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                            <div className="flex justify-end p-4 bg-gray-50 border-t">
                                <div className="w-64 flex justify-between items-center">
                                    <span className="font-bold text-slate-700">Total</span>
                                    <span className="font-bold text-slate-800">${calculateTotal().toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Registros del Presupuesto (Placeholder based on screenshot) */}
                        <div className="mt-8 border rounded-lg p-4">
                            <h4 className="font-medium text-slate-700 mb-4">Registros del Presupuesto</h4>
                            <div className="bg-slate-50 p-3 rounded text-sm grid grid-cols-3 font-medium text-slate-600">
                                <span>Nombre de Usuario</span>
                                <span>Fecha del Evento</span>
                                <span>Nombre del Evento</span>
                            </div>
                        </div>
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="p-6">
                <h1 className="text-xl font-semibold mb-6">Título y resumen del presupuesto</h1>

                <div className="space-y-6 bg-white p-6 rounded-lg border shadow-sm">
                    {/* Title and Summary */}
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title" className="text-gray-500">Presupuesto</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="max-w-md"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Input
                                id="summary"
                                placeholder="Resumen"
                                value={summary}
                                onChange={(e) => setSummary(e.target.value)}
                                className="max-w-md"
                            />
                        </div>
                    </div>

                    {/* Static Company Info */}
                    <div className="py-4">
                        <h3 className="font-medium text-lg text-slate-700">Seguridad BAS</h3>
                        <p className="text-sm text-slate-500">Antonio Miguel de solier N29-26 y bartolome de las casas</p>
                        <p className="text-sm text-slate-500">+18014004269</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Left Column: Client & Site */}
                        <div className="space-y-6">
                            <h3 className="font-medium text-lg text-slate-700">Facturar a</h3>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-gray-500">Cliente*</Label>
                                    <Select value={client} onValueChange={setClient}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Cliente*" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="central">Central</SelectItem>
                                            <SelectItem value="norte">Norte</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs text-gray-500">Sitio de publicación*</Label>
                                    <Select value={site} onValueChange={setSite}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sitio de publicación*" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="site1">Sitio Principal</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Estimate Details */}
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label className="text-xs text-gray-500">Número de Presupuesto*</Label>
                                <Input
                                    value={estimateNumber}
                                    onChange={(e) => setEstimateNumber(e.target.value)}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label className="text-xs text-gray-500">Número PO/SO</Label>
                                <Input
                                    placeholder="Número PO/SO"
                                    value={poSoNumber}
                                    onChange={(e) => setPoSoNumber(e.target.value)}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label className="text-xs text-gray-500">Fecha</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-between text-left font-normal",
                                                !date && "text-muted-foreground"
                                            )}
                                        >
                                            {date ? format(date, "MMM dd, yyyy", { locale: es }) : <span>Seleccionar</span>}
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={setDate}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="grid gap-2">
                                <Label className="text-xs text-gray-500">Fecha de Expiración</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-between text-left font-normal",
                                                !expiryDate && "text-muted-foreground"
                                            )}
                                        >
                                            {expiryDate ? format(expiryDate, "MMM dd, yyyy", { locale: es }) : <span>Seleccionar</span>}
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={expiryDate}
                                            onSelect={setExpiryDate}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="mt-8 border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow>
                                    <TableHead className="w-[40%]">Artículo</TableHead>
                                    <TableHead className="w-[15%]">Cantidad</TableHead>
                                    <TableHead className="w-[15%]">Tasa</TableHead>
                                    <TableHead className="w-[15%]">Impuesto</TableHead>
                                    <TableHead className="w-[15%] text-right">Monto</TableHead>
                                    <TableHead className="w-[5%]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <Input
                                                placeholder="Nombre del artículo"
                                                value={item.name}
                                                onChange={(e) => updateItem(item.id, "name", e.target.value)}
                                                className="border-0 shadow-none focus-visible:ring-0 px-0"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                                                className="border-0 shadow-none focus-visible:ring-0 px-0"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={item.rate}
                                                onChange={(e) => updateItem(item.id, "rate", parseFloat(e.target.value) || 0)}
                                                className="border-0 shadow-none focus-visible:ring-0 px-0"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Select defaultValue="none">
                                                <SelectTrigger className="border-0 shadow-none focus:ring-0 px-0">
                                                    <SelectValue placeholder="Ninguno" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">Ninguno</SelectItem>
                                                    <SelectItem value="iva">IVA (12%)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            ${(item.quantity * item.rate).toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeItem(item.id)}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        <div className="p-4 bg-white border-t">
                            <Button
                                variant="ghost"
                                className="text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                                onClick={addItem}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Añadir un artículo
                            </Button>
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end mt-4">
                        <div className="w-64 space-y-2">
                            <div className="flex justify-between text-sm font-medium">
                                <span>Total</span>
                                <span>${calculateTotal().toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="mt-8">
                        <Label htmlFor="notes" className="text-gray-500 mb-2 block">Notas</Label>
                        <Textarea
                            id="notes"
                            placeholder="Notas..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="min-h-[100px]"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-4 mt-8 pt-4 border-t">
                        <Button
                            variant="outline"
                            className="text-orange-500 border-orange-200 hover:bg-orange-50"
                            onClick={handlePreview}
                        >
                            Vista previa
                        </Button>
                        <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                            Guardar y continuar
                        </Button>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
