// One schema per input, shared by forms (client) and Edge Functions (server).
import { z } from "zod";

const trimmed = (max: number) => z.string().trim().max(max);

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/, "Use 3–40 lowercase letters, numbers or hyphens.")
  .refine(
    (s) => !["www", "app", "api", "admin", "book", "mail", "help", "support", "status", "lumid"].includes(s),
    "This name is reserved.",
  );

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email.").max(254);

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number.");

export const profileSchema = z.object({
  display_name: trimmed(120).min(2, "Enter your name."),
  title: trimmed(80).default("Psychologist"),
  bio: trimmed(2000).default(""),
  city: trimmed(80).default(""),
  languages: z.array(trimmed(40).min(1)).max(10).default([]),
  specialties: z.array(trimmed(60).min(1)).max(12).default([]),
  years_experience: z.number().int().min(0).max(70).nullable().default(null),
  rci_number: trimmed(40).nullable().default(null),
  slug: slugSchema,
});

export const sessionTypeSchema = z.object({
  name: trimmed(80).min(1, "Name the session."),
  description: trimmed(300).default(""),
  duration_minutes: z.number().int().min(15).max(240),
  price_paise: z.number().int().min(0).max(10_000_000),
  buffer_minutes: z.number().int().min(0).max(120).default(10),
  is_active: z.boolean().default(true),
});

const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM.");

export const availabilityRuleSchema = z
  .object({ weekday: z.number().int().min(0).max(6), start_time: timeOfDay, end_time: timeOfDay })
  .refine((r) => r.end_time > r.start_time, { message: "End must be after start.", path: ["end_time"] });

export const bookingRequestSchema = z.object({
  slug: slugSchema,
  session_type_id: z.string().uuid(),
  starts_at: z.string().datetime({ offset: true }),
  full_name: trimmed(120).min(2, "Enter your name."),
  email: emailSchema,
  phone: phoneSchema.optional().or(z.literal("")),
  note: trimmed(1000).optional(),
  accept_terms: z.literal(true, { errorMap: () => ({ message: "Please accept the terms to book." }) }),
});

export const cancelSchema = z.object({ reason: trimmed(500).min(3, "Add a short reason for the patient.") });

export const followUpSchema = z.object({
  patient_id: z.string().uuid(),
  booking_id: z.string().uuid().nullable().default(null),
  due_at: z.string().datetime({ offset: true }),
  message: trimmed(1000).min(1, "Write a message."),
  channel: z.enum(["email", "whatsapp"]).default("email"),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type SessionTypeInput = z.infer<typeof sessionTypeSchema>;
export type AvailabilityRuleInput = z.infer<typeof availabilityRuleSchema>;
export type BookingRequest = z.infer<typeof bookingRequestSchema>;
export type FollowUpInput = z.infer<typeof followUpSchema>;

/** Flattens zod issues into { field: message } for the error contract. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    out[key] ??= issue.message;
  }
  return out;
}
