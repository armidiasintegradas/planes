# Planes OS Live Auth Integration Design

## Goal
Publish the already-homologated Google-first Supabase authentication in front of the current Planes OS site while preserving the existing site, works, dashboards, desktop experience, and embedded operational data exactly as they are today.

## Approved architecture
- Keep `app/page.tsx` unchanged.
- Keep all existing works/data currently embedded in the public application unchanged.
- Use the existing Supabase IAM as the authentication and approval authority.
- Common users authenticate with Google, enter as `pending`, and only see the application after an administrator approves them.
- Existing administrative email/password remains contingency access only.
- `approved` users may enter the full current application in this phase.
- Do not introduce project/work filtering in this release. Scope-based filtering remains a later phase when the current works are mapped to Supabase `projects`/`works`.

## Source integration
`app/layout.tsx` wraps the unchanged application with the already-tested `AuthGate`. `components/AuthGate.tsx` remains the canonical source implementation for authentication states and Supabase profile checks.

## GitHub Pages deployment adapter
The current production site on `gh-pages` is a compiled static artifact, so production deployment must not replace its 1.2 MB `index.html` with a new UI build. Instead, a small production auth module is deployed beside it and a deterministic one-time publishing workflow injects only the auth bootstrap markers into the existing `index.html` artifact.

The production auth module mirrors the canonical AuthGate behavior:
- fetch Supabase `/auth/v1/settings` with `cache: 'no-store'` and timestamp;
- use Google OAuth with redirect `https://armidiasintegradas.github.io/planes/`;
- read `profiles.status` and `profiles.role`;
- show login for unauthenticated users;
- show waiting state for `pending`;
- block `rejected`/`suspended`;
- reveal the unchanged existing site for `approved`;
- subscribe to profile updates through Realtime so a pending user can be released without replacing the application.

## Visual constraint
The approved application receives no visual changes. Authentication is shown only before access is granted. Once approved, the auth layer disappears and the original site is displayed unchanged.

## Security boundary
This release protects interactive access to the static GitHub Pages application through Supabase authentication and IAM state. The current works are still embedded in a publicly downloadable static artifact; therefore this phase must not be represented as row-level protection of those existing work records. True per-project/per-work confidentiality requires moving those records into protected Supabase tables in a later phase.

## Release checks
1. `app/page.tsx` must remain byte-identical to `main` before merge.
2. Auth tests must pass.
3. Source build must pass.
4. Google provider must remain enabled in Supabase.
5. Existing test user `alxrib@gmail.com` must remain `approved` / `engenharia`.
6. The injected production artifact must contain exactly one auth bootstrap marker and load the production auth module.
7. GitHub Pages deployment must complete successfully.
8. Rollback is the previous `gh-pages` commit if any regression is detected.
