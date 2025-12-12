import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { clientService } from "@/lib/api/clientService";
import { Upload } from "lucide-react";

interface ImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function ImportDialog({ open, onOpenChange, onSuccess }: ImportDialogProps) {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    function downloadTemplate() {
        const csvContent = `name,lastName,email,phoneNumber,address,addressLine2,zipCode,city,country,faxNumber,website,categoryId
Cliente Ejemplo 1,García,cliente1@ejemplo.com,+593987654321,Calle Principal 123,Edificio A - Piso 3,170123,Quito,Ecuador,+593987654322,https://ejemplo1.com,
Cliente Ejemplo 2,Rodríguez,cliente2@ejemplo.com,+12025551234,Av. Secundaria 456,Oficina 205,10001,New York,USA,,,`;
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'plantilla-clientes.csv';
        link.click();
        window.URL.revokeObjectURL(url);
        toast.success("Plantilla descargada");
    }

    async function handleImport() {
        if (!file) {
            toast.error("Selecciona un archivo");
            return;
        }

        setLoading(true);
        const toastId = toast.loading("Procesando archivo...");
        
        try {
            const result = await clientService.importExcel(file);
            
            toast.dismiss(toastId);
            
            if (result.imported > 0) {
                toast.success(`✅ ${result.imported} clientes guardados en la base de datos exitosamente`);
            }
            
            if (result.errors && result.errors.length > 0) {
                toast.error(`${result.errors.length} filas no se pudieron importar. Revisa los detalles.`);
            }
            
            onSuccess();
            onOpenChange(false);
            setFile(null);
        } catch (error: any) {
            toast.dismiss(toastId);
            const errorMessage = error?.details || error?.response?.data?.message || error?.message || "Error al importar";
            
            if (errorMessage.includes("cannot be null")) {
                toast.error("Algunos campos obligatorios están vacíos. Verifica: name, lastName, email, phoneNumber, address, zipCode, city, country.");
            } else {
                toast.error(errorMessage);
            }
        } finally {
            setLoading(false);
                toast.success(`Clientes importados por exito.`);

        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Importar Clientes desde Excel</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">
                            Antes de cargar, asegúrese de:
                        </p>
                        <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                            <li>El archivo debe ser formato .xlsx, .xls o .csv</li>
                            <li><strong>Columnas obligatorias:</strong> name, lastName, email, phoneNumber, address, zipCode, city, country</li>
                            <li><strong>Columnas opcionales:</strong> addressLine2, faxNumber, website, categoryId</li>
                        </ul>
                        <Button
                            variant="link"
                            className="px-0 text-orange-500"
                            onClick={downloadTemplate}
                        >
                            Descargar plantilla de ejemplo
                        </Button>
                    </div>

                    <div className="border-2 border-dashed rounded-lg p-8 text-center">
                        <Input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="hidden"
                            id="file-upload"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer block">
                            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                            <p className="text-sm text-muted-foreground font-medium">
                                {file ? file.name : "Explorar tu archivo Excel aquí...."}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Click para seleccionar
                            </p>
                        </label>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleImport}
                            disabled={!file || loading}
                        >
                            {loading ? "Importando..." : "Importar"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
