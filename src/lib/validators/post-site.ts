import { z } from "zod";

export const postSiteSchema = z.object({
    name: z.string().trim().min(1, "Nombre del sitio requerido"),
    clientId: z.string().trim().min(1, "Cliente requerido"),
    address: z.string().trim().min(1, "Dirección requerida"),
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