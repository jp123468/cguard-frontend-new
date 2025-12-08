import { useMemo, useState, FormEvent } from "react";
import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
    Search,
    Filter as FilterIcon,
    MoreVertical,
    Upload,
    FileDown,
    FileSpreadsheet,
    Printer,
    Mail,
    UserPlus,
} from "lucide-react";

type VisitorFilters = {
    client: string;
    site: string;
    guard: string;
    tag: string;
    archived: boolean;
};

type NewVisitor = {
    client: string;
    site: string;
    guard: string;
    name: string;
    idNumber: string;
    mobile: string;
    phone: string;
    email: string;
    company: string;
};

export default function Visitors() {
    const [openFilter, setOpenFilter] = useState(false);
    const [openAddVisitor, setOpenAddVisitor] = useState(false);
    const [filters, setFilters] = useState<VisitorFilters>({
        client: "",
        site: "",
        guard: "",
        tag: "",
        archived: false,
    });
    const [newVisitor, setNewVisitor] = useState<NewVisitor>({
        client: "",
        site: "",
        guard: "",
        name: "",
        idNumber: "",
        mobile: "",
        phone: "",
        email: "",
        company: "",
    });
    const [perPage, setPerPage] = useState("25");
    const [action, setAction] = useState<string | undefined>(undefined);

    const rows: Array<never> = [];

    const perPageText = useMemo(() => {
        if (perPage === "10") return "10";
        if (perPage === "50") return "50";
        return "25";
    }, [perPage]);

    const onSubmitFilters = (e: FormEvent) => {
        e.preventDefault();
        console.log("Aplicando filtros:", filters);
        setOpenFilter(false);
    };

    const onSubmitVisitor = (e: FormEvent) => {
        e.preventDefault();
        console.log("Nuevo visitante:", newVisitor);
        setOpenAddVisitor(false);
    };

    return (
        <AppLayout>
            <Breadcrumb
                items={[
                    { label: "Panel de control", path: "/dashboard" },
                    { label: "Visitantes" },
                ]}
            />

            <section className="p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <Select value={action} onValueChange={setAction}>
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder="Acción" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="activar">Activar</SelectItem>
                                <SelectItem value="inactivar">Inactivar</SelectItem>
                                <SelectItem value="eliminar">Eliminar</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                className="w-72 pl-9"
                                placeholder="Buscar visitante"
                                onChange={(e) => console.log("buscar:", e.target.value)}
                            />
                        </div>

                        <Button
                            className="bg-orange-500 text-white hover:bg-orange-600"
                            type="button"
                            onClick={() => setOpenAddVisitor(true)}
                        >
                            Añadir visitante
                        </Button>

                        <Sheet open={openFilter} onOpenChange={setOpenFilter}>
                            <SheetTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="border-orange-200 text-orange-600"
                                >
                                    <FilterIcon className="mr-2 h-4 w-4" />
                                    Filtros
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-full max-w-md">
                                <SheetHeader>
                                    <SheetTitle>Filtros</SheetTitle>
                                </SheetHeader>

                                <form className="mt-6 space-y-5" onSubmit={onSubmitFilters}>
                                    <div className="space-y-2">
                                        <Label>Cliente*</Label>
                                        <Select
                                            value={filters.client}
                                            onValueChange={(v) =>
                                                setFilters((s) => ({ ...s, client: v }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona un cliente" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="central">central (+1 otro)</SelectItem>
                                                <SelectItem value="cliente-2">Cliente 2</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Sitio de publicación*</Label>
                                        <Select
                                            value={filters.site}
                                            onValueChange={(v) =>
                                                setFilters((s) => ({ ...s, site: v }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona un sitio" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="catolica">
                                                    Catolica (+2 otros)
                                                </SelectItem>
                                                <SelectItem value="site-2">Sitio 2</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Guardia</Label>
                                        <Select
                                            value={filters.guard}
                                            onValueChange={(v) =>
                                                setFilters((s) => ({ ...s, guard: v }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona un guardia" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="guardia-1">José Alejo Pinos</SelectItem>
                                                <SelectItem value="guardia-2">Guardia 2</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Etiqueta</Label>
                                        <Select
                                            value={filters.tag}
                                            onValueChange={(v) =>
                                                setFilters((s) => ({ ...s, tag: v }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona una etiqueta" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="vip">VIP</SelectItem>
                                                <SelectItem value="proveedor">Proveedor</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex items-center gap-2 pt-2">
                                        <Checkbox
                                            id="archived"
                                            checked={filters.archived}
                                            onCheckedChange={(checked) =>
                                                setFilters((s) => ({
                                                    ...s,
                                                    archived: Boolean(checked),
                                                }))
                                            }
                                        />
                                        <Label htmlFor="archived" className="text-sm font-normal">
                                            Mostrar datos archivados
                                        </Label>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="mt-4 w-full bg-orange-500 text-white hover:bg-orange-600"
                                    >
                                        Filtro
                                    </Button>
                                </form>
                            </SheetContent>
                        </Sheet>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-9 w-9 rounded-full border-slate-200 text-slate-600"
                                    type="button"
                                >
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem onClick={() => console.log("Importar")}>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Importar visitantes
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => console.log("PDF")}>
                                    <FileDown className="mr-2 h-4 w-4" />
                                    Exportar como PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => console.log("Excel")}>
                                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                                    Exportar como Excel
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => console.log("Imprimir")}>
                                    <Printer className="mr-2 h-4 w-4" />
                                    Imprimir
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => console.log("Correo")}>
                                    <Mail className="mr-2 h-4 w-4" />
                                    Correo Electrónico
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-lg border">
                    <table className="min-w-full border-collapse text-left text-sm">
                        <thead className="bg-gray-50">
                            <tr className="border-b">
                                <th className="w-10 px-4 py-3">
                                    <Checkbox />
                                </th>
                                <th className="px-4 py-3 font-semibold">Nombre</th>
                                <th className="px-4 py-3 font-semibold">Empresa</th>
                                <th className="px-4 py-3 font-semibold">Correo Electrónico</th>
                                <th className="px-4 py-3 font-semibold">Último registro</th>
                                <th className="px-4 py-3 font-semibold">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-20">
                                        <div className="flex flex-col items-center justify-center text-center">
                                            <img
                                                src="https://app.guardspro.com/assets/icons/custom/no-data-found.png"
                                                alt="Sin datos"
                                                className="mb-4 h-36"
                                            />
                                            <h3 className="text-lg font-semibold">
                                                No se encontraron resultados
                                            </h3>
                                            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                                                No pudimos encontrar ningún elemento que coincida con su
                                                búsqueda
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    <div className="flex items-center justify-end gap-4 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                            <span>Elementos por página</span>
                            <Select value={perPage} onValueChange={setPerPage}>
                                <SelectTrigger className="h-8 w-20">
                                    <SelectValue placeholder={perPageText} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="25">25</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>0 of 0</div>
                    </div>
                </div>
            </section>

            <Sheet open={openAddVisitor} onOpenChange={setOpenAddVisitor}>
                <SheetContent side="right" className="w-full max-w-xl">
                    <SheetHeader className="mb-4">
                        <SheetTitle>Nuevo Visitante</SheetTitle>
                    </SheetHeader>

                    <form className="space-y-4" onSubmit={onSubmitVisitor}>
                        <div className="flex items-center justify-center">
                            <div className="relative flex h-24 w-24 items-center justify-center rounded-md bg-slate-100">
                                <UserPlus className="h-10 w-10 text-slate-400" />
                                <button
                                    type="button"
                                    className="absolute bottom-1 right-1 rounded-full bg-white p-1 shadow-sm"
                                >
                                    <Upload className="h-4 w-4 text-slate-500" />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label>Cliente*</Label>
                                <Select
                                    value={newVisitor.client}
                                    onValueChange={(v) =>
                                        setNewVisitor((s) => ({ ...s, client: v }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un cliente" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="central">central (+1 otro)</SelectItem>
                                        <SelectItem value="cliente-2">Cliente 2</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Sitio de publicación*</Label>
                                <Select
                                    value={newVisitor.site}
                                    onValueChange={(v) =>
                                        setNewVisitor((s) => ({ ...s, site: v }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un sitio" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="catolica">
                                            Catolica (+2 otros)
                                        </SelectItem>
                                        <SelectItem value="site-2">Sitio 2</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Guardia*</Label>
                                <Select
                                    value={newVisitor.guard}
                                    onValueChange={(v) =>
                                        setNewVisitor((s) => ({ ...s, guard: v }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un guardia" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="guardia-1">José Alejo Pinos</SelectItem>
                                        <SelectItem value="guardia-2">Guardia 2</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Nombre*</Label>
                                <Input
                                    value={newVisitor.name}
                                    onChange={(e) =>
                                        setNewVisitor((s) => ({ ...s, name: e.target.value }))
                                    }
                                    placeholder="Nombre completo"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label>Número de identificación</Label>
                                <Input
                                    value={newVisitor.idNumber}
                                    onChange={(e) =>
                                        setNewVisitor((s) => ({ ...s, idNumber: e.target.value }))
                                    }
                                    placeholder="e.g. 12015550123"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label>Imagen del ID</Label>
                                <Input type="file" />
                            </div>

                            <div className="space-y-1.5">
                                <Label>Número de Móvil</Label>
                                <Input
                                    value={newVisitor.mobile}
                                    onChange={(e) =>
                                        setNewVisitor((s) => ({ ...s, mobile: e.target.value }))
                                    }
                                    placeholder="e.g. +12015550123"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label>Número de Teléfono</Label>
                                <Input
                                    value={newVisitor.phone}
                                    onChange={(e) =>
                                        setNewVisitor((s) => ({ ...s, phone: e.target.value }))
                                    }
                                    placeholder="e.g. +12015550123"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label>Correo Electrónico</Label>
                                <Input
                                    type="email"
                                    value={newVisitor.email}
                                    onChange={(e) =>
                                        setNewVisitor((s) => ({ ...s, email: e.target.value }))
                                    }
                                    placeholder="correo@ejemplo.com"
                                />
                            </div>

                            <div className="space-y-1.5 md:col-span-2">
                                <Label>Empresa</Label>
                                <Input
                                    value={newVisitor.company}
                                    onChange={(e) =>
                                        setNewVisitor((s) => ({ ...s, company: e.target.value }))
                                    }
                                    placeholder="Nombre de la empresa"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button
                                type="submit"
                                className="bg-orange-500 text-white hover:bg-orange-600"
                            >
                                Guardar
                            </Button>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>
        </AppLayout>
    );
}
