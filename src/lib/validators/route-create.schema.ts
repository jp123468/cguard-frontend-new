import { z } from "zod";

export const routeCreateSchema = z
  .object({
    name: z.string().min(1, "Nombre requerido"),
    description: z.string().optional(),
    continuous: z.boolean().default(true),
    dateFrom: z.string().min(1, "Desde requerido"),
    dateTo: z.string().min(1, "Hasta requerido"),
    startTime: z.string().min(1, "Hora de inicio requerida"),
    endTime: z.string().min(1, "Hora de fin requerida"),
    days: z
      .array(z.enum(["sun","mon","tue","wed","thu","fri","sat"]))
      .min(1, "Seleccionar al menos un día"),
    guardFilter: z.object({
      departmentId: z.string().optional(),
      skillsetId: z.string().optional(),
      categoryId: z.string().optional(),
    }),
    guardId: z.string().min(1, "Guardia requerido"),
    siteIds: z.array(z.string()).min(1, "Selecciona al menos un sitio de publicación "),
    vehicleId: z.string().min(1, "Vehículo requerido"),
    syncHitsBetweenGuards: z.boolean().default(false),
    forceVehicleRouteOrder: z.boolean().default(false),
    notifyBefore: z.enum(["00:05","00:10","00:15","00:30","01:00"]).default("00:15"),
    autoCheckInByGeofence: z.boolean().default(false),
    forceCheckInBeforeStart: z.boolean().default(false),
  })
  .refine((v) => new Date(v.dateFrom) <= new Date(v.dateTo), {
    path: ["dateTo"],
    message: "Rango de fechas inválido",
  });

export type RouteCreateSchema = z.infer<typeof routeCreateSchema>;
