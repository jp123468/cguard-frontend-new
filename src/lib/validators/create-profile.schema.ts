
import { z } from "zod";

const e164 = /^\+[1-9]\d{7,14}$/;

// Nombre/Apellido: permitir letras Unicode, espacios, apóstrofe y guiones. No números.
const nameRegex = /^[\p{L} '\-]+$/u;

export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export type BloodType = (typeof BLOOD_TYPES)[number];

export const GENDER_OPTIONS = ["Masculino", "Femenino"] as const;
export type Gender = (typeof GENDER_OPTIONS)[number];

export const MARITAL_STATUS_OPTIONS = ["Soltero", "Casado", "Unión libre", "Divorciado"] as const;
export type MaritalStatus = (typeof MARITAL_STATUS_OPTIONS)[number];

export const ACADEMIC_INSTRUCTION_OPTIONS = ["Primaria", "Secundaria", "Universidad", "Universitaria", "Especial"] as const;
export type AcademicInstruction = (typeof ACADEMIC_INSTRUCTION_OPTIONS)[number];

export const createProfileSchema = z
  .object({
    // ── Personal info ──────────────────────────────────────────────────────
    firstName: z
      .string()
      .trim()
      .min(1, "El nombre es requerido")
      .regex(nameRegex, "El nombre no debe contener números ni caracteres inválidos"),
    middleName: z
      .string()
      .trim()
      .regex(nameRegex, "El segundo nombre no debe contener números ni caracteres inválidos")
      .optional()
      .or(z.literal("")),
    lastName: z
      .string()
      .trim()
      .min(1, "El apellido es requerido")
      .regex(nameRegex, "El apellido no debe contener números ni caracteres inválidos"),

    gender: z.enum(GENDER_OPTIONS, { error: "El género es requerido" }),

    birthDate: z
      .string()
      .trim()
      .min(1, "La fecha de nacimiento es requerida")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD"),

    birthPlace: z.string().trim().max(50, "Máximo 50 caracteres").optional().or(z.literal("")),

    maritalStatus: z.enum(MARITAL_STATUS_OPTIONS, { error: "El estado civil es requerido" }),

    academicInstruction: z.enum(ACADEMIC_INSTRUCTION_OPTIONS, { error: "La instrucción académica es requerida" }),

    hiringContractDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD")
      .optional()
      .or(z.literal("")),

    guardCredentials: z.string().trim().max(255, "Máximo 255 caracteres").optional().or(z.literal("")),

    // ── Contact ────────────────────────────────────────────────────────────
    email: z.string().trim().email("Ingrese un correo válido"),
    phone: z.string().trim().regex(e164, "Use formato e.g. +12015550123"),

    // ── Address ─────────────────────────────────────────────────────────────
    homeAddress: z.string().trim().optional().or(z.literal("")),
    homeAddressLat: z.number().optional(),
    homeAddressLng: z.number().optional(),

    // ── Identity ───────────────────────────────────────────────────────────
    identificationNumber: z
      .string()
      .trim()
      .min(1, "El número de cédula/identificación es requerido")
      .max(30, "Máximo 30 caracteres"),
    bloodType: z.enum(BLOOD_TYPES),

    // ── Assignments ────────────────────────────────────────────────────────
    clientId: z.array(z.string().trim()).optional(),
    stationId: z.array(z.string().trim()).optional(),

    // ── Password (optional on create — invite flow sets it) ────────────────
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
  });

export type CreateProfileValues = z.infer<typeof createProfileSchema>;

