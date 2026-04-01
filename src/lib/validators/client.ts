import { z } from "zod";
import { validateCedulaOrRuc } from "./id";

export const clientSchema = z
    .object({
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
    latitude: z
        .string()
        .trim()
        .min(1, "Latitud requerida")
        .refine((val) => !Number.isNaN(Number(val)), {
            message: "Latitud debe ser numérica",
        })
        .refine((val) => Number(val) >= -90 && Number(val) <= 90, {
            message: "Latitud entre -90 y 90",
        }),
    longitude: z
        .string()
        .trim()
        .min(1, "Longitud requerida")
        .refine((val) => !Number.isNaN(Number(val)), {
            message: "Longitud debe ser numérica",
        })
        .refine((val) => Number(val) >= -180 && Number(val) <= 180, {
            message: "Longitud entre -180 y 180",
        }),
    active: z.boolean().optional(),
    // Tipo de persona (Persona Natural / Persona Jurídica)
    personType: z.enum(['PN', 'PJ']).optional(),
    // RUC o Cédula: obligatorio según requerimiento
    documentNumber: z
        .string()
        .trim()
        .min(1, "RUC/Cédula requerido")
        .max(50, "Máximo 50 caracteres"),
    categoryIds: z.array(z.string()).min(1, "Selecciona al menos una categoría"),
})
.superRefine((data, ctx) => {
    const personType = data.personType || 'PN';
    const doc = (data.documentNumber || '').toString().trim();
    if (!doc) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['documentNumber'], message: 'RUC/Cédula requerido' });
        return;
    }

    const digits = doc.replace(/\D/g, '');
    if (personType === 'PN') {
        // Persona natural: debe ser una cédula válida de 10 dígitos
        if (!validateCedulaOrRuc(digits) || digits.length !== 10) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['documentNumber'], message: 'Cédula inválida' });
        }
    } else if (personType === 'PJ') {
        // Persona jurídica: RUC de 13 dígitos que termina en 001 y cuyos primeros 10 conforman una cédula válida
        if (!validateCedulaOrRuc(digits) || digits.length !== 13) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['documentNumber'], message: 'RUC inválido (debe terminar en 001 y contener cédula válida)' });
        }
    }
});

export type ClientInput = z.infer<typeof clientSchema>;