import { z } from "zod";

export const accessLevels = ["Super Admin", "Admin", "Operador", "Lectura"] as const;

export const newAdminUserSchema = z.object({
    name: z.string().trim().min(1, "El nombre es requerido"),
    email: z.string().trim().email("Correo inválido"),
    // accessLevel will store the selected role id (dynamic from backend)
    accessLevel: z.string().trim().min(1, "Seleccione un nivel"),
    clientIds: z.array(z.string()).optional(),
    postSiteIds: z.array(z.string()).optional(),
});

export type NewAdminUserValues = z.infer<typeof newAdminUserSchema>;
