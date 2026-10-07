# Changelog

## 2026-10-07 (Today page on the UI kit)
- **feat:** Today rebuilt on the UI kit: search and a filter sheet (task type, zone, including "No zone"), each area in its own card with "Mark all done" in its header, showing 5 tasks then "Show more", "days late" on overdue tasks, thinner round tick boxes, shorter tick-then-remove animation. Home's Today card uses the same task row.
- **fix:** Home's Today card showed tasks months overdue (for example "160 days late") that Today and the nav badge already treat as probably done; it now shows tasks due now first.

## 2026-10-07 (Plants page on the UI kit)
- **feat:** Plants page rebuilt on the shared UI kit: one-line toolbar (search, Filter, sort, list or grid), filters in a sheet that apply on "Show N plants", removable filter chips, pages of 40 with "Show more", zone and category columns on desktop, Add plants fixed to the bottom on phones, toolbar hides on scroll down on phones.
- **fix:** the zone filter showed internal ids (for example `potager-…`) instead of zone names.

## 2026-10-07 (design rebuild, first pass)
- **feat:** shared UI kit in `src/ui/` and `src/styles/ui.css`: one scale for spacing, corners, lines and text; primary, secondary, ghost and danger buttons; inputs, tags, filter chips, cards, list toolbar; phone sizes roomier, desktop denser. Preview at `/design`. No existing page changes yet.

## 2026-10-07 (data lockdown)
- **fix:** SQL migration turns on Row Level Security for every table and the photo bucket, so only signed-in users can read or write data.
- **fix:** magic link no longer creates accounts for unknown emails (`shouldCreateUser: false`).
- **chore:** `scripts/check-public-access.mjs` reports what a logged-out visitor can read.

## 2026-10-07 (security)
- **fix:** the Anthropic API key no longer ships to the browser. Claude calls go through a new `/api/claude` Vercel function that requires a Supabase login and fixes the model and token cap server-side.
- **fix:** photos are shrunk to 1568px before sending, to stay under Vercel's 4.5 MB request limit.
- **test:** 11 new tests for the proxy, the client helper, and image sizing.

## 2026-10-07
- **feat:** "Forgot password?" link on the login modal sends a Supabase reset email. Completes the password reset flow.
- **test:** set up Vitest and Testing Library; 3 tests cover the reset flow.
- **chore:** synced package-lock.json.
