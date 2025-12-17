import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { postSiteService } from "@/lib/api/postSiteService";
import { Upload } from "lucide-react";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function PostSiteImportDialog({ open, onOpenChange, onSuccess }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  function downloadTemplate() {
    const csvContent = `companyName,description,contactEmail,contactPhone,address,secondAddress,postalCode,city,country,categoryIds\nEjemplo Co,Descripción,contacto@ejemplo.com,+593987654321,Calle Falsa 123,,170123,Quito,Ecuador,cat-id-1`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla-sitios.csv';
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
      const result = await postSiteService.import(file);
      toast.dismiss(toastId);

      if ((result as any).success > 0) {
        toast.success(`✅ ${(result as any).success} sitios importados correctamente`);
      }
      if ((result as any).failed && (result as any).failed > 0) {
        toast.error(`${(result as any).failed} filas no se pudieron importar.`);
      }

      onSuccess();
      onOpenChange(false);
      setFile(null);
    } catch (error: any) {
      toast.dismiss(toastId);
      toast.error(error?.message || 'Error al importar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar Sitios desde Excel/CSV</DialogTitle>
          <DialogDescription>Sube un archivo .xlsx/.xls/.csv para importar sitios de publicación.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Antes de cargar, asegúrate de que el archivo tenga las columnas requeridas.</p>
            <Button variant="link" className="px-0 text-orange-500" onClick={downloadTemplate}>
              Descargar plantilla de ejemplo
            </Button>
          </div>

          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
              id="postsite-file-upload"
            />
            <label htmlFor="postsite-file-upload" className="cursor-pointer block">
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-2" />
              <p className="text-sm text-muted-foreground font-medium">{file ? file.name : "Explorar tu archivo Excel aquí...."}</p>
              <p className="text-xs text-muted-foreground mt-1">Click para seleccionar</p>
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleImport} disabled={!file || loading}>{loading ? 'Importando...' : 'Importar'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
