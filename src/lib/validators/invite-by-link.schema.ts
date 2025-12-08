import { z } from "zod";

// E.164: + y 8–15 dígitos
const e164 = /^\+[1-9]\d{7,14}$/;

export const inviteByLinkEntrySchema = z.object({
  phone: z.string().trim().regex(e164, "Use formato e.g. +12015550123"),
});

export const inviteByLinkSchema = z.object({
  link: z.string().trim().url("Enlace inválido"),
  entries: z.array(inviteByLinkEntrySchema).min(1, "Agregue al menos un guardia"),
});

export type InviteByLinkEntry = z.infer<typeof inviteByLinkEntrySchema>;
export type InviteByLinkFormValues = z.infer<typeof inviteByLinkSchema>;
