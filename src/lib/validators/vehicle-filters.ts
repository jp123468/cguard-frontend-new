import { z } from "zod";

export const vehicleFiltersSchema = z.object({
  categoryId: z.string().optional(),
  status: z.enum(["activo", "inactivo"]).default("activo"),
  perPage: z.enum(["10", "25", "50"]).default("10"),
});

export type VehicleFilters = z.infer<typeof vehicleFiltersSchema>;

export const defaultVehicleFilters: VehicleFilters = {
  categoryId: "default",
  status: "activo",
  perPage: "10",
};
