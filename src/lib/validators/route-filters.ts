import { z } from "zod";

export const routeFiltersSchema = z.object({
  categoryId: z.string().optional(),
  status: z.enum(["activo", "inactivo"]).default("activo"),
  perPage: z.enum(["10", "25", "50"]).default("25"),
});

export type RouteFilters = z.infer<typeof routeFiltersSchema>;

export const defaultRouteFilters: RouteFilters = {
  categoryId: "default",
  status: "activo",
  perPage: "25",
};
