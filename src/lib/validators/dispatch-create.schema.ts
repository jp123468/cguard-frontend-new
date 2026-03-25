import { z } from "zod";

export const dispatchCreateSchema = z
  .object({
    // clientId/siteId may be omitted when creating from a post-site context
    clientId: z.string().optional(),
    siteId: z.string().optional(),
    // station is required for the post-site flow (we rely on station to locate the incident)
    stationId: z.string().min(1, "Estación requerida"),
    guardId: z.string().optional(),
    priority: z.enum(["alta", "media", "baja"]),
    callerType: z.string().min(1, "Tipo de llamador requerido"),
    callerName: z.string().min(1, "Nombre del llamador requerido"),
    location: z.string().min(1, "Ubicación requerida"),
    incidentType: z.string().min(1, "Tipo de incidente requerido"),
    incidentDate: z.string().min(1, "Fecha requerida"),
    incidentTime: z.string().min(1, "Hora requerida"),
    incidentDetails: z.string().min(1, "Detalles requeridos"),
    actionsTaken: z.string().optional(),
    internalNotes: z.string().optional(),
    attachment: z
      .instanceof(File)
      .optional()
      .or(z.undefined()),
  })
  // require date/time and basic presence of mandatory fields
  .refine(
    (v) => Boolean(v.incidentDate) && Boolean(v.incidentTime),
    { message: "Fecha y hora del incidente son requeridas", path: ["incidentDate"] }
  )
  .refine(
    (v) => {
      // Ensure we have enough location context: stationId must be provided
      return Boolean(v.stationId && String(v.stationId).trim().length > 0);
    },
    { message: "Estación requerida", path: ["stationId"] }
  );

export type DispatchCreateSchema = z.infer<typeof dispatchCreateSchema>;
