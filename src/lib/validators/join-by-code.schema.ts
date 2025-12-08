import { z } from "zod";

// E.164: + y 8–15 dígitos
const e164 = /^\+[1-9]\d{7,14}$/;

export const joinByCodeEntrySchema = z.object({
  phone: z.string().trim().regex(e164, "Use formato e.g. +12015550123"),
});

export const joinByCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .length(6, "El código debe tener 6 dígitos")
    .regex(/^\d{6}$/, "El código debe ser numérico"),
  entries: z.array(joinByCodeEntrySchema).min(1, "Agregue al menos un guardia"),
});

export type JoinByCodeEntry = z.infer<typeof joinByCodeEntrySchema>;
export type JoinByCodeFormValues = z.infer<typeof joinByCodeSchema>;
