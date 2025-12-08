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
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, ChevronsUpDown, Filter, User, Upload, EllipsisVertical, FileText, FileSpreadsheet, Printer, Mail } from "lucide-react";
import Breadcrumb from "@/components/ui/breadcrumb";

interface Contact {
    id: string;
    client: string;
    site: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
}

export default function ParkingContact() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isNewContactOpen, setIsNewContactOpen] = useState(false);
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);

    // New Contact Form State
    const [newContact, setNewContact] = useState({
        client: "",
        site: "",
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        unit: "",
        description: "",
        tag: "",
    });

    const handleAddContact = () => {
        const contact: Contact = {
            id: Math.random().toString(36).substr(2, 9),
            client: newContact.client,
            site: newContact.site,
            firstName: newContact.firstName,
            lastName: newContact.lastName,
            phone: newContact.phone,
            email: newContact.email,
        };
        setContacts([...contacts, contact]);
        setIsNewContactOpen(false);
        setNewContact({
            client: "",
            site: "",
            firstName: "",
            lastName: "",
            phone: "",
            email: "",
            unit: "",
            description: "",
            tag: "",
        });
    };

    return (
        <AppLayout>
            <Breadcrumb
                items={[
                    { label: "Panel de control", path: "/dashboard" },
                    { label: "Contactos" },
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
                                placeholder="Buscar contacto de estacionamiento"
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Sheet open={isNewContactOpen} onOpenChange={setIsNewContactOpen}>
                                <SheetTrigger asChild>
                                    <Button variant="outline" className="text-orange-500 border-orange-200 hover:bg-orange-50 hover:text-orange-600">
                                        Nuevo contacto
                                    </Button>
                                </SheetTrigger>
                                <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                                    <SheetHeader>
                                        <SheetTitle>Nuevo Contacto de Estacionamiento</SheetTitle>
                                    </SheetHeader>
                                    <div className="grid gap-6 py-6">
                                        <div className="flex justify-center">
                                            <div className="h-24 w-24 bg-gray-200 rounded flex items-center justify-center text-gray-400 relative">
                                                <User className="h-12 w-12" />
                                                <div className="absolute bottom-0 right-0 bg-slate-700 text-white p-1 rounded-sm">
                                                    <Upload className="h-3 w-3" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="client">Cliente*</Label>
                                            <Select value={newContact.client} onValueChange={(v) => setNewContact({ ...newContact, client: v })}>
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
                                            <Select value={newContact.site} onValueChange={(v) => setNewContact({ ...newContact, site: v })}>
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
                                            <Label htmlFor="firstName">Nombre*</Label>
                                            <Input
                                                id="firstName"
                                                value={newContact.firstName}
                                                onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="lastName">Apellido*</Label>
                                            <Input
                                                id="lastName"
                                                value={newContact.lastName}
                                                onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="phone">Número de Teléfono</Label>
                                            <Input
                                                id="phone"
                                                placeholder="e.g. +12015550123"
                                                value={newContact.phone}
                                                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="email">Correo Electrónico*</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={newContact.email}
                                                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="unit">Unidad</Label>
                                            <Input
                                                id="unit"
                                                value={newContact.unit}
                                                onChange={(e) => setNewContact({ ...newContact, unit: e.target.value })}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="description">Descripción</Label>
                                            <Textarea
                                                id="description"
                                                value={newContact.description}
                                                onChange={(e) => setNewContact({ ...newContact, description: e.target.value })}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="tag">Etiqueta</Label>
                                            <Button variant="outline" className="w-full justify-start text-muted-foreground">
                                                <Plus className="h-4 w-4 mr-2" /> Agregar
                                            </Button>
                                        </div>
                                    </div>
                                    <SheetFooter>
                                        <Button
                                            className="bg-orange-500 hover:bg-orange-600 text-white"
                                            onClick={handleAddContact}
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
                                                    <SelectValue placeholder="Seleccionar cliente" />
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
                                                    <SelectValue placeholder="Seleccionar sitio" />
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
                                            <Label>Etiqueta</Label>
                                            <Select>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="tag1">Etiqueta 1</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="archived" />
                                            <Label htmlFor="archived">Mostrar datos archivados</Label>
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
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuItem>
                                        <Upload className="mr-2 h-4 w-4" /> Importar contactos
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
                                <TableHead className="font-bold text-slate-700">Nombre</TableHead>
                                <TableHead className="font-bold text-slate-700">Apellido</TableHead>
                                <TableHead className="font-bold text-slate-700">Número de Teléfono</TableHead>
                                <TableHead className="font-bold text-slate-700">Correo Electrónico</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {contacts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-[400px] text-center">
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
                                contacts.map((contact) => (
                                    <TableRow key={contact.id}>
                                        <TableCell>
                                            <Checkbox />
                                        </TableCell>
                                        <TableCell>{contact.client}</TableCell>
                                        <TableCell>{contact.site}</TableCell>
                                        <TableCell>{contact.firstName}</TableCell>
                                        <TableCell>{contact.lastName}</TableCell>
                                        <TableCell>{contact.phone}</TableCell>
                                        <TableCell>{contact.email}</TableCell>
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
            </div >
        </AppLayout >
    );
}
