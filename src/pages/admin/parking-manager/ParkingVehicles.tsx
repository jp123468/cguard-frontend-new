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
} from "@/components/ui/sheet";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Search, Filter, EllipsisVertical, Upload, FileText, FileSpreadsheet, Printer, Mail, Car, ChevronsUpDown } from "lucide-react";
import Breadcrumb from "@/components/ui/breadcrumb";

interface Vehicle {
    id: string;
    client: string;
    site: string;
    year: string;
    brand: string;
    model: string;
    plate: string;
    color: string;
    parking?: string;
    qr?: string;
    contact?: string;
}

export default function ParkingVehicles() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isNewVehicleOpen, setIsNewVehicleOpen] = useState(false);
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);

    // New Vehicle Form State
    const [newVehicle, setNewVehicle] = useState<Partial<Vehicle>>({
        brand: "",
        color: "",
        model: "",
        year: "",
        plate: "",
        client: "",
        site: "",
        parking: "",
        qr: "",
        contact: "",
    });

    const handleAddVehicle = () => {
        const vehicle: Vehicle = {
            id: Math.random().toString(36).substr(2, 9),
            client: newVehicle.client || "",
            site: newVehicle.site || "",
            year: newVehicle.year || "",
            brand: newVehicle.brand || "",
            model: newVehicle.model || "",
            plate: newVehicle.plate || "",
            color: newVehicle.color || "",
            parking: newVehicle.parking,
            qr: newVehicle.qr,
            contact: newVehicle.contact,
        };
        setVehicles([...vehicles, vehicle]);
        setIsNewVehicleOpen(false);
        setNewVehicle({
            brand: "",
            color: "",
            model: "",
            year: "",
            plate: "",
            client: "",
            site: "",
            parking: "",
            qr: "",
            contact: "",
        });
    };

    return (
        <AppLayout>
            <Breadcrumb
                items={[
                    { label: "Panel de control", path: "/dashboard" },
                    { label: "Vehículos" },
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

                    <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-center">
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                                placeholder="Buscar vehículo"
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Sheet open={isNewVehicleOpen} onOpenChange={setIsNewVehicleOpen}>
                                <SheetTrigger asChild>
                                    <Button variant="outline" className="text-orange-500 border-orange-200 hover:bg-orange-50 hover:text-orange-600">
                                        Nuevo vehículo
                                    </Button>
                                </SheetTrigger>
                                <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                                    <SheetHeader>
                                        <SheetTitle>Nuevo vehículo</SheetTitle>
                                    </SheetHeader>
                                    <div className="grid gap-6 py-6">
                                        <div className="flex justify-center">
                                            <div className="h-24 w-24 bg-white border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 relative">
                                                <Car className="h-12 w-12 text-slate-700" />
                                                <div className="absolute bottom-0 right-0 bg-slate-700 text-white p-1 rounded-sm">
                                                    <Upload className="h-3 w-3" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="brand">Marca*</Label>
                                            <Input
                                                id="brand"
                                                value={newVehicle.brand}
                                                onChange={(e) => setNewVehicle({ ...newVehicle, brand: e.target.value })}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="color">Color*</Label>
                                            <Input
                                                id="color"
                                                value={newVehicle.color}
                                                onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="model">Modelo*</Label>
                                            <Input
                                                id="model"
                                                value={newVehicle.model}
                                                onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="year">Año*</Label>
                                            <Input
                                                id="year"
                                                value={newVehicle.year}
                                                onChange={(e) => setNewVehicle({ ...newVehicle, year: e.target.value })}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="plate">Matrícula*</Label>
                                            <Input
                                                id="plate"
                                                value={newVehicle.plate}
                                                onChange={(e) => setNewVehicle({ ...newVehicle, plate: e.target.value })}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="client">Cliente*</Label>
                                            <Select value={newVehicle.client} onValueChange={(v) => setNewVehicle({ ...newVehicle, client: v })}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar cliente" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="central">Central</SelectItem>
                                                    <SelectItem value="norte">Norte</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="site">Sitio de publicación*</Label>
                                            <Select value={newVehicle.site} onValueChange={(v) => setNewVehicle({ ...newVehicle, site: v })}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar sitio" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="site1">Sitio 1</SelectItem>
                                                    <SelectItem value="site2">Sitio 2</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="parking">Asignar estacionamiento</Label>
                                            <Select value={newVehicle.parking} onValueChange={(v) => setNewVehicle({ ...newVehicle, parking: v })}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="p1">Estacionamiento 1</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="qr">Etiquetas QR</Label>
                                            <Input
                                                id="qr"
                                                value={newVehicle.qr}
                                                onChange={(e) => setNewVehicle({ ...newVehicle, qr: e.target.value })}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="contact">Asignar contacto</Label>
                                            <Select value={newVehicle.contact} onValueChange={(v) => setNewVehicle({ ...newVehicle, contact: v })}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="c1">Contacto 1</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <SheetFooter>
                                        <Button
                                            className="bg-orange-500 hover:bg-orange-600 text-white w-full sm:w-auto"
                                            onClick={handleAddVehicle}
                                        >
                                            Guardar
                                        </Button>
                                    </SheetFooter>
                                </SheetContent>
                            </Sheet>

                            <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                                <SheetTrigger asChild>
                                    <Button variant="outline" className="text-orange-500 border-orange-200 hover:bg-orange-50 hover:text-orange-600">
                                        <Filter className="h-4 w-4 mr-2" /> Filtros
                                    </Button>
                                </SheetTrigger>
                                <SheetContent className="w-[400px] sm:w-[540px]">
                                    <SheetHeader>
                                        <SheetTitle>Filtros</SheetTitle>
                                    </SheetHeader>
                                    <div className="space-y-6 py-4">
                                        <div className="grid gap-2">
                                            <Label>Cliente*</Label>
                                            <Select>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="central (+1 otro)" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="central">central (+1 otro)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid gap-2">
                                            <Label>Sitio de publicación*</Label>
                                            <Select>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Catolica (+2 otros)" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="catolica">Catolica (+2 otros)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid gap-2">
                                            <Label>Estacionamiento</Label>
                                            <Select>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="1">Estacionamiento 1</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid gap-2">
                                            <Label>Año</Label>
                                            <Input placeholder="Año" />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label>Marca</Label>
                                            <Input placeholder="Marca" />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label>Modelo</Label>
                                            <Input placeholder="Modelo" />
                                        </div>

                                        <div className="space-y-2 pt-4">
                                            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                                                Filtro
                                            </Button>
                                        </div>
                                    </div>
                                </SheetContent>
                            </Sheet>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-orange-500">
                                        <EllipsisVertical className="h-5 w-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-64">
                                    <DropdownMenuItem>
                                        <Upload className="mr-2 h-4 w-4" /> Importar vehículo de estacionamiento
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <FileText className="mr-2 h-4 w-4" /> Exportar como PDF
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar como Excel
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <Printer className="mr-2 h-4 w-4" /> Imprimir
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <Mail className="mr-2 h-4 w-4" /> Correo Electrónico
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
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
                                <TableHead className="font-bold text-slate-700">Cliente</TableHead>
                                <TableHead className="font-bold text-slate-700">Sitio de publicación</TableHead>
                                <TableHead className="font-bold text-slate-700">Año</TableHead>
                                <TableHead className="font-bold text-slate-700">Marca</TableHead>
                                <TableHead className="font-bold text-slate-700">Modelo</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {vehicles.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-[400px] text-center">
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
                                vehicles.map((vehicle) => (
                                    <TableRow key={vehicle.id}>
                                        <TableCell>
                                            <Checkbox />
                                        </TableCell>
                                        <TableCell>{vehicle.client}</TableCell>
                                        <TableCell>{vehicle.site}</TableCell>
                                        <TableCell>{vehicle.year}</TableCell>
                                        <TableCell>{vehicle.brand}</TableCell>
                                        <TableCell>{vehicle.model}</TableCell>
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
