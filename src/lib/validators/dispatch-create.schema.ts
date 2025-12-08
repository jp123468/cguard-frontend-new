import { z } from "zod";

export const dispatchCreateSchema = z
  .object({
    clientId: z.string().min(1, "Cliente requerido"),
    siteId: z.string().min(1, "Sitio requerido"),
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
  .refine(
    (v) =>
      Boolean(v.incidentDate) &&
      Boolean(v.incidentTime) &&
      Boolean(v.clientId) &&
      Boolean(v.siteId),
    { message: "Campos obligatorios incompletos", path: ["clientId"] }
  );

export type DispatchCreateSchema = z.infer<typeof dispatchCreateSchema>;
