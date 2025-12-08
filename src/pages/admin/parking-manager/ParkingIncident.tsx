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
import { Search, Filter, EllipsisVertical, FileText, FileSpreadsheet, Printer, Mail, ChevronsUpDown, SquareParking, Paperclip, Calendar as CalendarIcon } from "lucide-react";
import Breadcrumb from "@/components/ui/breadcrumb";

interface ParkingIncidentItem {
    id: string;
    createdAt: string;
    incidentType: string;
    client: string;
    site: string;
    vehicleLicense: string;
    parking: string;
}

export default function ParkingIncident() {
    const [incidents, setIncidents] = useState<ParkingIncidentItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isNewIncidentOpen, setIsNewIncidentOpen] = useState(false);
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);

    // New Incident Form State
    const [newIncident, setNewIncident] = useState<Partial<ParkingIncidentItem & { attachment: string }>>({
        incidentType: "",
        client: "",
        site: "",
        vehicleLicense: "",
        parking: "",
        attachment: "",
    });

    const handleAddIncident = () => {
        const incident: ParkingIncidentItem = {
            id: Math.random().toString(36).substr(2, 9),
            createdAt: new Date().toLocaleString(),
            incidentType: newIncident.incidentType || "",
            client: newIncident.client || "",
            site: newIncident.site || "",
            vehicleLicense: newIncident.vehicleLicense || "",
            parking: newIncident.parking || "",
        };
        setIncidents([...incidents, incident]);
        setIsNewIncidentOpen(false);
        setNewIncident({
            incidentType: "",
            client: "",
            site: "",
            vehicleLicense: "",
            parking: "",
            attachment: "",
        });
    };

    return (
        <AppLayout>
            <Breadcrumb
                items={[
                    { label: "Panel de control", path: "/dashboard" },
                    { label: "Incidentes" },
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
                                placeholder="Buscar incidente"
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Sheet open={isNewIncidentOpen} onOpenChange={setIsNewIncidentOpen}>
                                <SheetTrigger asChild>
                                    <Button variant="outline" className="text-orange-500 border-orange-200 hover:bg-orange-50 hover:text-orange-600">
                                        Añadir incidente
                                    </Button>
                                </SheetTrigger>
                                <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                                    <SheetHeader>
                                        <SheetTitle>Nuevo Incidente</SheetTitle>
                                    </SheetHeader>
                                    <div className="grid gap-6 py-6">
                                        <div className="grid gap-2">
                                            <Label htmlFor="incidentType">Tipo de Incidente*</Label>
                                            <Select value={newIncident.incidentType} onValueChange={(v) => setNewIncident({ ...newIncident, incidentType: v })}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="type1">Robo</SelectItem>
                                                    <SelectItem value="type2">Daño</SelectItem>
                                                    <SelectItem value="type3">Otro</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="client">Cliente*</Label>
                                            <Select value={newIncident.client} onValueChange={(v) => setNewIncident({ ...newIncident, client: v })}>
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
                                            <Select value={newIncident.site} onValueChange={(v) => setNewIncident({ ...newIncident, site: v })}>
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
                                            <Label htmlFor="vehicle">Seleccionar vehículo</Label>
                                            <Select value={newIncident.vehicleLicense} onValueChange={(v) => setNewIncident({ ...newIncident, vehicleLicense: v })}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar vehículo" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="v1">Vehículo 1</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="parking">Seleccionar estacionamiento</Label>
                                            <Select value={newIncident.parking} onValueChange={(v) => setNewIncident({ ...newIncident, parking: v })}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar estacionamiento" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="p1">Estacionamiento 1</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="attachment">Adjunto</Label>
                                            <div className="relative">
                                                <Input
                                                    id="attachment"
                                                    className="pr-10"
                                                    placeholder="Seleccionar archivo"
                                                    readOnly
                                                />
                                                <Paperclip className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                            </div>
                                        </div>
                                    </div>
                                    <SheetFooter>
                                        <Button
                                            className="bg-orange-500 hover:bg-orange-600 text-white w-full sm:w-auto"
                                            onClick={handleAddIncident}
                                        >
                                            GUARDAR
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
                                            <Label>Guardia</Label>
                                            <Select>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="g1">Guardia 1</SelectItem>
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
                                                    <SelectItem value="p1">Estacionamiento 1</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <Label>Desde la Fecha</Label>
                                                <div className="relative">
                                                    <Input placeholder="Nov 15, 2025" />
                                                    <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                                </div>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Hora*</Label>
                                                <Input type="time" defaultValue="00:00" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <Label>Hasta la Fecha</Label>
                                                <div className="relative">
                                                    <Input placeholder="Nov 21, 2025" />
                                                    <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                                </div>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Hora*</Label>
                                                <Input type="time" defaultValue="23:59" />
                                            </div>
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
                                <TableHead className="font-bold text-slate-700">Creado en</TableHead>
                                <TableHead className="font-bold text-slate-700">Tipo de Incidente</TableHead>
                                <TableHead className="font-bold text-slate-700">Cliente</TableHead>
                                <TableHead className="font-bold text-slate-700">Sitio de publicación</TableHead>
                                <TableHead className="font-bold text-slate-700">Licencia del vehículo</TableHead>
                                <TableHead className="font-bold text-slate-700">Estacionamiento</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {incidents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-[400px] text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-500">
                                            <div className="bg-blue-50 p-6 rounded-full mb-4">
                                                <SquareParking className="w-12 h-12 text-blue-200" />
                                            </div>
                                            <h3 className="text-lg font-medium text-slate-700 mb-1">No se encontraron resultados</h3>
                                            <p className="text-sm max-w-xs">
                                                No pudimos encontrar ningún elemento que coincida con su búsqueda
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                incidents.map((incident) => (
                                    <TableRow key={incident.id}>
                                        <TableCell>
                                            <Checkbox />
                                        </TableCell>
                                        <TableCell>{incident.createdAt}</TableCell>
                                        <TableCell>{incident.incidentType}</TableCell>
                                        <TableCell>{incident.client}</TableCell>
                                        <TableCell>{incident.site}</TableCell>
                                        <TableCell>{incident.vehicleLicense}</TableCell>
                                        <TableCell>{incident.parking}</TableCell>
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
