# PLAN-005 Sink — better-auth replaces SITE_TOKEN

- **status**: completed
- **approvedAt**: 2026-06-17
- **createdAt**: 2026-06-17
- **relatedTask**: FEAT-012

## Context

Sink currently authenticates with a single shared `SITE_TOKEN`:

- `lib/auth.ts` — `requireSiteToken(request)` constant-time-compares a Bearer
  token against `getConfig().siteToken`; fails closed in production.
- ~23 `/api/*` route handlers each call `requireSiteToken` at the top.
- `lib/api.ts` attaches `Authorization: Bearer <token>` on every request; token
  lives client-side in a zustand `persist` store (`stores/auth-store.ts`).
- `components/auth/site-token-gate.tsx` re-verifies the stored token against
  `GET /api/verify` on mount and bounces to `/dashboard/login` on failure.
- `app/dashboard/login/page.tsx` is a single password field that POSTs the token.

This is a shared-secret model with no real users. The goal is per-user
email/password auth via better-auth, backed by the existing Drizzle DB.

Reference: flox commit `f80a538` (next-on-pages). Sink differs: **OpenNext**,
node runtime, bindings via `getCloudflareContext()` (already used in `lib/db.ts`).

## Proposal

### Dependency

- Add `better-auth: ^1.6.19` to `pnpm-workspace.yaml` prod catalog + sink
  `package.json` (`catalog:prod`). (Latest verified on npm: 1.6.19.)

### Schema + migration

- `database/schema.ts` — add better-auth's four tables (`user`, `session`,
  `account`, `verification`) with the exact column names better-auth expects
  (copy from flox schema). Keep existing `links` table untouched.
- **Migration: regenerate from scratch** (user-approved). Delete the existing
  `0000_*.sql` + `database/meta/` and run `pnpm --filter @cdlab996/sink db:gen`
  to emit a single fresh init migration covering `links` + the four auth tables.
  No data preservation needed; the DB is wiped and re-initialized on next deploy.
  Still tool-generated (drizzle-kit), never hand-edited.

### Server auth

- `lib/auth.ts` — rewrite:
  - `getAuth()` — builds a better-auth instance per call: `drizzleAdapter(db,
    { provider: 'sqlite', schema })`, `socialProviders: { google, github }`,
    `nextCookies()` plugin, `secret`/`baseURL` from env. **Email/password is NOT
    enabled** — social login only; first social sign-in auto-creates the user
    (login == registration).
  - `requireSession(request)` — async guard returning `{ ok: true, session } |
    { ok: false, response: 401 }`, using `auth.api.getSession({ headers })`.
    Replaces `requireSiteToken`. Remove `extractBearer` / `safeEqual` /
    `isValidSiteToken` / `requireSiteToken`.
- `app/api/auth/[...all]/route.ts` — new; GET/POST delegate to `auth.handler`.
- Replace `requireSiteToken` → `await requireSession` in all ~23 `/api/*`
  routes (mechanical; each call site gains `await`).
- `app/api/verify/route.ts` — delete (client gate no longer verifies a token).

### Client auth

- `lib/auth-client.ts` — new; `createAuthClient` + exported
  `signIn/signUp/signOut/useSession`.
- `app/dashboard/(app)/layout.tsx` — server-side session check via
  `getAuth().api.getSession({ headers })`; `redirect('/dashboard/login')` when
  absent. Removes the client `SiteTokenGate` wrapper.
- `components/auth/site-token-gate.tsx` — delete.
- `stores/auth-store.ts` — delete (no client token; session is a cookie).
- `app/dashboard/login/page.tsx` — rewrite to two social buttons ("Continue with
  Google" / "Continue with GitHub") calling `authClient.signIn.social({ provider,
  callbackURL: '/dashboard' })`. i18n strings (en/zh). No email/password fields.
- `components/dashboard/shell.tsx` — `onSignOut` → `authClient.signOut()` then
  redirect.
- `lib/api.ts` — drop `authHeader()` / Bearer wiring / `verifyToken`; session
  cookie is sent automatically with same-origin fetch. Simplify `downloadAuthed`
  and `uploadApi.image` (no auth header).

### Env / config / docs

- `lib/env.ts` — remove `siteToken` from `SinkConfig` + `getConfig`.
- `wrangler.jsonc` — remove `SITE_TOKEN`; add `BETTER_AUTH_URL` (var) and a note
  that `BETTER_AUTH_SECRET` + the OAuth client secrets are **secrets**
  (`.dev.vars` / `wrangler secret`), not committed.
- `cloudflare-env.d.ts` — add `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
  `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`.
- `.env.example` — swap SITE_TOKEN block for better-auth + OAuth vars.
- `.dev.vars` (gitignored) — local `BETTER_AUTH_SECRET` + OAuth creds.
- `README.md` — update the auth section (OAuth app setup + redirect URIs).
- i18n `messages/{en,zh}.json` — login keys (title/description + provider button labels).

## Registration policy — RESOLVED

Social login only (Google + GitHub); login == registration (first social
sign-in auto-creates the user). No email/password, no signup UI, no
`DISABLE_REGISTRATION` flag.

**Open access caveat**: any Google/GitHub account can sign in and reach the
dashboard. Acceptable per user direction (personal tool / obscure URL). An
email allowlist (reject sign-in unless email ∈ `ALLOWED_EMAILS` via a
better-auth `signIn` hook) is available later if needed — out of scope now.

## Risks

- **OAuth setup is an external dependency**: Google + GitHub OAuth apps must be
  created and their client id/secret + redirect URIs configured before login
  works. Redirect URI = `{BETTER_AUTH_URL}/api/auth/callback/{google|github}`
  (dev: `http://sink.localhost:3355/...`, prod: deployed origin). User provides
  the creds via `.dev.vars` / wrangler secrets.
- **DB re-init**: migration regenerated from scratch; existing data is dropped
  (user-approved). Generated, not hand-written.
- **23-route edit surface**: mechanical async swap; risk of a missed `await` →
  caught by tsc (returns Promise, `.ok` undefined). Verify by build.
- **Session in middleware-free app**: per-route guard keeps public `[slug]`
  redirects untouched (no auth DB hit on the hot redirect path). Good.
- **Secret handling**: `BETTER_AUTH_SECRET` must not be committed (current
  wrangler.jsonc already commits `LIBSQL_AUTH_TOKEN` + `SITE_TOKEN` — pre-existing;
  flagged, not fixed here unless asked).
- **baseURL**: better-auth needs a correct `BETTER_AUTH_URL` per env (dev
  `http://sink.localhost:3355`, prod the deployed origin) or social/redirects break.

## Scope

In: better-auth email/password, session-gated API + dashboard, SITE_TOKEN
removal, i18n login, schema + migration, env/docs.

Out (unless asked): Google/social login, email verification + password reset
(no email service wired), user-management UI, rate limiting, the pre-existing
committed-secrets cleanup in wrangler.jsonc.
