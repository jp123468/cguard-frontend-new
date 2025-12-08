import Breadcrumb from "@/components/ui/breadcrumb";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from "@/components/ui/select";
import { Funnel, CheckCheck } from "lucide-react";
import { useState } from "react";

export default function ActivitiesPage() {
  const [open, setOpen] = useState(false);

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Actividades" },
        ]}
      />

      <div className="p-6">
        {/* Barra de acciones */}
        <div className="mt-4 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            className="text-orange-600 border-orange-200 hover:text-orange-700"
            onClick={() => console.log("Marcar Todo como Leído")}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Marcar Todo como Leído
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline">
                <Funnel className="mr-2 h-4 w-4" />
                Filtros
              </Button>
            </SheetTrigger>

            {/* Panel lateral de filtros */}
            <SheetContent side="right" className="w-[420px] sm:w-[520px]">
              <SheetHeader>
                <SheetTitle>Filtros</SheetTitle>
              </SheetHeader>

              <div className="mt-4">
                <Tabs defaultValue="filters">
                  <TabsList className="grid grid-cols-2 w-full">
                    <TabsTrigger value="filters">Filtros</TabsTrigger>
                    <TabsTrigger value="saved" disabled>Filtros Guardados</TabsTrigger>
                  </TabsList>

                  <TabsContent value="filters" className="mt-4 space-y-4">
                    {/* Cliente */}
                    <div className="space-y-2">
                      <Label>Cliente</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {/* sin datos — solo UI */}
                          <SelectItem value="any">Cualquiera</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Sitio de publicación */}
                    <div className="space-y-2">
                      <Label>Sitio de publicación</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un sitio" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Cualquiera</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Guardia */}
                    <div className="space-y-2">
                      <Label>Guardia</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un guardia" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Cualquiera</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Tipo */}
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Todos</SelectItem>
                          <SelectItem value="check-in">Registro</SelectItem>
                          <SelectItem value="check-out">Salida</SelectItem>
                          <SelectItem value="incident">Incidente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Rango de fechas: DESDE */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Desde la Fecha</Label>
                        <Input type="date" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Hora*</Label>
                        <Input type="time" defaultValue="00:00" />
                      </div>
                    </div>

                    {/* Rango de fechas: HASTA */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Hasta la Fecha</Label>
                        <Input type="date" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Hora*</Label>
                        <Input type="time" defaultValue="23:59" />
                      </div>
                    </div>

                    {/* Archivados */}
                    <div className="flex items-center gap-2 pt-1">
                      <Checkbox id="archived" />
                      <Label htmlFor="archived" className="font-normal">
                        Mostrar datos archivados
                      </Label>
                    </div>

                    {/* Acciones */}
                    <div className="space-y-2 pt-2">
                      <Button
                        className="w-full bg-orange-500 hover:bg-orange-600"
                        onClick={() => {
                          console.log("Aplicar Filtro (solo vista)");
                          setOpen(false);
                        }}
                      >
                        Aplicar Filtro
                      </Button>
                      {/* Sin “Guardar Filtro” como pediste */}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Estado vacío */}
        <div className="flex flex-col items-center justify-center h-[70vh] text-center">
          <img
            src="https://app.guardspro.com/assets/icons/custom/no-data-found.png"
            className="h-40 mb-4"
            alt="Sin resultados"
          />
          <h3 className="text-2xl font-semibold text-gray-800">
            No se encontraron resultados
          </h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-xs">
            No pudimos encontrar ningún elemento que coincida con su búsqueda
          </p>
        </div>

      </div>
    </AppLayout>
  );
}
