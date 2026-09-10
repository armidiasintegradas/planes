# Planes Transactional Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reliable Planes-branded transactional emails for access request, approval, rejection and suspension without coupling email delivery to IAM authorization.

**Architecture:** Store email intents in a private Postgres outbox populated by database triggers. A Supabase Edge Function renders Planes-branded HTML and drains the outbox through Resend. Delivery failures never roll back or block access changes. Passkey remains a separate authentication capability and is exposed only when Supabase reports it enabled.

**Tech Stack:** PostgreSQL/Supabase, Supabase Edge Functions (Deno), Resend REST API, existing Planes brand assets, GitHub Actions tests.

**Spec:** Conversation-approved flow: Google primary login; Face ID/Passkey for approved returning users; email/password administrative contingency; transactional emails use official Planes identity.

## Global Constraints

- Do not change the approved desktop application layout or `app/page.tsx`.
- Do not expose service-role keys or Resend credentials in browser code or GitHub.
- Google remains the normal first-access method; public email signup remains blocked.
- Email delivery failure must never block `pending`, `approved`, `rejected` or `suspended` state transitions.
- Use the existing official Planes logo asset at `/planes/brand/planes-logo.png`.
- All new database email infrastructure lives in the private schema and is inaccessible to anon/authenticated users.
- Worker operations must be idempotent and retryable.

---

### Task 1: Private email outbox

**Files:**
- Create: Supabase migration `planes_transactional_email_outbox_v1`
- Test: SQL verification queries

**Interfaces:**
- Produces: `private.email_outbox`, `private.enqueue_email(...)`, event triggers on access requests/profiles.

- [ ] **Step 1: Write verification queries** that assert the table, checks, unique dedupe key, private grants and required trigger functions do not yet exist.
- [ ] **Step 2: Run verification and confirm RED.**
- [ ] **Step 3: Apply migration** creating the private outbox, enqueue helper and triggers for `access_request_received`, `admin_access_request`, `access_approved`, `access_rejected`, and `access_suspended`.
- [ ] **Step 4: Re-run verification and confirm GREEN.**
- [ ] **Step 5: Run Supabase security advisors after DDL.**

### Task 2: Planes-branded email worker

**Files:**
- Create/Deploy: Edge Function `planes-email-worker/index.ts`
- Create: `supabase/functions/planes-email-worker/index.ts` in repository for source control
- Test: static source tests plus safe no-secret invocation behavior

**Interfaces:**
- Consumes: pending rows in `private.email_outbox`.
- Produces: Resend API calls; updates `sent`, retry timing and failure metadata.

- [ ] **Step 1: Add failing source-contract tests** for Resend, outbox claiming, official logo URL, Planes colors, retry states and absence of credentials in source.
- [ ] **Step 2: Run CI and confirm RED.**
- [ ] **Step 3: Implement worker** with environment variables `RESEND_API_KEY`, `PLANES_EMAIL_FROM`, optional `PLANES_EMAIL_REPLY_TO`, and Planes-branded templates.
- [ ] **Step 4: Deploy worker with authenticated invocation** and verify it returns a controlled `email_not_configured` response when Resend is not configured.
- [ ] **Step 5: Run tests/build and confirm GREEN.**

### Task 3: Passkey production readiness

**Files:**
- Existing: `public/auth-gate-live.js`, `components/AuthGate.tsx`, `lib/auth/security.mjs`

**Interfaces:**
- Consumes: Supabase `/auth/v1/settings.passkeys_enabled`.
- Produces: Face ID/Passkey button only when enabled server-side.

- [ ] **Step 1: Verify production currently reports `passkeys_enabled=false`.**
- [ ] **Step 2: Confirm browser code already has conditional Passkey login and enrollment paths.**
- [ ] **Step 3: Document the final Dashboard values: RP display name `Planes OS`, RP ID `armidiasintegradas.github.io`, RP origin `https://armidiasintegradas.github.io`.
- [ ] **Step 4: After the Dashboard toggle is enabled, test register → sign out → Passkey-only sign-in and confirm a WebAuthn credential exists.**

### Task 4: Production email activation

**Files:**
- Supabase Edge Function secrets (Dashboard/CLI only; never source control)

**Interfaces:**
- Required secrets/config: `RESEND_API_KEY`, `PLANES_EMAIL_FROM`, optional `PLANES_EMAIL_REPLY_TO`.

- [ ] **Step 1: Verify a Planes-controlled sending domain in Resend.**
- [ ] **Step 2: Store Resend/API sender values as Supabase Edge Function secrets.**
- [ ] **Step 3: Trigger a controlled test email from a queued test row and confirm Resend delivery ID and outbox `sent_at`.**
- [ ] **Step 4: Test the real lifecycle with a fresh Google account: request received → admin notification → approval → user approval email.**
