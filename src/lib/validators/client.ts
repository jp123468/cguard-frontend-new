import { z } from "zod";

export const clientSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "Nombre del cliente requerido")
        .max(200, "Máximo 200 caracteres")
        .regex(/^[A-Za-zÀ-ÿ'\-\s]+$/, "Solo letras, espacios, ' y -"),
    lastName: z
        .string()
        .trim()
        .min(1, "Apellido requerido")
        .max(200, "Máximo 200 caracteres")
        .regex(/^[A-Za-zÀ-ÿ'\-\s]+$/, "Solo letras, espacios, ' y -"),
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
        .max(20, "Máximo 20 caracteres"),
    city: z
        .string()
        .trim()
        .min(1, "Ciudad requerida")
        .max(100, "Máximo 100 caracteres")
        .regex(/^[A-Za-zÀ-ÿ'\-\s]+$/, "Solo letras, espacios, ' y -"),
    country: z
        .string()
        .trim()
        .min(1, "País requerido")
        .max(100, "Máximo 100 caracteres")
        .regex(/^[A-Za-zÀ-ÿ'\-\s]+$/, "Solo letras, espacios, ' y -"),
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
    active: z.boolean().optional(),
    categoryId: z.string().optional(),
});

export type ClientInput = z.infer<typeof clientSchema>;