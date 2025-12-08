import { z } from "zod";

export const accessLevels = ["Super Admin", "Admin", "Operador", "Lectura"] as const;

export const newAdminUserSchema = z.object({
    name: z.string().trim().min(1, "El nombre es requerido"),
    email: z.string().trim().email("Correo inválido"),
    accessLevel: z.enum([...accessLevels]).refine(val => val !== undefined, { message: "Seleccione un nivel" }),
    clientId: z.string().trim().min(1, "Seleccione un cliente"),
    postSiteId: z.string().trim().min(1, "Seleccione un sitio"),
});

export type NewAdminUserValues = z.infer<typeof newAdminUserSchema>;
