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
- **Fix:** Claude calls now go through `api/claude.js`, a Vercel function that holds `ANTHROPIC_API_KEY` and only answers signed-in Supabase users. The old key must be rotated because it was public.
- **Rule:** only public values (Supabase URL, anon key) get the `VITE_` prefix. Secret keys live server-side with no prefix.

## 2026-10-07: Port 5173 is often taken by another local project
- **Rule:** run this app with `npm run dev -- --port 5180 --strictPort`. Never kill whatever is on 5173; it belongs to another project.

## 2026-10-07: Vercel functions reject request bodies over 4.5 MB
- **What went wrong:** moving Claude calls behind `/api/claude` would have broken photo uploads, because raw phone photos (3-8 MB, larger once base64-encoded) exceed Vercel's limit.
- **Fix:** `src/lib/image.js` shrinks photos to 1568px on the long edge as JPEG before sending.
- **Rule:** anything sent through a Vercel function must stay under 4.5 MB. Shrink or upload to Supabase Storage first.

## 2026-10-07: A test mock that returns new objects every render hides memo bugs
- **What went wrong:** the Plants page regression test passed even with the plant type filter bug put back, because the mocked context returned a fresh `seeds` array on every render, forcing `useMemo` to recompute.
- **Fix:** build mock context values once with `vi.hoisted` so they stay identical between renders, like the real provider.
- **Rule:** after writing a regression test, put the bug back and confirm the test fails. A test that can't fail proves nothing.

## 2026-10-07: Context functions used in effect dependencies must be stable
- **What went wrong:** pages called `loadPlantTasks` etc. in effects but left them out of the dependency list, because the functions were recreated every render; adding them would have looped forever. They also fetched twice when called twice quickly.
- **Fix:** loaders are `useCallback` with no dependencies and track what's loaded in a `useRef` Set.
- **Rule:** any function a context hands to pages for use in effects is wrapped in `useCallback` and never reads state directly; use refs or functional `setState`.
