import { z } from "zod";

export const postSiteSchema = z.object({
    name: z.string().trim().min(1, "Nombre del sitio requerido"),
    clientId: z.string().trim().min(1, "Cliente requerido"),
    address: z.string().trim().min(1, "Dirección requerida").max(200, "Máximo 200 caracteres"),
    addressLine2: z
        .string()
        .trim()
        .max(200, "Máximo 200 caracteres")
        .optional()
        .or(z.literal("")),
    postalCode: z
        .string()
        .trim()
        .min(1, "Código postal requerido")
        .max(20, "Máximo 20 caracteres")
        .regex(/^[0-9]+$/, "El código postal sólo debe contener dígitos"),
    city: z
        .string()
        .trim()
        .min(1, "Ciudad requerida")
        .max(100, "Máximo 100 caracteres")
        .regex(/^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/, "La ciudad no debe contener números"),
    country: z
        .string()
        .trim()
        .min(1, "País requerido")
        .max(100, "Máximo 100 caracteres")
        .regex(/^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/, "El país no debe contener números"),
    description: z.string().trim().min(1, "Descripción requerida").max(5000, "Máximo 5000 caracteres"),
    email: z
        .string()
        .trim()
        .min(1, "Correo requerido")
        .email("Correo electrónico inválido"),
    phone: z
        .string()
        .trim()
        .min(7, "El teléfono debe tener al menos 10 dígitos")
        .max(20, "El teléfono puede tener como máximo 20 caracteres"),
    latitud: z
        .string()
        .trim()
        .max(100, "Máximo 100 caracteres")
        .optional()
        .or(z.literal(""))
        .refine((val) => val === undefined || val === "" || /^-?\d+(?:\.\d+)?$/.test(val), {
            message: "Latitud inválida (sólo números y punto decimal)",
        }),
    longitud: z
        .string()
        .trim()
        .max(100, "Máximo 100 caracteres")
        .optional()
        .or(z.literal(""))
        .refine((val) => val === undefined || val === "" || /^-?\d+(?:\.\d+)?$/.test(val), {
            message: "Longitud inválida (sólo números y punto decimal)",
        }),
    fax: z
        .string()
        .trim()
        .max(20, "El fax puede tener como máximo 20 caracteres")
        .optional()
        .or(z.literal("")),
    categoryId: z.string().optional(),
    status: z.enum(["active", "inactive"]).default("active"),
});

export type PostSiteInput = z.infer<typeof postSiteSchema>;