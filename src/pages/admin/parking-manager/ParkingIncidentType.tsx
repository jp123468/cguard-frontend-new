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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, EllipsisVertical, X } from "lucide-react";
import Breadcrumb from "@/components/ui/breadcrumb";
import { Link } from "react-router-dom";

interface IncidentTypeItem {
    id: string;
    name: string;
    status: "Activo" | "Inactivo";
}

const INITIAL_DATA: IncidentTypeItem[] = [
    { id: "1", name: "Collision", status: "Activo" },
    { id: "2", name: "Damaged", status: "Activo" },
    { id: "3", name: "Left Unlocked", status: "Activo" },
    { id: "4", name: "Broken Window", status: "Activo" },
    { id: "5", name: "Theft", status: "Activo" },
    { id: "6", name: "Vehicle Towed", status: "Activo" },
];

export default function ParkingIncidentType() {
    const [incidentTypes] = useState<IncidentTypeItem[]>(INITIAL_DATA);
    const [searchQuery, setSearchQuery] = useState("");



    return (
        <AppLayout>
            <Breadcrumb
                items={[
                    { label: "Panel de control", path: "/dashboard" },
                    { label: "Tipo de Incidente" },
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
                                placeholder="Buscar tipo de incidente"
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Link to="/parking-manager/incident-type/new">
                                <Button variant="outline" className="text-orange-500 border-orange-200 hover:bg-orange-50 hover:text-orange-600">
                                    Nuevo Tipo de Incidente
                                </Button>
                            </Link>
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
                                <TableHead className="font-bold text-slate-700">Tipo de Incidente</TableHead>
                                <TableHead className="font-bold text-slate-700">Estado</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {incidentTypes.map((type) => (
                                <TableRow key={type.id}>
                                    <TableCell>
                                        <Checkbox />
                                    </TableCell>
                                    <TableCell>{type.name}</TableCell>
                                    <TableCell>
                                        <span className="text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-medium">
                                            {type.status}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <EllipsisVertical className="h-4 w-4 text-slate-400" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem className="text-red-600">
                                                    <X className="mr-2 h-4 w-4" /> Desactivar
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
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
                        1 - {incidentTypes.length} of {incidentTypes.length}
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
