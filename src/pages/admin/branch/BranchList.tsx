import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Breadcrumb from "@/components/ui/breadcrumb";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Search } from "lucide-react";

type Branch = {
    id: string;
    name: string;
    address: string;
    email: string;
    phone: string;
    status: "Activo" | "Inactivo";
};

export default function BranchList() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");

    // Mock data
    const branches: Branch[] = [
        {
            id: "1",
            name: "Seguridad BAS",
            address: "Antonio Miguel de soler N29-26 y ba...",
            email: "",
            phone: "+18014204269",
            status: "Activo",
        },
    ];

    const filteredBranches = branches.filter((branch) =>
        branch.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AppLayout>
            <Breadcrumb
                items={[
                    { label: "Panel de control", path: "/dashboard" },
                    { label: "Sucursal" },
                ]}
            />

            <div className="p-6">
                <Card>
                    <CardContent className="p-6">
                        {/* Header with Search and Add Button */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="relative w-64">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Buscar sucursal"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <Button
                                onClick={() => navigate("/branch/add-branch")}
                                className="bg-[#f36a6d] hover:bg-[#e85b5f] text-white"
                            >
                                Nueva sucursal
                            </Button>
                        </div>

                        {/* Table */}
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Dirección</TableHead>
                                    <TableHead>Correo Electrónico</TableHead>
                                    <TableHead>Número de Teléfono</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredBranches.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                            No se encontraron sucursales
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredBranches.map((branch) => (
                                        <TableRow key={branch.id}>
                                            <TableCell className="font-medium">{branch.name}</TableCell>
                                            <TableCell>{branch.address}</TableCell>
                                            <TableCell>{branch.email || "-"}</TableCell>
                                            <TableCell>{branch.phone}</TableCell>
                                            <TableCell>
                                                <span className="text-green-600">{branch.status}</span>
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem>Editar</DropdownMenuItem>
                                                        <DropdownMenuItem>Ver detalles</DropdownMenuItem>
                                                        <DropdownMenuItem className="text-red-600">
                                                            Eliminar
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        {/* Pagination */}
                        <div className="flex items-center justify-between mt-4">
                            <div className="text-sm text-gray-600">
                                Elementos por página: 25
                            </div>
                            <div className="text-sm text-gray-600">
                                1 - 1 of 1
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
