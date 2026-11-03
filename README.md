# FLOWPRINT

**See the Work. Find the Waste. Design What's Next.**

FLOWPRINT is a process-intelligence and improvement-design workspace. It connects an As-Is process map with transparent operational analysis, heuristic opportunity discovery, an editable To-Be simulator, and an executive report.

## Run locally

Requirements: Node.js 20.9+.

```bash
npm install
cp .env.example .env.local
# Fill in the Supabase project URL and publishable key, then:
npm run dev
```

Open `http://localhost:3000`. Without Supabase environment variables, the app remains usable in **Demo Mode** with illustrative processes and browser-local persistence. With the values configured, use **Sign in / Create account** to enable per-user cloud storage.

Required for Supabase cloud sync:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Optional Gemini server variables:

```dotenv
GEMINI_API_KEY=your_rotated_google_ai_studio_key
GEMINI_MODEL=gemini-3.6-flash
```

A Supabase publishable/anon key is intended for browser use; row-level security is mandatory. The app does not need a service-role key. Never place secret keys in `NEXT_PUBLIC_*` or client code. Keep `GEMINI_API_KEY` only in a server environment such as local `.env.local` or Vercel Project Environment Variables. The connected project uses the `flowprint_*` tables and the owner-scoped RLS policies in `supabase/migrations/0002_flowprint_supabase.sql`. The migration has been applied to the connected project; it does not modify its pre-existing tables.

### Supabase Auth setup

For a new project, apply `0002_flowprint_supabase.sql`, enable email/password sign-in, and set Auth URL Configuration. Add the app's exact callback target (the current origin plus `/app`) to the redirect allow-list. For local development, allow `http://localhost:3000/app`; for a deployed or preview build, allow that deployment's `/app` URL too. Email confirmation may be required before the first sign-in, depending on the project's Auth settings.

The first account sign-in creates a private workspace. If that account has no cloud processes yet, the current local workspace is seeded to it; otherwise remote records are loaded. Signed-out edits stay in local Demo Mode. The app only uses the authenticated user's RLS-protected access token and the public project key.

## Main routes

- `/` — product landing page
- `/login` — Supabase email sign-in / sign-up
- `/app` — workspace dashboard
- `/app/processes` — process library
- `/app/processes/new` — create a process
- `/app/processes/:id/studio` — interactive As-Is workflow canvas
- `/app/processes/:id/intelligence` — process metrics and signals
- `/app/processes/:id/opportunities` — heuristic opportunity scoring, optional AI discovery copilot, and scenario-targeted improvements
- `/app/processes/:id/scenarios` — editable To-Be canvas, optional AI draft, assumptions, and before/after comparison
- `/app/processes/:id/reports` — choose a scenario, preview the executive report, and export JSON / CSV or print to PDF
- `/app/settings` — sync status, account controls, and workspace export

## Data and persistence

The Zustand workspace hydrates from browser storage and, for a signed-in account, loads/saves that account's workspace through Supabase. Cloud data is stored in `flowprint_workspaces`, `flowprint_processes`, and `flowprint_scenarios`. Each row is protected by owner-based RLS; workflow graphs are JSONB. The local store is `flowprint-demo-v1`. **Settings → Export local workspace** downloads a JSON snapshot. Signing out resets the visible workspace to the illustrative demo records; it does not delete the cloud workspace.

`supabase/migrations/0001_flowprint.sql` is a no-op historical placeholder for a superseded, unprefixed draft. Do not apply the retired unprefixed schema. The active isolated schema is `0002_flowprint_supabase.sql`.

## Optional Gemini AI

Core metrics, validation, opportunity scores, and scenario calculations remain deterministic. Optional AI features provide qualitative discovery suggestions and an editable To-Be draft; neither changes a graph or score until a user explicitly reviews/applies it. AI requests require a signed-in workspace and are limited to 12 requests per hour per account per server instance. The user's selected process context is sent to Google AI Studio only after they click an AI action; requests use `store: false`, but avoid sending personal, confidential, or regulated data and review Google's current data policy. Do not treat generated content as measured fact or an implementation decision.

The API key is read only on the server from `GEMINI_API_KEY`. Without it, the AI controls show that Gemini is not configured, while the rest of FLOWPRINT continues to work. The API key pasted in chat should be revoked and replaced before enabling these features. Set the new key in `.env.local` for local development or Vercel's server-side environment settings; never add it to source control or a `NEXT_PUBLIC_*` variable.

## Business logic

Calculations are centralized in `src/lib/calculations.ts`:

- Human effort = sum of Activity effort minutes.
- Waiting time = sum of Waiting node duration + Activity waiting minutes.
- Cycle time = human effort + waiting time.
- Monthly workload = `(human effort / 60) × monthly volume`.
- Monthly labor cost = `monthly workload × hourly labor cost`.
- Potential monthly hours saved = `(baseline hours − proposed hours) × adoption rate`.
- Potential monthly cost savings = `potential hours saved × hourly labor cost`.
- Payback months = `implementation cost / potential monthly cost savings` only when savings are positive.

Scenario estimates are gated on a valid connected Start-to-End workflow. To-Be edits are separate from the baseline. Opportunity scores are **heuristic prioritization scores**, not automation-success probabilities; factors and scoring weights are shown in the UI. Values supplied with demo data are illustrative, not measured company results. FLOWPRINT does not execute external automations.

## Quality checks

```bash
npm run typecheck
npm test
npm run build
```

The automated tests cover workflow validation, workload/cost calculations, opportunity scores, scenario estimates, and zero/negative savings behavior.
