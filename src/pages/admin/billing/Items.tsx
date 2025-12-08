import { useState } from "react";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
    SheetClose,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, MoreVertical, ChevronsUpDown } from "lucide-react";
import Breadcrumb from "@/components/ui/breadcrumb";

interface Item {
    id: string;
    name: string;
    price: number;
    tax: string;
}

export default function Items() {
    const [items, setItems] = useState<Item[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // New Item Form State
    const [newItemName, setNewItemName] = useState("");
    const [newItemDescription, setNewItemDescription] = useState("");
    const [newItemPrice, setNewItemPrice] = useState("");
    const [newItemTax, setNewItemTax] = useState("");

    const handleAddItem = () => {
        const newItem: Item = {
            id: Math.random().toString(36).substr(2, 9),
            name: newItemName,
            price: parseFloat(newItemPrice) || 0,
            tax: newItemTax,
        };
        setItems([...items, newItem]);
        setIsSheetOpen(false);
        // Reset form
        setNewItemName("");
        setNewItemDescription("");
        setNewItemPrice("");
        setNewItemTax("");
    };

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AppLayout>
            <Breadcrumb
                items={[
                    { label: "Panel de control", path: "/dashboard" },
                    { label: "Elementos" },
                ]}
            />
            <div className="p-6 space-y-4">
                {/* Toolbar */}
                <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="w-full md:w-48">
                        <Select>
                            <SelectTrigger>
                                <SelectValue placeholder="Acción" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="delete">Eliminar</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                                placeholder="Buscar un artículo"
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                            <SheetTrigger asChild>
                                <Button className="bg-white text-orange-500 border border-orange-200 hover:bg-orange-50 hover:text-orange-600">
                                    Añadir artículo
                                </Button>
                            </SheetTrigger>
                            <SheetContent className="w-[400px] sm:w-[540px]">
                                <SheetHeader>
                                    <SheetTitle>Nuevo Elemento</SheetTitle>
                                </SheetHeader>
                                <div className="grid gap-6 py-6">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">Nombre del artículo*</Label>
                                        <Input
                                            id="name"
                                            value={newItemName}
                                            onChange={(e) => setNewItemName(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="description">Descripción del artículo*</Label>
                                        <Textarea
                                            id="description"
                                            value={newItemDescription}
                                            onChange={(e) => setNewItemDescription(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="price">Precio ($)</Label>
                                        <Input
                                            id="price"
                                            type="number"
                                            placeholder="0"
                                            value={newItemPrice}
                                            onChange={(e) => setNewItemPrice(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="tax">Impuesto</Label>
                                        <Select value={newItemTax} onValueChange={setNewItemTax}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar impuesto" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Ninguno</SelectItem>
                                                <SelectItem value="iva">IVA (12%)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <SheetFooter>
                                    <Button
                                        className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                                        onClick={handleAddItem}
                                    >
                                        Enviar
                                    </Button>
                                </SheetFooter>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>

                {/* Table */}
                <div className="border rounded-md">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[50px]">
                                    <Checkbox />
                                </TableHead>
                                <TableHead className="font-bold text-slate-700">Nombre</TableHead>
                                <TableHead className="font-bold text-slate-700">Precio ($)</TableHead>
                                <TableHead className="font-bold text-slate-700">Impuesto</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredItems.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-[400px] text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-500">
                                            <div className="bg-blue-50 p-6 rounded-full mb-4">
                                                <svg
                                                    className="w-12 h-12 text-blue-200"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={1.5}
                                                        d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                    />
                                                </svg>
                                            </div>
                                            <h3 className="text-lg font-medium text-slate-700 mb-1">No se encontraron resultados</h3>
                                            <p className="text-sm max-w-xs">
                                                No pudimos encontrar ningún elemento que coincida con su búsqueda
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredItems.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <Checkbox />
                                        </TableCell>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell>${item.price.toFixed(2)}</TableCell>
                                        <TableCell>{item.tax === 'iva' ? 'IVA (12%)' : 'Ninguno'}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon">
                                                <ChevronsUpDown className="h-4 w-4 text-slate-400" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination (Static for now) */}
                <div className="flex items-center justify-end space-x-2 py-4">
                    <div className="text-sm text-muted-foreground">
                        Elementos por página
                    </div>
                    <Select defaultValue="25">
                        <SelectTrigger className="w-[70px]">
                            <SelectValue placeholder="25" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="text-sm text-muted-foreground mx-4">
                        0 of 0
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button variant="outline" size="icon" disabled>
                            <span className="sr-only">Go to previous page</span>
                            <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Button>
                        <Button variant="outline" size="icon" disabled>
                            <span className="sr-only">Go to next page</span>
                            <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Button>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
