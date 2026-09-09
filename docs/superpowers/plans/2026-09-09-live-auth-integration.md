# Planes OS Live Auth Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the homologated Supabase/Google IAM in front of the current Planes OS production site without changing the existing works, dashboards, desktop UI, or `app/page.tsx`.

**Architecture:** Keep `components/AuthGate.tsx` as the canonical source gate and preserve `app/page.tsx` unchanged. Because GitHub Pages serves the existing compiled `gh-pages/index.html`, deploy a small `public/auth-gate-live.js` adapter and use a deterministic publishing workflow to inject only bootstrap CSS/script markers into the existing production artifact, then let Supabase profile status decide whether to reveal the unchanged application.

**Tech Stack:** React 19, vinext, Supabase JS 2.105.0, Supabase Auth/Realtime, GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-09-live-auth-integration-design.md`

## Global Constraints

- `app/page.tsx` must remain unchanged.
- Existing works and application data must remain unchanged in this release.
- Google is the primary user authentication provider.
- Email/password is contingency access for the existing administrator only.
- `pending`, `rejected`, and `suspended` users must not see the application UI.
- `approved` users see the complete existing application.
- Do not claim per-work confidentiality for the current static work data.
- Production redirect is `https://armidiasintegradas.github.io/planes/`.
- Auth settings reads must bypass stale caches.
- Rollback target is the `gh-pages` commit immediately preceding publication.

---

### Task 1: Contract-test the production Pages auth adapter

**Files:**
- Modify: `tests/auth-security.test.mjs`
- Create: `public/auth-gate-live.js`

**Interfaces:**
- Consumes: Supabase URL, publishable key, `profiles` table, Google OAuth, Realtime.
- Produces: browser module that exposes the existing application only for an approved profile.

- [ ] **Step 1: Write the failing test**

Add a source-contract test that reads `public/auth-gate-live.js` and requires all of these strings/patterns: `cache:'no-store'` or equivalent, `/auth/v1/settings?ts=`, `signInWithOAuth`, `provider:'google'`, `profiles`, `pending`, `approved`, `rejected`, `suspended`, `postgres_changes`, and the exact production redirect. Also assert the adapter does not contain `signUp(`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because `public/auth-gate-live.js` does not yet exist.

- [ ] **Step 3: Implement the production adapter**

Create `public/auth-gate-live.js` as an ES module importing `createClient` from `https://esm.sh/@supabase/supabase-js@2.105.0`. Implement unauthenticated Google login, administrative fallback login, profile-state rendering, Realtime profile updates, sign-out, no-store settings fetch, and `allowApp()` that removes the auth-blocking classes/root so the existing application becomes visible unchanged.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: add production Pages auth gate`

### Task 2: Add a deterministic GitHub Pages publisher

**Files:**
- Create: `.github/workflows/publish-live-auth.yml`
- Test: `tests/auth-security.test.mjs`

**Interfaces:**
- Consumes: `public/auth-gate-live.js` from the feature branch and current `gh-pages/index.html`.
- Produces: `gh-pages/auth-gate-live.js` plus one bootstrap marker in the existing `gh-pages/index.html`.

- [ ] **Step 1: Extend the failing source-contract test**

Require `.github/workflows/publish-live-auth.yml` to preserve the current `gh-pages/index.html`, copy only the auth module, remove any previous `PLANES_AUTH_GATE_START`/`PLANES_AUTH_GATE_END` block, and inject exactly one new block. Require `permissions: contents: write` and checkout of both the source branch and `gh-pages`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because the publisher workflow does not yet exist.

- [ ] **Step 3: Implement publishing workflow**

Create a workflow triggered by pushes to `feat/planes-iam-real` when the workflow or `public/auth-gate-live.js` changes. It checks out source and `gh-pages` in separate directories, copies the auth module, uses Python to idempotently inject a bootstrap block before `</head>` in the existing HTML, verifies one marker pair exists, commits only `index.html` and `auth-gate-live.js`, and pushes to `gh-pages`.

- [ ] **Step 4: Run tests and source build**

Run: `npm test && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `ci: publish auth gate over existing Pages site`

### Task 3: Verify source integrity and production IAM state

**Files:**
- No production code changes.

**Interfaces:**
- Consumes: GitHub branch hashes, Supabase profiles/provider settings.
- Produces: release evidence.

- [ ] **Step 1: Confirm page preservation**

Compare `app/page.tsx` on `main` and `feat/planes-iam-real` and require identical blob SHA.

- [ ] **Step 2: Confirm CI**

Require `npm test`, `npm run build`, and isolated auth-preview validation to pass at the final feature-branch head.

- [ ] **Step 3: Confirm IAM state**

Query Supabase and verify Google is enabled and `alxrib@gmail.com` is `approved` with role `engenharia`.

### Task 4: Merge canonical source and verify Pages publication

**Files:**
- Merge PR #1 to `main`.
- Production artifact changes are restricted to `gh-pages/index.html` bootstrap markers and `gh-pages/auth-gate-live.js`.

**Interfaces:**
- Consumes: green PR head and successful publishing workflow.
- Produces: canonical authenticated source plus live authenticated Pages application.

- [ ] **Step 1: Update PR description**

Record successful Google OAuth, pending flow, approval as `engenharia`, and Pages adapter design.

- [ ] **Step 2: Merge PR #1 only after final green CI**

Use the expected head SHA to prevent merging a moving branch.

- [ ] **Step 3: Verify GitHub Pages deployment**

Require the Pages build/deploy for the resulting `gh-pages` commit to complete successfully.

- [ ] **Step 4: Verify production artifact**

Read `gh-pages/index.html` and confirm exactly one auth bootstrap marker and the external module reference. Confirm `gh-pages/auth-gate-live.js` exists.

- [ ] **Step 5: Report production URL and known boundary**

Production: `https://armidiasintegradas.github.io/planes/`. State explicitly that current embedded works remain unchanged and are not yet filtered by Supabase work scopes.
