import * as z from 'zod'
import { SLUG_REGEX } from '@/lib/slug'

// Geo routing map: ISO-3166-1 alpha-2 (UPPERCASE) → destination URL. Keys are
// uppercased here so the redirect engine's `config.geo[cf.country]` lookup
// (CF country codes are uppercase) always matches.
const GeoSchema = z.preprocess(
  (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      return value
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k.trim().toUpperCase(),
        v,
      ]),
    )
  },
  z.record(
    z.string().regex(/^[A-Z]{2}$/u, 'Country must be a 2-letter ISO code'),
    z.string().trim().url().max(2048),
  ),
)

// Link behaviour config as sent by the dashboard (no passwordHash — the server
// derives that from the optional plaintext `password` field).
export const LinkConfigInputSchema = z.object({
  geo: GeoSchema.optional(),
  apple: z.string().trim().url().max(2048).optional(),
  google: z.string().trim().url().max(2048).optional(),
  title: z.string().trim().max(256).optional(),
  description: z.string().trim().max(2048).optional(),
  image: z.string().trim().url().max(2048).optional(),
  cloaking: z.boolean().optional(),
  redirectWithQuery: z.boolean().optional(),
  unsafe: z.boolean().optional(),
})

const slugField = z
  .string()
  .trim()
  .max(2048)
  .regex(SLUG_REGEX, 'Invalid slug format')

export const CreateLinkSchema = z.object({
  url: z.string().trim().url('Please provide a valid URL').max(2048),
  slug: slugField.optional(),
  domain: z.string().trim().max(255).optional(),
  comment: z.string().trim().max(2048).optional(),
  // Epoch milliseconds; null/omitted means never expires.
  expiresAt: z.number().int().positive().nullable().optional(),
  config: LinkConfigInputSchema.optional(),
  // Plaintext password — hashed server-side into config.passwordHash.
  password: z.string().min(1).max(128).nullable().optional(),
})

export const EditLinkSchema = CreateLinkSchema.extend({
  id: z.string().min(1, 'id is required'),
  url: z.string().trim().url().max(2048).optional(),
})

export const UpsertLinkSchema = CreateLinkSchema

export const DeleteLinkSchema = z.object({
  id: z.string().min(1),
})

export type CreateLinkInput = z.infer<typeof CreateLinkSchema>
export type EditLinkInput = z.infer<typeof EditLinkSchema>
export type LinkConfigInput = z.infer<typeof LinkConfigInputSchema>
