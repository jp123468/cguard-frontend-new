import { z } from "zod";

export const SERVICE_TYPE_VALUES = ['manned', 'alarm', 'cctv', 'patrol', 'custody'] as const;

export const postSiteSchema = z.object({
    name: z.string().trim().max(200, "Máximo 200 caracteres").optional().or(z.literal("")),
    serviceType: z.string().trim().max(50, "Máximo 50 caracteres").optional().or(z.literal("")),
    serviceConfig: z.any().optional(),
    clientId: z.string().trim().optional().or(z.literal("")),
    description: z.string().trim().max(5000, "Máximo 5000 caracteres").optional().or(z.literal("")),
    address: z.string().trim().max(200, "Máximo 200 caracteres").optional().or(z.literal("")),
    addressLine2: z.string().trim().max(200, "Máximo 200 caracteres").optional().or(z.literal("")),
    city: z.string().trim().max(100, "Máximo 100 caracteres").optional().or(z.literal("")),
    country: z.string().trim().max(100, "Máximo 100 caracteres").optional().or(z.literal("")),
    postalCode: z.string().trim().max(20, "Máximo 20 caracteres").optional().or(z.literal("")),
    email: z.string().trim().max(200, "Máximo 200 caracteres").optional().or(z.literal("")),
    phone: z.string().trim().max(20, "El teléfono puede tener como máximo 20 caracteres").optional().or(z.literal("")),
    latitud: z
        .coerce.string().trim().max(100, "Máximo 100 caracteres").optional().or(z.literal(""))
        .refine((val) => val === undefined || val === "" || /^-?\d+(?:\.\d+)?$/.test(val), {
            message: "Latitud inválida (sólo números y punto decimal)",
        }),
    longitud: z
        .coerce.string().trim().max(100, "Máximo 100 caracteres").optional().or(z.literal(""))
        .refine((val) => val === undefined || val === "" || /^-?\d+(?:\.\d+)?$/.test(val), {
            message: "Longitud inválida (sólo números y punto decimal)",
        }),
    stationSchedule: z.enum(["1 hora","4 horas","8 horas","10 horas","12 horas","14 horas","16 horas","24 horas"]).optional(),
    startingTimeInDay: z.string().trim().max(20, "Máximo 20 caracteres").optional().or(z.literal("")),
    finishTimeInDay: z.string().trim().max(20, "Máximo 20 caracteres").optional().or(z.literal("")),
    fax: z.string().trim().max(20, "El fax puede tener como máximo 20 caracteres").optional().or(z.literal("")),
    categoryId: z.string().optional(),
    status: z.enum(["active", "inactive"]).default("active"),
});

export type PostSiteInput = z.infer<typeof postSiteSchema>;
