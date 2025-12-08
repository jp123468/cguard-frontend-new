import { z } from "zod";

const e164 = /^\+[1-9]\d{7,14}$/;

export const createProfileSchema = z
  .object({
    firstName: z.string().trim().min(1, "El nombre es requerido"),
    lastName: z.string().trim().min(1, "El apellido es requerido"),
    email: z.string().trim().email("Ingrese un correo válido"),
    phone: z.string().trim().regex(e164, "Use formato e.g. +12015550123"),
    password: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .max(64, "Máximo 64 caracteres"),
    confirmPassword: z.string(),
    clientId: z.string().trim().min(1, "Seleccione un cliente"),
    postSiteId: z.string().trim().min(1, "Asigne un sitio de publicación"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type CreateProfileValues = z.infer<typeof createProfileSchema>;
