import { z } from "zod";

export const vehicleCreateSchema = z.object({
  year: z
    .string()
    .min(4, "Año inválido")
    .refine((v) => /^\d{4}$/.test(v), "Año inválido"),
  make: z.string().min(1, "Marca requerida"),
  model: z.string().min(1, "Modelo requerido"),
  color: z.string().optional(),
  plate: z.string().min(1, "Matrícula requerida"),
  initialMileage: z
    .string()
    .optional()
    .refine((v) => !v || /^\d+$/.test(v), "Solo números"),
  ownership: z.enum(["propio", "alquilado", "cliente"]).default("propio"),
  vin: z
    .string()
    .optional()
    .refine((v) => !v || /^[A-HJ-NPR-Z0-9]{11,17}$/i.test(v), "VIN inválido"),
  description: z.string().optional(),
  image: z.instanceof(File).optional().or(z.undefined()),
});

export type VehicleCreateSchema = z.infer<typeof vehicleCreateSchema>;
