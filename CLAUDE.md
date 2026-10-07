# Samoi App (Jardin Planner)

Garden planner for Le Grand Samoï, Condé-en-Normandie. Live at https://www.legrandsamoi.com.
React 19 + Vite + React Router, Supabase (auth, Postgres, storage), Claude API via a Vercel function.

## Development Commands

| Task | Command |
|---|---|
| Dev server | `npm run dev -- --port 5180 --strictPort` (5173 belongs to another project; never kill it) |
| Tests | `npm test` (Vitest + Testing Library, jsdom) |
| Lint | `npm run lint` |
| Build | `npm run build` |
| Anonymous access check | `node scripts/check-public-access.mjs` (every table must say `locked`) |

CI runs lint, tests and build on every PR (`.github/workflows/ci.yml`).

## Structure

- `src/pages/` one file per route (Home, Seeds = Plants, SeedDetail, Today, Garden, ZoneDetail, Login, ResetPassword)
- `src/context/SeedsContext.jsx` all Supabase reads and writes for plants, zones, tasks, diary
- `src/lib/claude.js` prompts and `callClaude()`, which calls `/api/claude`
- `src/lib/image.js` shrinks photos before sending (Vercel 4.5 MB body limit)
- `api/claude.js` Vercel function holding the Anthropic key; requires a Supabase session
- `supabase/migrations/` SQL run by hand in the Supabase SQL editor
- `src/theme.css` design tokens; pages mostly use inline styles today

## Environment Variables

| Name | Where | Public? |
|---|---|---|
| `VITE_SUPABASE_URL` | browser + server | yes, by design |
| `VITE_SUPABASE_ANON_KEY` | browser + server | yes, by design; RLS protects data |
| `ANTHROPIC_API_KEY` | server only (`api/`) | **no**. Never prefix with `VITE_` |

Local values live in `.env.local` (gitignored). Production values live in Vercel.

## Database Schema

Tables: `gardens`, `zones`, `plants`, `plant_tasks`, `zone_tasks`, `task_completions`,
`diary_entries`, `zone_diary_entries`, `garden_images`, `catalog_entries`. Storage bucket: `garden-images`.
All tables have RLS: signed-in users have full access, anonymous users have none. Sign-ups are closed.

## Rules

- One small PR per change, branched from `origin/main`. Laura merges; Vercel deploys `main`.
- Every behaviour change ships with a test. Run tests, lint and build before opening a PR.
- Screenshot UI changes with Playwright at 390px and 1440px wide before reporting done.
- Check `LEARNINGS.md` before changing anything; add to it when something surprises you.
- Never invent content (local rules, history, copy). Use Laura's material or cited sources.
