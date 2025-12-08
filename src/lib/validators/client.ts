import { z } from "zod";

export const clientSchema = z.object({
    name: z.string().trim().min(1, "Nombre del cliente requerido").max(200, "Máximo 200 caracteres"),
    email: z
        .string()
        .trim()
        .min(1, "Email requerido")
        .email("Correo inválido")
        .max(150, "Máximo 150 caracteres"),
    phoneNumber: z
        .string()
        .trim()
        .min(1, "Teléfono requerido")
        .max(20, "Máximo 20 caracteres"),
    address: z
        .string()
        .trim()
        .min(1, "Dirección requerida")
        .max(200, "Máximo 200 caracteres"),
    faxNumber: z
        .string()
        .trim()
        .max(20, "Máximo 20 caracteres")
        .optional()
        .or(z.literal("")),
    website: z
        .string()
        .trim()
        .url("URL inválida")
        .max(255, "Máximo 255 caracteres")
        .optional()
        .or(z.literal("")),
    categoryId: z.string().optional(),
    // publishSite: z.boolean().optional().default(false),
});

export type ClientInput = z.infer<typeof clientSchema>;