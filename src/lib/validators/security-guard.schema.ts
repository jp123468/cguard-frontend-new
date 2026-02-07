import { z } from "zod";

// E.164: + y 8–15 dígitos
const e164 = /^\+[1-9]\d{7,14}$/;

// Nombre/Apellido: permitir letras Unicode, espacios, apóstrofe y guiones. No números.
const nameRegex = /^[\p{L} '\-]+$/u;

export const inviteByOptions = ["SMS", "Correo Electrónico"] as const;

const baseEntry = {
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
  // Allow multiple clients/sites to be selected; store as arrays
  clientId: z.array(z.string().trim()).min(1, "Seleccione al menos un cliente"),
  postSiteId: z.array(z.string().trim()).min(1, "Asigne al menos un sitio de publicación"),
};

// Un solo contacto por registro (email o teléfono según inviteBy)
const entrySMS = z.object({
  inviteBy: z.literal("SMS"),
  contact: z
    .string()
    .trim()
    .regex(e164, "Use formato internacional, e.g. +12015550123"),
});

const entryEmail = z.object({
  inviteBy: z.literal("Correo Electrónico"),
  contact: z.string().trim().email("Ingrese un correo válido"),
});

export const guardEntrySchema = z
  .object(baseEntry)
  .and(z.discriminatedUnion("inviteBy", [entrySMS, entryEmail]));

export type GuardEntryValues = z.infer<typeof guardEntrySchema>;

// Formulario raíz: muchos registros de guardias
export const securityGuardsSchema = z.object({
  entries: z.array(guardEntrySchema).min(1, "Agregue al menos un guardia"),
});

export type SecurityGuardsFormValues = z.infer<typeof securityGuardsSchema>;
