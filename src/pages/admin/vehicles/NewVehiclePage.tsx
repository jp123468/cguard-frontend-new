import { Camera, Car } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";
import { PageContainer, PageHeader, Section } from "@/components/kit";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  vehicleCreateSchema,
  type VehicleCreateSchema,
} from "@/lib/validators/vehicle-create.schema";

import { Button } from "@/components/ui/button";
import vehicleService from '@/lib/api/vehicleService';
import { securityGuardService } from '@/lib/api/securityGuardService';
import { toast } from 'sonner';
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
  const previewRef = useRef<string | null>(null);
  previewRef.current = preview;
  // Revoke any outstanding blob preview URL on unmount to avoid leaking it.
  useEffect(() => () => {
    if (previewRef.current?.startsWith("blob:")) URL.revokeObjectURL(previewRef.current);
  }, []);
  const location = useLocation();
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const isEditing = !!editingId;

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

  useEffect(() => {
    // allow passing edit id via location.state or query param ?id=
    const stateId = (location.state as any)?.editId;
    const params = new URLSearchParams(location.search);
    const qId = params.get('id');
    const id = stateId || qId;
    if (id) {
      setEditingId(id);
      (async () => {
        try {
          const resp = await vehicleService.find(id);
          if (resp) {
            form.reset({
              year: resp.year ? String(resp.year) : '',
              make: resp.make || '',
              model: resp.model || '',
              color: resp.color || '',
              plate: resp.licensePlate || '',
              initialMileage: resp.initialMileage != null ? String(resp.initialMileage) : '',
              ownership: resp.ownership || 'propio',
              vin: resp.vin || '',
              description: resp.description || '',
              image: undefined,
            });
            if (resp.imageUrl && resp.imageUrl.length > 0) {
              setPreview(resp.imageUrl[0].downloadUrl || resp.imageUrl[0].publicUrl || null);
            }
          }
        } catch (err) {
          console.error('Error cargando vehículo para edición', err);
        }
      })();
    }
  }, [location]);

  const onSubmit = async (data: VehicleCreateSchema) => {
    try {
      // Normalize plate
      const plate = (data.plate || '').trim();

      // Check duplicate plate only when creating
      if (!editingId) {
        try {
          const matches = await vehicleService.autocomplete(plate, 1);
          if (matches && matches.length > 0) {
            form.setError('plate', { type: 'manual', message: 'Ya existe un vehículo con esa Placa' });
            return;
          }
        } catch (e) {
          // If autocomplete fails, allow submit to continue but log
          console.warn('No se pudo validar existencia de Placa', e);
        }
      }

      // Handle image upload first (if provided)
      let imageFileObj = null;
      if (data.image) {
        try {
          imageFileObj = await securityGuardService.uploadFileToStorage(
            data.image as File,
            'vehicleImage',
          );
        } catch (err) {
          console.error('Error uploading vehicle image', err);
          toast.error('Error subiendo imagen del vehículo');
          // continue without image
          imageFileObj = null;
        }
      }

      if (editingId) {
        // When editing, only allow changing image, ownership and description
        const updatePayload: any = {
          ownership: data.ownership,
          description: data.description,
        };
        if (imageFileObj) {
          updatePayload.imageUrl = imageFileObj;
        }
        const resp = await vehicleService.update(editingId, updatePayload);
        toast.success('Vehículo actualizado');
        console.log('Vehículo actualizado', resp);
        navigate('/vehicle-patrol/vehicles');
      } else {
        const payload: any = {
          name: `${data.make} ${data.model}`,
          licensePlate: plate,
          year: Number(data.year),
          make: data.make,
          model: data.model,
          color: data.color,
          initialMileage: data.initialMileage ? Number(data.initialMileage) : 0,
          ownership: data.ownership,
          vin: data.vin,
          description: data.description,
        };
        if (imageFileObj) {
          payload.imageUrl = imageFileObj;
        }
        const resp = await vehicleService.create(payload);
        toast.success('Vehículo creado');
        console.log('Vehículo creado', resp);
        navigate('/vehicle-patrol/vehicles');
      }
    } catch (err) {
      console.error('Error creando vehículo', err);
      toast.error(String((err as any)?.message || 'Error creando vehículo'));
    }
  };

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Nuevo vehículo" },
        ]}
      />

      <section className="p-6">
       <PageContainer width="narrow">
        <PageHeader
          icon={<Car />}
          title={isEditing ? "Editar vehículo" : "Nuevo vehículo"}
          subtitle="Registra los datos del vehículo de patrullaje"
        />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
           <Section title="Datos del vehículo" icon={<Car />} contentClassName="space-y-6">
            <div className="flex items-center justify-center">
              <label
                htmlFor="vehicle-image"
                className="group relative inline-flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border"
              >
                {preview ? (
                  <img src={preview} alt="vehículo" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center text-muted-foreground">
                    <svg width="42" height="42" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M5 11l1-3a3 3 0 012.83-2h6.34A3 3 0 0118 8l1 3h1a2 2 0 012 2v3a2 2 0 01-2 2v1a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1H7v1a1 1 0 01-1 1H5a1 1 0 01-1-1v-1a2 2 0 01-2-2v-3a2 2 0 012-2h1zm3.83-4a1 1 0 00-.95.68L7.3 11h9.4l-.58-3.32a1 1 0 00-.95-.68zM5 16h14v-3H5zm5-2.5a1.5 1.5 0 10-1.5 1.5A1.5 1.5 0 0010 13.5zm7 1.5a1.5 1.5 0 10-1.5-1.5A1.5 1.5 0 0017 15z" />
                    </svg>
                  </div>
                )}
                <span className="absolute bottom-1 right-1 rounded bg-white/90 px-1.5 py-0.5 text-xs">
                  <Camera className="h-6 w-6 text-muted-foreground" />
                </span>
              </label>
              <input
                id="vehicle-image"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setPreview((prev) => {
                    if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
                    if (f) {
                      form.setValue("image", f);
                      return URL.createObjectURL(f);
                    }
                    form.setValue("image", undefined);
                    return null;
                  });
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
                      <Input inputMode="numeric" placeholder="2022" {...field} disabled={isEditing} />
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
                      <Input placeholder="Toyota" {...field} disabled={isEditing} />
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
                      <Input placeholder="Hilux" {...field} disabled={isEditing} />
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
                    <FormLabel>Color*</FormLabel>
                    <FormControl>
                      <Input placeholder="Blanco" {...field} disabled={isEditing} />
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
                    <FormLabel>Placa*</FormLabel>
                    <FormControl>
                      <Input placeholder="ABC-1234" {...field} disabled={isEditing} />
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
                    <FormLabel>Kilometraje Inicial*</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" placeholder="0" {...field} disabled={isEditing} />
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
                    <FormLabel>Propiedad*</FormLabel>
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
                    <FormLabel>Número VIN (Número de Identificación del Vehículo)*</FormLabel>
                    <FormControl>
                      <Input placeholder="1HGCM82633A004352" {...field} disabled={isEditing} />
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
                variant="brand"
                disabled={form.formState.isSubmitting}
              >
                Enviar
              </Button>
            </div>
           </Section>
          </form>
        </Form>
       </PageContainer>
      </section>
    </AppLayout>
  );
}
