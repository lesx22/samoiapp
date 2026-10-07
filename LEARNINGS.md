# Learnings

Reusable rules from bugs and surprises. Check this before making changes.

## 2026-10-07: Vitest does not clean up rendered components between tests
- **What went wrong:** the second and third LoginPage tests failed with "Found multiple elements with the role button and name Log in".
- **Why:** Testing Library only auto-cleans the DOM when Vitest `globals` is on. This project doesn't use globals, so each test's page stayed mounted.
- **Fix:** `src/test/setup.js` calls `cleanup()` in `afterEach`.
- **Rule:** keep the `afterEach(cleanup)` in the shared setup file. Never remove it or turn on globals without checking test isolation.

## 2026-10-07: Any `VITE_` env variable is shipped to the browser
- **What went wrong:** `VITE_ANTHROPIC_API_KEY` is bundled into the public JavaScript, so anyone on the live site can read the key.
- **Why:** Vite exposes every variable prefixed with `VITE_` to client code by design.
- **Fix (pending):** move Claude API calls into a Vercel serverless function, then rotate the key.
- **Rule:** only public values (Supabase URL, anon key) get the `VITE_` prefix. Secret keys live server-side with no prefix.

## 2026-10-07: Port 5173 is often taken by another local project
- **Rule:** run this app with `npm run dev -- --port 5180 --strictPort`. Never kill whatever is on 5173; it belongs to another project.
