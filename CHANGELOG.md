# Changelog

## 2026-10-07 (security)
- **fix:** the Anthropic API key no longer ships to the browser. Claude calls go through a new `/api/claude` Vercel function that requires a Supabase login and fixes the model and token cap server-side.
- **fix:** photos are shrunk to 1568px before sending, to stay under Vercel's 4.5 MB request limit.
- **test:** 11 new tests for the proxy, the client helper, and image sizing.

## 2026-10-07
- **feat:** "Forgot password?" link on the login modal sends a Supabase reset email. Completes the password reset flow.
- **test:** set up Vitest and Testing Library; 3 tests cover the reset flow.
- **chore:** synced package-lock.json.
