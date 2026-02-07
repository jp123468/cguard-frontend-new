
import { z } from "zod";

const e164 = /^\+[1-9]\d{7,14}$/;

// Nombre/Apellido: permitir letras Unicode, espacios, apóstrofe y guiones. No números.
const nameRegex = /^[\p{L} '\-]+$/u;

export const createProfileSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, "El nombre es requerido")
      .regex(nameRegex, "El nombre no debe contener números ni caracteres inválidos"),
    lastName: z
      .string()
      .trim()
      .min(1, "El apellido es requerido")
      .regex(nameRegex, "El apellido no debe contener números ni caracteres inválidos"),
    email: z.string().trim().email("Ingrese un correo válido"),
    phone: z.string().trim().regex(e164, "Use formato e.g. +12015550123"),
    password: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .max(64, "Máximo 64 caracteres"),
    confirmPassword: z.string(),
    // Support multiple assignments
    clientId: z.array(z.string().trim()).min(1, "Seleccione al menos un cliente"),
    postSiteId: z.array(z.string().trim()).min(1, "Asigne al menos un sitio de publicación"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type CreateProfileValues = z.infer<typeof createProfileSchema>;
