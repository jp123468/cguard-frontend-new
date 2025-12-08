import { useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  vehicleCreateSchema,
  type VehicleCreateSchema,
} from "@/lib/validators/vehicle-create.schema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function NewVehiclePage() {
  const [preview, setPreview] = useState<string | null>(null);

  const form = useForm<VehicleCreateSchema>({
    resolver: zodResolver(vehicleCreateSchema) as any,
    defaultValues: {
      year: "",
      make: "",
      model: "",
      color: "",
      plate: "",
      initialMileage: "",
      ownership: "propio",
      vin: "",
      description: "",
      image: undefined,
    },
    mode: "onBlur",
  });

  const onSubmit = (data: VehicleCreateSchema) => {
    const payload = {
      ...data,
      initialMileage: data.initialMileage ? Number(data.initialMileage) : 0,
    };
    console.log("Nuevo vehículo:", payload);
  };

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Nuevo vehículo" },
        ]}
      />

      <div className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex items-center justify-center">
              <label
                htmlFor="vehicle-image"
                className="group relative inline-flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-md border"
              >
                {preview ? (
                  <img src={preview} alt="vehículo" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center text-slate-500">
                    <svg width="42" height="42" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M5 11l1-3a3 3 0 012.83-2h6.34A3 3 0 0118 8l1 3h1a2 2 0 012 2v3a2 2 0 01-2 2v1a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1H7v1a1 1 0 01-1 1H5a1 1 0 01-1-1v-1a2 2 0 01-2-2v-3a2 2 0 012-2h1zm3.83-4a1 1 0 00-.95.68L7.3 11h9.4l-.58-3.32a1 1 0 00-.95-.68zM5 16h14v-3H5zm5-2.5a1.5 1.5 0 10-1.5 1.5A1.5 1.5 0 0010 13.5zm7 1.5a1.5 1.5 0 10-1.5-1.5A1.5 1.5 0 0017 15z" />
                    </svg>
                  </div>
                )}
                <span className="absolute bottom-1 right-1 rounded bg-white/90 px-1.5 py-0.5 text-xs">
                  📷
                </span>
              </label>
              <input
                id="vehicle-image"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    form.setValue("image", f);
                    const url = URL.createObjectURL(f);
                    setPreview(url);
                  } else {
                    form.setValue("image", undefined);
                    setPreview(null);
                  }
                }}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Año*</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" placeholder="2022" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="make"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca*</FormLabel>
                    <FormControl>
                      <Input placeholder="Toyota" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo*</FormLabel>
                    <FormControl>
                      <Input placeholder="Hilux" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <Input placeholder="Blanco" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="plate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Matrícula*</FormLabel>
                    <FormControl>
                      <Input placeholder="ABC-1234" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="initialMileage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kilometraje Inicial</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ownership"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Propiedad</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="propio">Propio</SelectItem>
                        <SelectItem value="alquilado">Alquilado</SelectItem>
                        <SelectItem value="cliente">Del cliente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número VIN</FormLabel>
                    <FormControl>
                      <Input placeholder="1HGCM82633A004352" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea rows={4} placeholder="Notas del vehículo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" asChild>
                <Link to="/vehicles">Cancelar</Link>
              </Button>
              <Button
                type="submit"
                className="bg-orange-500 text-white hover:bg-orange-600"
                disabled={form.formState.isSubmitting}
              >
                Enviar
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </AppLayout>
  );
}
