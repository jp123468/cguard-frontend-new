import { z } from "zod";

export const dispatcherFiltersSchema = z
  .object({
    clientId: z.string().min(1, "Cliente es requerido"),
    siteId: z.string().min(1, "Sitio de publicación es requerido"),
    status: z.enum(["todo", "abierto", "en_proceso", "cerrado"]).default("todo"),
    fromDate: z.string().optional(), // YYYY-MM-DD
    fromTime: z.string().optional(), // HH:mm
    toDate: z.string().optional(),   // YYYY-MM-DD
    toTime: z.string().optional(),   // HH:mm
    includeArchived: z.boolean().default(false),
  })
  .refine(
    (val) => {
      // Si alguno de los "from" se usa, ambos deben existir, igual para "to"
      const fromOk = !val.fromDate && !val.fromTime
        ? true
        : Boolean(val.fromDate && val.fromTime);
      const toOk = !val.toDate && !val.toTime
        ? true
        : Boolean(val.toDate && val.toTime);
      return fromOk && toOk;
    },
    { message: "Completa fecha y hora en ambos lados del rango", path: ["fromDate"] }
  );

export type DispatcherFilters = z.infer<typeof dispatcherFiltersSchema>;

export const defaultDispatcherFilters: DispatcherFilters = {
  clientId: "",
  siteId: "",
  status: "todo",
  fromDate: undefined,
  fromTime: undefined,
  toDate: undefined,
  toTime: undefined,
  includeArchived: false,
};

/**
 * Convierte el rango YYYY-MM-DD + HH:mm a ISO strings.
 * Devuelve { from?: string, to?: string }
 */
export function toDateTimeRange(f: DispatcherFilters) {
  const from =
    f.fromDate && f.fromTime
      ? new Date(`${f.fromDate}T${f.fromTime}:00`).toISOString()
      : undefined;
  const to =
    f.toDate && f.toTime
      ? new Date(`${f.toDate}T${f.toTime}:00`).toISOString()
      : undefined;
  return { from, to };
}
