# Jardin Planner

Built for gardeners of all scales — from amateur home growers to professional farmers managing large estates. Starting with Grand Samoï, our 5-acre property in Condé-en-Normandy, France, the goal is a tool that works for anyone growing anything, anywhere in the world.

---

## What it does

**Plants library**
- Add plants by photo, name search, or seed packet URL
- Claude AI enriches each plant with Normandy-specific growing advice: sow dates, transplant windows, spacing, pests, harvest signs
- Filter and sort by category, plant type, colour, status, and garden zone
- Bulk import from a Google Sheet or Google Doc plant list

**Today page**
- Daily prioritised task list: what to sow, transplant, and harvest right now
- Mark tasks done — badge in nav shows only open tasks

**Garden zones**
- Assign plants to specific areas of the property
- Track what's growing where

**Plant detail**
- Full growing guide tailored to our climate (Zone RHS H4 / USDA 8b, oceanic Cfb)
- Chat with Claude about any specific plant
- Diary log per plant

---

## Tech stack

- React + Vite
- React Router
- Claude API (Anthropic) — plant identification, enrichment, and chat
- Plant catalog: custom seed list + Willemse France

---

## Running locally

1. Clone the repo and run `npm install`
2. Create `.env.local` in the project root with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `ANTHROPIC_API_KEY` (server-only; never prefix it with `VITE_`)
3. Run `npm run dev -- --port 5180 --strictPort` and open http://localhost:5180

`npm test` runs the tests. See `CLAUDE.md` for structure and conventions.

---

## Status

Active development. Data lives in Supabase; sign-in is invite-only.
