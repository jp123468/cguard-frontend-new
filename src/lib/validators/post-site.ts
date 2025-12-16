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
    postalCode: z.string().trim().min(1, "Código postal requerido").max(20, "Máximo 20 caracteres"),
    city: z.string().trim().min(1, "Ciudad requerida").max(100, "Máximo 100 caracteres"),
    country: z.string().trim().min(1, "País requerido").max(100, "Máximo 100 caracteres"),
    email: z
        .string()
        .trim()
        .email("Correo inválido")
        .optional(),
    phone: z
        .string()
        .trim()
        .min(7, "Número inválido")
        .optional(),
    fax: z
        .string()
        .trim()
        .optional(),
    categoryId: z.string().optional(),
    status: z.enum(["active", "inactive"]).default("active"),
});

export type PostSiteInput = z.infer<typeof postSiteSchema>;