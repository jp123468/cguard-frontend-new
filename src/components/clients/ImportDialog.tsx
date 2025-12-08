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

    async function handleImport() {
        if (!file) {
            toast.error("Selecciona un archivo");
            return;
        }

        setLoading(true);
        try {
            const result = await clientService.importExcel(file);
            toast.success(`${result.imported} clientes importados`);
            if (result.errors && result.errors.length > 0) {
                toast.warning(`${result.errors.length} errores encontrados`);
            }
            onSuccess();
            onOpenChange(false);
            setFile(null);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Error al importar");
        } finally {
            setLoading(false);
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
                            <li>El archivo debe ser formato .xlsx o .xls</li>
                            <li>Agregue los detalles del cliente correctamente.</li>
                            <li>El campo requerido es el nombre del cliente.</li>
                        </ul>
                    </div>

                    <div className="border-2 border-dashed rounded-lg p-8 text-center">
                        <Input
                            type="file"
                            accept=".xlsx,.xls"
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
