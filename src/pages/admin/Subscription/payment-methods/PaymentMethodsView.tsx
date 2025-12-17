import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { DialogDescription } from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronUp, CreditCard, Smartphone, Package, DollarSign, Landmark } from "lucide-react";

export default function PaymentMethodsView() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Métodos de Pago</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="text-orange-600 border-orange-200 hover:text-orange-700"
            >
              Añadir Método de Pago
            </Button>
          </DialogTrigger>
          <AddPaymentMethodDialog onSubmit={() => setOpen(false)} />
        </Dialog>
      </div>

      {/* Card de método de pago (solo visual) */}
      <Card className="overflow-hidden">
        <div className="bg-muted/40 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded bg-green-600" />
            <div className="flex items-center gap-3">
              <span className="font-medium text-gray-900">Link</span>
              <Badge className="bg-green-600 text-white hover:bg-green-700">
                Predeterminado
              </Badge>
            </div>
          </div>
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="px-5 py-4 border-t text-sm">
          <span className="font-semibold mr-2">CORREO ELECTRÓNICO:</span>
          <span className="text-muted-foreground">
            sales@innovationgrounds.com
          </span>
        </div>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* ---------------------- Dialog de añadir método ----------------------- */
/* ---------------------------------------------------------------------- */

function AddPaymentMethodDialog({ onSubmit }: { onSubmit: () => void }) {
  return (
    <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
      <DialogHeader className="pb-4">
        <DialogTitle className="text-2xl font-semibold">Añadir Método de Pago</DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground mt-1">
          Selecciona tu método de pago preferido para continuar
        </DialogDescription>
      </DialogHeader>

      {/* Tabs con estilo mejorado */}
      <Tabs defaultValue="card" className="w-full">
        <TabsList className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 bg-transparent h-auto p-0">
          {[
            { v: "card", label: "Tarjeta", Icon: CreditCard },
            { v: "gpay", label: "Google Pay", Icon: Smartphone },
            { v: "amazon", label: "Amazon Pay", Icon: Package },
            { v: "cashapp", label: "Cash App", Icon: DollarSign },
            { v: "bank", label: "Banco EE.UU.", Icon: Landmark },
          ].map(({ v, label, Icon }) => (
            <TabsTrigger
              key={v}
              value={v}
              className="
                flex flex-col items-center justify-center gap-2 px-3 py-4 text-xs font-medium
                rounded-lg border-2 border-gray-200 bg-white transition-all
                data-[state=active]:border-orange-500 data-[state=active]:bg-orange-50
                data-[state=active]:text-orange-700 data-[state=active]:shadow-sm
                data-[state=inactive]:text-gray-600 hover:border-gray-300 hover:bg-gray-50
              "
            >
              <Icon className="h-5 w-5" />
              <span className="text-center leading-tight">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tarjeta */}
        <TabsContent value="card" className="space-y-5 mt-6">
          <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-6 space-y-4 shadow-sm">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Número de tarjeta</Label>
              <Input 
                placeholder="1234 1234 1234 1234" 
                className="h-11 text-base"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Vencimiento</Label>
                <Input 
                  placeholder="MM/AA" 
                  className="h-11 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">CVC</Label>
                <Input 
                  placeholder="123" 
                  className="h-11 text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">País</Label>
              <Select defaultValue="EC">
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecciona un país" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EC">🇪🇨 Ecuador</SelectItem>
                  <SelectItem value="US">🇺🇸 Estados Unidos</SelectItem>
                  <SelectItem value="MX">🇲🇽 México</SelectItem>
                  <SelectItem value="CO">🇨🇴 Colombia</SelectItem>
                  <SelectItem value="PE">🇵🇪 Perú</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-blue-600 mt-0.5">ℹ️</div>
              <p className="text-xs text-blue-900 leading-relaxed">
                Al suministrar tus datos de tarjeta, permites que la empresa efectúe futuros cargos conforme a las condiciones estipuladas.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Google Pay */}
        <TabsContent value="gpay" className="space-y-4 mt-6">
          <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-white p-8 space-y-4 shadow-sm text-center">
            <div className="flex justify-center">
              <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Smartphone className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-base font-semibold text-gray-900">Google Pay seleccionado</p>
              <p className="text-sm text-gray-600 max-w-md mx-auto">
                Aparecerá un paso adicional para enviar tus datos de pago de forma segura a través de Google Pay.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Amazon Pay */}
        <TabsContent value="amazon" className="space-y-4 mt-6">
          <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-orange-50 to-white p-8 space-y-4 shadow-sm text-center">
            <div className="flex justify-center">
              <div className="h-16 w-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Package className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-base font-semibold text-gray-900">Amazon Pay seleccionado</p>
              <p className="text-sm text-gray-600 max-w-md mx-auto">
                Después del envío, serás redirigido a Amazon para completar los siguientes pasos de forma segura.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Cash App Pay */}
        <TabsContent value="cashapp" className="space-y-4 mt-6">
          <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-green-50 to-white p-8 space-y-4 shadow-sm text-center">
            <div className="flex justify-center">
              <div className="h-16 w-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                <DollarSign className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-base font-semibold text-gray-900">Cash App Pay seleccionado</p>
              <p className="text-sm text-gray-600 max-w-md mx-auto">
                Te aparecerá un código QR para que lo escanees con la aplicación Cash App en tu dispositivo móvil.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Cuenta bancaria */}
        <TabsContent value="bank" className="space-y-5 mt-6">
          <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-6 space-y-5 shadow-sm">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Correo electrónico</Label>
              <Input 
                type="email"
                placeholder="tu@correo.com" 
                className="h-11 text-base"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Nombre completo</Label>
              <Input 
                placeholder="Nombre y apellido" 
                className="h-11 text-base"
              />
            </div>
            
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700">Selecciona tu banco</Label>
              <Input 
                placeholder="Buscar banco..." 
                className="h-11 text-base"
              />
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {[
                  "CHASE",
                  "BANK OF AMERICA",
                  "WELLS FARGO",
                  "Capital One",
                  "NAVY FEDERAL",
                  "US BANK",
                ].map((b) => (
                  <button
                    key={b}
                    className="p-4 text-center text-xs font-semibold border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all bg-white"
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium text-left hover:underline">
              Introducir manualmente los datos bancarios
              <span className="block text-xs text-gray-500 font-normal mt-0.5">
                (puede tardar de 1 a 2 días hábiles)
              </span>
            </button>

            <div className="pt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="text-amber-600 mt-0.5">⚠️</div>
              <p className="text-xs text-amber-900 leading-relaxed">
                Si continúas, autorizas cargos a tu cuenta bancaria conforme a las condiciones estipuladas.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <DialogFooter className="pt-6 gap-3 sm:gap-2">
        <Button 
          variant="outline" 
          onClick={() => console.log("Cancelar")}
          className="flex-1 sm:flex-none h-11"
        >
          Cancelar
        </Button>
        <Button 
          onClick={onSubmit}
          className="flex-1 sm:flex-none h-11 bg-orange-600 hover:bg-orange-700"
        >
          Agregar método de pago
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}