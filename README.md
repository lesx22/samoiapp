# Jardin Planner

A family garden management app for Grand Samoï, our 5-acre estate in Condé-en-Normandy, France.

Built for a family of 5-6 people to coordinate planting, track hundreds of plants across the property, and tag-team garden work across different visits throughout the season.

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

1. Clone the repo
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the project root:
   ```
   VITE_ANTHROPIC_API_KEY=your_api_key_here
   ```
4. Start the dev server:
   ```
   npm run dev
   ```
5. Open `http://localhost:5173`

> Note: the `.env` file is gitignored and never committed. Never share your API key.

---

## Status

Active development. Data persistence (Supabase) and multi-user auth coming next.
